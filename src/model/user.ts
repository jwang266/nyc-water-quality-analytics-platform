import mongoose, { InferSchemaType, Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    lowerEmail: { type: String, required: true, trim: true },
    hashedPwd: { type: String, required: true },
    fname: { type: String, trim: true, default: "" },
    lname: { type: String, trim: true, default: "" },
    role: { type: String, default: "user" },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    likedBoroughs: [{ type: Schema.Types.ObjectId, ref: "Borough" }],
    isDeleted: { type: Boolean, default: false },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null }
  },
  { timestamps: { createdAt: "creationDate", updatedAt: "updatedAt" } }
);

// Unique index only for non-deleted users
userSchema.index(
  { lowerEmail: 1, isDeleted: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

export type User = InferSchemaType<typeof userSchema>;
const userCollection = model("User", userSchema);
export default userCollection;
