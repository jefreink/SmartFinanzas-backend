const express = require('express');
const multer = require('multer');
const path = require('path');
const { scanReceipt, scanExpiryDate, learnCorrection, getOCRStats, getOCRUsage } = require('../controllers/ocrController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Configuración de Multer idéntica a uploadRoutes (que funciona)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ocr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max (más generoso)
});

// Ruta con middleware de logging
router.post('/scan', (req, res, next) => {
  console.log('🔵 OCR /scan route accessed: POST');
  next();
}, protect, upload.single('image'), (req, res, next) => {
  console.log('✅ Después de multer, req.file:', req.file ? 'PRESENTE' : 'AUSENTE');
  if (req.file) {
    console.log('📁 Archivo recibido:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } else {
    console.error('❌ NO se recibió archivo');
  }
  next();
}, scanReceipt);

// Nueva ruta que acepta base64 en JSON (más confiable para React Native)
router.post('/scan-base64', protect, scanReceipt);

router.post('/expiry-date', protect, upload.single('image'), scanExpiryDate);
router.post('/learn', protect, learnCorrection);
router.get('/stats', protect, getOCRStats);
router.get('/usage', protect, getOCRUsage);

module.exports = router;
