/**
 * Analytics Routes
 * Rutas para análisis avanzados y estadísticas
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getOpportunityCostInsights,
  getEquivalences,
  getCategoryAnalysis,
  getSpendingTrends,
  getMoodSpendingAnalysis,
  getMonthlyWrap
} = require('../controllers/analyticsController');

// Proteger todas las rutas
router.use(protect);

// GET /api/analytics/opportunity-cost - Obtener insights de costo de oportunidad
router.get('/opportunity-cost', getOpportunityCostInsights);

// GET /api/analytics/equivalences/:amount - Obtener equivalencias para un monto
router.get('/equivalences/:amount', getEquivalences);

// GET /api/analytics/category-analysis - Análisis por categoría
router.get('/category-analysis', getCategoryAnalysis);

// GET /api/analytics/spending-trends - Tendencias de gasto
router.get('/spending-trends', getSpendingTrends);

// GET /api/analytics/mood-spending - Análisis de mood vs gasto
router.get('/mood-spending', getMoodSpendingAnalysis);

// GET /api/analytics/monthly-wrap - Resumen mensual estilo Wrap
router.get('/monthly-wrap', getMonthlyWrap);

module.exports = router;
