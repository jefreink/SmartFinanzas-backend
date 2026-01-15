/**
 * Controlador de División de Gastos (Split Bill)
 * 
 * Maneja la lógica de división de cuentas entre múltiples personas.
 * Incluye división equitativa, por ítem y cálculo de propina proporcional.
 */
const SplitBill = require('../models/SplitBill');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

/**
 * @desc    Crear nueva división de cuenta
 * @route   POST /api/split/create
 * @access  Private
 */
exports.createSplit = async (req, res) => {
  try {
    const { transactionId, splitType, participants, tipAmount, tipDistribution, notes } = req.body;

    // Validar que la transacción existe
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transacción no encontrada'
      });
    }

    // Validar que el usuario es dueño de la transacción
    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para dividir esta transacción'
      });
    }

    // Validar participantes
    if (!participants || participants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Debe haber al menos 2 participantes'
      });
    }

    const totalAmount = transaction.totalAmount;
    const tipValue = tipAmount || 0;
    const grandTotal = totalAmount + tipValue;

    // Crear objeto de división
    const splitData = {
      transaction: transactionId,
      creator: req.user.id,
      splitType,
      participants: participants.map(p => ({
        name: p.name,
        avatar: p.avatar || null,
        user: p.userId || null,
        assignedItems: [],
        subtotal: 0,
        tipAmount: 0,
        total: 0,
        paid: false,
      })),
      tipAmount: tipValue,
      tipDistribution: tipDistribution || 'proportional',
      totalAmount,
      grandTotal,
      status: 'active',
      notes: notes || '',
    };

    const split = await SplitBill.create(splitData);

    // Si es división equitativa, calcular automáticamente
    if (splitType === 'equal') {
      split.splitEqually();
      await split.save();
    }

    res.status(201).json({
      success: true,
      data: split,
      message: splitType === 'equal' 
        ? 'División equitativa creada exitosamente'
        : 'División por ítem creada. Asigna los productos a cada participante.'
    });

  } catch (err) {
    console.error('Error al crear división:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Asignar items a participantes (para división por ítem)
 * @route   PUT /api/split/:id/assign-items
 * @access  Private
 */
exports.assignItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignments } = req.body; // Array de { participantId, itemIds[] }

    const split = await SplitBill.findById(id).populate('transaction');
    
    if (!split) {
      return res.status(404).json({
        success: false,
        error: 'División no encontrada'
      });
    }

    // Validar permisos
    if (split.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para modificar esta división'
      });
    }

    if (split.splitType !== 'by-item') {
      return res.status(400).json({
        success: false,
        error: 'Esta división no es por ítem'
      });
    }

    // Obtener items de la transacción
    const transactionItems = split.transaction.items || [];
    
    if (transactionItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La transacción no tiene items para dividir'
      });
    }

    // Aplicar asignaciones
    assignments.forEach(assignment => {
      const participant = split.participants.id(assignment.participantId);
      if (participant) {
        participant.assignedItems = assignment.itemIds;
        
        // Calcular subtotal
        let subtotal = 0;
        assignment.itemIds.forEach(itemId => {
          const item = transactionItems.find(i => i._id.toString() === itemId.toString());
          if (item) {
            subtotal += item.price * item.quantity;
          }
        });
        participant.subtotal = subtotal;
      }
    });

    // Recalcular propinas
    split.calculateTipDistribution();

    await split.save();

    res.status(200).json({
      success: true,
      data: split,
      message: 'Items asignados exitosamente'
    });

  } catch (err) {
    console.error('Error al asignar items:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Actualizar propina y recalcular
 * @route   PUT /api/split/:id/tip
 * @access  Private
 */
exports.updateTip = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipAmount, tipDistribution } = req.body;

    const split = await SplitBill.findById(id);
    
    if (!split) {
      return res.status(404).json({
        success: false,
        error: 'División no encontrada'
      });
    }

    if (split.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para modificar esta división'
      });
    }

    // Actualizar valores
    split.tipAmount = tipAmount || 0;
    split.grandTotal = split.totalAmount + split.tipAmount;
    
    if (tipDistribution) {
      split.tipDistribution = tipDistribution;
    }

    // Recalcular distribución
    split.calculateTipDistribution();

    await split.save();

    res.status(200).json({
      success: true,
      data: split,
      message: 'Propina actualizada'
    });

  } catch (err) {
    console.error('Error al actualizar propina:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Marcar participante como pagado
 * @route   PUT /api/split/:id/mark-paid/:participantId
 * @access  Private
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id, participantId } = req.params;

    const split = await SplitBill.findById(id);
    
    if (!split) {
      return res.status(404).json({
        success: false,
        error: 'División no encontrada'
      });
    }

    const participant = split.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participante no encontrado'
      });
    }

    participant.paid = true;

    // Verificar si todos pagaron
    const allPaid = split.participants.every(p => p.paid);
    if (allPaid) {
      split.status = 'completed';
    }

    await split.save();

    res.status(200).json({
      success: true,
      data: split,
      message: allPaid ? 'Todos han pagado. División completada.' : 'Pago registrado'
    });

  } catch (err) {
    console.error('Error al marcar como pagado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener detalle de una división
 * @route   GET /api/split/:id
 * @access  Private
 */
exports.getSplitDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const split = await SplitBill.findById(id)
      .populate('transaction')
      .populate('creator', 'name email');
    
    if (!split) {
      return res.status(404).json({
        success: false,
        error: 'División no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: split
    });

  } catch (err) {
    console.error('Error al obtener división:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener divisiones del usuario
 * @route   GET /api/split/my-splits
 * @access  Private
 */
exports.getMySplits = async (req, res) => {
  try {
    const splits = await SplitBill.find({ creator: req.user.id })
      .populate('transaction', 'merchant totalAmount date')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: splits.length,
      data: splits
    });

  } catch (err) {
    console.error('Error al obtener divisiones:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Cancelar división
 * @route   DELETE /api/split/:id
 * @access  Private
 */
exports.cancelSplit = async (req, res) => {
  try {
    const { id } = req.params;

    const split = await SplitBill.findById(id);
    
    if (!split) {
      return res.status(404).json({
        success: false,
        error: 'División no encontrada'
      });
    }

    if (split.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para cancelar esta división'
      });
    }

    split.status = 'cancelled';
    await split.save();

    res.status(200).json({
      success: true,
      message: 'División cancelada'
    });

  } catch (err) {
    console.error('Error al cancelar división:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
