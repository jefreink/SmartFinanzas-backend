const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const catalogController = require('../controllers/subscriptionCatalogController');

// Todas las rutas requieren autenticación
router.use(authMiddleware.protect);

// GET /api/subscription-catalog - Obtener catálogo
router.get('/', catalogController.getCatalog);

// POST /api/subscription-catalog - Crear item
router.post('/', catalogController.createCatalogItem);

// PATCH /api/subscription-catalog/:id - Actualizar item
router.patch('/:id', catalogController.updateCatalogItem);

// DELETE /api/subscription-catalog/:id - Eliminar item
router.delete('/:id', catalogController.deleteCatalogItem);

// POST /api/subscription-catalog/reorder - Reordenar
router.post('/reorder', catalogController.reorderCatalog);

module.exports = router;
