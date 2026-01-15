/**
 * Sistema de Alertas de Inventario
 * Detecta productos próximos a vencer y genera alertas inteligentes
 */

const Inventory = require('../models/Inventory');

/**
 * Verifica el estado del inventario y genera alertas
 * @param {String} userId - ID del usuario
 * @returns {Object} Objeto con alertas categorizadas
 */
const checkInventoryAlerts = async (userId) => {
  try {
    const inventory = await Inventory.find({ 
      user: userId, 
      status: { $ne: 'consumed' } 
    });

    const alerts = {
      critical: [],
      warning: [],
      expired: [],
      suggestions: []
    };

    const today = new Date();

    inventory.forEach(item => {
      // Calcular días restantes
      let daysLeft = null;
      
      if (item.expiryDate) {
        const diff = new Date(item.expiryDate) - today;
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      } else if (item.purchaseDate && item.estimatedLifeDays) {
        const purchase = new Date(item.purchaseDate);
        const expiration = new Date(purchase);
        expiration.setDate(purchase.getDate() + item.estimatedLifeDays);
        const diff = expiration - today;
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      if (daysLeft !== null) {
        if (daysLeft < 0) {
          alerts.expired.push({
            id: item._id,
            name: item.name,
            daysOverdue: Math.abs(daysLeft),
            message: `${item.name} venció hace ${Math.abs(daysLeft)} día(s)`
          });
        } else if (daysLeft <= 2) {
          alerts.critical.push({
            id: item._id,
            name: item.name,
            daysLeft,
            message: `¡${item.name} vence en ${daysLeft} día(s)! Consúmelo pronto.`
          });
        } else if (daysLeft <= 5) {
          alerts.warning.push({
            id: item._id,
            name: item.name,
            daysLeft,
            message: `${item.name} vence en ${daysLeft} días`
          });
        }
      }
    });

    // Generar sugerencias inteligentes
    if (alerts.critical.length > 2) {
      alerts.suggestions.push({
        type: 'batch-cooking',
        message: `Tienes ${alerts.critical.length} productos críticos. ¿Preparar una comida grande?`
      });
    }

    if (alerts.expired.length > 0) {
      alerts.suggestions.push({
        type: 'waste-alert',
        message: `${alerts.expired.length} producto(s) vencido(s). Revisa tu despensa.`
      });
    }

    return {
      success: true,
      summary: {
        total: inventory.length,
        critical: alerts.critical.length,
        warning: alerts.warning.length,
        expired: alerts.expired.length
      },
      alerts
    };

  } catch (error) {
    console.error('Error checking inventory alerts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Genera recomendaciones de compra basadas en consumo reciente
 * @param {String} userId - ID del usuario
 * @returns {Array} Lista de productos recomendados
 */
const generateShoppingRecommendations = async (userId) => {
  try {
    // Obtener productos consumidos en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const consumedItems = await Inventory.find({
      user: userId,
      status: 'consumed',
      updatedAt: { $gte: thirtyDaysAgo }
    });

    // Agrupar por nombre y contar frecuencia
    const frequencyMap = {};
    
    consumedItems.forEach(item => {
      const name = item.name.toLowerCase();
      if (!frequencyMap[name]) {
        frequencyMap[name] = {
          name: item.name,
          count: 0,
          lastPurchase: item.purchaseDate,
          category: item.category
        };
      }
      frequencyMap[name].count++;
      
      // Actualizar última compra si es más reciente
      if (new Date(item.purchaseDate) > new Date(frequencyMap[name].lastPurchase)) {
        frequencyMap[name].lastPurchase = item.purchaseDate;
      }
    });

    // Convertir a array y ordenar por frecuencia
    const recommendations = Object.values(frequencyMap)
      .filter(item => item.count >= 2) // Solo productos comprados 2+ veces
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10
      .map(item => ({
        name: item.name,
        frequency: item.count,
        lastPurchased: item.lastPurchase,
        category: item.category,
        suggestion: `Compras ${item.name} frecuentemente (${item.count}x últimos 30 días)`
      }));

    return {
      success: true,
      count: recommendations.length,
      recommendations
    };

  } catch (error) {
    console.error('Error generating shopping recommendations:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  checkInventoryAlerts,
  generateShoppingRecommendations
};
