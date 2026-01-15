const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String }, // URL de la imagen (PNG de Google)
  lastPrice: { type: Number },
  category: { type: String }
});

const MerchantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  logoUrl: {
    type: String
  },
  defaultCategory: {
    type: String
  },
  // Coordenadas GPS para Geofencing
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    },
    address: String
  },
  // Lista de productos que sueles comprar aquí
  products: [ProductSchema],
  lastVisit: {
    type: Date,
    default: Date.now
  },
  visitCount: {
    type: Number,
    default: 1
  }
});

// Evitar duplicados por usuario + nombre de comercio
MerchantSchema.index({ user: 1, name: 1 }, { unique: true });

// Índice geoespacial para búsquedas por proximidad
MerchantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Merchant', MerchantSchema);
