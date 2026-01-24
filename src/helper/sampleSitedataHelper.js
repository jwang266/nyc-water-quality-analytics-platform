import { sampleSiteCollection } from '../model/index.js';
import { checkString } from './helper.js';

export const isValidSample_site = async (sample_site) => {
  sample_site = validateSampleSiteFormat(sample_site);
  const existing = await sampleSiteCollection.findOne({ sample_site });
  if (existing) {
    throw "Duplicate sample site found!";
  }
  return sample_site;
};

export const validateSampleSiteFormat = (sample_site) => {
  sample_site = checkString(sample_site, "sample_site");
  const regex = /^[A-Z0-9]+$/;
  if (!regex.test(sample_site)) {
    throw `sample_site can only contain capital letters and numbers`;
  }
  return sample_site;
};

export const isValidSample_station = (sample_station) => {
  return checkString(sample_station, "sample_station");
};

export const isValidLatitude = (lat) => {
  if (lat === undefined || lat === null) throw `latitude is required`;
  if (typeof lat === "string") lat = Number(lat);
  if (isNaN(lat)) throw "latitude must be a valid number";
  if (lat < 40.47729800 || lat > 40.91769100)
    throw `latitude must be a valid NYC latitude`;
  return Number(lat.toFixed(8));
};

export const isValidLongitude = (lng) => {
  if (lng === undefined || lng === null) throw `longitude is required`;

  if (typeof lng === "string") lng = Number(lng);
  if (isNaN(lng)) throw "longitude must be a valid number";

  if (lng < -74.26036900 || lng > -73.69920600)
    throw `longitude must be a valid NYC longitude`;

  return Number(lng.toFixed(8));
};

export const isValidBorough = (borough) => {
  borough = checkString(borough, "borough");
  const normalized = borough.toLowerCase();
  const allowedMap = {
    "bronx": "Bronx",
    "brooklyn": "Brooklyn",
    "manhattan": "Manhattan",
    "queens": "Queens",
    "staten island": "Staten Island"
  };
  if (!allowedMap.hasOwnProperty(normalized)) {
    throw `borough must be one of: ${Object.values(allowedMap).join(", ")}`;
  }
  return allowedMap[normalized];
};

export const isValidNeighborhood = (neighborhood) => {
  return checkString(neighborhood, "neighborhood");
};

export const isValidSampleSiteData = async ({ 
  sample_site, 
  sample_station, 
  latitude, 
  longitude, 
  borough, 
  neighborhood 
}) => {
  return {
    sample_site: await isValidSample_site(sample_site),
    sample_station: isValidSample_station(sample_station),
    latitude: isValidLatitude(latitude),
    longitude: isValidLongitude(longitude),
    borough: isValidBorough(borough),
    neighborhood: isValidNeighborhood(neighborhood)
  };
};
