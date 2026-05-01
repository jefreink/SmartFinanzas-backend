/**
 * Punto de entrada del Servidor
 * Inicializa la conexión a DB y levanta el servidor.
 */
const app = require('./app');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const seedCurrencies = require('./seeds/currencySeed');
const seedUsers = require('./seeds/userSeed');

// Cargar variables de entorno (.env.local tiene prioridad sobre .env)
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('🔧 Cargando configuración local (.env.local)');
  dotenv.config({ path: envLocalPath });
} else {
  console.log('🔧 Cargando configuración de producción (.env)');
  dotenv.config();
}

// Conectar a la base de datos y ejecutar seeds
connectDB().then(() => {
  seedCurrencies();
  seedUsers();
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const SERVER_URL = process.env.SERVER_URL || `http://${HOST}:${PORT}`;

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`📱 Accesible desde: ${SERVER_URL}`);
});

// Inicializar socket.io
// try {
//   const { Server } = require('socket.io');
//   const { setIo } = require('./utils/socket');
//   const io = new Server(server, {
//     cors: {
//       origin: process.env.SOCKET_ORIGIN || '*',
//       methods: ['GET', 'POST']
//     }
//   });

//   io.on('connection', (socket) => {
//     console.log('🔌 Socket conectado:', socket.id);

//     socket.on('identify', (userId) => {
//       if (userId) {
//         const room = `user:${userId}`;
//         socket.join(room);
//         console.log(`Socket ${socket.id} se unió a ${room}`);
//       }
//     });

//     socket.on('disconnect', () => {
//       console.log('🔌 Socket desconectado:', socket.id);
//     });
//   });

//   setIo(io);
//   console.log('🟣 Socket.IO inicializado');
// } catch (err) {
//   console.warn('No se pudo inicializar socket.io', err);
// }

// Manejo de rechazos de promesas no capturados
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Cerrar servidor y salir del proceso
  server.close(() => process.exit(1));
});
