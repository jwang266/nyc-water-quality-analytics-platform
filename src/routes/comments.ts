import { Router, type Request, type Response, type NextFunction } from 'express';
import commentData from '../data/comments.js';
import { commentCollection as Comment } from '../model/index.js';
import { isValidId } from '../helper/helper.js';

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session?.user) {
    res.status(401).json({ error: 'You must be logged in to perform this action.' });
    return;
  }
  next();
};

router.get('/borough/:boroughId', async (req, res) => {
  try {
    const comments = await commentData.getCommentsByBorough(req.params.boroughId);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const comment = await commentData.getCommentById(req.params.id);
    res.json(comment);
  } catch (e) {
    const message = String(e);
    res
      .status(message.includes('not found') ? 404 : 500)
      .json({ error: message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = String(req.session.user!._id || req.session.user!.id || '');
    const { boroughId, comment } = req.body as { boroughId?: string; comment?: string };

    if (!userId || !boroughId) {
      res.status(400).json({ error: 'Missing userId or boroughId' });
      return;
    }

    const created = await commentData.createComment(userId, boroughId, comment);

    const populated = await Comment.findById(created._id)
      .populate('user', 'fname lname')
      .lean();

    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const commentId = isValidId(req.params.id);
    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const userId = String(req.session.user!._id || req.session.user!.id);
    const isOwner = comment.user?.toString() === userId;
    const isAdmin = req.session.user!.role === 'admin';

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'You do not have permission to delete this comment.' });
      return;
    }

    await commentData.deleteComment(commentId);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
