import mongoose from "mongoose";

const { Schema, model } = mongoose;

const sampleSiteSchema = new Schema(
  {
    sample_site: { type: String, required: true, trim: true },
    sample_station: String,
    latitude: Number,
    longitude: Number,
    borough: String,
    neighborhood: String
  },
  { timestamps: true, versionKey: false }
);

sampleSiteSchema.index({ sample_site: 1 }, { unique: true });

const sampleSiteCollection = model("SampleSite", sampleSiteSchema)
export default sampleSiteCollection;
