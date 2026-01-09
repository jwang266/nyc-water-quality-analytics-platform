import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  boroughId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Borough",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  weekStart: {
    type: Date,
    required: true
  }
});

// enforce: 1 vote per user per week
voteSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

const voteCollection = mongoose.model("Vote", voteSchema);

export default voteCollection;
