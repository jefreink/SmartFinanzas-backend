/**
 * Finance Control Routes
 * CRUD independiente para control financiero mensual
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCurrentData,
  updateSalary,
  addItem,
  updateItem,
  deleteItem,
  updateLastMonth,
  resetMonth
} = require('../controllers/financeControlController');

router.use(protect);

router.get('/current', getCurrentData);
router.put('/salary', updateSalary);
router.post('/items', addItem);
router.put('/items/:itemId', updateItem);
router.delete('/items/:itemId', deleteItem);
router.put('/last-month', updateLastMonth);
router.delete('/reset', resetMonth);

module.exports = router;
