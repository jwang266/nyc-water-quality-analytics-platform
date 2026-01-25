import mongoose from "mongoose";
import type { InferSchemaType } from "mongoose";

const { Schema, model } = mongoose;

const DELETION_RETENTION_SECONDS = 0;  // immediate reuse

const deletedEmailSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true
    },
    deletedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

// TTL cleanup (not instant)
deletedEmailSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: DELETION_RETENTION_SECONDS }
);

deletedEmailSchema.statics.canReuse = async function (  // reuse check
  email: string
): Promise<boolean> {
  const record = await this.findOne({ email: email.toLowerCase() });
  if (!record) return true;

  const deletedTime = record.deletedAt.getTime();
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - deletedTime) / 1000;

  return elapsedSeconds >= DELETION_RETENTION_SECONDS;
};

export type DeletedEmail = InferSchemaType<typeof deletedEmailSchema>;

const deletedEmailCollection = model("DeletedEmail", deletedEmailSchema);
export default deletedEmailCollection;
