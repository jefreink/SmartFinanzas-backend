const Gamification = require('../models/Gamification');
const User = require('../models/User');

// Helper to get or create stats
const getOrCreateStats = async (userId) => {
    let stats = await Gamification.findOne({ user: userId });
    if (!stats) {
        stats = await Gamification.create({ user: userId });
    }
    return stats;
};

exports.getStats = async (req, res) => {
    try {
        const stats = await getOrCreateStats(req.user.id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Gamification.find()
            .sort({ points: -1 })
            .limit(10)
            .populate('user', 'name profileImage');

        res.json({ success: true, data: leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Internal function to add points
exports.addPoints = async (userId, amount, reason) => {
    try {
        const stats = await getOrCreateStats(userId);
        stats.points += amount;

        const leveledUp = stats.calculateLevel();
        if (leveledUp) {
            // Could notify user here (Socket.io or Push)
            console.log(`User ${userId} leveled up to ${stats.level}!`);
        }

        await stats.save();
        return stats;
    } catch (error) {
        console.error('Add points error:', error);
    }
};
