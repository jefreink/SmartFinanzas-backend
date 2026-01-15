const Subscription = require('../models/Subscription');

exports.createSubscription = async (req, res) => {
  try {
    const {
      serviceName,
      description,
      iconUrl,
      amount,
      currency,
      billingDay,
      nextBillingDate,
      isShared,
      members,
      notify24hBefore,
      status,
    } = req.body;

    if (!serviceName) return res.status(400).json({ success: false, message: 'serviceName required' });
    if (amount === undefined || amount === null) return res.status(400).json({ success: false, message: 'amount required' });
    if (!billingDay) return res.status(400).json({ success: false, message: 'billingDay required' });

    const subscription = await Subscription.create({
      owner: req.user._id,
      serviceName,
      description: description || '',
      iconUrl: iconUrl || '',
      amount: Number(amount),
      currency: currency || 'USD',
      billingDay: Number(billingDay),
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
      isShared: Boolean(isShared),
      members: Array.isArray(members) ? members : [],
      notify24hBefore: notify24hBefore !== undefined ? Boolean(notify24hBefore) : true,
      status: status || 'active',
    });

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('createSubscription error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { owner: req.user._id };
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query).sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error('getSubscriptions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('getSubscriptionById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: 'Not found' });

    const allowed = [
      'serviceName',
      'description',
      'iconUrl',
      'amount',
      'currency',
      'billingDay',
      'nextBillingDate',
      'isShared',
      'members',
      'notify24hBefore',
      'status',
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) subscription[field] = req.body[field];
    });

    await subscription.save();
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('updateSubscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: 'Not found' });

    await subscription.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error('deleteSubscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Confirmar pago de una suscripción
exports.confirmPayment = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }
    
    const subscription = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: 'Not found' });
    
    await subscription.confirmPayment(month, year);
    
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('confirmPayment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Confirmar pago de un miembro en plan compartido
exports.confirmMemberPayment = async (req, res) => {
  try {
    const { month, year, contactId } = req.body;
    
    if (!month || !year || !contactId) {
      return res.status(400).json({ 
        success: false, 
        message: 'month, year, and contactId are required' 
      });
    }
    
    const subscription = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Buscar el pago del mes
    let payment = subscription.paymentHistory.find(
      p => p.month === month && p.year === year
    );
    
    if (!payment) {
      // Crear registro de pago si no existe
      const dueDate = new Date(year, month - 1, subscription.billingDay);
      payment = {
        month,
        year,
        dueDate,
        amount: subscription.amount,
        isPaid: false,
        memberPayments: subscription.members.map(m => ({
          contactId: m.contactId,
          name: m.name,
          shareAmount: m.shareAmount,
          isPaid: false
        }))
      };
      subscription.paymentHistory.push(payment);
    }
    
    // Actualizar el pago del miembro
    const memberPayment = payment.memberPayments.find(
      mp => mp.contactId.toString() === contactId
    );
    
    if (memberPayment) {
      memberPayment.isPaid = true;
      memberPayment.paidDate = new Date();
    }
    
    // Verificar si todos pagaron (incluyendo el owner que siempre está "pagado")
    const allPaid = payment.memberPayments.every(mp => mp.isPaid);
    if (allPaid) {
      payment.isPaid = true;
      payment.paidDate = new Date();
    }
    
    await subscription.save();
    
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('confirmMemberPayment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Obtener historial de pagos
exports.getPaymentHistory = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: 'Not found' });
    
    res.json({ 
      success: true, 
      paymentHistory: subscription.paymentHistory,
      paymentStatus: subscription.getPaymentStatus()
    });
  } catch (error) {
    console.error('getPaymentHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

