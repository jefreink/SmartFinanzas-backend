/**
 * Configuración de la conexión a MongoDB Atlas
 * Utiliza variables de entorno para las credenciales de seguridad
 */
const mongoose = require('mongoose');

/**
 * Construye la URI de conexión a MongoDB Atlas
 * Reemplaza el placeholder <db_password> con la variable de entorno
 */
const buildMongoUri = () => {
  const dbUser = process.env.DB_USER || 'jefreink_db_user';
  const dbPassword = process.env.DB_PASSWORD;
  const dbCluster = process.env.DB_CLUSTER || 'cluster0.c5z3hwc.mongodb.net';
  const dbName = process.env.DB_NAME || 'smartfinanzas';

  if (!dbPassword) {
    throw new Error('DB_PASSWORD no está definido en las variables de entorno');
  }

  return `mongodb+srv://${dbUser}:${dbPassword}@${dbCluster}/?appName=${dbName}&retryWrites=true&w=majority`;
};

/**
 * Establece la conexión con MongoDB Atlas
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

    console.log(`✅ MongoDB Atlas Conectado: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error(`❌ Error de conexión a MongoDB Atlas: ${error.message}`);
    console.error('Asegúrate de que:');
    console.error('1. DB_PASSWORD esté definido en .env');
    console.error('2. Tu IP esté agregada en MongoDB Atlas (Network Access)');
    console.error('3. Las credenciales sean correctas');
    process.exit(1);
  }
};

module.exports = connectDB;
