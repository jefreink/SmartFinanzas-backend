/**
 * Salary Controller
 * Controlador para gestión de sueldos e ingresos
 */

const Salary = require('../models/Salary');

/**
 * @desc    Obtener todos los sueldos del usuario
 * @route   GET /api/salaries
 * @access  Private
 */
const getSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find({ user: req.user.id })
      .sort({ effectiveDate: -1 });

    res.status(200).json({
      success: true,
      count: salaries.length,
      data: salaries
    });
  } catch (error) {
    console.error('Error getting salaries:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sueldos'
    });
  }
};

/**
 * @desc    Obtener sueldo activo actual
 * @route   GET /api/salaries/current
 * @access  Private
 */
const getCurrentSalary = async (req, res) => {
  try {
    const salary = await Salary.findOne({ 
      user: req.user.id, 
      isActive: true 
    }).sort({ effectiveDate: -1 });

    if (!salary) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No hay sueldo registrado'
      });
    }

    // Calcular valores virtuales
    const netAmount = salary.amount - 
      ((salary.deductions?.pension || 0) + 
       (salary.deductions?.health || 0) + 
       (salary.deductions?.other || 0));
    
    const recommendedSavings = (netAmount * salary.recommendedSavingsPercent) / 100;

    res.status(200).json({
      success: true,
      data: {
        ...salary.toObject(),
        netAmount,
        recommendedSavings
      }
    });
  } catch (error) {
    console.error('Error getting current salary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sueldo actual'
    });
  }
};

/**
 * @desc    Crear nuevo sueldo
 * @route   POST /api/salaries
 * @access  Private
 */
const createSalary = async (req, res) => {
  try {
    const { amount, type, description, effectiveDate, frequency, deductions, recommendedSavingsPercent } = req.body;

    // Desactivar sueldos anteriores si es necesario
    if (effectiveDate) {
      await Salary.updateMany(
        { user: req.user.id, isActive: true },
        { isActive: false }
      );
    }

    const salary = await Salary.create({
      user: req.user.id,
      amount,
      type: type || 'fixed',
      description,
      effectiveDate: effectiveDate || new Date(),
      frequency: frequency || 'monthly',
      deductions: deductions || { pension: 0, health: 0, other: 0 },
      recommendedSavingsPercent: recommendedSavingsPercent || 10,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: salary
    });
  } catch (error) {
    console.error('Error creating salary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear sueldo',
      error: error.message
    });
  }
};

/**
 * @desc    Actualizar sueldo
 * @route   PUT /api/salaries/:id
 * @access  Private
 */
const updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let salary = await Salary.findOne({ _id: id, user: req.user.id });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Sueldo no encontrado'
      });
    }

    salary = await Salary.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: salary
    });
  } catch (error) {
    console.error('Error updating salary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar sueldo'
    });
  }
};

/**
 * @desc    Eliminar sueldo
 * @route   DELETE /api/salaries/:id
 * @access  Private
 */
const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await Salary.findOne({ _id: id, user: req.user.id });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Sueldo no encontrado'
      });
    }

    await salary.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Sueldo eliminado'
    });
  } catch (error) {
    console.error('Error deleting salary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar sueldo'
    });
  }
};

module.exports = {
  getSalaries,
  getCurrentSalary,
  createSalary,
  updateSalary,
  deleteSalary
};
