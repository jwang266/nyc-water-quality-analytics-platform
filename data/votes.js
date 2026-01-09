import { voteCollection, boroughCollection } from "../model/index.js";
import { isValidId } from "../helper/helper.js";

const exportedMethods = {
  async addVote(userId, boroughId, weekStart) {
    userId = isValidId(userId);
    boroughId = isValidId(boroughId);

    if (!(weekStart instanceof Date) || Number.isNaN(weekStart.getTime())) {
      throw "weekStart must be a valid Date";
    }

    const borough = await boroughCollection.findById(boroughId);
    if (!borough) throw "Borough not found";

    try {
      return await voteCollection.create({
        userId,
        boroughId,
        weekStart
      });
    } catch (e) {
      if (e.code === 11000) {
        throw "You have already voted for a borough this week.";
      }
      throw e;
    }
  },

  async getBestBorough(weekStart) {
    if (!(weekStart instanceof Date) || Number.isNaN(weekStart.getTime())) {
      throw "weekStart must be a valid Date";
    }

    const agg = await voteCollection.aggregate([
      { $match: { weekStart } },
      { $group: { _id: "$boroughId", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 1 }
    ]);

    if (agg.length === 0) return null;

    const borough = await boroughCollection.findById(agg[0]._id);
    if (!borough) return null;

    return {
      name: borough.name,
      description: borough.description,
      voteCount: agg[0].count
    };
  },

  async getUserVoteForWeek(userId, weekStart) {
    userId = isValidId(userId);

    if (!(weekStart instanceof Date) || Number.isNaN(weekStart.getTime())) {
      throw "weekStart must be a valid Date";
    }

    const vote = await voteCollection.findOne({ userId, weekStart });
    return vote ? vote.boroughId.toString() : null;
  },

  async getAllBoroughs() {
    return await boroughCollection.find({}).lean();
  }
};

export default exportedMethods;
