const express = require('express');
const { 
  getInventory, 
  addItem, 
  updateItem, 
  deleteItem, 
  adjustDays, 
  getAlerts, 
  getShoppingRecommendations,
  getPriceHistory,
  getProductSuggestions,
  getProductImages
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta pública para obtener imágenes de productos comunes
router.get('/product-images/all', getProductImages);

router.use(protect); // Rutas protegidas a partir de aquí

router.route('/')
  .get(getInventory)
  .post(addItem);

router.get('/alerts', getAlerts);
router.get('/shopping-list', getShoppingRecommendations);
router.get('/price-history/:productName', getPriceHistory);
router.get('/product-suggestions', getProductSuggestions);

router.route('/:id')
  .put(updateItem)
  .patch(updateItem)
  .delete(deleteItem);

router.patch('/:id/adjust-days', adjustDays);

module.exports = router;
