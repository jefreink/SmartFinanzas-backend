const express = require('express');
const { 
  createTransaction, 
  getTransactions, 
  getMonthlyStats, 
  getProjections,
  getTransactionById,
  updateTransaction,
  updateTransactionItems,
  deleteTransaction
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { checkSurvivalRestriction } = require('../middleware/survivalMiddleware');

const router = express.Router();

router.use(protect);

router.get('/projections', getProjections);
router.get('/stats', getMonthlyStats);

router.route('/')
  .get(getTransactions)
  .post(checkSurvivalRestriction, createTransaction);

router.route('/:id')
  .get(getTransactionById)
  .patch(updateTransaction)
  .delete(deleteTransaction);

router.patch('/:id/items', updateTransactionItems);

module.exports = router;
