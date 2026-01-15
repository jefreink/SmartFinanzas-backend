/**
 * Product Lifespan Configuration
 * Tabla de vida útil estimada para productos comunes
 * Ayuda a calcular automáticamente fechas de vencimiento
 */

const productLifespan = {
  // FRUTAS (días de frescura desde compra)
  'manzana': { days: 7, category: 'frutas', storage: 'refrigerado' },
  'platano': { days: 5, category: 'frutas', storage: 'ambiente' },
  'naranja': { days: 10, category: 'frutas', storage: 'ambiente' },
  'uva': { days: 5, category: 'frutas', storage: 'refrigerado' },
  'frutilla': { days: 3, category: 'frutas', storage: 'refrigerado' },
  'pera': { days: 7, category: 'frutas', storage: 'refrigerado' },
  'durazno': { days: 5, category: 'frutas', storage: 'refrigerado' },
  'sandia': { days: 7, category: 'frutas', storage: 'refrigerado' },
  'melon': { days: 7, category: 'frutas', storage: 'refrigerado' },
  'kiwi': { days: 7, category: 'frutas', storage: 'ambiente' },
  'limon': { days: 14, category: 'frutas', storage: 'ambiente' },

  // VERDURAS
  'lechuga': { days: 5, category: 'verduras', storage: 'refrigerado' },
  'tomate': { days: 7, category: 'verduras', storage: 'ambiente' },
  'zanahoria': { days: 14, category: 'verduras', storage: 'refrigerado' },
  'papa': { days: 30, category: 'verduras', storage: 'ambiente' },
  'cebolla': { days: 30, category: 'verduras', storage: 'ambiente' },
  'brocoli': { days: 7, category: 'verduras', storage: 'refrigerado' },
  'pimenton': { days: 7, category: 'verduras', storage: 'refrigerado' },
  'pepino': { days: 7, category: 'verduras', storage: 'refrigerado' },
  'apio': { days: 10, category: 'verduras', storage: 'refrigerado' },
  'espinaca': { days: 5, category: 'verduras', storage: 'refrigerado' },
  'coliflor': { days: 7, category: 'verduras', storage: 'refrigerado' },

  // LÁCTEOS
  'leche': { days: 7, category: 'lacteos', storage: 'refrigerado' },
  'yogurt': { days: 15, category: 'lacteos', storage: 'refrigerado' },
  'queso': { days: 21, category: 'lacteos', storage: 'refrigerado' },
  'mantequilla': { days: 30, category: 'lacteos', storage: 'refrigerado' },
  'crema': { days: 10, category: 'lacteos', storage: 'refrigerado' },
  'quesillo': { days: 14, category: 'lacteos', storage: 'refrigerado' },

  // CARNES
  'pollo': { days: 2, category: 'carnes', storage: 'refrigerado' },
  'carne': { days: 3, category: 'carnes', storage: 'refrigerado' },
  'pescado': { days: 1, category: 'carnes', storage: 'refrigerado' },
  'cerdo': { days: 3, category: 'carnes', storage: 'refrigerado' },
  'pavo': { days: 2, category: 'carnes', storage: 'refrigerado' },

  // PANADERÍA
  'pan': { days: 3, category: 'panaderia', storage: 'ambiente' },
  'tortilla': { days: 5, category: 'panaderia', storage: 'ambiente' },
  'hallulla': { days: 2, category: 'panaderia', storage: 'ambiente' },
  'marraqueta': { days: 2, category: 'panaderia', storage: 'ambiente' },

  // HUEVOS
  'huevo': { days: 28, category: 'huevos', storage: 'refrigerado' },

  // PRODUCTOS ENVASADOS (se recomienda revisar fecha impresa)
  'atun': { days: 730, category: 'enlatados', storage: 'ambiente' },
  'conserva': { days: 365, category: 'enlatados', storage: 'ambiente' },
  'legumbre': { days: 365, category: 'enlatados', storage: 'ambiente' },

  // BEBIDAS
  'jugo': { days: 7, category: 'bebidas', storage: 'refrigerado' },
  'cerveza': { days: 120, category: 'bebidas', storage: 'refrigerado' },
  'vino': { days: 365, category: 'bebidas', storage: 'ambiente' },
  'bebida': { days: 90, category: 'bebidas', storage: 'ambiente' },

  // CONDIMENTOS
  'salsa': { days: 30, category: 'condimentos', storage: 'refrigerado' },
  'mayonesa': { days: 60, category: 'condimentos', storage: 'refrigerado' },
  'ketchup': { days: 90, category: 'condimentos', storage: 'refrigerado' },
  'mostaza': { days: 90, category: 'condimentos', storage: 'refrigerado' }
};

/**
 * Busca la vida útil de un producto por nombre
 * @param {String} productName - Nombre del producto
 * @returns {Object|null} Información de vida útil o null si no se encuentra
 */
const findProductLifespan = (productName) => {
  if (!productName) return null;

  const normalized = productName.toLowerCase().trim();

  // Búsqueda exacta
  if (productLifespan[normalized]) {
    return productLifespan[normalized];
  }

  // Búsqueda parcial (si el nombre del producto contiene alguna palabra clave)
  for (const [key, value] of Object.entries(productLifespan)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
};

/**
 * Calcula la fecha de vencimiento estimada
 * @param {Date} purchaseDate - Fecha de compra
 * @param {String} productName - Nombre del producto
 * @returns {Date|null} Fecha de vencimiento estimada o null
 */
const calculateExpiryDate = (purchaseDate, productName) => {
  const lifespan = findProductLifespan(productName);
  
  if (!lifespan) return null;

  const expiry = new Date(purchaseDate);
  expiry.setDate(expiry.getDate() + lifespan.days);
  
  return expiry;
};

/**
 * Obtiene recomendación de almacenamiento
 * @param {String} productName - Nombre del producto
 * @returns {String} 'refrigerado', 'ambiente', o 'desconocido'
 */
const getStorageRecommendation = (productName) => {
  const lifespan = findProductLifespan(productName);
  return lifespan?.storage || 'desconocido';
};

/**
 * Obtiene categoría del producto
 * @param {String} productName - Nombre del producto
 * @returns {String} Categoría del producto
 */
const getProductCategory = (productName) => {
  const lifespan = findProductLifespan(productName);
  return lifespan?.category || 'otros';
};

module.exports = {
  productLifespan,
  findProductLifespan,
  calculateExpiryDate,
  getStorageRecommendation,
  getProductCategory
};
