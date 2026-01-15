/**
 * Controlador de Modo Supervivencia
 * Gestiona el estado y estadísticas del modo supervivencia
 */

const {
  checkSurvivalMode,
  activateSurvivalMode,
  deactivateSurvivalMode,
  getMotivationalMessage,
  getSurvivalSuggestions,
  autoUpdateSurvivalMode,
  BLOCKED_CATEGORIES,
  ESSENTIAL_CATEGORIES
} = require('../utils/survivalMode');

/**
 * @desc    Obtener estado del modo supervivencia
 * @route   GET /api/survival/status
 * @access  Private
 */
const getSurvivalStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const check = await checkSurvivalMode(userId);

    // El modo puede estar activo por: activación automática O activación manual del usuario
    const isActive = req.user.isSurvivalMode || check.shouldActivate;

    const message = getMotivationalMessage(check.level, check.stats.daysRemaining);
    const suggestions = getSurvivalSuggestions(req.user, check.stats);

    res.status(200).json({
      success: true,
      data: {
        isActive: isActive,
        level: check.level,
        message,
        stats: check.stats,
        suggestions,
        blockedCategories: BLOCKED_CATEGORIES,
        essentialCategories: ESSENTIAL_CATEGORIES
      }
    });
  } catch (error) {
    console.error('Error getting survival status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de modo supervivencia'
    });
  }
};

/**
 * @desc    Activar manualmente el modo supervivencia
 * @route   POST /api/survival/activate
 * @access  Private
 */
const manualActivate = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await activateSurvivalMode(userId);

    res.status(200).json({
      success: true,
      message: '🚨 Modo Supervivencia activado manualmente',
      data: {
        isSurvivalMode: user.isSurvivalMode,
        activatedAt: user.survivalModeActivatedAt
      }
    });
  } catch (error) {
    console.error('Error activating survival mode:', error);
    res.status(500).json({
      success: false,
      message: 'Error al activar modo supervivencia'
    });
  }
};

/**
 * @desc    Desactivar manualmente el modo supervivencia
 * @route   POST /api/survival/deactivate
 * @access  Private
 */
const manualDeactivate = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await deactivateSurvivalMode(userId);

    res.status(200).json({
      success: true,
      message: '✅ Modo Supervivencia desactivado',
      data: {
        isSurvivalMode: user.isSurvivalMode,
        deactivatedAt: user.survivalModeDeactivatedAt
      }
    });
  } catch (error) {
    console.error('Error deactivating survival mode:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar modo supervivencia'
    });
  }
};

/**
 * @desc    Verificar y actualizar automáticamente el modo supervivencia
 * @route   POST /api/survival/check
 * @access  Private
 */
const checkAndUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await autoUpdateSurvivalMode(userId);

    let message = '';
    if (result.action === 'activated') {
      message = '🚨 Modo Supervivencia activado automáticamente';
    } else if (result.action === 'deactivated') {
      message = '✅ Modo Supervivencia desactivado - Situación mejoró';
    } else {
      message = 'Estado sin cambios';
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        action: result.action,
        isActive: result.shouldActivate,
        level: result.level,
        stats: result.stats
      }
    });
  } catch (error) {
    console.error('Error checking survival mode:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar modo supervivencia'
    });
  }
};

/**
 * @desc    Obtener sugerencias de supervivencia
 * @route   GET /api/survival/suggestions
 * @access  Private
 */
const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const check = await checkSurvivalMode(userId);
    const suggestions = getSurvivalSuggestions(req.user, check.stats);

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sugerencias'
    });
  }
};

module.exports = {
  getSurvivalStatus,
  manualActivate,
  manualDeactivate,
  checkAndUpdate,
  getSuggestions
};
