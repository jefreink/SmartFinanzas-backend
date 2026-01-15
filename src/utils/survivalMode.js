/**
 * Survival Mode Utilities
 * Detecta y gestiona el modo supervivencia cuando el dinero libre es crítico
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Categorías bloqueadas en modo supervivencia
 */
const BLOCKED_CATEGORIES = [
  'Entretenimiento',
  'Streaming',
  'Suscripciones',
  'Restaurante',
  'Bar',
  'Viajes',
  'Lujo',
  'Ocio',
  'Compras Online',
  'Ropa',
  'Tecnología',
  'Delivery'
];

/**
 * Categorías esenciales permitidas siempre
 */
const ESSENTIAL_CATEGORIES = [
  'Supermercado',
  'Salud',
  'Educación',
  'Transporte',
  'Servicios Básicos',
  'Vivienda'
];

/**
 * Verifica si el usuario debe entrar en modo supervivencia
 * @param {String} userId - ID del usuario
 * @returns {Object} { shouldActivate, stats }
 */
const checkSurvivalMode = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    // Obtener ingresos del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Calcular ingresos totales del mes
    const incomeTransactions = await Transaction.find({
      user: userId,
      type: 'income',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

    // Calcular gastos totales del mes
    const expenseTransactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

    // Calcular dinero libre
    const freeMoney = totalIncome - totalExpenses;

    // Umbral: 10% del ingreso mensual o $50, lo que sea mayor
    const threshold = Math.max(totalIncome * 0.1, 50);

    // Calcular porcentaje restante
    const remainingPercentage = totalIncome > 0 ? (freeMoney / totalIncome) * 100 : 0;

    // Determinar nivel de criticidad
    let level = 'safe';
    let shouldActivate = false;

    if (freeMoney <= 0 && totalIncome > 0) {
      level = 'critical';
      shouldActivate = true;
    } else if ((freeMoney < threshold) && totalIncome > 0) {
      level = 'warning';
      shouldActivate = true;
    } else if ((remainingPercentage < 20) && totalIncome > 0) {
      level = 'caution';
      shouldActivate = false; // Solo advertencia, no bloqueo
    }

    // Calcular días restantes del mes
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - today.getDate();

    // Calcular presupuesto diario restante
    const dailyBudget = daysRemaining > 0 ? freeMoney / daysRemaining : 0;

    return {
      shouldActivate,
      level,
      stats: {
        freeMoney,
        totalIncome,
        totalExpenses,
        remainingPercentage: remainingPercentage.toFixed(1),
        threshold,
        daysRemaining,
        dailyBudget: Math.max(0, dailyBudget)
      }
    };
  } catch (error) {
    console.error('Error checking survival mode:', error);
    throw error;
  }
};

/**
 * Activa el modo supervivencia para un usuario
 * @param {String} userId - ID del usuario
 * @returns {Object} Usuario actualizado
 */
const activateSurvivalMode = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isSurvivalMode: true,
        survivalModeActivatedAt: new Date()
      },
      { new: true }
    );

    return user;
  } catch (error) {
    console.error('Error activating survival mode:', error);
    throw error;
  }
};

/**
 * Desactiva el modo supervivencia para un usuario
 * @param {String} userId - ID del usuario
 * @returns {Object} Usuario actualizado
 */
const deactivateSurvivalMode = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isSurvivalMode: false,
        survivalModeDeactivatedAt: new Date()
      },
      { new: true }
    );

    return user;
  } catch (error) {
    console.error('Error deactivating survival mode:', error);
    throw error;
  }
};

/**
 * Verifica si una categoría está bloqueada en modo supervivencia
 * @param {String} category - Categoría a verificar
 * @returns {Boolean}
 */
const isCategoryBlocked = (category) => {
  return BLOCKED_CATEGORIES.includes(category);
};

/**
 * Verifica si una categoría es esencial (siempre permitida)
 * @param {String} category - Categoría a verificar
 * @returns {Boolean}
 */
const isEssentialCategory = (category) => {
  return ESSENTIAL_CATEGORIES.includes(category);
};

/**
 * Genera mensaje motivacional según el nivel de criticidad
 * @param {String} level - Nivel de criticidad (critical, warning, caution, safe)
 * @param {Number} daysRemaining - Días restantes del mes
 * @returns {String}
 */
