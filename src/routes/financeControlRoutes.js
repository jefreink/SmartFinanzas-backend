/**
 * Finance Control Routes
 * CRUD independiente para control financiero mensual
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCurrentData,
  getHistory,
  updateSalary,
  addItem,
  updateItem,
  deleteItem,
  updateLastMonth,
  resetMonth,
  getCategories,
  addCategory,
  deleteCategory
} = require('../controllers/financeControlController');

router.use(protect);

router.get('/current', getCurrentData);
router.get('/history', getHistory);
router.put('/salary', updateSalary);
router.post('/items', addItem);
router.put('/items/:itemId', updateItem);
router.delete('/items/:itemId', deleteItem);
router.put('/last-month', updateLastMonth);
router.delete('/reset', resetMonth);
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.delete('/categories/:categoryId', deleteCategory);

module.exports = router;
