import express from 'express';
import mongoose from 'mongoose';
import { voteCollection, boroughCollection, waterSampleCollection, userCollection as User } from '../model/index.js';
import { isValidId, getCurrentWeekStart } from '../helper/helper.js';
import userData from '../data/users.js';
import commentsData from '../data/comments.js';
const router = express.Router();
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'You must be logged in to perform this action.' });
    }
    next();
};
router.get('/', async (req, res) => {
    // Toast: only show once
    let toast = null;
    if (req.session.toast) {
        toast = req.session.toast;
        delete req.session.toast;
    }
    const boroughs = await boroughCollection.find().lean();
    boroughs.forEach(b => {
        if (b.stats && b.stats.length > 0) {
            b.quality = {
                _id: b._id,
                chlorine: b.stats[0].avg_chlorine,
                turbidity: b.stats[0].avg_turbidity
            };
        }
    });
    // Check if the user already voted this week
    let userVoteBoroughId = null;
    if (req.session.user) {
        const userId = req.session.user.id;
        const weekStart = getCurrentWeekStart();
        const existingVote = await voteCollection.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            weekStart
        }).lean();
        if (existingVote)
            userVoteBoroughId = existingVote.boroughId.toString();
    }
    res.render('boroughs', {
        boroughs,
        isAuthenticated: !!req.session.user,
        user: req.session.user || null,
        userVoteBoroughId,
        toast
    });
});
router.get('/:id', async (req, res) => {
    try {
        const boroughId = req.params.id;
        const borough = await boroughCollection.findById(boroughId).lean();
        if (!borough)
            return res.status(404).render('error', { error: 'Borough not found' });
        const samples = await waterSampleCollection
            .find({ boroughId })
            .sort({ sample_date: -1 })
            .lean();
        samples.forEach(s => {
            s.sample_date = s.sample_date
                ? new Date(s.sample_date).toISOString().split('T')[0]
                : 'N/A';
        });
        // Health tips (simple rules, based on averages)
        const GUIDELINES = {
            chlorine: 4.0,
            turbidity: 1,
            coliform: 2,
            ecoli: 0.01,
            fluoride: 2.0
        };
        const tips = [];
        const notices = [];
        const stats = borough?.stats?.[0]; // stats might be missing
        if (stats) {
            if (stats.avg_turbidity > GUIDELINES.turbidity) {
                notices.push('Turbidity');
                tips.push('If you notice cloudiness, consider using a basic water filter for drinking.');
            }
            if (stats.avg_chlorine > GUIDELINES.chlorine) {
                notices.push('Chlorine');
                tips.push('If the taste/smell is strong, letting water sit can reduce chlorine odor.');
            }
            if (stats.avg_coliform > GUIDELINES.coliform) {
                notices.push('Coliform');
                tips.push('For extra caution, follow local public health guidance if advisories are issued.');
            }
            if (stats.avg_e_coli > GUIDELINES.ecoli) {
                notices.push('E. coli');
                tips.push('Avoid making assumptions—check official advisories for recommended actions.');
            }
            if (stats.avg_fluoride > GUIDELINES.fluoride) {
                notices.push('Fluoride');
                tips.push('If you have questions about fluoride levels, check local water quality reports for context.');
            }
        }
        let combinedNotice = null;
        if (notices.length > 0) {
            combinedNotice = `${notices.join(', ')} ${notices.length === 1 ? 'is' : 'are'} above the guideline for this borough.`;
        }
        // *always show something*
        if (tips.length === 0) {
            tips.push('All monitored indicators are within the defined guideline range for this borough.');
        }
        const comments = await commentsData.getCommentsByBorough(boroughId);
        let isLiked = false;
        if (req.session.user) {
            const user = await User.findById(req.session.user.id).select('likedBoroughs').lean();
            if (user && user.likedBoroughs) {
                isLiked = user.likedBoroughs.map(x => x.toString()).includes(boroughId);
            }
        }
        res.render('boroughDetails', {
            borough,
            samples,
            tips,
            combinedNotice,
            hasTips: tips.length > 0,
            comments,
            isLiked,
            isAuthenticated: !!req.session.user,
            user: req.session.user || null
        });
    }
    catch (e) {
        console.error('Borough Details Error:', e);
        res.status(500).render('error', { error: 'Could not load borough details' });
    }
});
router.post('/:id/like', requireAuth, async (req, res) => {
    try {
        const boroughId = req.params.id;
        const userId = req.session.user.id;
        const updatedUser = await userData.toggleLikeBorough(userId, boroughId);
        const isLiked = (updatedUser.likedBoroughs || []).map(x => x.toString()).includes(boroughId);
        res.json({ success: true, isLiked });
    }
    catch (e) {
        res.status(400).json({ error: e.toString() });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const id = isValidId(req.params.id);
        const borough = await boroughCollection.findByIdAndDelete(id);
        if (!borough)
            return res.status(404).json({ error: 'Borough not found' });
        res.json({ deleted: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message || e });
    }
});
export default router;
