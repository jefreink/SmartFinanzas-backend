const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
    id: String, // 'first_investment', 'savings_streak_3'
    name: String,
    description: String,
    icon: String, // emoji or url
    earnedAt: { type: Date, default: Date.now }
});

const GamificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 0 }, // Daily log streak
    lastActivityDate: { type: Date },
    badges: [BadgeSchema],
    achievements: {
        totalSavings: { type: Number, default: 0 },
        goalsCompleted: { type: Number, default: 0 },
        ideasImplemented: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Level calculation logic
GamificationSchema.methods.calculateLevel = function () {
    // Simple formula: Level = sqrt(points / 100)
    const newLevel = Math.floor(Math.sqrt(this.points / 100)) + 1;
    if (newLevel > this.level) {
        this.level = newLevel;
        return true; // Leveled up
    }
    return false;
};

module.exports = mongoose.model('Gamification', GamificationSchema);
