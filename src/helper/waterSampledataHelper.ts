import { sampleSiteCollection, waterSampleCollection } from '../model/index.js';
import { validateSampleSiteFormat } from './sampleSitedataHelper.js';
import { checkString } from './helper.js';

export const isValidSample_number = async (sample_number: unknown): Promise<string> => {
  const validatedNum = validateSampleNumFormat(sample_number);
  const existing = await waterSampleCollection.findOne({ sample_number: validatedNum });
  if (existing) {
    throw 'Duplicate sample number found!';
  }
  return validatedNum;
};

export const validateSampleNumFormat = (sample_number: unknown): string => {
  const numStr = checkString(sample_number, 'sample_number');
  if (!/^\d+$/.test(numStr)) {
    throw 'sample_number must contain only digits';
  }
  if (numStr.length < 5 || numStr.length > 12) {
    throw 'sample_number must be between 5 and 12 digits long';
  }
  return numStr;
};

export const isValidSample_date = (sample_date: unknown): string => {
  const dateStr = checkString(sample_date, 'sample_date');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    throw 'sample_date must be ISO format (YYYY-MM-DDTHH:MM:SS.mmm)';
  }
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    throw 'sample_date is not a valid date';
  }
  const minDate = new Date('2015-01-01T00:00:00.000');
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (parsedDate < minDate) {
    throw 'sample_date cannot be before 2015-01-01';
  }
  if (parsedDate > yesterday) {
    throw 'sample_date cannot be after yesterday';
  }
  return dateStr;
};

export const isValidSample_time = (sample_time: unknown): string => {
  const timeStr = checkString(sample_time, 'sample_time');
  const validFormat = /^(\d{1,2}:\d{2}(:\d{2})?(\.\d+)?)/;
  if (!validFormat.test(timeStr)) {
    throw 'sample_time must be in HH:MM, HH:MM.SSS, or HH:MM:SS.mmm format';
  }
  return timeStr;
};

export type SampleClass =
  | 'Compliance'
  | 'Operational'
  | 'Op-resample'
  | 'Resample_Compliance'
  | 'Resample_Operational';

const allowedSampleClasses: SampleClass[] = [
  'Compliance',
  'Operational',
  'Op-resample',
  'Resample_Compliance',
  'Resample_Operational'
];

export const isValidSample_class = (sample_class: unknown): SampleClass => {
  const sampleClassStr = checkString(sample_class, 'sample_class');
  if (!allowedSampleClasses.includes(sampleClassStr as SampleClass)) {
    throw `sample_class must be one of: ${allowedSampleClasses.join(', ')}`;
  }
  return sampleClassStr as SampleClass;
};

export const isValidWS_Sample_site = async (sample_site: unknown): Promise<string> => {
  const validatedSite = validateSampleSiteFormat(sample_site);
  const exists = await sampleSiteCollection.findOne({ sample_site: validatedSite });
  if (!exists) {
    throw 'Sample Site not found!';
  }
  return validatedSite;
};

function parseNumericField(
  value: unknown,
  fieldName: string,
  allowNull = false
): number | null {
  if (value === undefined || value === null) {
    if (allowNull) return null;
    throw new Error(`${fieldName} cannot be null or undefined`);
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '') {
      if (allowNull) return null;
      throw new Error(`${fieldName} cannot be empty`);
    }
    if (v === '<1') return 0;
    if (v.startsWith('<') || v.startsWith('>')) {
      const num = Number(v.slice(1));
      if (isNaN(num)) throw new Error(`${fieldName} invalid value: ${v}`);
      return num;
    }
    const num = Number(v);
    if (!isNaN(num)) return num;
    throw new Error(
      `${fieldName} must be a valid number or a string like '<1' or '>200'`
    );
  }
  throw new Error(`${fieldName} must be a number or a string`);
}

export const isValidResidual_free_chlorine_mg_l = (
  residual_free_chlorine_mg_l: unknown
): number => {
  const num = parseNumericField(residual_free_chlorine_mg_l, 'residual_free_chlorine_mg_l');
  if (num === null || num < 0 || num > 4) {
    throw 'residual_free_chlorine_mg_l must be between 0 and 4 mg/L';
  }
  return num;
};

export const isValidTurbidity_ntu = (turbidity_ntu: unknown): number => {
  const num = parseNumericField(turbidity_ntu, 'turbidity_ntu');
  if (num === null || num < 0 || num > 50) throw 'turbidity_ntu must be between 0 and 50 NTU';
  return num;
};

export const isValidColiform_quanti_tray_mpn_100ml = (val: unknown): number | null => {
  const num = parseNumericField(val, 'coliform_quanti_tray_mpn_100ml', true);
  if (num !== null && (num < 0 || num > 1000)) {
    throw 'coliform_quanti_tray_mpn_100ml must be between 0 and 1000';
  }
  return num;
};

export const isValidE_coli_quanti_tray_mpn_100ml = (val: unknown): number | null => {
  const num = parseNumericField(val, 'e_coli_quanti_tray_mpn_100ml', true);
  if (num !== null && (num < 0 || num > 4)) {
    throw 'e_coli_quanti_tray_mpn_100ml must be between 0 and 4';
  }
  return num;
};

export const isValidFluoride_mg_l = (fluoride: unknown): number | null => {
  const num = parseNumericField(fluoride, 'fluoride_mg_l', true);
  if (num !== null && (num < 0 || num > 4)) {
    throw 'fluoride_mg_l must be between 0 and 4 mg/L';
  }
  return num;
};

export interface RawWaterSampleData {
  sample_number: unknown;
  sample_date: unknown;
  sample_time: unknown;
  sample_site: unknown;
  sample_class: unknown;
  residual_free_chlorine_mg_l: unknown;
  turbidity_ntu: unknown;
  coliform_quanti_tray_mpn_100ml: unknown;
  e_coli_quanti_tray_mpn_100ml: unknown;
  fluoride_mg_l: unknown;
}

export interface ValidatedWaterSampleData {
  sample_number: string;
  sample_date: string;
  sample_time: string;
  sample_site: string;
  sample_class: SampleClass;
  residual_free_chlorine_mg_l: number;
  turbidity_ntu: number;
  coliform_quanti_tray_mpn_100ml: number | null;
  e_coli_quanti_tray_mpn_100ml: number | null;
  fluoride_mg_l: number | null;
}

export const isValidWaterSampleData = async (
  input: RawWaterSampleData
): Promise<ValidatedWaterSampleData> => {
  return {
    sample_number: await isValidSample_number(input.sample_number),
    sample_date: isValidSample_date(input.sample_date),
    sample_time: isValidSample_time(input.sample_time),
    sample_site: await isValidWS_Sample_site(input.sample_site),
    sample_class: isValidSample_class(input.sample_class),
    residual_free_chlorine_mg_l: isValidResidual_free_chlorine_mg_l(
      input.residual_free_chlorine_mg_l
    ),
    turbidity_ntu: isValidTurbidity_ntu(input.turbidity_ntu),
    coliform_quanti_tray_mpn_100ml: isValidColiform_quanti_tray_mpn_100ml(
      input.coliform_quanti_tray_mpn_100ml
    ),
    e_coli_quanti_tray_mpn_100ml: isValidE_coli_quanti_tray_mpn_100ml(
      input.e_coli_quanti_tray_mpn_100ml
    ),
    fluoride_mg_l: isValidFluoride_mg_l(input.fluoride_mg_l)
  };
};
