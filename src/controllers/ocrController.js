/**
 * Controlador de OCR (Receipt Scanning)
 * Usa Google Gemini Vision API para extraer información estructurada de boletas.
 * Mucho más preciso y con mejor comprensión de contexto que OCR tradicional.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const OcrUsage = require('../models/OcrUsage');
const { improveProductName, improveMerchantName, learnFromCorrection, getLearningStats } = require('../utils/ocrLearning');

// Google Gemini Configuration
const GEMINI_API_KEY = 'AIzaSyBlB_SJL50iK9nnwHVW-EYZUWSdNXD3Z7Q';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Helper para obtener/actualizar el uso mensual de OCR
 */
const trackOcrUsage = async (tokensUsed = 0) => {
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"
  
  let usage = await OcrUsage.findOne({ month: currentMonth });
  
  if (!usage) {
    usage = await OcrUsage.create({
      month: currentMonth,
      requestCount: 0,
      limit: 45000, // Gemini permite 1500/día = 45000/mes
      tokensUsed: 0,
      tokenLimit: 1000000 // 1 millón de tokens/mes
    });
  }
  
  // Incrementar contadores
  usage.requestCount += 1;
  usage.tokensUsed += tokensUsed;
  usage.lastRequest = new Date();
  await usage.save();
  
  return {
    current: usage.requestCount,
    limit: usage.limit,
    percentage: Math.round((usage.requestCount / usage.limit) * 100),
    remaining: usage.limit - usage.requestCount,
    tokensUsed: usage.tokensUsed,
    tokenLimit: usage.tokenLimit,
    tokenPercentage: Math.round((usage.tokensUsed / usage.tokenLimit) * 100),
    tokensRemaining: usage.tokenLimit - usage.tokensUsed
  };
};

/**
 * Base de datos expandida de comercios comunes en Latinoamérica
 */
const MERCHANTS_DATABASE = {
  supermercados: ['JUMBO', 'LIDER', 'UNIMARC', 'TOTTUS', 'SANTA ISABEL', 'WALMART', 'CENCOSUD', 'EKONO', 'ACUENTA', 'SMU'],
  restaurantes: ['MCDONALDS', 'BURGER KING', 'KFC', 'SUBWAY', 'DOMINOS', 'PIZZA HUT', 'STARBUCKS', 'DUNKIN'],
  farmacias: ['CRUZ VERDE', 'SALCOBRAND', 'AHUMADA', 'FARMACIA', 'PHARMACY'],
  retail: ['FALABELLA', 'RIPLEY', 'PARIS', 'HITES', 'LA POLAR'],
  servicios: ['UBER', 'CABIFY', 'RAPPI', 'PEDIDOS YA', 'CORNERSHOP'],
};

const ALL_MERCHANTS = Object.values(MERCHANTS_DATABASE).flat();

/**
 * Determina el tipo de boleta basándose en el comerciante detectado
 */
const getReceiptType = (merchant) => {
  const merchantUpper = merchant.toUpperCase();
  
  for (const [type, merchants] of Object.entries(MERCHANTS_DATABASE)) {
    if (merchants.some(m => merchantUpper.includes(m))) {
      return type;
    }
  }
  return 'general';
};

/**
 * Categoriza un producto basándose en palabras clave en su nombre
 */
