/**
 * productImages.js
 * Banco de imágenes para productos de inventario
 * Usa imágenes locales del servidor en /uploads/inventory/
 */

// Base URL para las imágenes (cambiar según ambiente)
const getImageUrl = (productName) => {
  const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const ext = '.png';
  // Normalizar nombre del producto para buscar archivo
  const normalized = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return `${baseUrl}/uploads/inventory/${normalized}${ext}`;
};

/**
 * Lista de productos comunes con sus nombres en el servidor
 * El nombre debe coincidir con el archivo guardado (sin timestamp)
 */
const PRODUCT_NAMES = [
  'leche', 'yogurt', 'queso', 'mantequilla', 'crema',
  'huevo', 'huevos',
  'harina', 'arroz', 'pasta', 'fideos', 'avena', 'pan',
  'manzana', 'plátano', 'banana', 'naranja', 'limón', 'pera', 'uva', 'sandía', 'melón', 'frutilla', 'fresa',
  'tomate', 'lechuga', 'zanahoria', 'papa', 'patata', 'cebolla', 'ajo', 'pimiento', 'brócoli', 'espinaca',
  'pollo', 'carne', 'res', 'cerdo', 'pescado', 'salmón',
  'agua', 'jugo', 'refresco', 'café', 'té',
  'sal', 'azúcar', 'aceite', 'vinagre', 'salsa', 'mayonesa', 'ketchup', 'mostaza'
];

/**
 * Mapeo de productos comunes a sus URLs locales en el servidor
 */
const PRODUCT_IMAGE_MAP = {};

// Inicializar el mapa con URLs locales para cada producto
PRODUCT_NAMES.forEach(productName => {
  PRODUCT_IMAGE_MAP[productName] = getImageUrl(productName);
});

/**
 * Mapeo de categorías a imagen genérica (fallback si no hay imagen específica)
 */
const CATEGORY_IMAGE_MAP = {
  'Lácteos': getImageUrl('leche'),
  'Frutas': getImageUrl('manzana'),
  'Verduras': getImageUrl('tomate'),
  'Hortalizas': getImageUrl('zanahoria'),
  'Carnes': getImageUrl('carne'),
  'Pescado': getImageUrl('pescado'),
  'Panadería': getImageUrl('pan'),
  'Bebidas': getImageUrl('agua'),
  'Condimentos': getImageUrl('aceite'),
  'Granos': getImageUrl('arroz'),
  'default': getImageUrl('agua') // Imagen por defecto
};
/**
 * Normaliza el nombre del producto para búsqueda
 * Elimina acentos, convierte a minúsculas, elimina caracteres especiales
 */
const normalizeProductName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s]/g, '') // Elimina caracteres especiales
    .trim();
};

/**
 * Detecta la categoría del producto basado en palabras clave
 */
const detectCategory = (productName) => {
  const normalized = normalizeProductName(productName);
  
  // Lácteos
  if (/leche|yogurt|queso|mantequilla|crema|huevo/.test(normalized)) return 'Lácteos';
  
  // Frutas
  if (/manzana|platano|banana|naranja|limon|pera|uva|sandia|melon|frutilla|fresa|durazno|cereza|kiwi|mango|piña/.test(normalized)) return 'Frutas';
  
  // Verduras
  if (/tomate|lechuga|zanahoria|papa|patata|cebolla|ajo|pimiento|brocoli|espinaca|acelga|repollo|col/.test(normalized)) return 'Verduras';
  
  // Carnes
  if (/pollo|carne|res|cerdo|cordero|pavo/.test(normalized)) return 'Carnes';
  
  // Pescado
  if (/pescado|salmon|atun|trucha|merluza|mariscos|camaron/.test(normalized)) return 'Pescado';
  
  // Panadería
  if (/pan|hallulla|marraqueta|baguette|ciabatta/.test(normalized)) return 'Panadería';
  
  // Bebidas
  if (/agua|jugo|refresco|gaseosa|cafe|te/.test(normalized)) return 'Bebidas';
  
  // Granos y harinas
  if (/harina|arroz|pasta|fideos|avena|quinoa|lentejas|porotos|garbanzos/.test(normalized)) return 'Granos';
  
  // Condimentos
  if (/sal|azucar|aceite|vinagre|salsa|mayonesa|ketchup|mostaza|especias/.test(normalized)) return 'Condimentos';
  
  return null;
};

/**
 * Obtiene la URL de imagen para un producto
 * @param {string} productName - Nombre del producto
 * @param {string} category - Categoría del producto (opcional)
 * @returns {string} URL de la imagen local
 */
const getProductImage = (productName, category = null) => {
  if (!productName) {
    return CATEGORY_IMAGE_MAP['default'];
  }

  const normalized = normalizeProductName(productName);
  
  // 1. Buscar coincidencia exacta en productos comunes
  if (PRODUCT_IMAGE_MAP[normalized]) {
    return PRODUCT_IMAGE_MAP[normalized];
  }
  
  // 2. Buscar coincidencia parcial (ej: "leche descremada" → "leche")
  for (const [key, imageUrl] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return imageUrl;
    }
  }
  
  // 3. Usar categoría detectada o proporcionada
  const detectedCategory = category || detectCategory(productName);
  if (detectedCategory && CATEGORY_IMAGE_MAP[detectedCategory]) {
    return CATEGORY_IMAGE_MAP[detectedCategory];
  }
  
  // 4. Imagen por defecto
  return CATEGORY_IMAGE_MAP['default'];
};

/**
 * Obtiene imágenes para múltiples productos
 */
const getProductImages = (products) => {
  return products.map(product => ({
    name: product.name,
    imageUrl: getProductImage(product.name, product.category)
  }));
};

module.exports = {
  PRODUCT_IMAGE_MAP,
  CATEGORY_IMAGE_MAP,
  getImageUrl,
  normalizeProductName,
  detectCategory,
  getProductImage,
  getProductImages
};
