import mongoose from "mongoose";
const { Schema, model } = mongoose;
const voteSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    boroughId: {
        type: Schema.Types.ObjectId,
        ref: "Borough",
        required: true
    },
    weekStart: {
        type: Date,
        required: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
// Enforce: 1 vote per user per week
voteSchema.index({ userId: 1, weekStart: 1 }, { unique: true });
const voteCollection = model("Vote", voteSchema);
export default voteCollection;
