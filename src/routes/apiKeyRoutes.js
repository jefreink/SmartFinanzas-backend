const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');

/**
 * Rutas para gestionar API keys
 * Nota: Agrega protección de autenticación según tu sistema
 */

// Obtener información de una API key específica (sin mostrar la key)
router.get('/:service', apiKeyController.getApiKeyInfo);

// Listar todas las API keys configuradas
router.get('/', apiKeyController.listAllApiKeys);

// Actualizar o crear una nueva API key
router.post('/update', apiKeyController.updateApiKey);

// Desactivar una API key
router.post('/:service/deactivate', apiKeyController.deactivateApiKey);

// Verificar si existe una API key activa
router.get('/:service/check', apiKeyController.checkApiKey);

module.exports = router;
