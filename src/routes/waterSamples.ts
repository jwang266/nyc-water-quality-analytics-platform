import express from 'express';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    res.render('watersamples', {
      title: 'Water Quality Samples',
      css: '/css/styles.css'
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).render('error', { error: message });
  }
});

export default router;
