import mongoose, { InferSchemaType, Schema, model } from "mongoose";

const NeighborhoodStatsSchema = new Schema(
  {
    name: { type: String },
    stats: {
      avg_chlorine: { type: Number },
      avg_turbidity: { type: Number },
      avg_coliform: { type: Number },
      avg_e_coli: { type: Number },
      avg_fluoride: { type: Number },
      latest_sample_date: { type: Date },
      sample_count: { type: Number }
    }
  },
  { _id: false }
);

const BoroughStatsSchema = new Schema(
  {
    avg_chlorine: { type: Number },
    avg_turbidity: { type: Number },
    avg_coliform: { type: Number },
    avg_e_coli: { type: Number },
    avg_fluoride: { type: Number },
    latest_sample_date: { type: Date },
    sample_count: { type: Number }
  },
  { _id: false }
);

const AlertSchema = new Schema(
  {
    alertDescription: { type: String },
    alertTime: { type: Date },
    isResolved: { type: Boolean },
    resolvedTime: { type: Date }
  },
  { _id: false }  // disable _id
);

const boroughSchema = new Schema(
  {
    name: { type: String },
    description: { type: String },
    neighborhoods: { type: [NeighborhoodStatsSchema], default: [] },
    stats: { type: [BoroughStatsSchema], default: [] },
    alerts: { type: [AlertSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

boroughSchema.index({ name: 1 }, { unique: true });

export type Borough = InferSchemaType<typeof boroughSchema>;  // inferred from schema to prevent type drift

const boroughCollection = model("Borough", boroughSchema);
export default boroughCollection;
