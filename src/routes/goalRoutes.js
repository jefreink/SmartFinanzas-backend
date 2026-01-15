/**
 * Rutas de Metas (Goals)
 */

const express = require('express');
const {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  addFunds,
  calculateSavingsPlan,
  getGoalsStatistics
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas especiales
router.post('/calculate-plan', calculateSavingsPlan);
router.get('/statistics', getGoalsStatistics);

// CRUD básico
router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/:id')
  .get(getGoal)
  .put(updateGoal)
  .delete(deleteGoal);

// Añadir fondos a una meta
router.post('/:id/add-funds', addFunds);

module.exports = router;
