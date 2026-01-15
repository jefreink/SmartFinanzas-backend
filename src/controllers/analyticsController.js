/**
 * Analytics Controller
 * Controlador para análisis avanzados y estadísticas
 */

const { generateOpportunityCostInsights, getEquivalenceSummary } = require('../utils/opportunityCost');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * @desc    Obtener insights de costo de oportunidad
 * @route   GET /api/analytics/opportunity-cost
 * @access  Private
 */
const getOpportunityCostInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const hourlyWage = req.query.hourlyWage ? parseFloat(req.query.hourlyWage) : 10;

    const insights = await generateOpportunityCostInsights(userId, hourlyWage);

    res.status(200).json({
      success: true,
      count: insights.length,
      data: insights
    });
  } catch (error) {
    console.error('Error getting opportunity cost insights:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener insights de costo de oportunidad'
    });
  }
};

/**
 * @desc    Obtener equivalencias para un monto específico
 * @route   GET /api/analytics/equivalences/:amount
 * @access  Private
 */
const getEquivalences = async (req, res) => {
  try {
    const amount = parseFloat(req.params.amount);
    const userId = req.user.id;

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Monto inválido'
      });
    }

    // Obtener moneda del usuario
    const user = await User.findById(userId);
    const currency = user?.currency || 'USD';

    const summary = getEquivalenceSummary(amount, currency);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting equivalences:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener equivalencias'
    });
  }
};

/**
 * @desc    Obtener análisis de gastos por categoría (con comparaciones)
 * @route   GET /api/analytics/category-analysis
 * @access  Private
 */
const getCategoryAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Definir rango de fechas (por defecto mes actual)
    const start = startDate ? new Date(startDate) : (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const end = endDate ? new Date(endDate) : new Date();

    const transactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: start, $lte: end }
    });

    // Agrupar por categoría
    const categoryData = {};
    transactions.forEach(tx => {
      if (!categoryData[tx.category]) {
        categoryData[tx.category] = {
          category: tx.category,
          total: 0,
          count: 0,
          transactions: []
        };
      }
      categoryData[tx.category].total += tx.totalAmount;
      categoryData[tx.category].count++;
      categoryData[tx.category].transactions.push({
        _id: tx._id,
        amount: tx.totalAmount,
        date: tx.date,
        merchant: tx.merchant
      });
    });

    // Convertir a array y ordenar
    const categories = Object.values(categoryData)
      .map(cat => ({
        ...cat,
        average: cat.total / cat.count,
        percentage: 0 // Se calculará después
      }))
      .sort((a, b) => b.total - a.total);

    // Calcular porcentajes
    const total = categories.reduce((sum, cat) => sum + cat.total, 0);
    categories.forEach(cat => {
      cat.percentage = total > 0 ? ((cat.total / total) * 100).toFixed(1) : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        categories,
        total,
        period: {
          start,
          end
        }
      }
    });
  } catch (error) {
    console.error('Error getting category analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener análisis de categorías'
    });
  }
};

/**
 * @desc    Obtener tendencias de gasto (comparación mes a mes)
 * @route   GET /api/analytics/spending-trends
 * @access  Private
 */
const getSpendingTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const months = parseInt(req.query.months) || 6;

    const trends = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const transactions = await Transaction.find({
        user: userId,
        type: 'expense',
        date: { $gte: monthStart, $lte: monthEnd }
      });

      const total = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

      trends.unshift({
        month: monthStart.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
        total,
        count: transactions.length,
        average: transactions.length > 0 ? total / transactions.length : 0
      });
    }

    // Calcular cambio porcentual mes a mes
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i].total;
      const previous = trends[i - 1].total;
      trends[i].change = previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : 0;
    }

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error getting spending trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tendencias de gasto'
    });
  }
};

/**
 * @desc    Obtener análisis de mood vs gasto
 * @route   GET /api/analytics/mood-spending
 * @access  Private
 */
const getMoodSpendingAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener transacciones con mood del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: startOfMonth },
      mood: { $exists: true }
    });

    // Agrupar por mood
    const moodData = {};
    transactions.forEach(tx => {
      if (!moodData[tx.mood]) {
        moodData[tx.mood] = {
          mood: tx.mood,
          total: 0,
          count: 0,
          average: 0
        };
      }
      moodData[tx.mood].total += tx.totalAmount;
      moodData[tx.mood].count++;
    });

    // Calcular promedios
    Object.values(moodData).forEach(data => {
      data.average = data.total / data.count;
    });

    // Convertir a array y ordenar por total
    const moodAnalysis = Object.values(moodData)
      .sort((a, b) => b.total - a.total);

    // Encontrar el mood más caro
    const mostExpensive = moodAnalysis[0];
    const insight = mostExpensive 
      ? `Gastas ${mostExpensive.average.toFixed(0)} en promedio cuando estás ${mostExpensive.mood}`
      : null;

    res.status(200).json({
      success: true,
      data: {
        moodAnalysis,
        insight,
        totalTracked: transactions.length
      }
    });
  } catch (error) {
    console.error('Error getting mood spending analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener análisis de mood'
    });
  }
};

/**
 * @desc    Obtener resumen mensual estilo "Wrap"
 * @route   GET /api/analytics/monthly-wrap
 * @access  Private
 */
