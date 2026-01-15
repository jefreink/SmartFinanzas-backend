/**
 * Controlador de Metas (Goals)
 * Gestiona las metas de ahorro del usuario
 */

const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const { calcularPlanDeAhorro, calculateTimeToGoal } = require('../utils/savingsPlanner');

/**
 * @desc    Obtener todas las metas del usuario
 * @route   GET /api/goals
 * @access  Private
 */
const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });

    // Incluir virtuals en la respuesta
    const goalsWithVirtuals = goals.map(goal => ({
      ...goal.toObject(),
      progressPercentage: goal.progressPercentage,
      amountRemaining: goal.amountRemaining,
      daysRemaining: goal.daysRemaining
    }));

    res.status(200).json({
      success: true,
      count: goals.length,
      data: goalsWithVirtuals
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener una meta específica
 * @route   GET /api/goals/:id
 * @access  Private
 */
const getGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta no encontrada' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    res.status(200).json({
      success: true,
      data: {
        ...goal.toObject(),
        progressPercentage: goal.progressPercentage,
        amountRemaining: goal.amountRemaining,
        daysRemaining: goal.daysRemaining
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Crear nueva meta
 * @route   POST /api/goals
 * @access  Private
 */
const createGoal = async (req, res) => {
  try {
    const { 
      name, 
      targetAmount, 
      targetDate, 
      isViceFund, 
      icon, 
      color,
      category,
      currentAmount 
    } = req.body;

    // Calcular plan de ahorro si hay fecha objetivo
    let recommendations = {};
    if (targetDate) {
      const plan = calcularPlanDeAhorro({
        targetAmount,
        currentAmount: currentAmount || 0,
        targetDate: new Date(targetDate)
      });

      if (plan.success) {
        recommendations = {
          recommendedDailyAmount: plan.recommendations.daily,
          recommendedWeeklyAmount: plan.recommendations.weekly,
          recommendedMonthlyAmount: plan.recommendations.monthly
        };
      }
    }

    const goal = await Goal.create({
      user: req.user.id,
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      isViceFund: isViceFund || false,
      icon: icon || '🎯',
      color: color || '#00F5FF',
      category: category || 'other',
      ...recommendations
    });

    res.status(201).json({
      success: true,
      data: goal
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Actualizar meta
 * @route   PUT /api/goals/:id
 * @access  Private
 */
const updateGoal = async (req, res) => {
  try {
    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta no encontrada' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    // Si se actualiza la fecha o el monto, recalcular plan
    if (req.body.targetDate || req.body.targetAmount) {
      const plan = calcularPlanDeAhorro({
        targetAmount: req.body.targetAmount || goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : goal.targetDate
      });

      if (plan.success && plan.recommendations) {
        req.body.recommendedDailyAmount = plan.recommendations.daily;
        req.body.recommendedWeeklyAmount = plan.recommendations.weekly;
        req.body.recommendedMonthlyAmount = plan.recommendations.monthly;
      }
    }

    goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: goal
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Eliminar meta
 * @route   DELETE /api/goals/:id
 * @access  Private
 */
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta no encontrada' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    await goal.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Añadir fondos a una meta
 * @route   POST /api/goals/:id/add-funds
 * @access  Private
 */
const addFunds = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Monto inválido' 
      });
    }

    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta no encontrada' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    await goal.addFunds(amount);

    res.status(200).json({
      success: true,
      data: goal,
      message: goal.status === 'completed' 
        ? '¡Felicitaciones! Meta completada 🎉' 
        : 'Fondos añadidos exitosamente'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Calcular plan de ahorro para una meta
 * @route   POST /api/goals/calculate-plan
 * @access  Private
 */
const calculateSavingsPlan = async (req, res) => {
  try {
    const { targetAmount, currentAmount, targetDate, userMonthlyIncome } = req.body;

    if (!targetAmount) {
      return res.status(400).json({
        success: false,
        message: 'Monto objetivo requerido'
      });
    }

    const plan = calcularPlanDeAhorro(
      {
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        targetDate: targetDate ? new Date(targetDate) : null
      },
      userMonthlyIncome ? parseFloat(userMonthlyIncome) : null
    );

    res.status(200).json({
      success: true,
      plan
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener estadísticas de metas
 * @route   GET /api/goals/statistics
 * @access  Private
 */
const getGoalsStatistics = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id });

    const statistics = {
      total: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      paused: goals.filter(g => g.status === 'paused').length,
      totalTargetAmount: goals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: goals.reduce((sum, g) => sum + g.currentAmount, 0),
      averageProgress: goals.length > 0 
        ? goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length 
        : 0,
      viceFundTotal: goals
        .filter(g => g.isViceFund)
        .reduce((sum, g) => sum + g.currentAmount, 0)
    };

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getGoals = getGoals;
exports.getGoal = getGoal;
exports.createGoal = createGoal;
exports.updateGoal = updateGoal;
exports.deleteGoal = deleteGoal;
exports.addFunds = addFunds;
exports.calculateSavingsPlan = calculateSavingsPlan;
exports.getGoalsStatistics = getGoalsStatistics;
