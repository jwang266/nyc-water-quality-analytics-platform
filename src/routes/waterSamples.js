import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.render('watersamples', {
      title: 'Water Quality Samples',
      css: '/css/styles.css'
    });
  } catch (e) {
    res.status(500).render('error', { error: e.message || e });
  }
});

export default router;
