/**
 * commonProductsSeeds.js
 * Script para llenar la BD con productos comunes
 * Ejecutar: node src/seeds/commonProductsSeeds.js
 */

const mongoose = require('mongoose');
const CommonProduct = require('../models/CommonProduct');
require('dotenv').config();

const commonProducts = [
  // Lácteos
  {
    name: 'leche',
    category: 'Lácteos',
    imageUrl: '/uploads/inventory/leche',
    keywords: ['lechita', 'lacteo', 'descremada', 'entera', 'light'],
    aliases: ['leches']
  },
  {
    name: 'yogurt',
    category: 'Lácteos',
    imageUrl: '/uploads/inventory/yogurt',
    keywords: ['yogur', 'yoghurt', 'batido', 'naturaleza'],
    aliases: ['yogurts']
  },
  {
    name: 'queso',
    category: 'Lácteos',
    imageUrl: '/uploads/inventory/queso',
    keywords: ['quesillo', 'cheddar', 'mozzarella', 'fresco', 'untable'],
    aliases: ['quesos']
  },
  {
    name: 'mantequilla',
    category: 'Lácteos',
    imageUrl: '/uploads/inventory/mantequilla',
    keywords: ['manteca', 'butter', 'clarificada', 'sin sal'],
    aliases: ['mantequillas']
  },
  {
    name: 'huevo',
    category: 'Lácteos',
    imageUrl: '/uploads/inventory/huevo',
    keywords: ['ovo', 'huevitos', 'clara', 'yema'],
    aliases: ['huevos']
  },

  // Frutas
  {
    name: 'manzana',
    category: 'Frutas',
    imageUrl: '/uploads/inventory/manzana',
    keywords: ['manzana roja', 'manzana verde', 'manzana amarilla', 'gala', 'fuji'],
    aliases: ['manzanas']
  },
  {
    name: 'banana',
    category: 'Frutas',
    imageUrl: '/uploads/inventory/banana',
    keywords: ['plátano', 'banano', 'platano'],
    aliases: ['bananas', 'plátanos']
  },
  {
    name: 'naranja',
    category: 'Frutas',
    imageUrl: '/uploads/inventory/naranja',
    keywords: ['china', 'citrico', 'zumo', 'jugo'],
    aliases: ['naranjas']
  },
  {
    name: 'pera',
    category: 'Frutas',
    imageUrl: '/uploads/inventory/pera',
    keywords: ['pera verde', 'pera roja', 'williams'],
    aliases: ['peras']
  },
  {
    name: 'fresa',
    category: 'Frutas',
    imageUrl: '/uploads/inventory/fresa',
    keywords: ['frutilla', 'berry', 'berries', 'fresitas'],
    aliases: ['fresas']
  },

  // Verduras
  {
    name: 'tomate',
    category: 'Verduras',
    imageUrl: '/uploads/inventory/tomate',
    keywords: ['tomate rojo', 'tomate cherry', 'tomate verde', 'tomatero'],
    aliases: ['tomates']
  },
  {
    name: 'cebolla',
    category: 'Verduras',
    imageUrl: '/uploads/inventory/cebolla',
    keywords: ['cebolla morada', 'cebolla blanca', 'cebolla roja', 'cebollas'],
    aliases: ['cebollas']
  },
  {
    name: 'zanahoria',
    category: 'Verduras',
    imageUrl: '/uploads/inventory/zanahoria',
    keywords: ['zanahoria naranja', 'zanahoriitas', 'baby'],
    aliases: ['zanahorias']
  },
  {
    name: 'papa',
    category: 'Verduras',
    imageUrl: '/uploads/inventory/papa',
    keywords: ['papas', 'patata', 'papa criolla', 'papa blanca'],
    aliases: ['patatas']
  },
  {
    name: 'ajo',
    category: 'Verduras',
    imageUrl: '/uploads/inventory/ajo',
    keywords: ['diente de ajo', 'ajito', 'ajo morado', 'ajo blanco'],
    aliases: ['ajos']
  },
  {
    name: 'lechuga',
    category: 'Verduras',
    imageUrl: '/uploads/inventory/lechuga',
    keywords: ['lechuga crespa', 'lechuga romana', 'lechuga mantequilla', 'lechuguita'],
    aliases: ['lechugas']
  },

  // Carnes
  {
    name: 'pollo',
    category: 'Carnes',
    imageUrl: '/uploads/inventory/pollo',
    keywords: ['pechuga', 'muslo', 'alita', 'entero', 'piel'],
    aliases: ['pollos']
  },
  {
    name: 'carne',
    category: 'Carnes',
    imageUrl: '/uploads/inventory/carne',
    keywords: ['carne molida', 'carne roja', 'bistec', 'carne magra'],
    aliases: ['carnes']
  },
  {
    name: 'pescado',
    category: 'Pescado',
    imageUrl: '/uploads/inventory/pescado',
    keywords: ['filete', 'entero', 'trucha', 'merluza', 'bagre'],
    aliases: ['pescados']
  },

  // Lácteos derivados - Granos y Harinas
  {
    name: 'harina',
    category: 'Granos',
    imageUrl: '/uploads/inventory/harina',
    keywords: ['harina de trigo', 'harina integral', 'harina común'],
    aliases: ['harinas']
  },
  {
    name: 'arroz',
    category: 'Granos',
    imageUrl: '/uploads/inventory/arroz',
    keywords: ['arroz blanco', 'arroz integral', 'arroz integral', 'grano largo'],
    aliases: ['arroces']
  },
  {
    name: 'pasta',
    category: 'Granos',
    imageUrl: '/uploads/inventory/pasta',
    keywords: ['fideos', 'spaghetti', 'penne', 'tallarín'],
    aliases: ['pastas']
  },
  {
    name: 'pan',
    category: 'Panadería',
    imageUrl: '/uploads/inventory/pan',
    keywords: ['pan blanco', 'pan integral', 'pan francés', 'pan molde'],
    aliases: ['panes']
  },

  // Bebidas
  {
    name: 'agua',
    category: 'Bebidas',
    imageUrl: '/uploads/inventory/agua',
    keywords: ['agua mineral', 'agua purificada', 'agua destilada'],
    aliases: ['aguas']
  },
  {
    name: 'jugo',
    category: 'Bebidas',
    imageUrl: '/uploads/inventory/jugo',
    keywords: ['jugo natural', 'jugo de naranja', 'zumo', 'juguito'],
    aliases: ['jugos']
  },

  // Condimentos
  {
    name: 'aceite',
    category: 'Condimentos',
    imageUrl: '/uploads/inventory/aceite',
    keywords: ['aceite de oliva', 'aceite vegetal', 'aceite girasol', 'aceite premium'],
    aliases: ['aceites']
  },
  {
    name: 'sal',
    category: 'Condimentos',
    imageUrl: '/uploads/inventory/sal',
    keywords: ['sal fina', 'sal gruesa', 'sal marina', 'sal yodada'],
    aliases: ['sales']
  },
  {
    name: 'ketchup',
    category: 'Condimentos',
    imageUrl: '/uploads/inventory/ketchup',
    keywords: ['catsup', 'salsa de tomate'],
    aliases: ['ketchups']
  },
  {
    name: 'mayonesa',
    category: 'Condimentos',
    imageUrl: '/uploads/inventory/mayonesa',
    keywords: ['mayo', 'mayonesa light', 'mayonesa casera'],
    aliases: ['mayonesas']
  }
];

async function seedCommonProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartFinanzas');
    console.log('Conectado a MongoDB');

    // Limpiar productos previos (opcional)
    // await CommonProduct.deleteMany({});

    // Insertar productos comunes
    const inserted = await CommonProduct.insertMany(commonProducts, { ordered: false });
    console.log(`✅ ${inserted.length} productos comunes insertados correctamente`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al insertar productos:', error.message);
    if (error.code === 11000) {
      console.log('ℹ️  Los productos ya existen en la BD');
      process.exit(0);
    }
    process.exit(1);
  }
}

seedCommonProducts();
