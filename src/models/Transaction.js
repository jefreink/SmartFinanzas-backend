/**
 * Modelo de Transacción (Transaction)
 * Registro central de gastos e ingresos.
 * Implementa desglose de ítems (OCR) y Mood Tracking.
 */
const mongoose = require('mongoose');

const TransactionItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true },
  category: { type: String }, // Categoría específica del ítem (ej: 'Dairy', 'Alcohol')
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Para Split Bills
});

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    category: {
      type: String, // Ej: 'Food', 'Transport', 'Vice', 'Entertainment', 'Salary'
      required: true,
    },
    merchant: {
      type: String, // Nombre del comercio detectado por OCR o manual
      trim: true
    },
    date: {
      type: Date,
      default: Date.now,
    },
    items: [TransactionItemSchema], // Desglose de items provenientes del OCR
    mood: {
      type: String, 
      enum: ['happy', 'sad', 'stressed', 'neutral', 'excited', 'regret'],
      description: 'Estado de ánimo asociado al gasto (Psicología Financiera)'
    },
    isVice: {
      type: Boolean,
      default: false,
      description: 'Flag para activar el Impuesto al Vicio'
    },
    // Amount diverted to savings automatically if isVice is true
    viceTaxAmount: {
      type: Number, 
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'debit', 'credit', 'transfer'],
      default: 'cash',
    },
    installments: {
      current: { type: Number, default: 1 },
      total: { type: Number, default: 1 }
    },
    receiptImage: {
      type: String, // URL/Path de la imagen del recibo
    },
    metadata: {
      originalOcrData: mongoose.Schema.Types.Mixed, // Guardar raw data del OCR por debug
    }
  },
  {
    timestamps: true,
  }
);

// Índices para mejorar performance de reportes
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
