/**
 * Survival Mode Middleware
 * Bloquea transacciones no esenciales cuando el modo supervivencia está activo
 */

const User = require('../models/User');
const { isCategoryBlocked, isEssentialCategory } = require('../utils/survivalMode');

/**
 * Middleware que verifica si la transacción está permitida en modo supervivencia
 */
const checkSurvivalRestriction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, type } = req.body;

    // Solo aplicar restricciones a gastos
    if (type !== 'expense') {
      return next();
    }

    // Obtener usuario
    const user = await User.findById(userId);

    // Si no está en modo supervivencia, permitir
    if (!user.isSurvivalMode) {
      return next();
    }

    // Si es categoría esencial, permitir siempre
    if (isEssentialCategory(category)) {
      return next();
    }

    // Si es categoría bloqueada, denegar
    if (isCategoryBlocked(category)) {
      return res.status(403).json({
        success: false,
        message: '🚨 Modo Supervivencia Activo',
        details: `No puedes realizar gastos en "${category}" mientras estés en modo supervivencia. Solo se permiten gastos esenciales.`,
        blockedCategory: category,
        survivalMode: true,
        suggestion: 'Intenta con categorías esenciales como Supermercado, Salud o Transporte.'
      });
    }

    // Permitir categorías no bloqueadas explícitamente
    next();
  } catch (error) {
    console.error('Error in survival mode middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar restricciones de modo supervivencia'
    });
  }
};

/**
 * Middleware que advierte si el usuario está cerca del modo supervivencia
 */
const warnNearSurvival = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Si ya está en modo supervivencia, no advertir (ya está bloqueado)
    if (user.isSurvivalMode) {
      return next();
    }

    // Aquí podrías agregar lógica adicional para advertencias
    // Por ahora, solo continuar
    next();
  } catch (error) {
    console.error('Error in near survival warning:', error);
    next(); // No bloquear por errores de advertencia
  }
};

module.exports = {
  checkSurvivalRestriction,
  warnNearSurvival
};