const getMotivationalMessage = (level, daysRemaining) => {
  const messages = {
    critical: [
      `🚨 Modo Supervivencia activado. Solo gastos esenciales por ${daysRemaining} días más.`,
      `🛡️ Protegiendo tu bolsillo. Enfócate en lo necesario hasta fin de mes.`,
      `⚠️ Alerta crítica: Solo permite gastos básicos para llegar a fin de mes.`
    ],
    warning: [
      `⚡ Estás en zona de riesgo. Reduce gastos innecesarios por ${daysRemaining} días.`,
      `💡 Casi en supervivencia. Prioriza lo importante hasta el próximo ingreso.`,
      `🔔 Advertencia: Tu dinero libre está bajo. Modo cauteloso activado.`
    ],
    caution: [
      `👀 Ojo: Tu presupuesto se está ajustando. Compra con consciencia.`,
      `💭 Reflexiona antes de gastar. Quedan ${daysRemaining} días del mes.`,
      `🎯 Estás en terreno sensible. Cada gasto cuenta ahora.`
    ],
    safe: [
      `✅ Todo bajo control. Sigue administrando sabiamente.`,
      `🌟 Buen ritmo financiero. Mantén el equilibrio.`,
      `💚 Zona segura. Continúa con tus hábitos actuales.`
    ]
  };

  const levelMessages = messages[level] || messages.safe;
  return levelMessages[Math.floor(Math.random() * levelMessages.length)];
};

/**
 * Obtiene sugerencias de supervivencia personalizadas
 * @param {Object} user - Usuario
 * @param {Object} stats - Estadísticas de supervivencia
 * @returns {Array} Lista de sugerencias
 */
const getSurvivalSuggestions = (user, stats) => {
  const suggestions = [];

  if (stats.dailyBudget < 20) {
    suggestions.push({
      icon: '🍳',
      title: 'Cocina en casa',
      description: `Con $${stats.dailyBudget.toFixed(0)} al día, cada comida casera cuenta.`
    });
  }

  if (stats.daysRemaining > 7) {
    suggestions.push({
      icon: '💡',
      title: 'Revisa suscripciones',
      description: 'Cancela servicios no esenciales temporalmente.'
    });
  }

  suggestions.push({
    icon: '🚶',
    title: 'Transporte alternativo',
    description: 'Considera caminar o usar bici para distancias cortas.'
  });

  suggestions.push({
    icon: '💰',
    title: 'Busca ingresos extra',
    description: 'Revisa el Generador de Prosperidad para ideas rápidas.'
  });

  if (stats.freeMoney > 0) {
    suggestions.push({
      icon: '📊',
      title: 'Presupuesto diario',
      description: `Máximo $${stats.dailyBudget.toFixed(0)} por día hasta fin de mes.`
    });
  }

  return suggestions;
};

/**
 * Verifica y actualiza automáticamente el modo supervivencia
 * @param {String} userId - ID del usuario
 * @returns {Object} Estado actualizado
 */
const autoUpdateSurvivalMode = async (userId) => {
  try {
    const check = await checkSurvivalMode(userId);
    const user = await User.findById(userId);

    // Activar si debe activarse y no está activo
    if (check.shouldActivate && !user.isSurvivalMode) {
      await activateSurvivalMode(userId);
      return {
        action: 'activated',
        ...check
      };
    }

    // Desactivar si no debe estar activo y lo está
    if (!check.shouldActivate && user.isSurvivalMode && check.level === 'safe') {
      await deactivateSurvivalMode(userId);
      return {
        action: 'deactivated',
        ...check
      };
    }

    return {
      action: 'no_change',
      ...check
    };
  } catch (error) {
    console.error('Error auto-updating survival mode:', error);
    throw error;
  }
};

module.exports = {
  checkSurvivalMode,
  activateSurvivalMode,
  deactivateSurvivalMode,
  isCategoryBlocked,
  isEssentialCategory,
  getMotivationalMessage,
  getSurvivalSuggestions,
  autoUpdateSurvivalMode,
  BLOCKED_CATEGORIES,
  ESSENTIAL_CATEGORIES
};