const categorizeProduct = (productName) => {
  const name = productName.toLowerCase();
  
  // Categorías de productos
  const categories = {
    'Lácteos': ['leche', 'yogurt', 'queso', 'mantequilla', 'crema'],
    'Carnes': ['carne', 'pollo', 'cerdo', 'res', 'pescado', 'vacuno'],
    'Frutas': ['manzana', 'platano', 'naranja', 'pera', 'uva', 'fruta'],
    'Verduras': ['lechuga', 'tomate', 'cebolla', 'zanahoria', 'papa', 'verdura'],
    'Panadería': ['pan', 'galleta', 'torta', 'pastel', 'masa'],
    'Bebidas': ['agua', 'jugo', 'bebida', 'refresco', 'gaseosa', 'cerveza', 'vino'],
    'Limpieza': ['detergente', 'jabon', 'cloro', 'limpiador', 'desinfectante'],
    'Snacks': ['chips', 'chocolate', 'dulce', 'caramelo', 'galleta'],
    'Aseo Personal': ['shampoo', 'pasta', 'desodorante', 'papel', 'toalla'],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
};

/**
 * Función auxiliar mejorada para parsear texto extraído y detectar items
 */
const parseReceiptText = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Detectar comerciante (primeras 10 líneas)
  let merchant = '';
  let receiptType = 'general';
  
  for (const line of lines.slice(0, 10)) {
    const upperLine = line.toUpperCase();
    for (const m of ALL_MERCHANTS) {
      if (upperLine.includes(m)) {
        merchant = m;
        receiptType = getReceiptType(m);
        break;
      }
    }
    if (merchant) break;
  }
  
  // Detectar fecha de la boleta
  let receiptDate = null;
  const dateRegex = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
  for (const line of lines.slice(0, 15)) {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      receiptDate = new Date(`${fullYear}-${month}-${day}`);
      if (!isNaN(receiptDate.getTime())) {
        break;
      }
    }
  }

  // Detectar items y precios (patrones mejorados)
  const items = [];
  
  // Múltiples patrones de precio (soporta diferentes formatos)
  const pricePatterns = [
    /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/,  // 1.234,56 o 1,234.56
    /\$?\s*(\d{1,3}[.,]\d{0,3})\s*$/,         // $1234 o 1234
    /(\d{1,3})\s*$/,                           // 123 (sin decimales)
  ];
  
  const quantityRegex = /^(\d+)\s*[xX×]\s*/; // Cantidad al inicio (1x, 2X, 3×)
  
  // Palabras clave a excluir
  const excludeKeywords = [
    'TOTAL', 'SUBTOTAL', 'IVA', 'CAMBIO', 'VUELTO', 'DESCUENTO',
    'EFECTIVO', 'TARJETA', 'DEBITO', 'CREDITO', 'RUT', 'BOLETA',
    'FACTURA', 'TICKET', 'GRACIAS', 'ATENCION', 'HORARIO'
  ];

  for (const line of lines) {
    // Intentar cada patrón de precio
    let priceMatch = null;
    let price = 0;
    
    for (const pattern of pricePatterns) {
      priceMatch = line.match(pattern);
      if (priceMatch) {
        const priceStr = priceMatch[1].replace(/[.,]/g, match => match === '.' ? '' : '.');
        price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) break;
      }
    }
    
    if (!priceMatch || price === 0) continue;
    
    // Extraer nombre del producto (todo menos el precio)
    let name = line.replace(priceMatch[0], '').trim();
    
    // Detectar cantidad si existe
    let quantity = 1;
    const qtyMatch = name.match(quantityRegex);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1]);
      name = name.replace(quantityRegex, '').trim();
    }
    
    // Limpiar nombre del producto
    name = name.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, ' ').trim();
    
    if (name.length < 2) continue; // Nombre muy corto, probablemente basura
    
    // Categorizar producto basado en nombre
    const category = categorizeProduct(name);
    
    items.push({
      name,
      quantity,
      price,
      category,
    });
  }

  // Detectar total de la boleta (múltiples patrones)
  let totalAmount = 0;
  const totalPatterns = [
    /TOTAL[\s:]+\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]?\d{0,2})/i,
    /TOTAL[\s:]*(\d+)/i,
    /TOTAL\s+PAGAR[\s:]*(\d+)/i,
  ];
  
  for (const line of lines.reverse()) {
    for (const pattern of totalPatterns) {
      const totalMatch = line.match(pattern);
      if (totalMatch) {
        const totalStr = totalMatch[1].replace(/[.,]/g, match => match === '.' ? '' : '.');
        totalAmount = Math.round(parseFloat(totalStr));
        if (!isNaN(totalAmount) && totalAmount > 0) break;
      }
    }
    if (totalAmount > 0) break;
  }

  // Si no encontramos total, sumar los items
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  return { 
    merchant, 
    items, 
    totalAmount,
    receiptDate: receiptDate || new Date(),
    receiptType,
  };
};

/**
 * @desc    Procesar imagen de recibo con OCR.space API
 * @route   POST /api/ocr/scan
 * @access  Private
 */
