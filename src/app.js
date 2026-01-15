/**
 * Configuración de la App Express
 * Define middlewares globales y rutas.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const financeRoutes = require('./routes/financeRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const splitRoutes = require('./routes/splitRoutes');
const tripRoutes = require('./routes/tripRoutes');
const goalRoutes = require('./routes/goalRoutes');
const prosperityRoutes = require('./routes/prosperityRoutes');
const survivalRoutes = require('./routes/survivalRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const loanRoutes = require('./routes/loanRoutes');
const commonProductRoutes = require('./routes/commonProductRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const contactRoutes = require('./routes/contactRoutes');
const subscriptionCatalogRoutes = require('./routes/subscriptionCatalogRoutes');
const currencyRoutes = require('./routes/currencies');

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Logging middleware para debugging
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

// Definir rutas base
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/split', splitRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/prosperity', prosperityRoutes);
app.use('/api/survival', survivalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/common-products', commonProductRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/subscription-catalog', subscriptionCatalogRoutes);
app.use('/api/currencies', currencyRoutes);

// Servir archivos estáticos de uploads con path absoluto
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

console.log('📁 Uploads directory:', uploadsPath);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API SmartFinance AI Funcionando 🚀');
});

module.exports = app;