const getMonthlyWrap = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;
    
    // Si no se especifica, usar el mes anterior
    const targetDate = year && month 
      ? new Date(year, month - 1, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    // Obtener todas las transacciones del mes
    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('merchant', 'name');

    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No hay transacciones para este mes'
      });
    }

    const expenses = transactions.filter(tx => tx.type === 'expense');
    const income = transactions.filter(tx => tx.type === 'income');

    // 1. Totales básicos
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalIncome = income.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const balance = totalIncome - totalExpenses;

    // 2. Merchant favorito (más visitado)
    const merchantVisits = {};
    expenses.forEach(tx => {
      if (tx.merchant) {
        const merchantName = tx.merchant.name || 'Desconocido';
        merchantVisits[merchantName] = (merchantVisits[merchantName] || 0) + 1;
      }
    });
    const favoriteMerchant = Object.entries(merchantVisits)
      .sort((a, b) => b[1] - a[1])[0];

    // 3. Categoría más frecuente
    const categoryCount = {};
    expenses.forEach(tx => {
      categoryCount[tx.category] = (categoryCount[tx.category] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])[0];

    // 4. Día de mayor gasto
    const dailyExpenses = {};
    expenses.forEach(tx => {
      const day = new Date(tx.date).getDate();
      dailyExpenses[day] = (dailyExpenses[day] || 0) + tx.totalAmount;
    });
    const biggestSpendingDay = Object.entries(dailyExpenses)
      .sort((a, b) => b[1] - a[1])[0];

    // 5. Mood predominante
    const moodCount = {};
    expenses.filter(tx => tx.mood).forEach(tx => {
      moodCount[tx.mood] = (moodCount[tx.mood] || 0) + 1;
    });
    const dominantMood = Object.entries(moodCount)
      .sort((a, b) => b[1] - a[1])[0];

    // 6. Transacción más grande
    const biggestTransaction = expenses.reduce((max, tx) => 
      tx.totalAmount > max.totalAmount ? tx : max
    , expenses[0]);

    // 7. Promedio por transacción
    const averageTransaction = totalExpenses / expenses.length;

    // 8. Comparación con mes anterior
    const prevMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59);
    const prevMonthTransactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: prevMonthStart, $lte: prevMonthEnd }
    });
    const prevMonthTotal = prevMonthTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const changePercentage = prevMonthTotal > 0 
      ? ((totalExpenses - prevMonthTotal) / prevMonthTotal) * 100 
      : 0;

    // 9. Gastos hormiga (transacciones < 5000 o equivalente)
    const user = await User.findById(userId);
    const currency = user?.currency || 'USD';
    const antThreshold = currency === 'CLP' ? 5000 : currency === 'USD' ? 10 : 50;
    const antExpenses = expenses.filter(tx => tx.totalAmount < antThreshold);
    const totalAntSpending = antExpenses.reduce((sum, tx) => sum + tx.totalAmount, 0);

    // 10. Racha de gastos (días consecutivos con transacciones)
    const daysWithTransactions = [...new Set(expenses.map(tx => 
      new Date(tx.date).toDateString()
    ))].sort();
    let currentStreak = 1;
    let longestStreak = 1;
    for (let i = 1; i < daysWithTransactions.length; i++) {
      const prevDate = new Date(daysWithTransactions[i - 1]);
      const currDate = new Date(daysWithTransactions[i]);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    // Construir respuesta tipo "Wrap"
    const wrap = {
      month: targetDate.toLocaleString('es', { month: 'long', year: 'numeric' }),
      currency,
      slides: [
        {
          type: 'intro',
          title: `Tu ${targetDate.toLocaleString('es', { month: 'long' })} en números`,
          subtitle: `Realizaste ${transactions.length} transacciones`
        },
        {
          type: 'totals',
          title: 'Resumen financiero',
          data: {
            totalExpenses,
            totalIncome,
            balance,
            changePercentage: changePercentage.toFixed(1),
            trend: changePercentage > 0 ? 'up' : 'down'
          }
        },
        {
          type: 'favorite',
          title: 'Tu lugar favorito',
          data: {
            merchant: favoriteMerchant ? favoriteMerchant[0] : 'N/A',
            visits: favoriteMerchant ? favoriteMerchant[1] : 0,
            message: favoriteMerchant 
              ? `Visitaste ${favoriteMerchant[0]} ${favoriteMerchant[1]} veces`
              : 'No hay suficientes datos'
          }
        },
        {
          type: 'category',
          title: 'Tu categoría estrella',
          data: {
            category: topCategory ? topCategory[0] : 'N/A',
            count: topCategory ? topCategory[1] : 0,
            percentage: topCategory ? ((topCategory[1] / expenses.length) * 100).toFixed(0) : 0
          }
        },
        {
          type: 'biggest-day',
          title: 'El día que más gastaste',
          data: {
            day: biggestSpendingDay ? biggestSpendingDay[0] : 'N/A',
            amount: biggestSpendingDay ? biggestSpendingDay[1] : 0,
            message: biggestSpendingDay
              ? `El día ${biggestSpendingDay[0]} gastaste ${biggestSpendingDay[1].toFixed(0)}`
              : 'No hay datos'
          }
        },
        {
          type: 'mood',
          title: 'Tu humor financiero',
          data: {
            mood: dominantMood ? dominantMood[0] : 'neutral',
            count: dominantMood ? dominantMood[1] : 0,
            message: dominantMood
              ? `Estuviste ${dominantMood[0]} en ${dominantMood[1]} compras`
              : 'No registraste tu estado de ánimo'
          }
        },
        {
          type: 'ant-spending',
          title: 'Gastos hormiga',
          data: {
            count: antExpenses.length,
            total: totalAntSpending,
            average: antExpenses.length > 0 ? totalAntSpending / antExpenses.length : 0,
            message: `${antExpenses.length} pequeños gastos sumaron ${totalAntSpending.toFixed(0)}`
          }
        },
        {
          type: 'streak',
          title: 'Racha de actividad',
          data: {
            longestStreak,
            message: longestStreak > 1 
              ? `Tu racha más larga fue de ${longestStreak} días consecutivos`
              : 'No tuviste días consecutivos con gastos'
          }
        },
        {
          type: 'biggest-purchase',
          title: 'Tu compra más grande',
          data: {
            amount: biggestTransaction.totalAmount,
            category: biggestTransaction.category,
            merchant: biggestTransaction.merchant?.name || 'Desconocido',
            date: biggestTransaction.date
          }
        },
        {
          type: 'outro',
          title: '¡Así fue tu mes!',
          data: {
            averageTransaction: averageTransaction.toFixed(0),
            totalDays: daysWithTransactions.length,
            message: balance >= 0 
              ? '¡Felicidades! Cerraste el mes en positivo' 
              : 'El próximo mes puede ser mejor'
          }
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: wrap
    });
  } catch (error) {
    console.error('Error generating monthly wrap:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar resumen mensual'
    });
  }
};

module.exports = {
  getOpportunityCostInsights,
  getEquivalences,
  getCategoryAnalysis,
  getSpendingTrends,
  getMoodSpendingAnalysis,
  getMonthlyWrap
};
