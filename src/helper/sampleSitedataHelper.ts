import { sampleSiteCollection } from '../model/index.js';
import { checkString } from './helper.js';

export const isValidSample_site = async (sample_site: unknown): Promise<string> => {
  const validSampleSite = validateSampleSiteFormat(sample_site);
  const existing = await sampleSiteCollection.findOne({ sample_site: validSampleSite });
  if (existing) {
    throw 'Duplicate sample site found!';
  }
  return validSampleSite;
};

export const validateSampleSiteFormat = (sample_site: unknown): string => {
  const validSampleSite = checkString(sample_site, 'sample_site');
  const regex = /^[A-Z0-9]+$/;
  if (!regex.test(validSampleSite)) {
    throw 'sample_site can only contain capital letters and numbers';
  }
  return validSampleSite;
};

export const isValidSample_station = (sample_station: unknown): string => {
  return checkString(sample_station, 'sample_station');
};

export const isValidLatitude = (lat: unknown): number => {
  if (lat === undefined || lat === null) throw 'latitude is required';
  let latitude: number;
  if (typeof lat === 'string') {
    latitude = Number(lat);
  } else if (typeof lat === 'number') {
    latitude = lat;
  } else {
    throw 'latitude must be a valid number';
  }
  if (isNaN(latitude)) throw 'latitude must be a valid number';
  if (latitude < 40.477298 || latitude > 40.917691) {
    throw 'latitude must be a valid NYC latitude';
  }
  return Number(latitude.toFixed(8));
};

export const isValidLongitude = (lng: unknown): number => {
  if (lng === undefined || lng === null) throw 'longitude is required';

  let longitude: number;
  if (typeof lng === 'string') {
    longitude = Number(lng);
  } else if (typeof lng === 'number') {
    longitude = lng;
  } else {
    throw 'longitude must be a valid number';
  }
  if (isNaN(longitude)) throw 'longitude must be a valid number';
  if (longitude < -74.260369 || longitude > -73.699206) {
    throw 'longitude must be a valid NYC longitude';
  }

  return Number(longitude.toFixed(8));
};

const allowedBoroughMap = {
  bronx: 'Bronx',
  brooklyn: 'Brooklyn',
  manhattan: 'Manhattan',
  queens: 'Queens',
  'staten island': 'Staten Island'
} as const;

type BoroughKey = keyof typeof allowedBoroughMap;

export const isValidBorough = (borough: unknown): string => {
  const boroughStr = checkString(borough, 'borough');
  const normalized = boroughStr.toLowerCase() as BoroughKey;
  if (!Object.prototype.hasOwnProperty.call(allowedBoroughMap, normalized)) {
    throw `borough must be one of: ${Object.values(allowedBoroughMap).join(', ')}`;
  }
  return allowedBoroughMap[normalized];
};

export const isValidNeighborhood = (neighborhood: unknown): string => {
  return checkString(neighborhood, 'neighborhood');
};

export interface SampleSiteDataInput {
  sample_site: unknown;
  sample_station: unknown;
  latitude: unknown;
  longitude: unknown;
  borough: unknown;
  neighborhood: unknown;
}

export interface ValidSampleSiteData {
  sample_site: string;
  sample_station: string;
  latitude: number;
  longitude: number;
  borough: string;
  neighborhood: string;
}

export const isValidSampleSiteData = async ({
  sample_site,
  sample_station,
  latitude,
  longitude,
  borough,
  neighborhood
}: SampleSiteDataInput): Promise<ValidSampleSiteData> => {
  return {
    sample_site: await isValidSample_site(sample_site),
    sample_station: isValidSample_station(sample_station),
    latitude: isValidLatitude(latitude),
    longitude: isValidLongitude(longitude),
    borough: isValidBorough(borough),
    neighborhood: isValidNeighborhood(neighborhood)
  };
};
