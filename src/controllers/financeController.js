/**
 * Controlador Financiero Core
 * Cálculos de Dinero Libre y métricas generales.
 */
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');

/**
 * @desc    Obtener Resumen Financiero (Dinero Libre)
 * @route   GET /api/finance/summary
 * @access  Private
 */
exports.getFinancialSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 1. Obtener Transacciones del Mes
    const transactions = await Transaction.find({
      user: req.user.id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    // 2. Calcular "Dinero Libre" Diario
    // Fórmula simplificada: (Ingresos - GastosFijos - AhorroMeta) / DíasRestantes
    // Por ahora haremos una versión básica: Balance Total - Metas Activas
    
    // Obtener total en metas de ahorro
    const goals = await Goal.find({ user: req.user.id, status: 'active' });
    const totalSavingsGoal = goals.reduce((acc, curr) => acc + (curr.targetAmount - curr.currentAmount), 0);
    
    const currentBalance = income - expenses;

    // Presupuesto diario "inteligente" (Simulado por ahora)
    const daysInMonth = endOfMonth.getDate();
    const daysRemaining = daysInMonth - today.getDate() + 1; // Incluyendo hoy
    
    // Supuesto: El usuario debería tener X disponible, si le restamos lo que le falta ahorrar
    // Si balance es positivo
    
    let freeMoneyDaily = 0;
    if (currentBalance > 0) {
        freeMoneyDaily = currentBalance / daysRemaining;
    }

    res.status(200).json({
      success: true,
      data: {
        income,
        expenses,
        balance: currentBalance,
        freeMoneyDaily: Math.max(0, freeMoneyDaily.toFixed(2)),
        totalSavingsGoal
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener Datos Completos del Dashboard
 * @route   GET /api/finance/dashboard
 * @access  Private
 * @returns {Object} freeAmount, totalBudget, chartData, recentTransactions, alerts
 */
exports.getDashboardData = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 1. Obtener transacciones del mes
    const transactions = await Transaction.find({
      user: req.user.id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: -1 });

    // 2. Calcular ingresos y gastos totales
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const balance = income - expenses;

    // 3. Calcular "Dinero Libre"
    // Dinero Libre = Balance actual - Metas de ahorro comprometidas
    const goals = await Goal.find({ user: req.user.id, status: 'active' });
    const savingsCommitment = goals.reduce((acc, curr) => {
      // Si la meta tiene un monto mensual recomendado, usarlo; si no, 0
      return acc + (curr.recommendedMonthlyAmount || 0);
    }, 0);

    const freeAmount = Math.max(0, balance - savingsCommitment);
    const totalBudget = income; // Presupuesto = ingresos del mes

    // 4. Preparar datos para el gráfico (últimos 7 días)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= date && tDate < nextDay;
      });

      const dayIncome = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.totalAmount, 0);

      const dayExpenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.totalAmount, 0);

      chartData.push({
        day: `${date.getDate()}/${date.getMonth() + 1}`,
        income: dayIncome,
        expenses: dayExpenses,
      });
    }

    // 5. Transacciones recientes (últimas 5)
    const recentTransactions = transactions.slice(0, 5);

    // 6. Generar alertas inteligentes
    const alerts = [];
    const Inventory = require('../models/Inventory');

    // Alerta: Productos próximos a vencer
    const criticalItems = await Inventory.find({
      user: req.user.id,
      status: { $in: ['warning', 'critical'] }
    }).limit(3);

    if (criticalItems.length > 0) {
      alerts.push({
        type: 'expiry',
        title: 'Productos por vencer',
        message: `Tienes ${criticalItems.length} productos próximos a vencer en tu despensa`,
        color: '#FF8C00', // Naranja
        action: 'navigate:Inventory',
      });
    }

    // Alerta: Cuotas de tarjeta pendientes
    const creditTransactions = transactions.filter(
      t => t.type === 'expense' && 
      t.paymentMethod === 'credit' && 
      t.installments.current < t.installments.total
    );

    if (creditTransactions.length > 0) {
      const totalDebt = creditTransactions.reduce((acc, curr) => {
        const remaining = curr.installments.total - curr.installments.current;
        return acc + (curr.totalAmount / curr.installments.total) * remaining;
      }, 0);

      alerts.push({
        type: 'payment',
        title: 'Cuotas pendientes',
        message: `Tienes ${creditTransactions.length} cuotas activas. Total: $${Math.round(totalDebt).toLocaleString()}`,
        color: '#00F5FF', // Turquesa
      });
    }

    // Alerta: Modo supervivencia (si dinero libre < 10% del presupuesto)
    if (totalBudget > 0 && freeAmount < totalBudget * 0.1) {
      alerts.push({
        type: 'survival',
        title: '⚠️ Modo Supervivencia',
        message: 'Tu dinero libre está por debajo del 10%. Controla tus gastos.',
        color: '#FF007F', // Rosa
      });
    }

    // Alerta: Meta de ahorro próxima a cumplirse
    const nearGoals = goals.filter(g => {
      const progress = (g.currentAmount / g.targetAmount) * 100;
      return progress >= 80 && progress < 100;
    });

    if (nearGoals.length > 0) {
      alerts.push({
        type: 'goal',
        title: '🎯 ¡Casi lo logras!',
        message: `Estás a punto de cumplir "${nearGoals[0].name}"`,
        color: '#00F5FF', // Turquesa
        action: 'navigate:Goals',
      });
    }

    // 7. Respuesta final
    res.status(200).json({
      success: true,
      data: {
        freeAmount,
        totalBudget,
        chartData,
        recentTransactions,
        alerts,
      },
    });

  } catch (err) {
    console.error('Error en getDashboardData:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
