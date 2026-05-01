/**
 * Upload Controller
 * Maneja la subida de imágenes desde base64
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const uploadBase64Image = async (req, res) => {
    console.log('📥 Solicitud de subida de imagen recibida');
    try {
        const { image, filename } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No se proporcionó una imagen' });
        }

        // Extraer el base64 (manejar duplicados de prefijo "data:image/...;base64,")
        const base64Data = image.includes(',')
            ? image.split(',').pop()
            : image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generar nombre único para el archivo
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const ext = filename ? path.extname(filename) : '.png';
        const finalFilename = `${hash}${ext? ext: '.jpg'}`;

        // Directorio de uploads
        const uploadsDir = path.join(__dirname, '../../uploads');
        await fs.mkdir(uploadsDir, { recursive: true });

        // Guardar archivo
        const filePath = path.join(uploadsDir, finalFilename);
        await fs.writeFile(filePath, buffer);

        // Devolver URL usando SERVER_URL (consistente en todas las plataformas)
        const serverUrl = process.env.SERVER_URL || 'https://smartfinanzas-backend.onrender.com';
        const imageUrl = `${serverUrl}/uploads/${finalFilename}`;
        
        console.log('✅ Imagen guardada:', finalFilename);
        console.log('✅ URL generada:', imageUrl);

        res.json({ 
            success: true, 
            url: imageUrl,
            filename: finalFilename
        });

    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ error: 'Error al procesar la imagen' });
    }
};

const uploadImage = async (req, res) => {
    console.log('🎯 uploadImage controller iniciado');
    console.log('📦 req.file:', req.file);
    console.log('📦 req.body:', req.body);
    
    try {
        if (!req.file) {
            console.error('❌ No se recibió archivo');
            return res.status(400).json({ error: 'No se recibió archivo' });
        }

        console.log('✅ Archivo recibido:', req.file.filename);

        // Usar SERVER_URL (consistente en todas las plataformas)
        const serverUrl = process.env.SERVER_URL || 'https://smartfinanzas-backend.onrender.com';
        const imageUrl = `${serverUrl}/uploads/${req.file.filename}`;

        console.log('✅ URL generada:', imageUrl);

        res.json({
            success: true,
            url: imageUrl,
        });
    } catch (err) {
        console.error('❌ Error al subir imagen:', err);
        console.error('❌ Stack:', err.stack);
        res.status(500).json({ error: 'Error al subir imagen', details: err.message });
    }
};

const uploadInventoryImage = async (req, res) => {
    console.log('📥 Solicitud de subida de imagen de inventario recibida');
    try {
        const { image, productName } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No se proporcionó una imagen' });
        }

        // Extraer el base64
        const base64Data = image.includes(',')
            ? image.split(',').pop()
            : image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generar nombre del archivo basado en el producto
        const normalizedName = (productName || 'producto')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]/g, '');
        
        const ext = '.png';
        const timestamp = Date.now();
        const finalFilename = `${normalizedName}-${timestamp}${ext}`;

        // Directorio de inventario
        const inventoryDir = path.join(__dirname, '../../uploads/inventory');
        await fs.mkdir(inventoryDir, { recursive: true });

        // Guardar archivo
        const filePath = path.join(inventoryDir, finalFilename);
        await fs.writeFile(filePath, buffer);

        // Devolver URL usando SERVER_URL (consistente en todas las plataformas)
        const serverUrl = process.env.SERVER_URL || 'https://smartfinanzas-backend.onrender.com';
        const imageUrl = `${serverUrl}/uploads/inventory/${finalFilename}`;
        
        console.log('✅ Imagen de inventario guardada:', finalFilename);
        console.log('✅ URL generada:', imageUrl);

        res.json({ 
            success: true, 
            url: imageUrl,
            filename: finalFilename,
            productName
        });

    } catch (error) {
        console.error('Error al subir imagen de inventario:', error);
        res.status(500).json({ error: 'Error al procesar la imagen' });
    }
};

module.exports = {
    uploadBase64Image,
    uploadImage,
    uploadInventoryImage
};

