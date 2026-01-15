const mongoose = require('mongoose');

/**
 * CommonProduct Schema
 * Almacena productos comunes con sus categorías e imágenes
 * Permite búsquedas eficientes y coincidencias por palabra clave
 */
const CommonProductSchema = new mongoose.Schema(
  {
    // Nombre principal del producto
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    
    // Categoría del producto
    category: {
      type: String,
      enum: [
        'Lácteos',
        'Frutas',
        'Verduras',
        'Hortalizas',
        'Carnes',
        'Pescado',
        'Panadería',
        'Bebidas',
        'Condimentos',
        'Granos'
      ],
      required: true
    },
    
    // URL de la imagen (ruta local del servidor)
    imageUrl: {
      type: String,
      required: true
    },
    
    // Palabras clave alternativas para búsqueda
    // Ej: cebolla -> ['morada', 'blanca', 'roja', 'cebollas']
    keywords: {
      type: [String],
      default: [],
      lowercase: true
    },
    
    // Variantes del nombre (singulares/plurales)
    // Ej: leche -> ['leches', 'lechita', 'lacteo']
    aliases: {
      type: [String],
      default: [],
      lowercase: true
    },
    
    // Si es un producto básico/común
    isCommon: {
      type: Boolean,
      default: true
    },
    
    // Contador de búsquedas (para Analytics)
    searchCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Índices para búsqueda rápida
CommonProductSchema.index({ name: 'text', keywords: 'text', aliases: 'text', category: 1 });
CommonProductSchema.index({ category: 1 });
CommonProductSchema.index({ name: 1 });

module.exports = mongoose.model('CommonProduct', CommonProductSchema);