exports.scanReceipt = async (req, res) => {
  console.log('🎯 scanReceipt iniciado');
  try {
    let base64Image;
    let mimeType;
    
    // Aceptar imagen como archivo (multipart) o como base64 en JSON
    if (req.file) {
      // Método tradicional con Multer
      console.log('📸 Archivo recibido vía Multer:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
      
      const imageBuffer = fs.readFileSync(req.file.path);
      base64Image = imageBuffer.toString('base64');
      // Normalizar MIME type: image/jpg -> image/jpeg
      mimeType = req.file.mimetype === 'image/jpg' ? 'image/jpeg' : req.file.mimetype;
      
    } else if (req.body.image) {
      // Método alternativo: base64 en JSON
      console.log('📸 Imagen recibida como base64 en JSON');
      
      const imageData = req.body.image;
      
      // Si viene con el prefijo data:image/...;base64, extraerlo
      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ 
            success: false, 
            error: 'Formato de imagen base64 inválido' 
          });
        }
        mimeType = matches[1];
        base64Image = matches[2];
      } else {
        // Si ya es solo el base64
        base64Image = imageData;
        mimeType = req.body.mimeType || 'image/jpeg';
      }
      
      console.log('✅ Base64 extraído, tamaño:', base64Image.length, 'bytes');
      
    } else {
      console.log('❌ No se recibió archivo ni base64');
      return res.status(400).json({ 
        success: false, 
        error: 'No se recibió ninguna imagen (envía file o base64)' 
      });
    }
    
    // Verificar límite de uso mensual antes de procesar
    const currentMonth = new Date().toISOString().slice(0, 7);
    let currentUsage = await OcrUsage.findOne({ month: currentMonth });
    
    // Verificar límites de requests y tokens
    if (currentUsage) {
      if (currentUsage.requestCount >= currentUsage.limit) {
        return res.status(429).json({
          success: false,
          error: 'Límite mensual de requests alcanzado',
          message: `Has alcanzado el límite de ${currentUsage.limit} escaneos este mes. Intenta el próximo mes.`,
          usage: {
            current: currentUsage.requestCount,
            limit: currentUsage.limit,
            percentage: 100,
            tokensUsed: currentUsage.tokensUsed,
            tokenLimit: currentUsage.tokenLimit,
            tokenPercentage: Math.round((currentUsage.tokensUsed / currentUsage.tokenLimit) * 100)
          }
        });
      }
      
      if (currentUsage.tokensUsed >= currentUsage.tokenLimit) {
        return res.status(429).json({
          success: false,
          error: 'Límite mensual de tokens alcanzado',
          message: `Has alcanzado el límite de ${currentUsage.tokenLimit.toLocaleString()} tokens este mes. Intenta el próximo mes.`,
          usage: {
            current: currentUsage.requestCount,
            limit: currentUsage.limit,
            percentage: Math.round((currentUsage.requestCount / currentUsage.limit) * 100),
            tokensUsed: currentUsage.tokensUsed,
            tokenLimit: currentUsage.tokenLimit,
            tokenPercentage: 100
          }
        });
      }
    }
    
    console.log('🤖 Enviando a Gemini Vision...');
    
    // Obtener el modelo
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Prompt para extraer información estructurada
    const prompt = `Analiza esta imagen de una boleta o recibo de compra y extrae la siguiente información en formato JSON:

{
  "merchant": "nombre del comercio o tienda",
  "date": "fecha en formato YYYY-MM-DD",
  "totalAmount": número total de la compra en pesos ENTEROS,
  "items": [
    {
      "name": "nombre del producto",
      "quantity": número de unidades compradas,
      "price": precio UNITARIO en pesos ENTEROS (sin decimales),
      "category": "categoría del producto (Lácteos, Carnes, Frutas, Verduras, Panadería, Bebidas, Limpieza, Snacks, Aseo Personal, o General)"
    }
  ]
}

REGLAS CRÍTICAS:
- Los precios DEBEN ser números ENTEROS sin decimales (ej: 1190, no 1.190 o 1,190)
- La cantidad es el número de unidades de CADA producto
- Si la boleta dice "Leche x2" o "2x1190", quantity=2 y price=1190 (precio unitario)
- Los precios deben ser el valor UNITARIO (el precio de UNA unidad)
- Si no puedes identificar algún campo, usa null
- Las categorías deben ser exactamente una de las mencionadas
- Intenta identificar todos los productos visibles en la boleta
- Si el nombre del producto está incompleto o abreviado, complétalo de forma inteligente

Responde SOLO con el JSON, sin texto adicional.`;

    // Crear contenido según documentación
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    // Enviar a Gemini
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    
    const text = response.text();
    
    // Obtener metadata de uso de tokens
    const usageMetadata = response.usageMetadata;
    const tokensUsed = usageMetadata ? (usageMetadata.totalTokenCount || 0) : 0;
    
    console.log('✅ Respuesta de Gemini recibida');
    console.log('📝 Texto crudo:', text.substring(0, 200));
    console.log('🪙 Tokens usados:', tokensUsed);
    
    // Trackear uso de OCR con tokens
    const usageStats = await trackOcrUsage(tokensUsed);
    console.log('📊 Uso OCR:', usageStats);

    // Parsear respuesta JSON
    let parsedData;
    try {
      // Limpiar markdown code blocks si existen
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ Error parseando JSON de Gemini:', parseError);
      console.error('Texto recibido:', text);
      
      return res.status(500).json({
        success: false,
        error: 'No se pudo interpretar la respuesta de Gemini',
        message: 'La imagen no contiene una boleta clara. Intenta con otra foto.',
        rawText: text
      });
    }

    let { merchant, items, totalAmount, date } = parsedData;

    // Mejorar merchant con ML
    if (merchant) {
      const improved = await improveMerchantName(merchant);
      if (improved.confidence > 0.7) {
        merchant = improved.improved;
      }
    }

    // Mejorar nombres de productos con ML
    if (items && Array.isArray(items)) {
      for (let item of items) {
        if (item.name) {
          const improved = await improveProductName(item.name);
          if (improved.confidence > 0.6) {
            item.name = improved.improved;
            item.mlConfidence = improved.confidence;
          }
        }
      }
    }

    console.log('✅ Datos parseados:', { 
      merchant, 
      items: items?.length || 0, 
      totalAmount
    });

    // Limpiar archivo temporal si existe
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error limpiando archivo temporal:', err);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        merchant: merchant || 'Comercio desconocido',
        date: date,
        totalAmount: totalAmount || 0,
        items: items && items.length > 0 ? items : [
          { name: '', quantity: 1, price: totalAmount || 0, category: 'General' }
        ],
        confidence: items && items.length > 0 ? 0.95 : 0.3,
        message: items && items.length > 0
          ? `✨ Gemini detectó ${items.length} productos de ${merchant || 'un comercio'}.`
          : 'No se detectaron productos. Agrégalos manualmente.'
      },
      usage: usageStats
    });

  } catch (err) {
    console.error('❌ Error en OCR:', err.message);
    console.error('📋 Tipo de error:', err.constructor.name);
    console.error('Stack:', err.stack);
    console.error('🔍 Error completo:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    
    // Limpiar archivo temporal en caso de error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Archivo temporal eliminado');
      } catch (cleanupErr) {
        console.error('Error limpiando archivo:', cleanupErr);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: err.message,
      message: 'Error al procesar la imagen. Completa los datos manualmente.'
    });
  }
};

