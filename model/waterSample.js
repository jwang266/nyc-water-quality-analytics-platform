import mongoose from "mongoose";

const { Schema, model } = mongoose;

const waterSampleSchema = new Schema(
  {
    sample_number: { type: String, required: true, trim: true },
    sample_date: Date,
    sample_time: String,
    sample_site: String,
    sample_class: String,
    residual_free_chlorine_mg_l: Number,
    turbidity_ntu: Number,
    coliform_quanti_tray_mpn_100ml: Number,
    e_coli_quanti_tray_mpn_100ml: Number,
    fluoride_mg_l: Number
  },
  { timestamps: true, versionKey: false }
);

waterSampleSchema.index({ sample_number: 1 }, { unique: true });
waterSampleSchema.index({ sample_site: 1 });
waterSampleSchema.index({ sample_date: -1 });

const waterSampleCollection = model("WaterSample", waterSampleSchema);
export default waterSampleCollection;
