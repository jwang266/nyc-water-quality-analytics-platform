import express from 'express';
import { boroughCollection } from '../model/index.js';
import commentsRouter from './comments.js';
import { boroughsData, waterSamplesData } from '../data/index.js';

const router = express.Router();

function queryParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

router.get('/borough-overall', async (_req, res) => {
  try {
    const boroughs = await boroughCollection.find().lean();

    const formatted = boroughs.map((b) => ({
      _id: b._id,
      name: b.name,
      description: b.description,
      sample_count: b.stats?.[0]?.sample_count || 0,
      avg_chlorine: b.stats?.[0]?.avg_chlorine ?? null,
      avg_turbidity: b.stats?.[0]?.avg_turbidity ?? null,
      avg_coliform: b.stats?.[0]?.avg_coliform ?? null,
      avg_e_coli: b.stats?.[0]?.avg_e_coli ?? null,
      avg_fluoride: b.stats?.[0]?.avg_fluoride ?? null
    }));

    res.json(formatted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/borough-stats', async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const results = await boroughsData.getBoroughsDataByDayMonthYear(
      queryParam(year),
      queryParam(month),
      queryParam(day)
    );
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get('/data-dates', async (_req, res) => {
  try {
    const results = await waterSamplesData.getDataDates();
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

router.get('/water-samples', async (req, res) => {
  try {
    const page = parseInt(queryParam(req.query.page) ?? '1', 10) || 1;
    const limit = parseInt(queryParam(req.query.limit) ?? '20', 10) || 20;

    const results = await waterSamplesData.getRecentWaterSamples({
      page,
      limit
    });

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

router.get('/borough-trends', async (req, res) => {
  try {
    const { borough, year, month, metric } = req.query;
    const results = await waterSamplesData.getTrendData(
      queryParam(borough),
      queryParam(year),
      queryParam(month),
      queryParam(metric)
    );
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

router.use('/comments', commentsRouter);

export default router;
