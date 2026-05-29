import {
  boroughCollection,
  sampleSiteCollection,
  waterSampleCollection
} from '../model/index.js';

const BOROUGH_DESCRIPTIONS = {
  Bronx:
    'The Bronx is a predominantly residential borough located north of Manhattan. It contains a mix of urban neighborhoods, parks, and coastline along the Harlem and East Rivers. Water quality monitoring in the Bronx focuses on communities with older infrastructure, varied housing density, and coastal influences.',
  Brooklyn:
    'Brooklyn is New York City\'s most populous borough, known for its diverse neighborhoods and extensive coastline along the East River and Jamaica Bay. Water quality conditions vary by neighborhood due to differences in population density, building age, and distribution network characteristics.',
  Manhattan:
    'Manhattan is the urban and commercial core of New York City, with high-rise buildings and dense infrastructure. Drinking water quality here is influenced by high demand, older distribution systems in some areas, and complex network routing to serve residential, commercial, and institutional facilities.',
  Queens:
    'Queens is a geographically large and highly diverse borough with both dense urban zones and low-rise residential areas. It borders the East River and Jamaica Bay. Water quality patterns can differ widely across neighborhoods because of varying pipe age, housing types, and system distribution routes.',
  'Staten Island':
    'Staten Island is the least densely populated borough, featuring more suburban development and significant coastal areas. Its drinking water system relies on long-distance distribution infrastructure, and water quality monitoring emphasizes neighborhood-level variations due to elevation and network layout.'
} as const;

type BoroughName = keyof typeof BOROUGH_DESCRIPTIONS;

type WaterSampleLean = {
  sample_date?: Date | null;
  sample_site?: string | null;
  residual_free_chlorine_mg_l?: number | null;
  turbidity_ntu?: number | null;
  coliform_quanti_tray_mpn_100ml?: number | null;
  e_coli_quanti_tray_mpn_100ml?: number | null;
  fluoride_mg_l?: number | null;
};

