const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    serviceName: { type: String, required: true, trim: true },
    description: { type: String, trim: true }, // E.g. "Premium", "Duo", "Family"
    iconUrl: { type: String }, // Custom icon URL
    
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },

    billingDay: { type: Number, required: true, min: 1, max: 31 },
    nextBillingDate: { type: Date },

    isShared: { type: Boolean, default: false },
    members: [
      {
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
        name: String,
        email: String,
        avatar: String,
        shareAmount: Number // Calculated amount for this person
      }
    ],

    // Historial de pagos mensuales
    paymentHistory: [
      {
        month: { type: Number, required: true }, // 1-12
        year: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        paidDate: { type: Date },
        amount: { type: Number, required: true },
        isPaid: { type: Boolean, default: false },
        // Para planes compartidos: estado de pago de cada miembro
        memberPayments: [
          {
            contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
            name: String,
            shareAmount: Number,
            isPaid: { type: Boolean, default: false },
            paidDate: { type: Date }
          }
        ]
      }
    ],

    notify24hBefore: { type: Boolean, default: true },

    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
  },
  { timestamps: true }
);

SubscriptionSchema.pre('save', function () {
  if (!this.nextBillingDate) {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);

    const day = Math.min(Math.max(this.billingDay || 1, 1), 31);
    next.setDate(day);

    if (next < now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(day);
    }

    this.nextBillingDate = next;
  }
});

// Método para obtener el estado actual de la suscripción
SubscriptionSchema.methods.getPaymentStatus = function() {
  const now = new Date();
  const dueDate = new Date(this.nextBillingDate);
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  
  // Buscar el pago del mes actual
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentPayment = this.paymentHistory.find(
    p => p.month === currentMonth && p.year === currentYear
  );
  
  if (currentPayment && currentPayment.isPaid) {
    return 'paid';
  } else if (daysUntilDue < 0) {
    return 'overdue';
  } else if (daysUntilDue <= 3) {
    return 'due_soon';
  } else {
    return 'pending';
  }
};

// Método para confirmar un pago
SubscriptionSchema.methods.confirmPayment = function(month, year) {
  const payment = this.paymentHistory.find(
    p => p.month === month && p.year === year
  );
  
  if (payment) {
    payment.isPaid = true;
    payment.paidDate = new Date();
  } else {
    // Crear nuevo registro de pago
    const dueDate = new Date(year, month - 1, this.billingDay);
    this.paymentHistory.push({
      month,
      year,
      dueDate,
      paidDate: new Date(),
      amount: this.amount,
      isPaid: true,
      memberPayments: this.members.map(m => ({
        contactId: m.contactId,
        name: m.name,
        shareAmount: m.shareAmount,
        isPaid: false
      }))
    });
  }
  
  // Actualizar nextBillingDate al siguiente mes
  const nextDate = new Date(year, month, this.billingDay);
  this.nextBillingDate = nextDate;
  
  return this.save();
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);
