const mongoose = require('mongoose');

/**
 * Schema para almacenar configuraciones de API keys
 * Permite gestionar de forma segura las keys de terceros (Gemini, etc)
 */
const ApiKeyConfigSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: ['gemini', 'openai', 'other'],
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

// Índice para búsqueda rápida por servicio
ApiKeyConfigSchema.index({ service: 1 });

// Método para validar que la key no esté vacía
ApiKeyConfigSchema.pre('save', function (next) {
  if (!this.apiKey || this.apiKey.trim().length === 0) {
    next(new Error('La API key no puede estar vacía'));
  } else {
    next();
  }
});

module.exports = mongoose.model('ApiKeyConfig', ApiKeyConfigSchema);
