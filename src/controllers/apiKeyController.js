const apiKeyService = require('../services/apiKeyService');

/**
 * @desc    Obtener información de una API key (sin mostrar la key completa)
 * @route   GET /api/api-key/:service
 * @access  Private/Admin
 */
exports.getApiKeyInfo = async (req, res) => {
  try {
    const { service } = req.params;

    const info = await apiKeyService.getApiKeyInfo(service);

    if (!info) {
      return res.status(404).json({
        success: false,
        error: `API key no encontrada para servicio: ${service}`,
      });
    }

    res.status(200).json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error('❌ Error obteniendo info de API key:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @desc    Listar todas las API keys configuradas (sin mostrar las keys completas)
 * @route   GET /api/api-key
 * @access  Private/Admin
 */
exports.listAllApiKeys = async (req, res) => {
  try {
    const apiKeys = await apiKeyService.listAllApiKeys();

    res.status(200).json({
      success: true,
      data: apiKeys,
      message: `${apiKeys.length} servicio(s) configurado(s)`,
    });
  } catch (error) {
    console.error('❌ Error listando API keys:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @desc    Actualizar o crear una nueva API key
 * @route   POST /api/api-key/update
 * @access  Private/Admin
 * @body    { service, apiKey, description }
 */
exports.updateApiKey = async (req, res) => {
  try {
    const { service, apiKey, description } = req.body;

    if (!service || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'service y apiKey son requeridos',
      });
    }

    const result = await apiKeyService.updateApiKey(
      service,
      apiKey,
      description || '',
      req.user?.email || 'admin' // Si tienes autenticación
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Error actualizando API key:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @desc    Desactivar una API key
 * @route   POST /api/api-key/:service/deactivate
 * @access  Private/Admin
 */
exports.deactivateApiKey = async (req, res) => {
  try {
    const { service } = req.params;

    const result = await apiKeyService.deactivateApiKey(service);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Error desactivando API key:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @desc    Verificar si existe una API key activa
 * @route   GET /api/api-key/:service/check
 * @access  Private
 */
exports.checkApiKey = async (req, res) => {
  try {
    const { service } = req.params;

    const hasKey = await apiKeyService.hasActiveApiKey(service);

    if (!hasKey) {
      return res.status(200).json({
        success: false,
        hasKey: false,
        message: `No hay API key activa para ${service}`,
      });
    }

    res.status(200).json({
      success: true,
      hasKey: true,
      message: `API key activa para ${service}`,
    });
  } catch (error) {
    console.error('❌ Error verificando API key:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
