const express = require('express');
const { getFinancialSummary, getDashboardData } = require('../controllers/financeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/summary', getFinancialSummary);
router.get('/dashboard', getDashboardData);

module.exports = router;
