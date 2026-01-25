import mongoose, { InferSchemaType, Schema, model } from "mongoose";

const sampleSiteSchema = new Schema(
  {
    sample_site: { type: String, required: true, trim: true },
    sample_station: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    borough: { type: String },
    neighborhood: { type: String }
  },
  { timestamps: true, versionKey: false }
);

sampleSiteSchema.index({ sample_site: 1 }, { unique: true });

export type SampleSite = InferSchemaType<typeof sampleSiteSchema>;

const sampleSiteCollection = model("SampleSite", sampleSiteSchema);
export default sampleSiteCollection;
