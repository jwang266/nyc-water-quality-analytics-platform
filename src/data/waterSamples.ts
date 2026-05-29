import { waterSampleCollection, sampleSiteCollection } from '../model/index.js';

export interface RecentWaterSamplesOptions {
  sample_number?: string;
  sample_site?: string;
  borough?: string;
  page?: number | string;
  limit?: number | string;
}

export interface FormattedWaterSample {
  _id: string;
  sample_number: string;
  sample_site: string;
  borough: string;
  date: string;
  chlorine: number | null | undefined;
  turbidity: number | null | undefined;
  fluoride: number | null | undefined;
  coliform: number | null | undefined;
  ecoli: number | null | undefined;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getRecentWaterSamples = async ({
  sample_number,
  sample_site,
  borough,
  page = 1,
  limit = 50
}: RecentWaterSamplesOptions = {}): Promise<FormattedWaterSample[]> => {
  const query: Record<string, unknown> = {};

  if (sample_number) {
    query.sample_number = sample_number;
  }

  let sampleSiteRegex: RegExp | null = null;
  if (sample_site) {
    sampleSiteRegex = new RegExp(escapeRegex(sample_site), 'i');
    query.sample_site = sampleSiteRegex;
  }

  const now = new Date();
  const endUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
  const startUTC = new Date(
    Date.UTC(
      now.getUTCFullYear() - 1,
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  query.sample_date = { $gte: startUTC, $lte: endUTC };

  let siteFilter: string[] | null = null;
  if (borough) {
    const boroughRegex = new RegExp('^' + escapeRegex(borough) + '$', 'i');

    const sites = await sampleSiteCollection
      .find({ borough: boroughRegex })
      .select('sample_site')
      .lean();

    const siteVals = sites.map((s) => s.sample_site);
    if (siteVals.length === 0) return [];

    if (sampleSiteRegex) {
      const filtered = siteVals.filter((val) => sampleSiteRegex!.test(val));
      if (filtered.length === 0) return [];
      siteFilter = filtered;
    } else {
      siteFilter = siteVals;
    }
  }

  const parsedLimit = Number(limit);
  const lim =
    !isNaN(parsedLimit) && parsedLimit > 0 ? Math.max(1, parsedLimit) : 10;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const skip = (pageNum - 1) * lim;

  const mongoQuery: Record<string, unknown> = { ...query };
  if (siteFilter) mongoQuery.sample_site = { $in: siteFilter };
  else if (sampleSiteRegex) mongoQuery.sample_site = sampleSiteRegex;

  const samples = await waterSampleCollection
    .find(mongoQuery)
    .sort({ sample_date: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  if (samples.length === 0) return [];

  const siteIds = [
    ...new Set(samples.map((s) => s.sample_site).filter((id): id is string => Boolean(id)))
  ];
  const siteDocs = await sampleSiteCollection
    .find({ sample_site: { $in: siteIds } })
    .select('sample_site borough')
    .lean();

  const siteMap: Record<string, string> = {};
  siteDocs.forEach((doc) => {
    siteMap[doc.sample_site] = doc.borough || 'Unknown';
  });

  return samples.map((s) => ({
    _id: s._id.toString(),
    sample_number: s.sample_number,
    sample_site: s.sample_site || 'N/A',
    borough: (s.sample_site && siteMap[s.sample_site]) || 'Unknown',
    date: s.sample_date ? s.sample_date.toISOString().split('T')[0] : 'N/A',
    chlorine: s.residual_free_chlorine_mg_l,
    turbidity: s.turbidity_ntu,
    fluoride: s.fluoride_mg_l,
    coliform: s.coliform_quanti_tray_mpn_100ml,
    ecoli: s.e_coli_quanti_tray_mpn_100ml
  }));
};

export const getDataDates = async () => {
  const docs = await waterSampleCollection.aggregate<{
    _id: { year: number; month: number };
  }>([
    {
      $match: {
        sample_date: { $type: 'date' }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$sample_date' },
          month: { $month: '$sample_date' }
        }
      }
    }
  ]);

  const yearsSet = new Set<number>();
  const monthsByYearMap: Record<number, Set<number>> = {};

  for (const doc of docs) {
    const y = doc._id.year;
    const m = doc._id.month;
    if (!Number.isInteger(y) || !Number.isInteger(m)) continue;
    yearsSet.add(y);
    if (!monthsByYearMap[y]) monthsByYearMap[y] = new Set();
    monthsByYearMap[y].add(m);
  }

  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const monthsByYear: Record<number, number[]> = {};

  for (const y of years) {
    monthsByYear[y] = Array.from(monthsByYearMap[y] || []).sort((a, b) => a - b);
  }

  return { years, monthsByYear };
};

const metricFieldMap = {
  avg_chlorine: 'residual_free_chlorine_mg_l',
  avg_turbidity: 'turbidity_ntu',
  avg_coliform: 'coliform_quanti_tray_mpn_100ml',
  avg_e_coli: 'e_coli_quanti_tray_mpn_100ml',
  avg_fluoride: 'fluoride_mg_l'
} as const;

type TrendMetric = keyof typeof metricFieldMap;

export const getTrendData = async (
  borough: unknown,
  year: unknown,
  month: unknown,
  metric: unknown
) => {
  if (!borough || !year || !metric) return [];

  const boroughStr = String(borough);
  const y = Number(year);
  const m =
    month !== undefined && month !== null && month !== ''
      ? Number(month)
      : null;

  if (!Number.isInteger(y) || y < 2010 || y > 2100) {
    throw 'Invalid year for trend data';
  }
  if (m !== null && (!Number.isInteger(m) || m < 1 || m > 12)) {
    throw 'Invalid month for trend data';
  }

  const metricKey = String(metric) as TrendMetric;
  const field = metricFieldMap[metricKey];
  if (!field) {
    throw `Unsupported metric: ${metric}`;
  }

  let start: Date;
  let end: Date;
  if (m !== null) {
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0, 23, 59, 59, 999);
  } else {
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31, 23, 59, 59, 999);
  }

  const boroughRegex = new RegExp('^' + escapeRegex(boroughStr) + '$', 'i');

  const dateFormat = m !== null ? '%Y-%m-%d' : '%Y-%m-01';

  const pipeline = [
    {
      $match: {
        sample_date: { $gte: start, $lte: end },
        [field]: { $ne: null }
      }
    },
    {
      $lookup: {
        from: 'samplesites',
        localField: 'sample_site',
        foreignField: 'sample_site',
        as: 'site'
      }
    },
    { $unwind: '$site' },
    {
      $match: {
        'site.borough': boroughRegex
      }
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: dateFormat,
              date: '$sample_date'
            }
          }
        },
        avgValue: { $avg: `$${field}` }
      }
    },
    { $sort: { '_id.date': 1 as const } },
    {
      $project: {
        _id: 0,
        date: '$_id.date',
        value: '$avgValue'
      }
    }
  ];

  return waterSampleCollection.aggregate(pipeline);
};
