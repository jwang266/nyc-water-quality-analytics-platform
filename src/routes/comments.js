import { Router } from 'express';
import commentData from '../data/comments.js';
import { commentCollection as Comment } from '../model/index.js';
import { isValidId } from '../helper/helper.js';

const router = Router();

const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'You must be logged in to perform this action.' });
  }
  next();
};

// Get all comments for a borough
router.get('/borough/:boroughId', async (req, res) => {
  try {
    const comments = await commentData.getCommentsByBorough(req.params.boroughId);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const comment = await commentData.getCommentById(req.params.id);
    res.json(comment);
  } catch (e) {
    res
      .status(e.toString().includes('not found') ? 404 : 500)
      .json({ error: e.toString() });
  }
});

// Create a new comment
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = String(req.session.user._id || req.session.user.id || '');
    const { boroughId, comment } = req.body;

    if (!userId || !boroughId) {
      return res.status(400).json({ error: 'Missing userId or boroughId' });
    }

    const created = await commentData.createComment(userId, boroughId, comment);

    const populated = await Comment.findById(created._id)
      .populate('user', 'fname lname')
      .lean();

    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// DELETE /api/comments/:id, admin or owner
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const commentId = isValidId(req.params.id);
    const comment = await Comment.findById(commentId).lean();
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const userId = String(req.session.user._id || req.session.user.id);
    const isOwner = comment.user?.toString() === userId;
    const isAdmin = req.session.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment.' });
    }

    await commentData.deleteComment(commentId);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

export default router;
