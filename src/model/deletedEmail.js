import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Retention period: 0 seconds (no waiting - allow immediate reuse)
const DELETION_RETENTION_SECONDS = 0;

const deletedEmailSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    deletedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Create TTL index on deletedAt field
// MongoDB will automatically delete documents 10 seconds after deletedAt
deletedEmailSchema.index({ deletedAt: 1 }, { expireAfterSeconds: DELETION_RETENTION_SECONDS });

// Function to check if a deleted email can be reused (after retention period)
deletedEmailSchema.statics.canReuse = async function(email) {
  const record = await this.findOne({ email: email.toLowerCase() });
  if (!record) return true; // Not in deleted list, can use
  
  const deletedTime = record.deletedAt.getTime();
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - deletedTime) / 1000;
  
  return elapsedSeconds >= DELETION_RETENTION_SECONDS;
};

const deletedEmailCollection = model("deletedEmail", deletedEmailSchema);
export default deletedEmailCollection;