export const createOrUpdateBoroughs = async () => {
  const siteList = await sampleSiteCollection.find({}).lean();
  const boroughMap: Record<
    string,
    { neighborhoods: Record<string, string[]>; site_ids: string[] }
  > = {};

  for (const s of siteList) {
    const boroughName = s.borough?.trim();
    const neighborhood = s.neighborhood?.trim();
    if (!boroughName) continue;

    if (!boroughMap[boroughName]) {
      boroughMap[boroughName] = { neighborhoods: {}, site_ids: [] };
    }

    boroughMap[boroughName].site_ids.push(s.sample_site.toString());

    if (neighborhood) {
      if (!boroughMap[boroughName].neighborhoods[neighborhood]) {
        boroughMap[boroughName].neighborhoods[neighborhood] = [];
      }
      boroughMap[boroughName].neighborhoods[neighborhood].push(s.sample_site.toString());
    }
  }

  const results: { borough: string; action: string }[] = [];

  for (const [bName, data] of Object.entries(boroughMap)) {
    const neighborhoodStatsArray = [];

    for (const [nName, nSiteIds] of Object.entries(data.neighborhoods)) {
      const waterData = (await waterSampleCollection
        .find({ sample_site: { $in: nSiteIds } })
        .lean()) as WaterSampleLean[];

      const sample_count = waterData.length;

      const avg = (key: keyof WaterSampleLean) =>
        sample_count
          ? waterData.reduce((sum, x) => sum + (Number(x[key]) || 0), 0) / sample_count
          : 0;

      const latest_sample_date = sample_count
        ? waterData.reduce((a, b) =>
            new Date(a.sample_date!) > new Date(b.sample_date!) ? a : b
          ).sample_date
        : null;

      neighborhoodStatsArray.push({
        name: nName,
        stats: {
          avg_chlorine: avg('residual_free_chlorine_mg_l'),
          avg_turbidity: avg('turbidity_ntu'),
          avg_coliform: avg('coliform_quanti_tray_mpn_100ml'),
          avg_e_coli: avg('e_coli_quanti_tray_mpn_100ml'),
          avg_fluoride: avg('fluoride_mg_l'),
          latest_sample_date,
          sample_count
        }
      });
    }

    const boroughSamples = (await waterSampleCollection
      .find({ sample_site: { $in: data.site_ids } })
      .lean()) as WaterSampleLean[];

    const borough_sample_count = boroughSamples.length;

    const avgB = (key: keyof WaterSampleLean) =>
      borough_sample_count
        ? boroughSamples.reduce((sum, x) => sum + (Number(x[key]) || 0), 0) /
          borough_sample_count
        : 0;

    const borough_latest_sample = borough_sample_count
      ? boroughSamples.reduce((a, b) =>
          new Date(a.sample_date!) > new Date(b.sample_date!) ? a : b
        ).sample_date
      : null;

    const boroughStats = {
      avg_chlorine: avgB('residual_free_chlorine_mg_l'),
      avg_turbidity: avgB('turbidity_ntu'),
      avg_coliform: avgB('coliform_quanti_tray_mpn_100ml'),
      avg_e_coli: avgB('e_coli_quanti_tray_mpn_100ml'),
      avg_fluoride: avgB('fluoride_mg_l'),
      latest_sample_date: borough_latest_sample,
      sample_count: borough_sample_count
    };

    const existing = await boroughCollection.findOne({ name: bName });

    if (!existing) {
      const descriptionKey = bName as BoroughName;
      await boroughCollection.create({
        name: bName,
        description:
          BOROUGH_DESCRIPTIONS[descriptionKey] ||
          'Description not available for this borough',
        neighborhoods: neighborhoodStatsArray,
        stats: [boroughStats],
        alerts: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      results.push({ borough: bName, action: 'created' });
    } else {
      await boroughCollection.findOneAndUpdate(
        { _id: existing._id },
        {
          neighborhoods: neighborhoodStatsArray,
          stats: [boroughStats],
          updatedAt: new Date()
        }
      );
      results.push({ borough: bName, action: 'updated' });
    }
  }

  return results;
};

export async function getBoroughsDataByDayMonthYear(
  year: unknown,
  month: unknown,
  day: unknown
) {
  const y = Number(year);
  const m = month !== undefined && month !== null && month !== '' ? Number(month) : null;
  const d = day !== undefined && day !== null && day !== '' ? Number(day) : null;

  if (!Number.isInteger(y) || y < 2015 || y > 2025) {
    throw 'Invalid year! Must be between 2015 and 2025.';
  }
  if (m !== null && (!Number.isInteger(m) || m < 1 || m > 12)) {
    throw 'Invalid month! Must be between 1 and 12.';
  }
  if (d !== null && (!Number.isInteger(d) || d < 1 || d > 31)) {
    throw 'Invalid day! Must be between 1 and 31.';
  }

  let start: Date;
  let end: Date;

  if (d !== null && m !== null) {
    start = new Date(y, m - 1, d);
    end = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else if (m !== null) {
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0, 23, 59, 59, 999);
  } else {
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31, 23, 59, 59, 999);
  }

  return aggregateByDateRange(start, end);
}

async function aggregateByDateRange(start: Date, end: Date) {
  return waterSampleCollection.aggregate([
    {
      $match: {
        sample_date: { $gte: start, $lte: end }
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
      $group: {
        _id: '$site.borough',
        avg_chlorine: { $avg: '$residual_free_chlorine_mg_l' },
        avg_turbidity: { $avg: '$turbidity_ntu' },
        avg_coliform: { $avg: '$coliform_quanti_tray_mpn_100ml' },
        avg_e_coli: { $avg: '$e_coli_quanti_tray_mpn_100ml' },
        avg_fluoride: { $avg: '$fluoride_mg_l' },
        sample_count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'boroughs',
        localField: '_id',
        foreignField: 'name',
        as: 'boroughDoc'
      }
    },
    {
      $project: {
        borough: '$_id',
        _id: { $arrayElemAt: ['$boroughDoc._id', 0] },
        avg_chlorine: 1,
        avg_turbidity: 1,
        avg_coliform: 1,
        avg_e_coli: 1,
        avg_fluoride: 1,
        sample_count: 1
      }
    },
    { $sort: { borough: 1 } }
  ]);
}
