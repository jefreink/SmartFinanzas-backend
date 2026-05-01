/**
 * Configuración de la conexión a MongoDB
 * Soporta MongoDB Atlas (producción) y MongoDB Local (desarrollo)
 */
const mongoose = require('mongoose');

/**
 * Construye la URI de conexión a MongoDB
 * Prioridad: MONGO_URI > ATLAS > Local default
 */
const buildMongoUri = () => {
  // Si existe MONGO_URI explícita (para MongoDB local), usarla
  if (process.env.MONGO_URI) {
    console.log('🔧 Usando MONGO_URI explícita:', process.env.MONGO_URI);
    return process.env.MONGO_URI;
  }

  // Si no, construir URI de Atlas
  const dbUser = process.env.DB_USER || 'jefreink_db_user';
  const dbPassword = process.env.DB_PASSWORD;
  const dbCluster = process.env.DB_CLUSTER || 'cluster0.c5z3hwc.mongodb.net';
  const dbName = process.env.DB_NAME || 'smartfinanzas';

  if (!dbPassword) {
    throw new Error('DB_PASSWORD no está definido en las variables de entorno');
  }

  const atlasUri = `mongodb+srv://${dbUser}:${dbPassword}@${dbCluster}/?appName=${dbName}&retryWrites=true&w=majority`;
  console.log('🔧 Usando MongoDB Atlas');
  return atlasUri;
};

/**
 * Establece la conexión con MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoUri = buildMongoUri();
    
    const conn = await mongoose.connect(mongoUri, {
      // Opciones recomendadas para MongoDB Atlas
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      // socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
    console.error('Asegúrate de que:');
    console.error('Para ATLAS:');
    console.error('  1. DB_PASSWORD esté definido en .env');
    console.error('  2. Tu IP esté agregada en MongoDB Atlas (Network Access)');
    console.error('Para LOCAL:');
    console.error('  1. MongoDB esté corriendo en localhost:27017');
    console.error('  2. MONGO_URI esté definido en .env.local');
    console.error('1. DB_PASSWORD esté definido en .env');
    console.error('2. Tu IP esté agregada en MongoDB Atlas (Network Access)');
    console.error('3. Las credenciales sean correctas');
    process.exit(1);
  }
};

module.exports = connectDB;
