import {Router} from 'express';
import { voteCollection, boroughCollection } from '../model/index.js';
import { getCurrentWeekStart } from '../helper/helper.js';

const router = Router();

/* ===========================================
   HOME PAGE
=========================================== */
router.get('/', async (req, res) => {
    try {
      const weekStart = getCurrentWeekStart();

      // Get all boroughs first
      const allBoroughs = await boroughCollection.find({}).lean();

      // Get vote counts for all boroughs this week
      // Use exact match like votes.js does
      const voteCounts = await voteCollection.aggregate([
        { $match: { weekStart: weekStart } },
        { $group: { _id: "$boroughId", voteCount: { $sum: 1 } } },
        { $sort: { voteCount: -1 } }
      ]);

      // Create a map of borough IDs to vote counts
      const voteMap = {};
      voteCounts.forEach(vc => {
        voteMap[vc._id.toString()] = vc.voteCount;
      });

      // Add vote counts to all boroughs, ensuring all are shown
      // include id so template can submit votes
      const boroughSnapshots = allBoroughs.map(borough => ({
        id: borough._id.toString(),
        name: borough.name,
        voteCount: voteMap[borough._id.toString()] || 0
      }));

      // Sort by vote count (descending) to rank by votes
      boroughSnapshots.sort((a, b) => b.voteCount - a.voteCount);

      res.render('home', {
        title: 'Welcome to Water Monitor',
        css: '/public/css/styles.css',
        boroughSnapshots: boroughSnapshots,
        isAuthenticated: !!req.session.user
      });
    } catch (e) {
      console.error('Home route error:', e);
      res.status(500).render('error', { error: e });
    }
  });

  export default router;