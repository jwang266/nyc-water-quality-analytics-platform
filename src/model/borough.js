import mongoose from "mongoose";

const { Schema, model } = mongoose;

const NeighborhoodStatsSchema = new Schema(
  {
    name: String,
    stats: {
      avg_chlorine: Number,
      avg_turbidity: Number,
      avg_coliform: Number,
      avg_e_coli: Number,
      avg_fluoride: Number,
      latest_sample_date: Date,
      sample_count: Number     
    }
  },
  { _id: false }
);

const BoroughStatsSchema = new Schema(
  {
    avg_chlorine: Number,
    avg_turbidity: Number,
    avg_coliform: Number,
    avg_e_coli: Number,
    avg_fluoride: Number,
    latest_sample_date: Date,
    sample_count: Number    
  },
  { _id: false }
);

const AlertSchema = new Schema({
  alertDescription: String,
  alertTime: Date,
  isResolved: Boolean,
  resolvedTime: Date
});

const boroughSchema = new Schema(
  {
    name: { type: String },
    description: String,
    neighborhoods: { type: [NeighborhoodStatsSchema], default: [] },
    stats: { type: [BoroughStatsSchema], default: [] },
    alerts: { type: [AlertSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

boroughSchema.index({ name: 1 }, { unique: true });

const boroughCollection = model("Borough", boroughSchema);
export default boroughCollection;
