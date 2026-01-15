/**
 * Upload Routes
 * Rutas para subir archivos
 */
const path = require('path');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadBase64Image, uploadImage, uploadInventoryImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// Configurar multer con más opciones
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Middleware de logging
router.use((req, res, next) => {
    console.log('🔵 Upload route accessed:', req.method, req.path);
    next();
});

router.post('/image', (req, res, next) => {
    console.log('📥 POST /image recibido');
    next();
}, protect, upload.single('image'), uploadImage);

router.post('/image64', (req, res, next) => {
    console.log('📥 POST /image64 recibido');
    next();
}, protect, uploadBase64Image);

router.post('/inventory-image', (req, res, next) => {
    console.log('📥 POST /inventory-image recibido');
    next();
}, protect, uploadInventoryImage);

module.exports = router;
