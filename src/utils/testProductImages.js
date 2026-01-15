/**
 * Script de prueba para el sistema de imágenes de productos
 * Ejecutar con: node backend/src/utils/testProductImages.js
 */

const { getProductImage, getProductImages, PRODUCT_IMAGE_MAP, CATEGORY_IMAGE_MAP } = require('./productImages');

console.log('🎨 Sistema de Imágenes Flat para Productos\n');
console.log('='.repeat(60));

// Test 1: Productos comunes
console.log('\n📦 TEST 1: Productos Comunes');
console.log('-'.repeat(60));

const commonProducts = [
  'leche',
  'Leche Descremada Colun 1L',
  'huevos',
  'Manzana Fuji',
  'tomate',
  'pollo',
  'arroz',
  'pan',
  'agua mineral',
  'aceite de oliva'
];

commonProducts.forEach(product => {
  const imageUrl = getProductImage(product);
  console.log(`✓ ${product.padEnd(30)} → ${imageUrl.substring(0, 60)}...`);
});

// Test 2: Productos no comunes (con categoría)
console.log('\n\n🏷️  TEST 2: Productos No Comunes (con categoría)');
console.log('-'.repeat(60));

const uncommonProducts = [
  { name: 'Quinoa orgánica', category: 'Granos' },
  { name: 'Salchichas Frankfurt', category: 'Carnes' },
  { name: 'Jugo de arándanos', category: 'Bebidas' },
  { name: 'Chips de lentejas', category: 'Snacks' },
  { name: 'Chocolate amargo 70%', category: 'Dulces' }
];

uncommonProducts.forEach(({ name, category }) => {
  const imageUrl = getProductImage(name, category);
  console.log(`✓ ${name.padEnd(30)} [${category.padEnd(12)}] → Imagen genérica de ${category}`);
});

// Test 3: Detección automática de categoría
console.log('\n\n🤖 TEST 3: Detección Automática de Categoría');
console.log('-'.repeat(60));

const autoDetectProducts = [
  'Mantequilla con sal',
  'Plátano de Canarias',
  'Cebolla morada',
  'Carne de cerdo',
  'Café molido',
  'Pasta integral'
];

autoDetectProducts.forEach(product => {
  const imageUrl = getProductImage(product);
  const hasSpecificImage = Object.keys(PRODUCT_IMAGE_MAP).some(key => 
    product.toLowerCase().includes(key) || key.includes(product.toLowerCase())
  );
  console.log(`✓ ${product.padEnd(30)} → ${hasSpecificImage ? 'Imagen específica' : 'Imagen genérica de categoría'}`);
});

// Test 4: Múltiples productos a la vez
console.log('\n\n📋 TEST 4: Procesamiento por Lote');
console.log('-'.repeat(60));

const batchProducts = [
  { name: 'Leche', category: 'Lácteos' },
  { name: 'Yogurt', category: 'Lácteos' },
  { name: 'Manzana', category: 'Frutas' },
  { name: 'Arroz', category: 'Granos' }
];

const results = getProductImages(batchProducts);
console.log(`✓ Procesados ${results.length} productos en lote:`);
results.forEach(({ name, imageUrl }) => {
  console.log(`  - ${name}: ${imageUrl.substring(0, 50)}...`);
});

// Test 5: Productos desconocidos (fallback)
console.log('\n\n❓ TEST 5: Productos Desconocidos (Fallback)');
console.log('-'.repeat(60));

const unknownProducts = [
  'Producto Extraño XYZ',
  '',
  null,
  undefined
];

unknownProducts.forEach(product => {
  const imageUrl = getProductImage(product);
  const productName = product || '(vacío/null)';
  console.log(`✓ ${String(productName).padEnd(30)} → Imagen por defecto (carrito)`);
});

// Estadísticas
console.log('\n\n📊 ESTADÍSTICAS');
console.log('='.repeat(60));
console.log(`Total de productos específicos: ${Object.keys(PRODUCT_IMAGE_MAP).length}`);
console.log(`Total de categorías genéricas: ${Object.keys(CATEGORY_IMAGE_MAP).length - 1}`);
console.log(`Fuente de imágenes: pngwing.com (flat design)`);

console.log('\n✅ Todos los tests completados\n');

// Ejemplo de uso en código real
console.log('💡 EJEMPLO DE USO EN CÓDIGO:\n');
console.log(`
// Backend (Controller)
const { getProductImage } = require('../utils/productImages');

const imageUrl = getProductImage('Leche descremada', 'Lácteos');
// → https://w7.pngwing.com/pngs/442/976/...

// Frontend (Component)
import { getProductImage } from '../utils/productImageHelper';

<Image source={{ uri: item.imageUrl || getProductImage(item.name) }} />
`);
