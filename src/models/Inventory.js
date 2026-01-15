/**
 * Modelo de Inventario (Inventory)
 * Gestiona los productos de la despensa y su frescura.
 */
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    unit: {
      type: String,
      default: 'unid', // kg, g, l, ml, etc.
    },
    category: {
      type: String,
      enum: ['perishable', 'non-perishable'], // Perecedero | No perecedero
      required: true,
    },
    productCategory: {
      type: String,
      default: null, // Categoría del producto: frutas, verduras, carnes, etc.
      // Ej: 'Frutas', 'Verduras', 'Carnes', 'Lácteos', 'Bebidas', etc.
    },
    expiryDate: {
      type: Date,
      // Obligatorio para no perecederos si se escanea, opcional si es fruta (calculado)
    },
    estimatedLifeDays: {
      type: Number, // Días estimados de vida útil (para frutas/verduras)
      default: 7 // Default 1 week for perishables if unknown
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['fresh', 'warning', 'critical', 'expired', 'consumed'],
      default: 'fresh',
    },
    sourceTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction', // Link a la compra original
    },
    freshnessScore: {
      type: Number, // 0-100, calculado por el backend
      default: 100
    },
    imageUrl: {
      type: String,
      default: null, // URL de imagen del producto
    },
    price: {
      type: Number,
      default: null, // Precio del producto
    },
    currency: {
      type: String,
      default: 'CLP', // Moneda del precio
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Método virtual para calcular días restantes
 */
InventorySchema.virtual('daysRemaining').get(function () {
  const today = new Date();
  
  if (this.expiryDate) {
    const diff = new Date(this.expiryDate) - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  // Si es estimado (Frutas/Verduras)
  if (this.purchaseDate && this.estimatedLifeDays) {
    const purchase = new Date(this.purchaseDate);
    const expiration = new Date(purchase);
    expiration.setDate(purchase.getDate() + this.estimatedLifeDays);
    const diff = expiration - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

module.exports = mongoose.model('Inventory', InventorySchema);
