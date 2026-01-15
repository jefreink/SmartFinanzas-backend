/**
 * Modelo de División de Gastos (SplitBill)
 * 
 * Gestiona la división de cuentas de restaurantes entre múltiples personas.
 * Soporta división equitativa y por ítem consumido.
 * Incluye cálculo proporcional de propina.
 * 
 * @model SplitBill
 */
const mongoose = require('mongoose');

/**
 * Esquema de participante en la división
 */
const ParticipantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'Usuario si está registrado en la app'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Nombre del participante (puede no estar registrado)'
  },
  avatar: {
    type: String,
    description: 'URL del avatar o emoji representativo'
  },
  assignedItems: [{
    type: mongoose.Schema.Types.ObjectId,
    description: 'IDs de los items asignados a esta persona'
  }],
  subtotal: {
    type: Number,
    default: 0,
    description: 'Suma de los items asignados'
  },
  tipAmount: {
    type: Number,
    default: 0,
    description: 'Propina proporcional calculada'
  },
  total: {
    type: Number,
    default: 0,
    description: 'Subtotal + Propina'
  },
  paid: {
    type: Boolean,
    default: false,
    description: 'Indica si el participante ya pagó'
  }
});

/**
 * Esquema principal de división de cuenta
 */
const SplitBillSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      description: 'Transacción original que se está dividiendo'
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'Usuario que creó la división'
    },
    splitType: {
      type: String,
      enum: ['equal', 'by-item'],
      required: true,
      description: 'Tipo de división: equitativa o por ítem'
    },
    participants: [ParticipantSchema],
    tipAmount: {
      type: Number,
      default: 0,
      description: 'Propina total (antes de dividir)'
    },
    tipDistribution: {
      type: String,
      enum: ['equal', 'proportional'],
      default: 'proportional',
      description: 'Cómo se distribuye la propina: igual para todos o proporcional al consumo'
    },
    totalAmount: {
      type: Number,
      required: true,
      description: 'Monto total de la cuenta (sin propina)'
    },
    grandTotal: {
      type: Number,
      required: true,
      description: 'Monto total incluyendo propina'
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      description: 'Estado de la división'
    },
    notes: {
      type: String,
      description: 'Notas adicionales sobre la división'
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Método para calcular y distribuir la propina
 */
SplitBillSchema.methods.calculateTipDistribution = function() {
  if (this.participants.length === 0) return;

  if (this.tipDistribution === 'equal') {
    // Dividir propina equitativamente
    const tipPerPerson = this.tipAmount / this.participants.length;
    this.participants.forEach(participant => {
      participant.tipAmount = Math.round(tipPerPerson);
    });
  } else {
    // Propina proporcional al consumo
    const totalSubtotal = this.participants.reduce((sum, p) => sum + p.subtotal, 0);
    
    if (totalSubtotal > 0) {
      this.participants.forEach(participant => {
        const proportion = participant.subtotal / totalSubtotal;
        participant.tipAmount = Math.round(this.tipAmount * proportion);
      });
    }
  }

  // Actualizar totales
  this.participants.forEach(participant => {
    participant.total = participant.subtotal + participant.tipAmount;
  });

  // Ajustar por redondeo (asegurar que la suma sea exacta)
  const calculatedGrandTotal = this.participants.reduce((sum, p) => sum + p.total, 0);
  const difference = this.grandTotal - calculatedGrandTotal;
  
  if (difference !== 0 && this.participants.length > 0) {
    // Ajustar la diferencia al primer participante
    this.participants[0].total += difference;
  }
};

/**
 * Método para dividir equitativamente
 */
SplitBillSchema.methods.splitEqually = function() {
  if (this.participants.length === 0) return;

  const amountPerPerson = Math.floor(this.totalAmount / this.participants.length);
  const remainder = this.totalAmount % this.participants.length;

  this.participants.forEach((participant, index) => {
    // El primero se lleva el residuo
    participant.subtotal = amountPerPerson + (index === 0 ? remainder : 0);
  });

  this.calculateTipDistribution();
};

/**
 * Índice para búsquedas eficientes
 */
SplitBillSchema.index({ transaction: 1 });
SplitBillSchema.index({ creator: 1, createdAt: -1 });
SplitBillSchema.index({ status: 1 });

module.exports = mongoose.model('SplitBill', SplitBillSchema);
