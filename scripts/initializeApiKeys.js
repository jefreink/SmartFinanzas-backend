/**
 * Script de inicialización para configurar API keys en la base de datos
 * Ejecutar: node backend/scripts/initializeApiKeys.js
 * 
 * Este script crea o actualiza las API keys en la base de datos
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ApiKeyConfig = require('../src/models/ApiKeyConfig');

const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartfinance';

/**
 * Conectar a MongoDB y crear API keys iniciales
 */
const initializeApiKeys = async () => {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Conectado a MongoDB');

    // API key de Gemini (obtenida del .env o hardcodeada)
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      console.warn('⚠️ GEMINI_API_KEY no está definida en .env');
      console.log('   Por favor, actualizar el API key usando el endpoint POST /api/api-key/update');
    } else {
      console.log('📝 Inicializando API key de Gemini...');
      
      const result = await ApiKeyConfig.findOneAndUpdate(
        { service: 'gemini' },
        {
          service: 'gemini',
          apiKey: geminiKey,
          description: 'Google Gemini Vision API para OCR de boletas',
          isActive: true,
          updatedBy: 'initialization-script',
          lastUpdated: new Date(),
        },
        {
          new: true,
          upsert: true,
        }
      );

      console.log('✅ API key de Gemini inicializada');
      console.log(`   Servicio: ${result.service}`);
      console.log(`   Activa: ${result.isActive}`);
      console.log(`   Última actualización: ${result.lastUpdated}`);
    }

    // Listar todas las API keys configuradas
    const allKeys = await ApiKeyConfig.find({});
    console.log(`\n📋 Total de API keys configuradas: ${allKeys.length}`);
    
    allKeys.forEach((key) => {
      console.log(`   - ${key.service}: ${key.isActive ? '✅ Activa' : '❌ Inactiva'}`);
    });

    console.log('\n✨ Inicialización completada');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
};

// Ejecutar
initializeApiKeys();
