/**
 * Planificador de Ahorro (Savings Planner)
 * Calcula planes de ahorro realistas basados en metas y plazos
 */

/**
 * Calcula un plan de ahorro detallado para una meta
 * @param {Object} goal - Objeto con información de la meta
 * @param {Number} goal.targetAmount - Monto objetivo
 * @param {Number} goal.currentAmount - Monto actual ahorrado
 * @param {Date} goal.targetDate - Fecha objetivo
 * @param {Number} userMonthlyIncome - Ingreso mensual promedio del usuario (opcional)
 * @returns {Object} Plan de ahorro con recomendaciones
 */
const calcularPlanDeAhorro = (goal, userMonthlyIncome = null) => {
  const amountNeeded = goal.targetAmount - (goal.currentAmount || 0);
  
  if (amountNeeded <= 0) {
    return {
      success: true,
      completed: true,
      message: '¡Meta ya completada!',
      amountNeeded: 0
    };
  }

  // Calcular días restantes
  let daysRemaining = null;
  let weeksRemaining = null;
  let monthsRemaining = null;

  if (goal.targetDate) {
    const today = new Date();
    const target = new Date(goal.targetDate);
    const diffTime = target - today;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    weeksRemaining = Math.ceil(daysRemaining / 7);
    monthsRemaining = Math.ceil(daysRemaining / 30);

    if (daysRemaining <= 0) {
      return {
        success: false,
        expired: true,
        message: 'La fecha objetivo ya pasó. Considera extender el plazo.',
        amountNeeded
      };
    }
  } else {
    // Sin fecha objetivo, usar estimaciones por defecto
    daysRemaining = 365; // 1 año por defecto
    weeksRemaining = 52;
    monthsRemaining = 12;
  }

  // Calcular cantidades recomendadas
  const recommendedDaily = parseFloat((amountNeeded / daysRemaining).toFixed(2));
  const recommendedWeekly = parseFloat((amountNeeded / weeksRemaining).toFixed(2));
  const recommendedMonthly = parseFloat((amountNeeded / monthsRemaining).toFixed(2));

  // Evaluar si es factible
  let isFeasible = true;
  let feasibilityMessage = '';
  let feasibilityLevel = 'easy'; // easy, moderate, challenging, difficult

  if (userMonthlyIncome) {
    const percentageOfIncome = (recommendedMonthly / userMonthlyIncome) * 100;

    if (percentageOfIncome > 50) {
      isFeasible = false;
      feasibilityLevel = 'difficult';
      feasibilityMessage = `Requiere ahorrar ${percentageOfIncome.toFixed(0)}% de tu ingreso mensual. Considera extender el plazo.`;
    } else if (percentageOfIncome > 30) {
      feasibilityLevel = 'challenging';
      feasibilityMessage = `Requiere ahorrar ${percentageOfIncome.toFixed(0)}% de tu ingreso mensual. Es retador pero posible.`;
    } else if (percentageOfIncome > 15) {
      feasibilityLevel = 'moderate';
      feasibilityMessage = `Requiere ahorrar ${percentageOfIncome.toFixed(0)}% de tu ingreso mensual. Plan equilibrado.`;
    } else {
      feasibilityLevel = 'easy';
      feasibilityMessage = `Solo requiere ahorrar ${percentageOfIncome.toFixed(0)}% de tu ingreso mensual. ¡Muy alcanzable!`;
    }
  }

  // Generar estrategias sugeridas
  const strategies = [];

  if (daysRemaining > 30) {
    strategies.push({
      type: 'daily',
      description: `Ahorra $${recommendedDaily} cada día`,
      icon: '📅',
      difficulty: recommendedDaily < 100 ? 'easy' : recommendedDaily < 500 ? 'moderate' : 'hard'
    });
  }

  strategies.push({
    type: 'weekly',
    description: `Ahorra $${recommendedWeekly} cada semana`,
    icon: '📆',
    difficulty: recommendedWeekly < 500 ? 'easy' : recommendedWeekly < 2000 ? 'moderate' : 'hard'
  });

  strategies.push({
    type: 'monthly',
    description: `Ahorra $${recommendedMonthly} cada mes`,
    icon: '📊',
    difficulty: recommendedMonthly < 2000 ? 'easy' : recommendedMonthly < 10000 ? 'moderate' : 'hard'
  });

  // Estrategias alternativas
  if (recommendedMonthly > 1000) {
    strategies.push({
      type: 'biweekly',
      description: `Ahorra $${(recommendedMonthly / 2).toFixed(2)} cada quincena`,
      icon: '💰',
      difficulty: 'moderate'
    });
  }

  return {
    success: true,
    amountNeeded,
    timeframe: {
      days: daysRemaining,
      weeks: weeksRemaining,
      months: monthsRemaining
    },
    recommendations: {
      daily: recommendedDaily,
      weekly: recommendedWeekly,
      monthly: recommendedMonthly
    },
    feasibility: {
      isFeasible,
      level: feasibilityLevel,
      message: feasibilityMessage
    },
    strategies,
    motivationalMessage: generateMotivationalMessage(goal, monthsRemaining)
  };
};

