import { Router } from 'express';
import { voteCollection, boroughCollection } from '../model/index.js';
import { getCurrentWeekStart } from '../helper/helper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const weekStart = getCurrentWeekStart();

    const allBoroughs = await boroughCollection.find({}).lean();

    const voteCounts = await voteCollection.aggregate<{
      _id: { toString(): string };
      voteCount: number;
    }>([
      { $match: { weekStart } },
      { $group: { _id: '$boroughId', voteCount: { $sum: 1 } } },
      { $sort: { voteCount: -1 } }
    ]);

    const voteMap: Record<string, number> = {};
    voteCounts.forEach((vc) => {
      voteMap[vc._id.toString()] = vc.voteCount;
    });

    const boroughSnapshots = allBoroughs
      .map((borough) => ({
        id: borough._id.toString(),
        name: borough.name,
        voteCount: voteMap[borough._id.toString()] || 0
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    res.render('home', {
      title: 'Welcome to Water Monitor',
      css: '/css/styles.css',
      boroughSnapshots,
      isAuthenticated: !!req.session.user
    });
  } catch (e) {
    console.error('Home route error:', e);
    res.status(500).render('error', { error: e });
  }
});

export default router;
