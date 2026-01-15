/**
 * Rutas de Modo Supervivencia
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSurvivalStatus,
  manualActivate,
  manualDeactivate,
  checkAndUpdate,
  getSuggestions
} = require('../controllers/survivalController');

// Todas las rutas requieren autenticación
router.use(protect);

// @route   GET /api/survival/status
// @desc    Obtener estado actual del modo supervivencia
// @access  Private
router.get('/status', getSurvivalStatus);

// @route   POST /api/survival/activate
// @desc    Activar manualmente el modo supervivencia
// @access  Private
router.post('/activate', manualActivate);

// @route   POST /api/survival/deactivate
// @desc    Desactivar manualmente el modo supervivencia
// @access  Private
router.post('/deactivate', manualDeactivate);

// @route   POST /api/survival/check
// @desc    Verificar y actualizar automáticamente
// @access  Private
router.post('/check', checkAndUpdate);

// @route   GET /api/survival/suggestions
// @desc    Obtener sugerencias de supervivencia
// @access  Private
router.get('/suggestions', getSuggestions);

module.exports = router;
