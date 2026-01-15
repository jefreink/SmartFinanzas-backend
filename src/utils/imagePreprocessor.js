/**
 * Preprocesador de Imágenes para OCR
 * 
 * Utiliza sharp para mejorar la calidad de las imágenes antes del OCR:
 * - Aumenta contraste
 * - Convierte a escala de grises
 * - Mejora nitidez
 * - Normaliza el brillo
 * 
 * @module imagePreprocessor
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Preprocesa una imagen para mejorar la precisión del OCR
 * 
 * @param {string} inputPath - Ruta de la imagen original
 * @param {Object} options - Opciones de procesamiento
 * @param {number} options.contrast - Factor de contraste (1.0 = normal, >1 = más contraste)
 * @param {number} options.brightness - Factor de brillo (1.0 = normal)
 * @param {boolean} options.sharpen - Aplicar filtro de nitidez
 * @returns {Promise<string>} Ruta de la imagen procesada
 */
async function preprocessImage(inputPath, options = {}) {
  const {
    contrast = 1.5,
    brightness = 1.2,
    sharpen = true,
  } = options;

  try {
    // Generar nombre del archivo procesado
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    const dirname = path.dirname(inputPath);
    const outputPath = path.join(dirname, `${basename}_processed${ext}`);

    // Pipeline de procesamiento con Sharp
    let pipeline = sharp(inputPath)
      .grayscale() // Convertir a escala de grises
      .normalize() // Normalizar histograma
      .linear(contrast, -(128 * contrast) + 128); // Ajustar contraste

    // Aplicar nitidez si está habilitado
    if (sharpen) {
      pipeline = pipeline.sharpen({
        sigma: 1.5,
        m1: 1.0,
        m2: 0.5,
      });
    }

    // Ajustar brillo (modulate)
    pipeline = pipeline.modulate({
      brightness: brightness,
    });

    // Guardar imagen procesada
    await pipeline.toFile(outputPath);

    console.log(`Imagen preprocesada guardada en: ${outputPath}`);

    return outputPath;

  } catch (error) {
    console.error('Error al preprocesar imagen:', error);
    // Si falla el preprocesamiento, retornar la imagen original
    return inputPath;
  }
}

/**
 * Rota una imagen automáticamente basándose en la orientación EXIF
 * 
 * @param {string} inputPath - Ruta de la imagen
 * @returns {Promise<string>} Ruta de la imagen rotada
 */
async function autoRotate(inputPath) {
  try {
    const outputPath = inputPath.replace(/(\.\w+)$/, '_rotated$1');
    
    await sharp(inputPath)
      .rotate() // Rotación automática según EXIF
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Error al rotar imagen:', error);
    return inputPath;
  }
}

/**
 * Recorta los bordes de una imagen para eliminar márgenes innecesarios
 * 
 * @param {string} inputPath - Ruta de la imagen
 * @param {number} threshold - Umbral de recorte (0-255)
 * @returns {Promise<string>} Ruta de la imagen recortada
 */
async function trimImage(inputPath, threshold = 10) {
  try {
    const outputPath = inputPath.replace(/(\.\w+)$/, '_trimmed$1');
    
    await sharp(inputPath)
      .trim(threshold)
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Error al recortar imagen:', error);
    return inputPath;
  }
}

/**
 * Procesa una imagen con el pipeline completo de optimización para OCR
 * 
 * @param {string} inputPath - Ruta de la imagen original
 * @returns {Promise<string>} Ruta de la imagen optimizada
 */
async function optimizeForOCR(inputPath) {
  try {
    console.log('Iniciando optimización de imagen para OCR...');

    // 1. Auto-rotar según EXIF
    let processedPath = await autoRotate(inputPath);

    // 2. Recortar bordes
    processedPath = await trimImage(processedPath);

    // 3. Preprocesar (contraste, nitidez, etc.)
    processedPath = await preprocessImage(processedPath, {
      contrast: 1.5,
      brightness: 1.2,
      sharpen: true,
    });

    console.log('Optimización completa');
    return processedPath;

  } catch (error) {
    console.error('Error en pipeline de optimización:', error);
    return inputPath; // Retornar original si falla
  }
}

/**
 * Limpia archivos temporales de procesamiento
 * 
 * @param {string} originalPath - Ruta del archivo original
 */
async function cleanupProcessedFiles(originalPath) {
  try {
    const dirname = path.dirname(originalPath);
    const basename = path.basename(originalPath, path.extname(originalPath));
    
    // Patrones de archivos procesados
    const patterns = [
      `${basename}_rotated.*`,
      `${basename}_trimmed.*`,
      `${basename}_processed.*`,
    ];

    // Eliminar archivos procesados
    const files = await fs.readdir(dirname);
    for (const file of files) {
      if (patterns.some(pattern => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(file);
      })) {
        await fs.unlink(path.join(dirname, file));
        console.log(`Archivo temporal eliminado: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error al limpiar archivos temporales:', error);
  }
}

module.exports = {
  preprocessImage,
  autoRotate,
  trimImage,
  optimizeForOCR,
  cleanupProcessedFiles,
};
