const express = require('express');
const {
  getAllCommonProducts,
  searchCommonProducts,
  getProductsByCategory,
  getCategories,
  getProductImage
} = require('../controllers/commonProductController');

const router = express.Router();

// Rutas públicas (sin autenticación necesaria)

// GET /api/common-products
// Obtener todos los productos comunes
router.get('/', getAllCommonProducts);

// GET /api/common-products/categories
// Obtener todas las categorías disponibles
router.get('/categories', getCategories);

// GET /api/common-products/search?q=cebolla
// Búsqueda inteligente de productos (exacta, keywords, full-text)
router.get('/search', searchCommonProducts);

// GET /api/common-products/category/:category
// Obtener productos de una categoría específica
router.get('/category/:category', getProductsByCategory);

// GET /api/common-products/image?q=cebolla morada
// Obtener imagen de producto por búsqueda
router.get('/image', getProductImage);

module.exports = router;
