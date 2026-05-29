import express, { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  voteCollection,
  boroughCollection,
  waterSampleCollection,
  userCollection as User
} from '../model/index.js';
import { getCurrentWeekStart, isValidId } from '../helper/helper.js';
import userData from '../data/users.js';
import commentsData from '../data/comments.js';

const router = express.Router();

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.status(401).json({ error: 'You must be logged in to perform this action.' });
    return;
  }
  next();
};

router.get('/', async (req, res) => {
  let toast = null;
  if (req.session.toast) {
    toast = req.session.toast;
    delete req.session.toast;
  }

  const boroughs = await boroughCollection.find().lean();

  boroughs.forEach((b) => {
    if (b.stats && b.stats.length > 0) {
      (b as typeof b & { quality?: object }).quality = {
        _id: b._id,
        chlorine: b.stats[0].avg_chlorine,
        turbidity: b.stats[0].avg_turbidity
      };
    }
  });

  let userVoteBoroughId: string | null = null;
  if (req.session.user) {
    const userId = req.session.user.id;
    const weekStart = getCurrentWeekStart();

    const existingVote = await voteCollection
      .findOne({
        userId: new mongoose.Types.ObjectId(userId),
        weekStart
      })
      .lean();

    if (existingVote) userVoteBoroughId = existingVote.boroughId.toString();
  }

  res.render('boroughs', {
    boroughs,
    isAuthenticated: !!req.session.user,
    user: req.session.user || null,
    userVoteBoroughId,
    toast
  });
});

router.get('/:id', async (req, res) => {
  try {
    const boroughId = req.params.id;
    const borough = await boroughCollection.findById(boroughId).lean();
    if (!borough) {
      res.status(404).render('error', { error: 'Borough not found' });
      return;
    }

    const samples = await waterSampleCollection
      .find({ boroughId })
      .sort({ sample_date: -1 })
      .lean();

    const formattedSamples = samples.map((s) => ({
      ...s,
      sample_date: s.sample_date
        ? new Date(s.sample_date).toISOString().split('T')[0]
        : 'N/A'
    }));

    const GUIDELINES = {
      chlorine: 4.0,
      turbidity: 1,
      coliform: 2,
      ecoli: 0.01,
      fluoride: 2.0
    };

    const tips: string[] = [];
    const notices: string[] = [];

    const stats = borough?.stats?.[0];
    if (stats) {
      if ((stats.avg_turbidity ?? 0) > GUIDELINES.turbidity) {
        notices.push('Turbidity');
        tips.push(
          'If you notice cloudiness, consider using a basic water filter for drinking.'
        );
      }
      if ((stats.avg_chlorine ?? 0) > GUIDELINES.chlorine) {
        notices.push('Chlorine');
        tips.push(
          'If the taste/smell is strong, letting water sit can reduce chlorine odor.'
        );
      }
      if ((stats.avg_coliform ?? 0) > GUIDELINES.coliform) {
        notices.push('Coliform');
        tips.push(
          'For extra caution, follow local public health guidance if advisories are issued.'
        );
      }
      if ((stats.avg_e_coli ?? 0) > GUIDELINES.ecoli) {
        notices.push('E. coli');
        tips.push(
          'Avoid making assumptions—check official advisories for recommended actions.'
        );
      }
      if ((stats.avg_fluoride ?? 0) > GUIDELINES.fluoride) {
        notices.push('Fluoride');
        tips.push(
          'If you have questions about fluoride levels, check local water quality reports for context.'
        );
      }
    }

    let combinedNotice: string | null = null;
    if (notices.length > 0) {
      combinedNotice = `${notices.join(', ')} ${notices.length === 1 ? 'is' : 'are'} above the guideline for this borough.`;
    }

    if (tips.length === 0) {
      tips.push(
        'All monitored indicators are within the defined guideline range for this borough.'
      );
    }

    const comments = await commentsData.getCommentsByBorough(boroughId);
    let isLiked = false;
    if (req.session.user) {
      const user = await User.findById(req.session.user.id).select('likedBoroughs').lean();
      if (user?.likedBoroughs) {
        isLiked = user.likedBoroughs.map((x) => x.toString()).includes(boroughId);
      }
    }

    res.render('boroughDetails', {
      borough,
      samples: formattedSamples,
      tips,
      combinedNotice,
      hasTips: tips.length > 0,
      comments,
      isLiked,
      isAuthenticated: !!req.session.user,
      user: req.session.user || null
    });
  } catch (e) {
    console.error('Borough Details Error:', e);
    res.status(500).render('error', { error: 'Could not load borough details' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const boroughId = req.params.id;
    const userId = req.session.user!.id;

    const updatedUser = await userData.toggleLikeBorough(userId, boroughId);
    const likedBoroughs = Array.isArray(updatedUser.likedBoroughs)
      ? updatedUser.likedBoroughs
      : [];
    const isLiked = likedBoroughs.map((x) => x.toString()).includes(boroughId);

    res.json({ success: true, isLiked });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = isValidId(req.params.id);
    const borough = await boroughCollection.findByIdAndDelete(id);
    if (!borough) {
      res.status(404).json({ error: 'Borough not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  }
});

export default router;
