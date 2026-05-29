import { commentCollection } from '../model/index.js';
import mongoose from 'mongoose';
import { checkString, isValidId } from '../helper/helper.js';

const exportedMethods = {
  async createComment(userId: unknown, boroughId: unknown, comment: unknown) {
    const validUserId = isValidId(userId);
    const validBoroughId = isValidId(boroughId);
    const validComment = checkString(comment, 'Comment');

    if (validComment.length > 200) {
      throw 'Comment must be 200 characters or less';
    }

    const newComment = {
      user: new mongoose.Types.ObjectId(validUserId),
      borough: new mongoose.Types.ObjectId(validBoroughId),
      comment: validComment,
      commentDate: new Date()
    };

    const created = await commentCollection.create(newComment);

    if (!created) {
      throw 'Could not create comment';
    }

    return created;
  },

  async getCommentById(id: unknown) {
    const validId = isValidId(id);

    const comment = await commentCollection.findById(validId);
    if (!comment) throw 'Comment not found';

    return comment;
  },

  async getCommentsByBorough(boroughId: unknown) {
    const validBoroughId = isValidId(boroughId);

    return commentCollection
      .find({ borough: new mongoose.Types.ObjectId(validBoroughId) })
      .populate('user', 'fname lname')
      .sort({ commentDate: -1 })
      .lean();
  },

  async getCommentsByUser(userId: unknown) {
    const validUserId = isValidId(userId);

    return commentCollection
      .find({ user: new mongoose.Types.ObjectId(validUserId) })
      .populate('borough', 'name')
      .sort({ commentDate: -1 })
      .lean();
  },

  async deleteComment(id: unknown): Promise<true> {
    const validId = isValidId(id);

    const deleted = await commentCollection.findByIdAndDelete(validId);
    if (!deleted) throw 'Comment not found';

    return true;
  }
};

export default exportedMethods;
