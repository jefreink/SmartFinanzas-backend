const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const { protect } = require('../middleware/authMiddleware');

// Rutas públicas
router.get('/', currencyController.getAllCurrencies);
router.get('/:code', currencyController.getCurrencyByCode);

// Rutas protegidas (admin)
router.post('/', protect, currencyController.createCurrency);
router.put('/:code', protect, currencyController.updateCurrency);
router.delete('/:code', protect, currencyController.deleteCurrency);

module.exports = router;
