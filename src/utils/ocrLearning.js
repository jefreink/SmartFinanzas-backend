/**
 * Sistema de Machine Learning Ligero para OCR
 * Aprende de las correcciones del usuario para mejorar futuras detecciones
 */
const fs = require('fs').promises;
const path = require('path');

// Ruta del archivo de aprendizaje
const LEARNING_FILE = path.join(__dirname, '../../data/ocr_learning.json');

/**
 * Estructura de datos de aprendizaje:
 * {
 *   products: {
 *     "ocrText": { correctedName: "Nombre Correcto", frequency: 5 },
 *     ...
 *   },
 *   merchants: {
 *     "ocrText": { correctedName: "Nombre Correcto", frequency: 3 },
 *     ...
 *   },
 *   patterns: {
 *     "pattern": { category: "Categoría", frequency: 10 },
 *     ...
 *   }
 * }
 */

/**
 * Cargar datos de aprendizaje
 */
const loadLearningData = async () => {
  try {
    // Crear directorio data si no existe
    const dataDir = path.dirname(LEARNING_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Cargar archivo
    const data = await fs.readFile(LEARNING_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si no existe, crear estructura inicial
    const initialData = {
      products: {},
      merchants: {},
      patterns: {},
      corrections: []
    };
    await saveLearningData(initialData);
    return initialData;
  }
};

/**
 * Guardar datos de aprendizaje
 */
const saveLearningData = async (data) => {
  try {
    await fs.writeFile(LEARNING_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error guardando datos de aprendizaje:', error);
  }
};

/**
 * Normalizar texto para comparación (sin acentos, minúsculas, sin espacios extra)
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calcular similitud entre dos textos (Levenshtein distance simplificada)
 */
const calculateSimilarity = (str1, str2) => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Contar caracteres coincidentes
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
};

/**
 * Mejorar nombre de producto basándose en aprendizajes previos
 */
const improveProductName = async (ocrText) => {
  const data = await loadLearningData();
  const normalized = normalizeText(ocrText);
  
  // Búsqueda exacta
  if (data.products[normalized]) {
    const learned = data.products[normalized];
    return {
      improved: learned.correctedName,
      confidence: Math.min(0.95, 0.7 + (learned.frequency * 0.05)),
      source: 'exact_match'
    };
  }
  
  // Búsqueda por similitud
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const [key, value] of Object.entries(data.products)) {
    const similarity = calculateSimilarity(normalized, key);
    if (similarity > 0.75 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = value;
    }
  }
  
  if (bestMatch) {
    return {
      improved: bestMatch.correctedName,
      confidence: bestSimilarity * 0.8,
      source: 'similarity_match'
    };
  }
  
  // No hay mejora disponible
  return {
    improved: ocrText,
    confidence: 0.5,
    source: 'original'
  };
};

/**
 * Mejorar nombre de merchant basándose en aprendizajes previos
 */
const improveMerchantName = async (ocrText) => {
  const data = await loadLearningData();
  const normalized = normalizeText(ocrText);
  
  // Búsqueda exacta
  if (data.merchants[normalized]) {
    const learned = data.merchants[normalized];
    return {
      improved: learned.correctedName,
      confidence: Math.min(0.98, 0.8 + (learned.frequency * 0.05)),
      source: 'exact_match'
    };
  }
  
  // Búsqueda por similitud alta (merchants necesitan más precisión)
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const [key, value] of Object.entries(data.merchants)) {
    const similarity = calculateSimilarity(normalized, key);
    if (similarity > 0.85 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = value;
    }
  }
  
  if (bestMatch) {
    return {
      improved: bestMatch.correctedName,
      confidence: bestSimilarity * 0.9,
      source: 'similarity_match'
    };
  }
  
  return {
    improved: ocrText,
    confidence: 0.4,
    source: 'original'
  };
};

/**
 * Registrar corrección del usuario para aprendizaje futuro
 */
const learnFromCorrection = async (type, ocrText, correctedText) => {
  const data = await loadLearningData();
  const normalized = normalizeText(ocrText);
  const target = type === 'merchant' ? data.merchants : data.products;
  
  if (target[normalized]) {
    // Actualizar corrección existente
    if (target[normalized].correctedName === correctedText) {
      target[normalized].frequency++;
    } else {
      // Usuario cambió la corrección, reemplazar
      target[normalized] = {
        correctedName: correctedText,
        frequency: 1,
        lastUpdated: new Date()
      };
    }
  } else {
    // Nueva corrección
    target[normalized] = {
      correctedName: correctedText,
      frequency: 1,
      created: new Date()
    };
  }
  
  // Registrar en historial de correcciones (para análisis)
  data.corrections.push({
    type,
    original: ocrText,
    corrected: correctedText,
    timestamp: new Date()
  });
  
  // Limitar historial a últimas 500 correcciones
  if (data.corrections.length > 500) {
    data.corrections = data.corrections.slice(-500);
  }
  
  await saveLearningData(data);
  
  return {
    success: true,
    message: 'Aprendizaje registrado correctamente'
  };
};

/**
 * Mejorar categorización basándose en patrones aprendidos
 */
const improveCategory = async (productName) => {
  const data = await loadLearningData();
  const normalized = normalizeText(productName);
  
  // Buscar patrón más frecuente
  let bestPattern = null;
  let bestFrequency = 0;
  
  for (const [pattern, value] of Object.entries(data.patterns)) {
    if (normalized.includes(pattern) && value.frequency > bestFrequency) {
      bestFrequency = value.frequency;
      bestPattern = value;
    }
  }
  
  if (bestPattern) {
    return {
      category: bestPattern.category,
      confidence: Math.min(0.9, 0.6 + (bestFrequency * 0.02))
    };
  }
  
  return null;
};

/**
 * Registrar patrón de categoría para aprendizaje
 */
const learnCategoryPattern = async (productName, category) => {
  const data = await loadLearningData();
  const normalized = normalizeText(productName);
  
  // Extraer palabras clave (palabras de 4+ letras)
  const keywords = normalized.split(' ').filter(word => word.length >= 4);
  
  for (const keyword of keywords) {
    if (data.patterns[keyword]) {
      if (data.patterns[keyword].category === category) {
        data.patterns[keyword].frequency++;
      }
    } else {
      data.patterns[keyword] = {
        category,
        frequency: 1,
        created: new Date()
      };
    }
  }
  
  await saveLearningData(data);
};

/**
 * Obtener estadísticas de aprendizaje
 */
const getLearningStats = async () => {
  const data = await loadLearningData();
  
  return {
    totalProducts: Object.keys(data.products).length,
    totalMerchants: Object.keys(data.merchants).length,
    totalPatterns: Object.keys(data.patterns).length,
    totalCorrections: data.corrections.length,
    topMerchants: Object.entries(data.merchants)
      .sort(([, a], [, b]) => b.frequency - a.frequency)
      .slice(0, 10)
      .map(([key, value]) => ({ original: key, corrected: value.correctedName, frequency: value.frequency })),
    topProducts: Object.entries(data.products)
      .sort(([, a], [, b]) => b.frequency - a.frequency)
      .slice(0, 10)
      .map(([key, value]) => ({ original: key, corrected: value.correctedName, frequency: value.frequency }))
  };
};

module.exports = {
  improveProductName,
  improveMerchantName,
  improveCategory,
  learnFromCorrection,
  learnCategoryPattern,
  getLearningStats,
  normalizeText,
  calculateSimilarity
};
