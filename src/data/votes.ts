import { voteCollection, boroughCollection } from '../model/index.js';
import { isValidId } from '../helper/helper.js';

function assertValidWeekStart(weekStart: Date): void {
  if (!(weekStart instanceof Date) || Number.isNaN(weekStart.getTime())) {
    throw 'weekStart must be a valid Date';
  }
}

function isDuplicateKeyError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: number }).code === 11000
  );
}

const exportedMethods = {
  async addVote(userId: unknown, boroughId: unknown, weekStart: Date) {
    const validUserId = isValidId(userId);
    const validBoroughId = isValidId(boroughId);
    assertValidWeekStart(weekStart);

    const borough = await boroughCollection.findById(validBoroughId);
    if (!borough) throw 'Borough not found';

    try {
      return await voteCollection.create({
        userId: validUserId,
        boroughId: validBoroughId,
        weekStart
      });
    } catch (e: unknown) {
      if (isDuplicateKeyError(e)) {
        throw 'You have already voted for a borough this week.';
      }
      throw e;
    }
  },

  async getBestBorough(weekStart: Date) {
    assertValidWeekStart(weekStart);

    const agg = await voteCollection.aggregate<{
      _id: unknown;
      count: number;
    }>([
      { $match: { weekStart } },
      { $group: { _id: '$boroughId', count: { $sum: 1 } } },
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

  async getUserVoteForWeek(userId: unknown, weekStart: Date): Promise<string | null> {
    const validUserId = isValidId(userId);
    assertValidWeekStart(weekStart);

    const vote = await voteCollection.findOne({ userId: validUserId, weekStart });
    return vote ? vote.boroughId.toString() : null;
  },

  async getAllBoroughs() {
    return boroughCollection.find({}).lean();
  }
};

export default exportedMethods;