/**
 * @desc    Extraer fecha de vencimiento de imagen de producto
 * @route   POST /api/ocr/expiry-date
 * @access  Private
 */
exports.scanExpiryDate = async (req, res) => {
  let processedImagePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se recibió ninguna imagen' 
      });
    }

    console.log('Procesando imagen para detectar fecha de vencimiento...');
    
    // Preprocesar con configuración optimizada para fechas
    processedImagePath = await optimizeForOCR(req.file.path);
    
    // Procesar con Tesseract
    const { data: { text } } = await Tesseract.recognize(
      processedImagePath,
      'spa+eng', // Soporte para español e inglés
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`Progreso fecha: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log('Texto extraído:', text);

    // Buscar patrones de fecha de vencimiento
    const datePatterns = [
      // DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
      /(?:VENC|VENCE|EXP|EXPIRA|CONSUMIR ANTES|BEST BEFORE)[\s:]*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i,
      // Fecha sin prefijo
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
      // Formato ISO: YYYY-MM-DD
      /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
      // Formato MM/YYYY
      /(\d{1,2})[\/\-.](\d{4})/,
    ];

    let detectedDate = null;
    let confidence = 0;

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let day, month, year;
          
          if (match.length === 3) {
            // Formato MM/YYYY
            month = parseInt(match[1]);
            year = parseInt(match[2]);
            day = 1; // Primer día del mes
          } else if (match[1].length === 4) {
            // Formato ISO: YYYY-MM-DD
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else {
            // Formato DD/MM/YYYY
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          }
          
          // Convertir año de 2 dígitos a 4
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          
          // Validar rango
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2050) {
            detectedDate = new Date(year, month - 1, day);
            
            // Verificar que la fecha no sea inválida
            if (!isNaN(detectedDate.getTime())) {
              // Mayor confidence si incluye palabra clave
              confidence = pattern.source.includes('VENC|EXP') ? 0.9 : 0.7;
              break;
            }
          }
        } catch (err) {
          console.log('Error parseando fecha:', err);
          continue;
        }
      }
    }

    // Limpiar archivos temporales
    if (processedImagePath !== req.file.path) {
      await cleanupProcessedFiles(req.file.path);
    }

    if (detectedDate) {
      res.status(200).json({
        success: true,
        data: {
          expiryDate: detectedDate,
          confidence,
          rawText: text,
          message: `Fecha detectada: ${detectedDate.toLocaleDateString('es-ES')}`
        }
      });
    } else {
      res.status(200).json({
        success: false,
        data: {
          expiryDate: null,
          confidence: 0,
          rawText: text,
          message: 'No se pudo detectar la fecha. Ingrésala manualmente.'
        }
      });
    }

  } catch (err) {
    console.error('Error en OCR de fecha:', err);
    
    // Limpiar archivos temporales
    if (processedImagePath && processedImagePath !== req.file?.path) {
      try {
        await cleanupProcessedFiles(req.file.path);
      } catch (cleanupErr) {
        console.error('Error al limpiar archivos:', cleanupErr);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: err.message,
      message: 'Error al procesar la imagen. Ingresa la fecha manualmente.'
    });
  }
};

/**
 * @desc    Registrar corrección del usuario para mejorar ML
 * @route   POST /api/ocr/learn
 * @access  Private
 */
exports.learnCorrection = async (req, res) => {
  try {
    const { type, original, corrected } = req.body;

    if (!type || !original || !corrected) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere type (product/merchant), original y corrected'
      });
    }

    if (!['product', 'merchant'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type debe ser "product" o "merchant"'
      });
    }

    const result = await learnFromCorrection(type, original, corrected);

    res.status(200).json({
      success: true,
      data: result,
      message: `Aprendizaje registrado: "${original}" → "${corrected}"`
    });
  } catch (error) {
    console.error('Error registrando aprendizaje:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Obtener estadísticas del sistema de aprendizaje
 * @route   GET /api/ocr/stats
 * @access  Private
 */
exports.getOCRStats = async (req, res) => {
  try {
    const stats = await getLearningStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Obtener uso mensual de OCR
 * @route   GET /api/ocr/usage
 * @access  Private
 */
exports.getOCRUsage = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let usage = await OcrUsage.findOne({ month: currentMonth });
    
    if (!usage) {
      usage = await OcrUsage.create({
        month: currentMonth,
        requestCount: 0,
        limit: 45000,
        tokensUsed: 0,
        tokenLimit: 1000000
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        current: usage.requestCount,
        limit: usage.limit,
        percentage: Math.round((usage.requestCount / usage.limit) * 100),
        remaining: usage.limit - usage.requestCount,
        tokensUsed: usage.tokensUsed,
        tokenLimit: usage.tokenLimit,
        tokenPercentage: Math.round((usage.tokensUsed / usage.tokenLimit) * 100),
        tokensRemaining: usage.tokenLimit - usage.tokensUsed,
        month: currentMonth,
        lastRequest: usage.lastRequest
      }
    });
  } catch (error) {
    console.error('Error obteniendo uso de OCR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
