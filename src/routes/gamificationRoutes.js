const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStats, getLeaderboard } = require('../controllers/gamificationController');

router.use(protect);

router.get('/', getStats);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
