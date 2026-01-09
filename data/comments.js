import { commentCollection } from "../model/index.js";
import mongoose from "mongoose";
import { checkString, isValidId } from "../helper/helper.js";

const exportedMethods = {
  async createComment(userId, boroughId, comment) {
    // Debug logs
    // console.log("--- Data Layer createComment ---");
    // console.log("Raw userId:", userId);
    // console.log("Raw boroughId:", boroughId);

    try {
      userId = isValidId(userId);
      boroughId = isValidId(boroughId);
      comment = checkString(comment, "Comment");

      // console.log("Validated userId:", userId);
      // console.log("Validated boroughId:", boroughId);

      if (comment.length > 200) {
        throw "Comment must be 200 characters or less";
      }

      const newComment = {
        user: new mongoose.Types.ObjectId(userId),
        borough: new mongoose.Types.ObjectId(boroughId),
        comment,
        commentDate: new Date()
      };

      const created = await commentCollection.create(newComment);

      if (!created) {
        // console.error("Mongoose create failed.");
        throw "Could not create comment";
      }

      // console.log("Comment successfully created in DB. ID:", created._id);
      return created;
    } catch (error) {
      throw error;
    }
  },

  async getCommentById(id) {
    id = isValidId(id);

    const comment = await commentCollection.findById(id);
    if (!comment) throw "Comment not found";

    return comment;
  },

  // Get all comments for a borough, newest first
  async getCommentsByBorough(boroughId) {
    boroughId = isValidId(boroughId);

    return commentCollection
      .find({ borough: new mongoose.Types.ObjectId(boroughId) })
      .populate("user", "fname lname")
      .sort({ commentDate: -1 })
      .lean();
  },

  // Get all comments made by a user
  async getCommentsByUser(userId) {
    userId = isValidId(userId);

    return commentCollection
      .find({ user: new mongoose.Types.ObjectId(userId) })
      .populate("borough", "name")
      .sort({ commentDate: -1 })
      .lean();
  },

  async deleteComment(id) {
    id = isValidId(id);

    const deleted = await commentCollection.findByIdAndDelete(id);
    if (!deleted) throw "Comment not found";

    return true;
  }
};

export default exportedMethods;
