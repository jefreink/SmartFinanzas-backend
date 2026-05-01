const ApiKeyConfig = require('../models/ApiKeyConfig');

/**
 * Servicio para gestionar API keys de terceros
 * Mantiene las keys de forma segura en la base de datos
 */

/**
 * Obtener la API key de un servicio específico
 * @param {string} service - Nombre del servicio (gemini, openai, etc)
 * @returns {Promise<string|null>} La API key o null si no existe
 */
exports.getApiKey = async (service) => {
  try {
    const config = await ApiKeyConfig.findOne({
      service: service.toLowerCase(),
      isActive: true,
    });

    if (!config) {
      console.warn(`⚠️ API key no encontrada para servicio: ${service}`);
      return null;
    }

    return config.apiKey;
  } catch (error) {
    console.error(`❌ Error obteniendo API key para ${service}:`, error.message);
    return null;
  }
};

/**
 * Guardar o actualizar la API key de un servicio
 * @param {string} service - Nombre del servicio
 * @param {string} apiKey - La nueva API key
 * @param {string} description - Descripción opcional
 * @param {string} updatedBy - Usuario que actualiza (opcional)
 * @returns {Promise<Object>} El documento actualizado
 */
exports.updateApiKey = async (service, apiKey, description = '', updatedBy = 'system') => {
  try {
    if (!service || !apiKey) {
      throw new Error('service y apiKey son requeridos');
    }

    if (apiKey.trim().length === 0) {
      throw new Error('La API key no puede estar vacía');
    }

    // Buscar y actualizar o crear
    const config = await ApiKeyConfig.findOneAndUpdate(
      { service: service.toLowerCase() },
      {
        service: service.toLowerCase(),
        apiKey: apiKey.trim(),
        description,
        lastUpdated: new Date(),
        updatedBy,
        isActive: true,
      },
      {
        new: true, // Retornar documento actualizado
        upsert: true, // Crear si no existe
      }
    );

    console.log(`✅ API key actualizada para servicio: ${service}`);

    return {
      success: true,
      service: config.service,
      lastUpdated: config.lastUpdated,
      message: `API key para ${service} actualizada correctamente`,
    };
  } catch (error) {
    console.error(`❌ Error actualizando API key para ${service}:`, error.message);
    throw error;
  }
};

/**
 * Obtener información de una API key (sin mostrar la key completa)
 * @param {string} service - Nombre del servicio
 * @returns {Promise<Object|null>} Información de la key sin la key misma
 */
exports.getApiKeyInfo = async (service) => {
  try {
    const config = await ApiKeyConfig.findOne({
      service: service.toLowerCase(),
    });

    if (!config) {
      return null;
    }

    // Retornar información sin exponer la key completa
    return {
      service: config.service,
      isActive: config.isActive,
      description: config.description,
      lastUpdated: config.lastUpdated,
      updatedBy: config.updatedBy,
      keyPreview: `${config.apiKey.substring(0, 4)}...${config.apiKey.substring(
        config.apiKey.length - 4
      )}`,
    };
  } catch (error) {
    console.error(`❌ Error obteniendo info de API key para ${service}:`, error.message);
    return null;
  }
};

/**
 * Listar todas las API keys configuradas (sin mostrar las keys completas)
 * @returns {Promise<Array>} Array de configuraciones sin keys expuestas
 */
exports.listAllApiKeys = async () => {
  try {
    const configs = await ApiKeyConfig.find({});

    return configs.map((config) => ({
      service: config.service,
      isActive: config.isActive,
      description: config.description,
      lastUpdated: config.lastUpdated,
      updatedBy: config.updatedBy,
      keyPreview: `${config.apiKey.substring(0, 4)}...${config.apiKey.substring(
        config.apiKey.length - 4
      )}`,
    }));
  } catch (error) {
    console.error('❌ Error listando API keys:', error.message);
    return [];
  }
};

/**
 * Desactivar una API key
 * @param {string} service - Nombre del servicio
 * @returns {Promise<Object>}
 */
exports.deactivateApiKey = async (service) => {
  try {
    const config = await ApiKeyConfig.findOneAndUpdate(
      { service: service.toLowerCase() },
      { isActive: false, lastUpdated: new Date() },
      { new: true }
    );

    if (!config) {
      throw new Error(`API key no encontrada para servicio: ${service}`);
    }

    console.log(`✅ API key desactivada para servicio: ${service}`);

    return {
      success: true,
      message: `API key para ${service} desactivada correctamente`,
    };
  } catch (error) {
    console.error(`❌ Error desactivando API key para ${service}:`, error.message);
    throw error;
  }
};

/**
 * Verificar si existe una API key activa para un servicio
 * @param {string} service - Nombre del servicio
 * @returns {Promise<boolean>}
 */
exports.hasActiveApiKey = async (service) => {
  try {
    const config = await ApiKeyConfig.findOne({
      service: service.toLowerCase(),
      isActive: true,
    });

    return !!config;
  } catch (error) {
    console.error(`❌ Error verificando API key para ${service}:`, error.message);
    return false;
  }
};
