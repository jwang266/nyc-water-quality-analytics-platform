import { Schema, model } from "mongoose";
const waterSampleSchema = new Schema({
    sample_number: { type: String, required: true, trim: true },
    sample_date: { type: Date },
    sample_time: { type: String },
    sample_site: { type: String },
    sample_class: { type: String },
    residual_free_chlorine_mg_l: { type: Number },
    turbidity_ntu: { type: Number },
    coliform_quanti_tray_mpn_100ml: { type: Number },
    e_coli_quanti_tray_mpn_100ml: { type: Number },
    fluoride_mg_l: { type: Number }
}, { timestamps: true, versionKey: false });
waterSampleSchema.index({ sample_number: 1 }, { unique: true });
waterSampleSchema.index({ sample_site: 1 });
waterSampleSchema.index({ sample_date: -1 });
const waterSampleCollection = model("WaterSample", waterSampleSchema);
export default waterSampleCollection;