/**
 * Genera un mensaje motivacional basado en la meta y el tiempo
 * @param {Object} goal - Meta
 * @param {Number} months - Meses restantes
 * @returns {String} Mensaje motivacional
 */
const generateMotivationalMessage = (goal, months) => {
  const messages = {
    short: [
      '¡Casi lo tienes! Un último esfuerzo.',
      'En poco tiempo alcanzarás tu objetivo.',
      'La recta final siempre es emocionante.'
    ],
    medium: [
      'Constancia es la clave. ¡Tú puedes!',
      'Cada ahorro te acerca más a tu meta.',
      'El tiempo vuela cuando persigues tus sueños.'
    ],
    long: [
      'Los grandes logros requieren paciencia.',
      'Cada paso cuenta en este viaje.',
      'La disciplina de hoy es la libertad de mañana.'
    ]
  };

  let category = 'long';
  if (months <= 3) category = 'short';
  else if (months <= 12) category = 'medium';

  const categoryMessages = messages[category];
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
};

/**
 * Simula el progreso futuro de una meta con ahorros constantes
 * @param {Object} goal - Meta actual
 * @param {Number} monthlyContribution - Contribución mensual
 * @param {Number} months - Meses a simular
 * @returns {Array} Array con proyección mensual
 */
const simulateGoalProgress = (goal, monthlyContribution, months = 12) => {
  const projection = [];
  let currentAmount = goal.currentAmount || 0;
  const startDate = new Date();

  for (let i = 0; i <= months; i++) {
    const projectedDate = new Date(startDate);
    projectedDate.setMonth(startDate.getMonth() + i);
    
    projection.push({
      month: i,
      date: projectedDate,
      amount: currentAmount,
      percentage: Math.min(100, (currentAmount / goal.targetAmount) * 100)
    });

    currentAmount += monthlyContribution;
  }

  return projection;
};

/**
 * Calcula cuánto tiempo tomará alcanzar la meta con una contribución específica
 * @param {Number} targetAmount - Monto objetivo
 * @param {Number} currentAmount - Monto actual
 * @param {Number} monthlyContribution - Contribución mensual
 * @returns {Object} Tiempo estimado
 */
const calculateTimeToGoal = (targetAmount, currentAmount, monthlyContribution) => {
  const amountNeeded = targetAmount - currentAmount;
  
  if (amountNeeded <= 0) {
    return { months: 0, message: '¡Ya completaste tu meta!' };
  }

  if (monthlyContribution <= 0) {
    return { months: null, message: 'Necesitas una contribución mayor a 0' };
  }

  const monthsNeeded = Math.ceil(amountNeeded / monthlyContribution);
  const yearsNeeded = Math.floor(monthsNeeded / 12);
  const remainingMonths = monthsNeeded % 12;

  let message = '';
  if (yearsNeeded > 0) {
    message = `${yearsNeeded} año${yearsNeeded > 1 ? 's' : ''}`;
    if (remainingMonths > 0) {
      message += ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
    }
  } else {
    message = `${monthsNeeded} mes${monthsNeeded > 1 ? 'es' : ''}`;
  }

  return {
    months: monthsNeeded,
    years: yearsNeeded,
    message,
    estimatedCompletionDate: new Date(new Date().setMonth(new Date().getMonth() + monthsNeeded))
  };
};

module.exports = {
  calcularPlanDeAhorro,
  simulateGoalProgress,
  calculateTimeToGoal,
  generateMotivationalMessage
};
