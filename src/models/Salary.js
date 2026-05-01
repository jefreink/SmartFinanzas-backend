/**
 * Modelo de Sueldo (Salary)
 * Registro de ingresos mensuales fijos y variables
 */
const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'CLP',
    },
    type: {
      type: String,
      enum: ['fixed', 'variable', 'bonus', 'freelance', 'other'],
      default: 'fixed',
      description: 'Tipo de ingreso: fijo mensual, variable, bono, freelance, otro'
    },
    description: {
      type: String,
      trim: true,
    },
    // Fecha de inicio de vigencia (para histórico de sueldos)
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    // Si es sueldo actual activo
    isActive: {
      type: Boolean,
      default: true,
    },
    // Frecuencia de pago
    frequency: {
      type: String,
      enum: ['monthly', 'biweekly', 'weekly', 'daily'],
      default: 'monthly',
    },
    // Deducciones (ej: AFP, salud, etc. para calcular sueldo líquido)
    deductions: {
      pension: { type: Number, default: 0 }, // AFP
      health: { type: Number, default: 0 }, // Isapre/Fonasa
      other: { type: Number, default: 0 },  // Otros descuentos
    },
    // Porcentaje de ahorro automático recomendado
    recommendedSavingsPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas eficientes
SalarySchema.index({ user: 1, isActive: 1 });
SalarySchema.index({ user: 1, effectiveDate: -1 });

// Método virtual para obtener sueldo líquido
SalarySchema.virtual('netAmount').get(function() {
  const totalDeductions = 
    (this.deductions?.pension || 0) + 
    (this.deductions?.health || 0) + 
    (this.deductions?.other || 0);
  return Math.max(0, this.amount - totalDeductions);
});

// Método virtual para monto recomendado de ahorro
SalarySchema.virtual('recommendedSavingsAmount').get(function() {
  return (this.netAmount * this.recommendedSavingsPercent) / 100;
});

module.exports = mongoose.model('Salary', SalarySchema);
