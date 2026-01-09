import express from 'express';
import { boroughCollection } from '../model/index.js';
import commentsRouter from './comments.js';
import { boroughsData, waterSamplesData } from '../data/index.js';

const router = express.Router();

router.get('/borough-overall', async (req, res) => {
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
    const results = await boroughsData.getBoroughsDataByDayMonthYear(year, month, day);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

router.get('/data-dates', async (req, res) => {
  try {
    const results = await waterSamplesData.getDataDates();
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

router.get('/water-samples', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const results = await waterSamplesData.getRecentWaterSamples({
      page,
      limit
    });

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

router.get('/borough-trends', async (req, res) => {
  try {
    const { borough, year, month, metric } = req.query;
    const results = await waterSamplesData.getTrendData(borough, year, month, metric);
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

router.use('/comments', commentsRouter);

export default router;
