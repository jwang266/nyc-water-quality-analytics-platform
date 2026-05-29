import { sampleSiteCollection } from '../model/index.js';
import * as helpFun from '../helper/sampleSitedataHelper.js';
import { isValidId } from '../helper/helper.js';
import type { ValidSampleSiteData } from '../helper/sampleSitedataHelper.js';

export const createSampleSite = async (sampleSiteObj: helpFun.SampleSiteDataInput) => {
  const validatedData: ValidSampleSiteData = await helpFun.isValidSampleSiteData(sampleSiteObj);
  const newSite = new sampleSiteCollection(validatedData);
  const savedSite = await newSite.save();

  const result = savedSite.toObject();
  return { ...result, _id: result._id.toString() };
};

export const getAllSampleSites = async () => {
  const sites = await sampleSiteCollection.find({}).lean();
  if (!sites) throw 'Could not get all sample sites!';

  return sites.map((site) => ({
    ...site,
    _id: site._id.toString()
  }));
};

export const getSampleSiteById = async (id: unknown) => {
  const validId = isValidId(id);

  const site = await sampleSiteCollection.findById(validId).lean();
  if (!site) throw 'No sample site with that id!';

  return { ...site, _id: site._id.toString() };
};

export const getSampleSiteByNum = async (ssNum: unknown) => {
  const validNum = helpFun.validateSampleSiteFormat(ssNum);

  const site = await sampleSiteCollection.findOne({ sample_site: validNum }).lean();

  if (!site) throw 'No sample site with that number!';

  return { ...site, _id: site._id.toString() };
};
