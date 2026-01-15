const Loan = require('../models/Loan');
const User = require('../models/User');
const { getIo } = require('../utils/socket');

// Crear préstamo
exports.createLoan = async (req, res) => {
  try {
    const { amount, currency, borrowerId, borrowerName, dueDate, notes, role, otherName } = req.body;
    
    if (!amount) return res.status(400).json({ success: false, message: 'Amount required' });
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    // role: 'lender' (yo presto) or 'borrower' (yo debo)
    let payload = {
      amount: Number(amount),
      currency: currency || 'CLP',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes || '',
      createdBy: req.user._id,
    };

    if (role === 'borrower') {
      // El usuario autenticado es el borrower (deuda): lender = borrowerId/otherName/borrowerName
      payload.borrower = req.user._id;
      payload.borrowerName = req.user.name || '';
      
      if (borrowerId) {
        // Si hay ID de lender, usarlo
        payload.lender = borrowerId;
      } else if (otherName || borrowerName) {
        // Si no hay ID pero hay nombre, usar lenderName
        payload.lenderName = otherName || borrowerName;
      } else {
        // Si no hay nada especificado, error
        return res.status(400).json({ success: false, message: 'Lender name or ID required' });
      }
    } else {
      // role === 'lender' (por defecto) el usuario es lender
      payload.lender = req.user._id;
      payload.lenderName = req.user.name || '';
      
      if (borrowerId) {
        payload.borrower = borrowerId;
      } else if (borrowerName) {
        payload.borrowerName = borrowerName;
      }
      // No hay problema si no hay borrower especificado (se puede dejar vacío)
    }

    console.log('Creating loan with payload:', payload);
    
    const loan = await Loan.create(payload);
    
    // Populate antes de responder
    const populated = await Loan.findById(loan._id)
      .populate('lender', 'name email avatar')
      .populate('borrower', 'name email avatar');

    res.json({ success: true, loan: populated });
    
    // Emitir evento en tiempo real
    try {
      const io = getIo();
      if (io) {
        // Notificar a lender y borrower si son usuarios
        if (populated.lender) io.to(`user:${populated.lender._id.toString()}`).emit('loan.created', populated);
        if (populated.borrower) io.to(`user:${populated.borrower._id.toString()}`).emit('loan.created', populated);
      }
    } catch (e) { console.error('emit loan.created error', e); }
  } catch (error) {
    console.error('createLoan error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error',
      details: error.errors ? Object.keys(error.errors) : undefined
    });
  }
};

// Obtener préstamos relevantes para el usuario (prestados o que debe pagar)
exports.getLoans = async (req, res) => {
  try {
    const userId = req.user._id;
    const loans = await Loan.find({ $or: [{ lender: userId }, { borrower: userId }] })
      .populate('lender', 'name email avatar')
      .populate('borrower', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, loans });
  } catch (error) {
    console.error('getLoans error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Obtener detalle
exports.getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('lender', 'name email avatar')
      .populate('borrower', 'name email avatar');
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    // verificar permiso: lender o borrower
    const userId = req.user._id.toString();
    const lenderId = loan.lender ? loan.lender._id.toString() : null;
    const borrowerId = loan.borrower ? loan.borrower._id.toString() : null;
    if (lenderId !== userId && borrowerId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, loan });
  } catch (error) {
    console.error('getLoanById error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Acciones: marcar pagado (por borrower) o confirmar pagado (por lender)
exports.markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'mark_paid' | 'confirm_paid'
    const loan = await Loan.findById(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const userId = req.user._id.toString();

    if (action === 'mark_paid') {
      // borrower marks as paid
      const borrowerId = loan.borrower ? loan.borrower.toString() : null;
      if (!borrowerId || borrowerId !== userId) {
        return res.status(403).json({ success: false, message: 'Only borrower can mark as paid' });
      }
      loan.status = 'marked_paid';
      // Registrar pago completo
      loan.paidAmount = loan.amount;
      if (!loan.paymentHistory) loan.paymentHistory = [];
      loan.paymentHistory.push({
        type: 'payment',
        amount: loan.amount,
        date: new Date(),
        method: 'Transferencia bancaria',
        status: 'completed'
      });
      await loan.save();
      
      // Populate antes de emitir
      const populated = await Loan.findById(loan._id)
        .populate('lender', 'name email avatar')
        .populate('borrower', 'name email avatar');
      
      try {
        const io = getIo();
        if (io) {
          if (populated.lender) io.to(`user:${populated.lender._id.toString()}`).emit('loan.updated', populated);
          if (populated.borrower) io.to(`user:${populated.borrower._id.toString()}`).emit('loan.updated', populated);
        }
      } catch (e) { console.error('emit loan.updated (mark_paid) error', e); }
      return res.json({ success: true, loan: populated });
    }

    if (action === 'confirm_paid') {
      // lender confirms payment
      const lenderId = loan.lender ? loan.lender.toString() : null;
      if (!lenderId || lenderId !== userId) {
        return res.status(403).json({ success: false, message: 'Only lender can confirm payment' });
      }
      loan.status = 'paid';
      loan.paidAt = new Date();
      await loan.save();
      
      // Populate antes de emitir
      const populated = await Loan.findById(loan._id)
        .populate('lender', 'name email avatar')
        .populate('borrower', 'name email avatar');
      
      try {
        const io = getIo();
        if (io) {
          if (populated.lender) io.to(`user:${populated.lender._id.toString()}`).emit('loan.updated', populated);
          if (populated.borrower) io.to(`user:${populated.borrower._id.toString()}`).emit('loan.updated', populated);
        }
      } catch (e) { console.error('emit loan.updated (confirm_paid) error', e); }
      return res.json({ success: true, loan: populated });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    console.error('markPaid error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Editar préstamo
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findById(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Solo el creador puede editar (simplificar permisos)
    if (loan.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit' });
    }

    const allowed = ['amount', 'currency', 'borrowerName', 'lenderName', 'dueDate', 'notes'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) loan[field] = req.body[field];
    });

    await loan.save();

    const populated = await Loan.findById(loan._id).populate('lender', 'name email').populate('borrower', 'name email');

    // Emitir evento update
    try {
      const io = getIo();
      if (io) {
        if (populated.lender) io.to(`user:${populated.lender.toString()}`).emit('loan.updated', populated);
        if (populated.borrower) io.to(`user:${populated.borrower.toString()}`).emit('loan.updated', populated);
      }
    } catch (e) { console.error('emit loan.updated (edit) error', e); }

    res.json({ success: true, loan: populated });
  } catch (error) {
    console.error('updateLoan error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Borrar préstamo
exports.deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findById(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Solo el creador puede borrar
    if (loan.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete' });
    }

    await loan.remove();

    try {
      const io = getIo();
      if (io) {
        if (loan.lender) io.to(`user:${loan.lender.toString()}`).emit('loan.deleted', { _id: loan._id });
        if (loan.borrower) io.to(`user:${loan.borrower.toString()}`).emit('loan.deleted', { _id: loan._id });
      }
    } catch (e) { console.error('emit loan.deleted error', e); }

    res.json({ success: true });
  } catch (error) {
    console.error('deleteLoan error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
