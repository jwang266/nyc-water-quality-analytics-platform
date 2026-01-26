import { sampleSiteCollection, waterSampleCollection } from '../model/index.js';
import { validateSampleSiteFormat } from './sampleSitedataHelper.js';
import { checkString } from './helper.js';
export const isValidSample_number = async (sample_number) => {
    sample_number = validateSampleNumFormat(sample_number);
    const existing = await waterSampleCollection.findOne({ sample_number });
    if (existing) {
        throw "Duplicate sample number found!";
    }
    return sample_number;
};
export const validateSampleNumFormat = (sample_number) => {
    sample_number = checkString(sample_number, "sample_number");
    if (!/^\d+$/.test(sample_number)) {
        throw "sample_number must contain only digits";
    }
    if (sample_number.length < 5 || sample_number.length > 12) {
        throw "sample_number must be between 5 and 12 digits long";
    }
    return sample_number;
};
export const isValidSample_date = (sample_date) => {
    sample_date = checkString(sample_date, "sample_date");
    if (!/^\d{4}-\d{2}-\d{2}T/.test(sample_date)) {
        throw "sample_date must be ISO format (YYYY-MM-DDTHH:MM:SS.mmm)";
    }
    const parsedDate = new Date(sample_date);
    if (isNaN(parsedDate.getTime())) {
        throw "sample_date is not a valid date";
    }
    const MIN_DATE = new Date("2015-01-01T00:00:00.000");
    const now = new Date();
    const YESTERDAY = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (parsedDate < MIN_DATE) {
        throw "sample_date cannot be before 2015-01-01";
    }
    if (parsedDate > YESTERDAY) {
        throw "sample_date cannot be after yesterday";
    }
    return sample_date;
};
export const isValidSample_time = (sample_time) => {
    sample_time = checkString(sample_time, "sample_time");
    const validFormat = /^(\d{1,2}:\d{2}(:\d{2})?(\.\d+)?)/;
    if (!validFormat.test(sample_time)) {
        throw "sample_time must be in HH:MM, HH:MM.SSS, or HH:MM:SS.mmm format";
    }
    return sample_time;
};
export const isValidSample_class = (sample_class) => {
    sample_class = checkString(sample_class, "sample_class");
    const allowed = [
        "Compliance",
        "Operational",
        "Op-resample",
        "Resample_Compliance",
        "Resample_Operational"
    ];
    if (!allowed.includes(sample_class)) {
        throw `sample_class must be one of: ${allowed.join(", ")}`;
    }
    return sample_class;
};
export const isValidWS_Sample_site = async (sample_site) => {
    sample_site = validateSampleSiteFormat(sample_site);
    const exists = await sampleSiteCollection.findOne({ sample_site });
    if (!exists) {
        throw "Sample Site not found!";
    }
    return sample_site;
};
function parseNumericField(value, fieldName, allowNull = false) {
    if (value === undefined || value === null) {
        if (allowNull)
            return null;
        throw new Error(`${fieldName} cannot be null or undefined`);
    }
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        value = value.trim();
        if (value === "") {
            if (allowNull)
                return null;
            throw new Error(`${fieldName} cannot be empty`);
        }
        if (value === "<1")
            return 0;
        if (value.startsWith("<") || value.startsWith(">")) {
            const num = Number(value.slice(1));
            if (isNaN(num))
                throw new Error(`${fieldName} invalid value: ${value}`);
            return num;
        }
        const num = Number(value);
        if (!isNaN(num))
            return num;
        throw new Error(`${fieldName} must be a valid number or a string like '<1' or '>200'`);
    }
    throw new Error(`${fieldName} must be a number or a string`);
}
export const isValidResidual_free_chlorine_mg_l = (residual_free_chlorine_mg_l) => {
    const num = parseNumericField(residual_free_chlorine_mg_l, "residual_free_chlorine_mg_l");
    if (num < 0 || num > 4)
        throw "residual_free_chlorine_mg_l must be between 0 and 4 mg/L";
    return num;
};
export const isValidTurbidity_ntu = (turbidity_ntu) => {
    const num = parseNumericField(turbidity_ntu, "turbidity_ntu");
    if (num < 0 || num > 50)
        throw "turbidity_ntu must be between 0 and 50 NTU";
    return num;
};
export const isValidColiform_quanti_tray_mpn_100ml = (val) => {
    const num = parseNumericField(val, "coliform_quanti_tray_mpn_100ml", true);
    if (num < 0 || num > 1000)
        throw "coliform_quanti_tray_mpn_100ml must be between 0 and 1000";
    return num;
};
export const isValidE_coli_quanti_tray_mpn_100ml = (val) => {
    const num = parseNumericField(val, "e_coli_quanti_tray_mpn_100ml", true);
    if (num < 0 || num > 4)
        throw "e_coli_quanti_tray_mpn_100ml must be between 0 and 4";
    return num;
};
export const isValidFluoride_mg_l = (fluoride) => {
    const num = parseNumericField(fluoride, "fluoride_mg_l", true);
    if (num < 0 || num > 4)
        throw "fluoride_mg_l must be between 0 and 4 mg/L";
    return num;
};
export const isValidWaterSampleData = async ({ sample_number, sample_date, sample_time, sample_site, sample_class, residual_free_chlorine_mg_l, turbidity_ntu, coliform_quanti_tray_mpn_100ml, e_coli_quanti_tray_mpn_100ml, fluoride_mg_l }) => {
    return {
        sample_number: await isValidSample_number(sample_number),
        sample_date: isValidSample_date(sample_date),
        sample_time: isValidSample_time(sample_time),
        sample_site: await isValidWS_Sample_site(sample_site),
        sample_class: isValidSample_class(sample_class),
        residual_free_chlorine_mg_l: isValidResidual_free_chlorine_mg_l(residual_free_chlorine_mg_l),
        turbidity_ntu: isValidTurbidity_ntu(turbidity_ntu),
        coliform_quanti_tray_mpn_100ml: isValidColiform_quanti_tray_mpn_100ml(coliform_quanti_tray_mpn_100ml),
        e_coli_quanti_tray_mpn_100ml: isValidE_coli_quanti_tray_mpn_100ml(e_coli_quanti_tray_mpn_100ml),
        fluoride_mg_l: isValidFluoride_mg_l(fluoride_mg_l)
    };
};
