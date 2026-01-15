/**
 * Rutas de Prosperidad (Prosperity)
 */

const express = require('express');
const {
  getIdeas,
  saveIdea,
  dismissIdea,
  getSavedIdeas,
  implementIdea,
  getImplementedIdeas,
  resetViewedIdeas,
  seedIdeas
} = require('../controllers/prosperityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta pública para seed (solo desarrollo)
router.post('/seed', seedIdeas);

// Rutas protegidas
router.use(protect);

router.get('/ideas', getIdeas);
router.post('/save', saveIdea);
router.post('/dismiss', dismissIdea);
router.get('/saved', getSavedIdeas);
router.post('/implement', implementIdea);
router.get('/implemented', getImplementedIdeas);
router.post('/reset', resetViewedIdeas);

module.exports = router;
