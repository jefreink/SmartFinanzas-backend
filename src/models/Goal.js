/**
 * Modelo de Meta de Ahorro (Goal)
 * Almacena los objetivos financieros del usuario.
 */
const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Nombre de la meta requerido'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Monto objetivo requerido'],
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    isViceFund: {
      type: Boolean,
      default: false,
      description: 'Si es true, esta meta recibe el impuesto al vicio automáticamente',
    },
    deadline: {
      type: Date,
    },
    targetDate: {
      type: Date,
      description: 'Fecha objetivo para completar la meta',
    },
    recommendedDailyAmount: {
      type: Number,
      default: 0,
      description: 'Cantidad recomendada a ahorrar diariamente',
    },
    recommendedWeeklyAmount: {
      type: Number,
      default: 0,
      description: 'Cantidad recomendada a ahorrar semanalmente',
    },
    recommendedMonthlyAmount: {
      type: Number,
      default: 0,
      description: 'Cantidad recomendada a ahorrar mensualmente',
    },
    icon: {
      type: String,
      default: '🎯',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    color: {
      type: String,
      default: '#00F5FF' // Default Neon Cyan
    },
    category: {
      type: String,
      enum: ['emergency', 'travel', 'purchase', 'investment', 'education', 'other'],
      default: 'other',
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Virtual: Progreso de la meta en porcentaje
 */
GoalSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

/**
 * Virtual: Cantidad restante para completar la meta
 */
GoalSchema.virtual('amountRemaining').get(function() {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

/**
 * Virtual: Días restantes hasta la fecha objetivo
 */
GoalSchema.virtual('daysRemaining').get(function() {
  if (!this.targetDate) return null;
  const today = new Date();
  const target = new Date(this.targetDate);
  const diff = target - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * Método: Añadir fondos a la meta
 */
GoalSchema.methods.addFunds = async function(amount) {
  this.currentAmount += amount;
  if (this.currentAmount >= this.targetAmount) {
    this.status = 'completed';
  }
  return this.save();
};

// Asegurar que los virtuals sean incluidos en JSON
GoalSchema.set('toJSON', { virtuals: true });
GoalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', GoalSchema);
