/**
 * Salary Routes
 * Rutas para gestión de sueldos
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSalaries,
  getCurrentSalary,
  createSalary,
  updateSalary,
  deleteSalary
} = require('../controllers/salaryController');

// Proteger todas las rutas
router.use(protect);

router.get('/', getSalaries);
router.get('/current', getCurrentSalary);
router.post('/', createSalary);
router.put('/:id', updateSalary);
router.delete('/:id', deleteSalary);

module.exports = router;
