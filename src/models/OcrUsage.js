const mongoose = require('mongoose');

const ocrUsageSchema = new mongoose.Schema({
  month: {
    type: String, // Formato: "2026-01"
    required: true,
    unique: true
  },
  requestCount: {
    type: Number,
    default: 0
  },
  limit: {
    type: Number,
    default: 45000 // 1500 requests/día * 30 días
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  tokenLimit: {
    type: Number,
    default: 1000000 // 1 millón de tokens/mes (Gemini free)
  },
  lastRequest: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OcrUsage', ocrUsageSchema);
