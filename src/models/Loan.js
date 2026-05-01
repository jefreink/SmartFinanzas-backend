const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  totalAmount: { type: Number }, // alias para compatibilidad con frontend
  currency: { type: String, default: 'CLP' },
  lender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Puede ser null si hay lenderName
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Puede ser null si hay borrowerName
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: false }, // Referencia a Contacto si no es Usuario
  borrowerName: { type: String },
  lenderName: { type: String },
  dueDate: { type: Date }, // Opcional - puede no haber vencimiento (ej: deudas por compras divididas)
  notes: { type: String },
  description: { type: String }, // alias para compatibilidad
  // Tipo de deuda: 'loan' (préstamo tradicional) o 'split-bill' (de una compra dividida)
  debtType: {
    type: String,
    enum: ['loan', 'split-bill'],
    default: 'loan',
    description: 'Tipo de deuda: préstamo o compra dividida'
  },
  // Referencia a la transacción dividida (si debtType es 'split-bill')
  sourceTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    description: 'Transacción original si es una deuda de compra dividida'
  },
  // status: 'pending' -> active, 'marked_paid' -> borrower marked paid, 'paid' -> confirmed by lender
  status: { type: String, enum: ['pending', 'marked_paid', 'paid'], default: 'pending' },
  paidAmount: { type: Number, default: 0 },
  paymentHistory: [{
    type: { type: String, enum: ['initial', 'payment'] },
    amount: Number,
    date: { type: Date, default: Date.now },
    method: String,
    status: { type: String, default: 'completed' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paidAt: { type: Date },
}, { timestamps: true });

// Validador personalizado: al menos uno de lender o lenderName debe existir
// Nota: usamos estilo "promise/sync" (sin next) para compatibilidad con Mongoose
LoanSchema.pre('save', function () {
  // Inicializar paymentHistory si no existe
  if (this.isNew && (!this.paymentHistory || this.paymentHistory.length === 0)) {
    this.paymentHistory = [{
      type: 'initial',
      amount: this.amount,
      date: new Date(),
      status: 'completed'
    }];
  }

  // Asegurar que totalAmount siempre sea igual a amount
  this.totalAmount = this.amount;

  // Validación: debe haber lender o lenderName
  if (!this.lender && !this.lenderName) {
    throw new Error('Either lender (user ID) or lenderName must be specified');
  }
});

module.exports = mongoose.model('Loan', LoanSchema);
