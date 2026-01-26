import mongoose from "mongoose";
const { Schema, model } = mongoose;
const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    borough: { type: Schema.Types.ObjectId, ref: "Borough" },
    comment: { type: String },
    commentDate: { type: Date, default: Date.now }
}, {
    timestamps: true
});
commentSchema.index({ borough: 1 });
commentSchema.index({ user: 1 });
const commentCollection = model("Comment", commentSchema);
export default commentCollection;
