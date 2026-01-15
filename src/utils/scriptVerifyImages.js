/**
 * scriptVerifyImages.js
 * Script para verificar y actualizar URLs de imágenes en la base de datos
 * Ejecutar con: node backend/src/utils/scriptVerifyImages.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const Inventory = require('../models/Inventory');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smartfinanzas';

async function verifyAndUpdateImages() {
  try {
    console.log('\n📊 VERIFICACIÓN DE IMÁGENES DE INVENTARIO\n');
    console.log('='.repeat(60));

    // Conectar a la base de datos
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a la base de datos\n');

    // Obtener todos los productos
    const products = await Inventory.find().select('_id name imageUrl category createdAt');
    console.log(`📦 Total de productos en inventario: ${products.length}\n`);

    let withImages = 0;
    let withoutImages = 0;
    let invalidUrls = 0;
    const productsWithoutImages = [];

    // Analizar cada producto
    for (const product of products) {
      if (product.imageUrl) {
        withImages++;
        // Verificar si es una URL válida
        if (!product.imageUrl.startsWith('http')) {
          console.log(`⚠️  ${product.name.padEnd(30)} - URL no válida: ${product.imageUrl.substring(0, 50)}...`);
          invalidUrls++;
        }
      } else {
        withoutImages++;
        productsWithoutImages.push({
          id: product._id,
          name: product.name,
          category: product.category,
          createdAt: product.createdAt
        });
      }
    }

    console.log(`\n📊 ESTADÍSTICAS:\n`);
    console.log(`  ✅ Con imagen asignada: ${withImages} (${((withImages/products.length)*100).toFixed(1)}%)`);
    console.log(`  ❌ Sin imagen asignada: ${withoutImages} (${((withoutImages/products.length)*100).toFixed(1)}%)`);
    console.log(`  ⚠️  URLs inválidas: ${invalidUrls}`);

    if (productsWithoutImages.length > 0 && productsWithoutImages.length <= 20) {
      console.log(`\n📋 PRODUCTOS SIN IMAGEN:\n`);
      productsWithoutImages.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name.padEnd(30)} (${p.category || 'Sin categoría'})`);
      });
    }

    if (productsWithoutImages.length > 20) {
      console.log(`\n📋 Mostrando primeros 20 de ${productsWithoutImages.length} productos sin imagen:\n`);
      productsWithoutImages.slice(0, 20).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name.padEnd(30)} (${p.category || 'Sin categoría'})`);
      });
      console.log(`  ... y ${productsWithoutImages.length - 20} más`);
    }

    // Verificar carpeta de imágenes
    const inventoryDir = path.join(__dirname, '../../uploads/inventory');
    try {
      const files = await fs.readdir(inventoryDir);
      console.log(`\n📁 IMÁGENES EN SERVIDOR:\n`);
      console.log(`  Carpeta: ${inventoryDir}`);
      console.log(`  Archivos: ${files.length}`);
      if (files.length > 0 && files.length <= 10) {
        console.log(`\n  Listado:`);
        files.forEach((f, i) => {
          console.log(`    ${i + 1}. ${f}`);
        });
      } else if (files.length > 10) {
        console.log(`\n  Primeros 10 archivos:`);
        files.slice(0, 10).forEach((f, i) => {
          console.log(`    ${i + 1}. ${f}`);
        });
        console.log(`    ... y ${files.length - 10} más`);
      }
    } catch (err) {
      console.log(`  ⚠️  La carpeta /uploads/inventory no existe aún`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 RECOMENDACIÓN:\n');
    if (withoutImages > 0) {
      console.log(`  Usa la pantalla de Gestor de Imágenes para cargar las ${withoutImages}`);
      console.log(`  imágenes faltantes desde pngwing.com y guardarlas en el servidor.\n`);
    } else {
      console.log(`  ✅ Todos los productos tienen imagen asignada.\n`);
    }

    await mongoose.disconnect();
    console.log('✅ Desconectado de la base de datos\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyAndUpdateImages();
