import { Router, type Request, type Response, type NextFunction } from 'express';
import voteData from '../data/votes.js';
import { getCurrentWeekStart } from '../helper/helper.js';

const router = Router();

const requireLogin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.redirect('/users/login');
    return;
  }
  next();
};

router.post('/', requireLogin, async (req, res) => {
  const { boroughId } = req.body as { boroughId?: string };
  const userId = req.session.user!.id;
  const weekStart = getCurrentWeekStart();

  try {
    await voteData.addVote(userId, boroughId, weekStart);

    req.session.toast = {
      type: 'message',
      message: 'Your vote has been recorded!'
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    req.session.toast = {
      type: 'error',
      message
    };
  }

  res.redirect('/votes/best');
});

router.get('/best', async (req, res) => {
  const weekStartObj = getCurrentWeekStart();
  const weekStartDisplay = weekStartObj.toISOString().slice(0, 10);

  try {
    let toast = null;
    if (req.session.toast) {
      toast = req.session.toast;
      delete req.session.toast;
    }

    const bestBorough = await voteData.getBestBorough(weekStartObj);
    const allBoroughs = await voteData.getAllBoroughs();

    let userVoteBoroughId: string | null = null;
    let userHasVoted = false;
    let votingBoroughs = allBoroughs;

    if (req.session.user) {
      userVoteBoroughId = await voteData.getUserVoteForWeek(
        req.session.user.id,
        weekStartObj
      );

      if (userVoteBoroughId) {
        userHasVoted = true;
        votingBoroughs = allBoroughs.filter(
          (b) => b._id.toString() === userVoteBoroughId
        );
      }
    }

    res.render('bestBorough', {
      title: 'Vote for Best Borough',
      bestBorough,
      boroughs: votingBoroughs,
      weekStart: weekStartDisplay,
      isAuthenticated: !!req.session.user,
      user: req.session.user || null,
      userHasVoted,
      toast,
      css: '/css/styles.css'
    });
  } catch (e) {
    console.error('Vote page error:', e);
    res.status(500).render('error', {
      title: 'Error',
      error: 'Could not load voting page.'
    });
  }
});

export default router;
