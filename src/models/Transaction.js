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
  imageUrl: { type: String }, // URL/Path de la imagen del ítem
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Para Split Bills
});

/**
 * Esquema para participante en división de gastos
 */
const SplitParticipantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subtotal: { type: Number, required: true }, // Lo que pagó del subtotal
  tipAmount: { type: Number, default: 0 }, // Su porción de propina
  total: { type: Number, required: true }, // subtotal + tipAmount
  itemsAssigned: [Number], // Índices de items del array items asignados a este participante
  isMe: { type: Boolean, default: false } // Si es el usuario que creó la transacción
});

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }, // Link to Trip
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
    merchant: { type: String }, // Nombre del comercio o descripción
    payer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
      name: { type: String }
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
    },
    // División de gastos (Cuando la cuenta se divide entre varias personas)
    isSplit: {
      type: Boolean,
      default: false,
      description: 'Si la transacción está dividida entre múltiples personas'
    },
    splitType: {
      type: String,
      enum: ['equal', 'by-item', null],
      description: 'Tipo de división: equitativa (igual para todos) o por ítem (cada quien paga sus items)'
    },
    tip: {
      type: Number,
      default: 0,
      description: 'Propina total antes de dividir'
    },
    splitParticipants: [SplitParticipantSchema],
    subtotal: {
      type: Number,
      description: 'Subtotal sin propina (totalAmount - tip)'
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
