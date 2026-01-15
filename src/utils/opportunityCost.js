/**
 * Opportunity Cost Analyzer
 * Genera comparaciones creativas para educar al usuario sobre el costo de oportunidad de sus gastos
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Multiplicadores de moneda (aproximados)
 * Usados para ajustar precios de referencia a diferentes monedas
 */
const CURRENCY_MULTIPLIERS = {
  'USD': 1,
  'CLP': 800,      // 1 USD ≈ 800 CLP
  'ARS': 350,      // 1 USD ≈ 350 ARS
  'MXN': 17,       // 1 USD ≈ 17 MXN
  'COP': 4000,     // 1 USD ≈ 4000 COP
  'EUR': 0.92,     // 1 USD ≈ 0.92 EUR
  'BRL': 5,        // 1 USD ≈ 5 BRL
  'PEN': 3.7,      // 1 USD ≈ 3.7 PEN
  'UYU': 39,       // 1 USD ≈ 39 UYU
};

/**
 * Referencias comunes para comparaciones (precios base en USD)
 * Estos precios se multiplican automáticamente según la moneda del usuario
 */
const REFERENCE_ITEMS_BASE = [
  { name: 'un mes de Netflix', cost: 10, icon: '📺', category: 'Entretenimiento' },
  { name: 'un mes de Spotify', cost: 10, icon: '🎵', category: 'Entretenimiento' },
  { name: 'un mes de gym', cost: 30, icon: '💪', category: 'Salud' },
  { name: 'una comida en restaurante', cost: 15, icon: '🍽️', category: 'Comida' },
  { name: 'un tanque de gasolina', cost: 40, icon: '⛽', category: 'Transporte' },
  { name: 'una entrada al cine', cost: 8, icon: '🎬', category: 'Entretenimiento' },
  { name: 'un libro', cost: 12, icon: '📚', category: 'Educación' },
  { name: 'un mes de transporte público', cost: 50, icon: '🚌', category: 'Transporte' },
  { name: 'una pizza delivery', cost: 18, icon: '🍕', category: 'Comida' },
  { name: 'un café latte diario por una semana', cost: 21, icon: '☕', category: 'Comida' },
  { name: 'un corte de cabello', cost: 15, icon: '💇', category: 'Cuidado Personal' },
  { name: 'una consulta médica', cost: 50, icon: '🏥', category: 'Salud' },
  { name: 'un curso online', cost: 30, icon: '🎓', category: 'Educación' },
  { name: 'una cena romántica', cost: 60, icon: '🌹', category: 'Comida' },
  { name: 'un videojuego nuevo', cost: 50, icon: '🎮', category: 'Entretenimiento' },
  { name: 'un mes de internet', cost: 40, icon: '🌐', category: 'Servicios' },
  { name: 'zapatos deportivos', cost: 80, icon: '👟', category: 'Ropa' },
  { name: 'auriculares inalámbricos', cost: 70, icon: '🎧', category: 'Tecnología' },
  { name: 'una clase de yoga', cost: 12, icon: '🧘', category: 'Salud' },
  { name: 'un almuerzo diario por una semana', cost: 35, icon: '🥗', category: 'Comida' }
];

/**
 * Obtiene items de referencia ajustados a la moneda del usuario
 * @param {String} currency - Código de moneda (USD, CLP, etc.)
 * @returns {Array} Items con precios ajustados
 */
const getAdjustedReferenceItems = (currency = 'USD') => {
  const multiplier = CURRENCY_MULTIPLIERS[currency] || 1;
  
  return REFERENCE_ITEMS_BASE.map(item => ({
    ...item,
    cost: Math.round(item.cost * multiplier)
  }));
};

/**
 * Plantillas de insights creativos
 */
const INSIGHT_TEMPLATES = [
  {
    type: 'equivalence',
    template: 'Tus {category} este mes = {equivalent}',
    icon: '💡'
  },
  {
    type: 'savings_goal',
    template: 'Si hubieras ahorrado tus {category}, tendrías {amount} para {goal}',
    icon: '🎯'
  },
  {
    type: 'time_value',
    template: 'Tus {category} representan {hours} horas de trabajo',
    icon: '⏰'
  },
  {
    type: 'alternative',
    template: 'En lugar de {category}, pudiste haber {alternative}',
    icon: '🔄'
  },
  {
    type: 'accumulation',
    template: 'En un año, tus {category} suman {yearly_total}',
    icon: '📊'
  },
  {
    type: 'comparison',
    template: 'Gastas más en {category1} que en {category2}',
    icon: '⚖️'
  }
];

