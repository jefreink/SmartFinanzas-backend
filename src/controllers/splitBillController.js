/**
 * Split Bill Controller
 * Controlador para la división de gastos entre múltiples personas
 */

const SplitBill = require('../models/SplitBill');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * @desc    Crear una nueva división de cuenta
 * @route   POST /api/split-bill
 * @access  Private
 */
const createSplitBill = async (req, res) => {
  try {
    const { transactionId, splitType, participants, tipPercentage } = req.body;

    // Verificar que la transacción existe y pertenece al usuario
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para dividir esta transacción'
      });
    }

    // Verificar que haya items si es división por item
    if (splitType === 'by-item' && (!transaction.items || transaction.items.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'La transacción debe tener items para división por ítem'
      });
    }

    // Crear la división
    const splitBill = await SplitBill.create({
      transaction: transactionId,
      creator: req.user.id,
      splitType,
      participants,
      tipPercentage: tipPercentage || 0,
      totalAmount: transaction.totalAmount
    });

    // Calcular distribución
    await splitBill.calculateDistribution();
    await splitBill.save();

    // Poblar datos
    await splitBill.populate('transaction');
    await splitBill.populate('creator', 'name email');

    res.status(201).json({
      success: true,
      data: splitBill
    });
  } catch (error) {
    console.error('Error creating split bill:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear división de cuenta',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener una división específica
 * @route   GET /api/split-bill/:id
 * @access  Private
 */
const getSplitBill = async (req, res) => {
  try {
    const splitBill = await SplitBill.findById(req.params.id)
      .populate('transaction')
      .populate('creator', 'name email')
      .populate('participants.user', 'name email');

    if (!splitBill) {
      return res.status(404).json({
        success: false,
        message: 'División no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: splitBill
    });
  } catch (error) {
    console.error('Error getting split bill:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener división'
    });
  }
};

/**
 * @desc    Actualizar asignación de items
 * @route   PATCH /api/split-bill/:id/assign
 * @access  Private
 */
const updateItemAssignment = async (req, res) => {
  try {
    const { participantId, assignedItems } = req.body;

    const splitBill = await SplitBill.findById(req.params.id);
    if (!splitBill) {
      return res.status(404).json({
        success: false,
        message: 'División no encontrada'
      });
    }

    // Verificar permisos
    if (splitBill.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede modificar asignaciones'
      });
    }

    // Actualizar participante
    const participant = splitBill.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participante no encontrado'
      });
    }

    participant.assignedItems = assignedItems;

    // Recalcular distribución
    await splitBill.calculateDistribution();
    await splitBill.save();

    res.status(200).json({
      success: true,
      data: splitBill
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar asignación'
    });
  }
};

/**
 * @desc    Marcar como pagado
 * @route   PATCH /api/split-bill/:id/mark-paid/:participantId
 * @access  Private
 */
const markAsPaid = async (req, res) => {
  try {
    const { id, participantId } = req.params;

    const splitBill = await SplitBill.findById(id);
    if (!splitBill) {
      return res.status(404).json({
        success: false,
        message: 'División no encontrada'
      });
    }

    const participant = splitBill.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participante no encontrado'
      });
    }

    participant.paid = !participant.paid;
    splitBill.markModified('participants');
    await splitBill.save();

    res.status(200).json({
      success: true,
      data: splitBill,
      message: participant.paid ? 'Marcado como pagado' : 'Marcado como no pagado'
    });
  } catch (error) {
    console.error('Error marking as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado'
    });
  }
};

/**
 * @desc    Obtener divisiones de una transacción
 * @route   GET /api/split-bill/transaction/:transactionId
 * @access  Private
 */
const getSplitsByTransaction = async (req, res) => {
  try {
    const splits = await SplitBill.find({ transaction: req.params.transactionId })
      .populate('creator', 'name email')
      .populate('participants.user', 'name email');

    res.status(200).json({
      success: true,
      count: splits.length,
      data: splits
    });
  } catch (error) {
    console.error('Error getting splits:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener divisiones'
    });
  }
};

/**
 * @desc    Eliminar una división
 * @route   DELETE /api/split-bill/:id
 * @access  Private
 */
const deleteSplitBill = async (req, res) => {
  try {
    const splitBill = await SplitBill.findById(req.params.id);
    
    if (!splitBill) {
      return res.status(404).json({
        success: false,
        message: 'División no encontrada'
      });
    }

    if (splitBill.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede eliminar la división'
      });
    }

    await splitBill.deleteOne();

    res.status(200).json({
      success: true,
      message: 'División eliminada'
    });
  } catch (error) {
    console.error('Error deleting split bill:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar división'
    });
  }
};

/**
 * @desc    Enviar recordatorio de pago
 * @route   POST /api/split-bill/:id/remind/:participantId
 * @access  Private
 */
const sendPaymentReminder = async (req, res) => {
  try {
    const { id, participantId } = req.params;

    const splitBill = await SplitBill.findById(id)
      .populate('creator', 'name')
      .populate('participants.user', 'name email');

    if (!splitBill) {
      return res.status(404).json({
        success: false,
        message: 'División no encontrada'
      });
    }

    const participant = splitBill.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participante no encontrado'
      });
    }

    // TODO: Implementar envío de notificación/email
    // Por ahora solo simulamos
    console.log(`Recordatorio enviado a ${participant.name} por ${splitBill.creator.name}`);

    res.status(200).json({
      success: true,
      message: `Recordatorio enviado a ${participant.name}`
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar recordatorio'
    });
  }
};

module.exports = {
  createSplitBill,
  getSplitBill,
  updateItemAssignment,
  markAsPaid,
  getSplitsByTransaction,
  deleteSplitBill,
  sendPaymentReminder
};
