/**
 * Modelo de Ideas de Prosperidad (ProsperityIdea)
 * Seed data para sugerencias de ingresos extra.
 */
const mongoose = require('mongoose');

const ProsperityIdeaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    requiredSkills: {
      type: [String], // Skills necesarios para matchear
      default: [],
    },
    estimatedEarnings: {
      type: String, // Ej: "$50-$100 / hora"
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ProsperityIdea', ProsperityIdeaSchema);
