/**
 * Función scanReceipt con Gemini Vision
 * Para reemplazar en ocrController.js
 */
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});
const base64ImageFile = fs.readFileSync("path/to/small-sample.jpg", {
  encoding: "base64",
});

exports.scanReceipt = async (req, res) => {
  console.log('📥 Solicitud de OCR recibida aqui llego');
  try {
    // Verificar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió ninguna imagen'
      });
    }

    console.log('📸 Archivo recibido:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Verificar límite de uso mensual antes de procesar
    const currentMonth = new Date().toISOString().slice(0, 7);
    let currentUsage = await OcrUsage.findOne({ month: currentMonth });

    if (currentUsage && currentUsage.requestCount >= currentUsage.limit) {
      return res.status(429).json({
        success: false,
        error: 'Límite mensual de OCR alcanzado',
        message: 'Has alcanzado el límite mensual de escaneos. Intenta el próximo mes.',
        usage: {
          current: currentUsage.requestCount,
          limit: currentUsage.limit,
          percentage: 100
        }
      });
    }

    // Leer imagen como base64
    const imageBuffer = fs.readFileSync(req.file.path);

    const base64ImageFile = fs.readFileSync(req.file.path, {
      encoding: "base64",
    });
    console.log('🤖 Enviando a Gemini 2.5...');

    // Prompt para extraer información estructurada
    const prompt = `Analiza esta imagen de una boleta o recibo de compra y extrae la siguiente información en formato JSON:

{
  "merchant": "nombre del comercio o tienda",
  "date": "fecha en formato YYYY-MM-DD",
  "totalAmount": número total de la compra,
  "items": [
    {
      "name": "nombre del producto",
      "quantity": número de unidades,
      "price": precio unitario,
      "category": "categoría del producto (Lácteos, Carnes, Frutas, Verduras, Panadería, Bebidas, Limpieza, Snacks, Aseo Personal, o General)"
    }
  ]
}

IMPORTANTE:
- Si no puedes identificar algún campo, usa null
- Los precios deben ser números sin símbolos
- Las categorías deben ser exactamente una de las mencionadas
- Intenta identificar todos los productos visibles en la boleta
- Si el nombre del producto está incompleto o abreviado, complétalo de forma inteligente

Responde SOLO con el JSON, sin texto adicional.`;

    // Enviar imagen y prompt a Gemini
    // const result = await model.generateContent([
    //   prompt,
    //   {
    //     inlineData: {
    //       mimeType: 'image/jpeg', //'req.file.mimetype',
    //       data: base64Image
    //     }
    //   }
    // ]);

    const contents = [
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64ImageFile,
        },
      },
      { text: prompt },
    ];

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const response = await result.response;
    const text = response.text();

    console.log('✅ Respuesta de Gemini recibida');
    console.log('📝 Texto crudo:', text.substring(0, 200));

    // Trackear uso de OCR
    const usageStats = await trackOcrUsage();
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

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('Error limpiando archivo temporal:', err);
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
    console.error('Stack:', err.stack);

    // Limpiar archivo temporal en caso de error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
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