/**
 * Metas comunes para comparaciones (precios base en USD)
 */
const COMMON_GOALS_BASE = [
  { name: 'un viaje de fin de semana', min: 200, icon: '✈️' },
  { name: 'un fondo de emergencia', min: 500, icon: '🛡️' },
  { name: 'una laptop nueva', min: 800, icon: '💻' },
  { name: 'un smartphone nuevo', min: 600, icon: '📱' },
  { name: 'tu meta de ahorro', min: 100, icon: '💰' }
];

/**
 * Obtiene metas ajustadas a la moneda del usuario
 * @param {String} currency - Código de moneda
 * @returns {Array} Metas con precios ajustados
 */
const getAdjustedGoals = (currency = 'USD') => {
  const multiplier = CURRENCY_MULTIPLIERS[currency] || 1;
  
  return COMMON_GOALS_BASE.map(goal => ({
    ...goal,
    min: Math.round(goal.min * multiplier)
  }));
};

/**
 * Calcula equivalencias de gasto con items de referencia
 * @param {Number} amount - Monto a comparar
 * @param {String} currency - Moneda del usuario
 * @returns {Array} Lista de equivalencias
 */
const calculateEquivalences = (amount, currency = 'USD') => {
  const equivalences = [];
  const REFERENCE_ITEMS = getAdjustedReferenceItems(currency);

  for (const item of REFERENCE_ITEMS) {
    const quantity = Math.floor(amount / item.cost);
    if (quantity >= 1) {
      equivalences.push({
        item: item.name,
        icon: item.icon,
        quantity,
        exactAmount: (quantity * item.cost).toFixed(2),
        description: quantity === 1 
          ? `${item.icon} ${item.name}`
          : `${quantity}x ${item.icon} ${item.name}`
      });
    }
  }

  // Ordenar por relevancia (cantidad más cercana a 1-10)
  equivalences.sort((a, b) => {
    const scoreA = Math.abs(a.quantity - 5);
    const scoreB = Math.abs(b.quantity - 5);
    return scoreA - scoreB;
  });

  return equivalences.slice(0, 5);
};

/**
 * Genera insight de equivalencia para una categoría
 * @param {String} category - Categoría de gasto
 * @param {Number} amount - Monto total
 * @param {String} currency - Moneda del usuario
 * @returns {Object} Insight generado
 */
const generateEquivalenceInsight = (category, amount, currency = 'USD') => {
  const equivalences = calculateEquivalences(amount, currency);
  if (equivalences.length === 0) return null;

  const best = equivalences[0];
  const otherOptions = equivalences.slice(1, 3).map(e => e.description).join(', ');
  return {
    type: 'equivalence',
    icon: '💡',
    title: 'Costo de Oportunidad',
    message: `Tus gastos en ${category} este mes ($${amount.toFixed(0)}) = ${best.description}`,
    details: otherOptions ? `También equivale a: ${otherOptions}` : null
  };
};

/**
 * Genera insight de ahorro proyectado
 * @param {String} category - Categoría de gasto
 * @param {Number} monthlyAmount - Monto mensual
 * @param {String} currency - Moneda del usuario
 * @returns {Object} Insight generado
 */
const generateSavingsGoalInsight = (category, monthlyAmount, currency = 'USD') => {
  const yearlyAmount = monthlyAmount * 12;
  const COMMON_GOALS = getAdjustedGoals(currency);
  
  // Encontrar meta alcanzable
  const achievableGoal = COMMON_GOALS.find(goal => yearlyAmount >= goal.min);
  if (!achievableGoal) return null;

  return {
    type: 'savings_goal',
    icon: '🎯',
    title: 'Potencial de Ahorro',
    message: `Si ahorraras tus gastos en ${category}, en un año tendrías $${yearlyAmount.toFixed(0)} para ${achievableGoal.name}`,
    details: `Ahorro mensual necesario: $${monthlyAmount.toFixed(0)} × 12 meses = $${yearlyAmount.toFixed(0)}`
  };
};

/**
 * Genera insight de valor en tiempo (horas de trabajo)
 * @param {String} category - Categoría de gasto
 * @param {Number} amount - Monto total
 * @param {Number} hourlyWage - Salario por hora del usuario
 * @returns {Object} Insight generado
 */
const generateTimeValueInsight = (category, amount, hourlyWage = 10) => {
  const hours = (amount / hourlyWage).toFixed(1);
  
  let timeDescription = '';
  if (hours < 8) {
    timeDescription = `${hours} horas de trabajo`;
  } else if (hours < 40) {
    const days = (hours / 8).toFixed(1);
    timeDescription = `${days} días de trabajo`;
  } else {
    const weeks = (hours / 40).toFixed(1);
    timeDescription = `${weeks} semanas de trabajo`;
  }

  return {
    type: 'time_value',
    icon: '⏰',
    title: 'Valor en Tiempo',
    message: `Tus gastos en ${category} ($${amount.toFixed(0)}) representan ${timeDescription}`,
    details: `Basado en un salario de $${hourlyWage}/hora (${hours} horas de trabajo)`
  };
};

/**
 * Genera insight de acumulación anual
 * @param {String} category - Categoría de gasto
 * @param {Number} monthlyAmount - Monto mensual
 * @param {String} currency - Moneda del usuario
 * @returns {Object} Insight generado
 */
const generateAccumulationInsight = (category, monthlyAmount, currency = 'USD') => {
  const yearlyTotal = monthlyAmount * 12;
  const equivalences = calculateEquivalences(yearlyTotal, currency);
  
  if (equivalences.length === 0) return null;

  return {
    type: 'accumulation',
    icon: '📊',
    title: 'Proyección Anual',
    message: `En un año, tus gastos en ${category} suman $${yearlyTotal.toFixed(0)} - eso equivale a ${equivalences[0].description}`,
    details: `Promedio mensual: $${monthlyAmount.toFixed(0)} × 12 meses`
  };
};

/**
 * Genera insight de comparación entre categorías
 * @param {Object} categories - Objeto con categorías y montos
 * @returns {Object} Insight generado
 */
const generateComparisonInsight = (categories) => {
  const entries = Object.entries(categories);
  if (entries.length < 2) return null;

  // Ordenar por monto descendente
  entries.sort((a, b) => b[1] - a[1]);

  const [cat1, amount1] = entries[0];
  const [cat2, amount2] = entries[1];

  const difference = amount1 - amount2;
  const percentage = ((difference / amount2) * 100).toFixed(0);

  return {
    type: 'comparison',
    icon: '⚖️',
    title: 'Comparación de Gastos',
    message: `Gastas ${percentage}% más en ${cat1} ($${amount1.toFixed(0)}) que en ${cat2} ($${amount2.toFixed(0)})`,
    details: `Diferencia: $${difference.toFixed(0)} - Considera reducir gastos en ${cat1} para equilibrar tu presupuesto`
  };
};

/**
 * Analiza gastos hormiga (pequeños gastos frecuentes)
 * @param {Array} transactions - Lista de transacciones
 * @returns {Object} Análisis de gastos hormiga
 */
const analyzeAntSpending = (transactions) => {
  // Gastos hormiga: menos de $10, frecuentes (más de 5 al mes)
  const antCategories = {};
  
  transactions.forEach(tx => {
    if (tx.totalAmount < 10 && tx.totalAmount > 0) {
      if (!antCategories[tx.category]) {
        antCategories[tx.category] = { count: 0, total: 0 };
      }
      antCategories[tx.category].count++;
      antCategories[tx.category].total += tx.totalAmount;
    }
  });

  // Filtrar categorías con al menos 5 compras
  const frequentAnts = Object.entries(antCategories)
    .filter(([_, data]) => data.count >= 5)
    .map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      average: data.total / data.count
    }))
    .sort((a, b) => b.total - a.total);

  return {
    categories: frequentAnts,
    totalAmount: frequentAnts.reduce((sum, ant) => sum + ant.total, 0),
    totalCount: frequentAnts.reduce((sum, ant) => sum + ant.count, 0)
  };
};

/**
 * Genera todos los insights de costo de oportunidad para el mes
 * @param {String} userId - ID del usuario
 * @param {Number} hourlyWage - Salario por hora (opcional)
 * @returns {Array} Lista de insights
 */
const generateOpportunityCostInsights = async (userId, hourlyWage = 10) => {
  try {
    // Obtener usuario para conocer su moneda
    const user = await User.findById(userId);
    const currency = user?.currency || 'USD';

    // Obtener transacciones del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (transactions.length === 0) {
      return [];
    }

    // Agrupar por categoría
    const categoryTotals = {};
    transactions.forEach(tx => {
      if (!categoryTotals[tx.category]) {
        categoryTotals[tx.category] = 0;
      }
      categoryTotals[tx.category] += tx.totalAmount;
    });

    const insights = [];

    // 1. Insights por categoría top
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Ajustar el threshold mínimo según la moneda
    const multiplier = CURRENCY_MULTIPLIERS[currency] || 1;
    const minThreshold = 50 * multiplier;

    for (const [category, amount] of topCategories) {
      // Equivalencia
      const eqInsight = generateEquivalenceInsight(category, amount, currency);
      if (eqInsight) insights.push(eqInsight);

      // Meta de ahorro (solo si el gasto supera el threshold ajustado)
      if (amount > minThreshold) {
        const sgInsight = generateSavingsGoalInsight(category, amount, currency);
        if (sgInsight) insights.push(sgInsight);
      }

      // Valor en tiempo
      const tvInsight = generateTimeValueInsight(category, amount, hourlyWage);
      if (tvInsight) insights.push(tvInsight);

      // Acumulación anual
      const accInsight = generateAccumulationInsight(category, amount, currency);
      if (accInsight) insights.push(accInsight);
    }

    // 2. Comparación entre categorías
    if (topCategories.length >= 2) {
      const compInsight = generateComparisonInsight(categoryTotals);
      if (compInsight) insights.push(compInsight);
    }

    // 3. Análisis de gastos hormiga
    const antAnalysis = analyzeAntSpending(transactions);
    if (antAnalysis.categories.length > 0) {
      const topAnt = antAnalysis.categories[0];
      insights.push({
        type: 'ant_spending',
        icon: '🐜',
        title: 'Gastos Hormiga Detectados',
        message: `${topAnt.count} compras pequeñas de ${topAnt.category} suman $${topAnt.total.toFixed(0)} este mes`,
        details: `Si reduces estas compras a la mitad, ahorrarías $${(topAnt.total / 2).toFixed(0)} al mes`,
        antSpending: antAnalysis
      });
    }

    // Seleccionar los mejores 5 insights (variados)
    const selectedInsights = [];
    const typesSeen = new Set();

    for (const insight of insights) {
      if (!typesSeen.has(insight.type) || selectedInsights.length < 3) {
        selectedInsights.push(insight);
        typesSeen.add(insight.type);
      }
      if (selectedInsights.length >= 5) break;
    }

    return selectedInsights;
  } catch (error) {
    console.error('Error generating opportunity cost insights:', error);
    throw error;
  }
};

/**
 * Obtiene resumen de equivalencias para un monto específico
 * @param {Number} amount - Monto a analizar
 * @param {String} currency - Moneda del usuario
 * @returns {Object} Resumen con equivalencias
 */
const getEquivalenceSummary = (amount, currency = 'USD') => {
  const equivalences = calculateEquivalences(amount, currency);
  
  return {
    amount,
    currency,
    equivalences: equivalences.slice(0, 10),
    bestMatch: equivalences[0] || null
  };
};

module.exports = {
  calculateEquivalences,
  generateEquivalenceInsight,
  generateSavingsGoalInsight,
  generateTimeValueInsight,
  generateAccumulationInsight,
  generateComparisonInsight,
  analyzeAntSpending,
  generateOpportunityCostInsights,
  getEquivalenceSummary,
  getAdjustedReferenceItems,
  getAdjustedGoals,
  CURRENCY_MULTIPLIERS
};
