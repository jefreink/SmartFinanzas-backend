/**
 * Controlador de Inventario
 * Maneja la lógica de la despensa y frescura con algoritmo híbrido.
 */
const Inventory = require('../models/Inventory');
const { checkInventoryAlerts, generateShoppingRecommendations } = require('../utils/inventoryAlerts');
const { calculateExpiryDate, getStorageRecommendation, getProductCategory } = require('../config/productLifespan');
const { getProductImage } = require('../utils/productImages');

/**
 * Tabla maestra de vida útil estimada (en días) para perecederos
 * Si el usuario no provee fecha, se usa esto.
 */
const SHELF_LIFE_ESTIMATES = {
  'Frutas': 7,
  'Verduras': 5,
  'Hortalizas': 4,
  'Carne': 3,
  'Pescado': 2,
  'Lácteos': 10,
  'Panadería': 3,
  // Default general
  'Perecederos': 7 
};

/**
 * @desc    Obtener todo el inventario del usuario con Score de Frescura
 * @route   GET /api/inventory
 * @access  Private
 */
exports.getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({ user: req.user.id }).sort({ expiryDate: 1, purchaseDate: 1 });
    
    // Calcular status dinámico antes de devolver
    const inventoryWithStatus = inventory.map(item => {
      const daysLeft = item.daysRemaining; // Usando el virtual del modelo
      let status = 'fresh';
      
      if (daysLeft !== null) {
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft <= 2) status = 'critical';
        else if (daysLeft <= 5) status = 'warning';
      }
      
      // No modificamos la BD en GET, solo la respuesta, o podríamos hacer un bulkWrite si quisiéramos persistir el status
      return {
        ...item.toObject(),
        status,
        daysRemaining: daysLeft
      };
    });

    res.status(200).json({ success: true, count: inventoryWithStatus.length, data: inventoryWithStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Agregar ítem manual
 * @route   POST /api/inventory
 * @access  Private
 */
exports.addItem = async (req, res) => {
    try {
        const { name, quantity, unit, category, expiryDate, purchaseDate, estimatedLifeDays, isEstimated, price, transactionId } = req.body;

        // Mapear categorías legibles a enums del modelo
        const perishablesCategories = ['Lácteos', 'Carnes', 'Frutas', 'Verduras', 'Panadería', 'Pescado', 'Hortalizas'];
        const isCategoryPerishable = perishablesCategories.some(p => 
            category?.toLowerCase().includes(p.toLowerCase())
        );
        const finalCategory = isCategoryPerishable ? 'perishable' : 'non-perishable';

        // Obtener imagen flat automáticamente
        const imageUrl = getProductImage(name, category);

        const newItem = await Inventory.create({
            user: req.user.id,
            name,
            quantity: quantity || 1,
            unit: unit || 'unid',
            category: finalCategory,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            estimatedLifeDays: estimatedLifeDays || 7,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : Date.now(),
            sourceTransaction: transactionId,
            freshnessScore: isEstimated ? 50 : 100,
            imageUrl: imageUrl
        });

        res.status(201).json({ success: true, data: newItem });
    } catch (err) {
        console.error('❌ Error en addItem:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Actualizar ítem (ej: Ajuste de frescura manual)
 * @route   PUT /api/inventory/:id
 * @access  Private
 */
exports.updateItem = async (req, res) => {
    try {
        let item = await Inventory.findById(req.params.id);
        if(!item) return res.status(404).json({ success: false, msg: 'Item no encontrado' });
        if(item.user.toString() !== req.user.id) return res.status(401).json({ success: false, msg: 'No autorizado' });

        // Si se cambia el nombre, actualizar la imagen automáticamente
        if (req.body.name && req.body.name !== item.name) {
            req.body.imageUrl = getProductImage(req.body.name, req.body.category || item.category);
        }

        item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Eliminar ítem (Consumido o Desechado)
 * @route   DELETE /api/inventory/:id
 * @access  Private
 */
exports.deleteItem = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if(!item) return res.status(404).json({ success: false, msg: 'Item no encontrado' });
        if(item.user.toString() !== req.user.id) return res.status(401).json({ success: false, msg: 'No autorizado' });

        await item.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Ajustar días de vida útil (perecederos)
 * @route   PATCH /api/inventory/:id/adjust-days
 * @access  Private
 */
exports.adjustDays = async (req, res) => {
    try {
        const { estimatedLifeDays } = req.body;
        
        const item = await Inventory.findById(req.params.id);
        if(!item) return res.status(404).json({ success: false, msg: 'Item no encontrado' });
        if(item.user.toString() !== req.user.id) return res.status(401).json({ success: false, msg: 'No autorizado' });

        if (item.category === 'perishable') {
            item.estimatedLifeDays = estimatedLifeDays;
            await item.save();
        }

        res.status(200).json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener alertas del inventario
 * @route   GET /api/inventory/alerts
 * @access  Private
 */
exports.getAlerts = async (req, res) => {
    try {
        const alerts = await checkInventoryAlerts(req.user.id);
        res.status(200).json(alerts);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener recomendaciones de compra
 * @route   GET /api/inventory/shopping-list
 * @access  Private
 */
exports.getShoppingRecommendations = async (req, res) => {
    try {
        const recommendations = await generateShoppingRecommendations(req.user.id);
        res.status(200).json(recommendations);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener historial de precios de un producto
 * @route   GET /api/inventory/price-history/:productName
 * @access  Private
 */
exports.getPriceHistory = async (req, res) => {
    try {
        const { productName } = req.params;
        const Transaction = require('../models/Transaction');
        
        // Buscar transacciones del usuario que contengan este producto
        const transactions = await Transaction.find({
            user: req.user.id,
            'items.name': new RegExp(productName, 'i')
        }).sort({ date: -1 }).limit(10);

        // Extraer precios del producto específico
        const priceHistory = [];
        
        transactions.forEach(transaction => {
            const item = transaction.items.find(i => 
                new RegExp(productName, 'i').test(i.name)
            );
            
            if (item && item.price) {
                priceHistory.push({
                    price: item.price,
                    date: transaction.date,
                    merchant: transaction.merchant,
                    quantity: item.quantity || 1
                });
            }
        });

        if (priceHistory.length === 0) {
            return res.status(200).json({
                success: true,
                productName,
                message: 'No hay historial de precios para este producto',
                priceHistory: []
            });
        }

        // Calcular estadísticas
        const prices = priceHistory.map(p => p.price);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const latestPrice = priceHistory[0].price;

        // Determinar tendencia
        let trend = 'stable';
        if (priceHistory.length >= 2) {
            const recentAvg = (priceHistory[0].price + priceHistory[1].price) / 2;
            if (recentAvg > avgPrice * 1.1) trend = 'increasing';
            else if (recentAvg < avgPrice * 0.9) trend = 'decreasing';
        }

        res.status(200).json({
            success: true,
            productName,
            statistics: {
                average: avgPrice.toFixed(2),
                min: minPrice,
                max: maxPrice,
                latest: latestPrice,
                trend
            },
            priceHistory
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener sugerencias de productos con imágenes
 * @route   GET /api/inventory/product-suggestions?q=:query
 * @access  Private
 */
exports.getProductSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ 
                success: false, 
                message: 'Query parameter required' 
            });
        }

        const normalizedQuery = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const suggestions = [];
        
        // Buscar en el mapeo de productos comunes
        for (const [productName, imageUrl] of Object.entries(require('../utils/productImages').PRODUCT_IMAGE_MAP)) {
            if (productName.includes(normalizedQuery) || normalizedQuery.includes(productName)) {
                suggestions.push({
                    name: productName.charAt(0).toUpperCase() + productName.slice(1),
                    imageUrl,
                    isCommon: true
                });
            }
        }

        // También buscar en el historial del usuario
        const userProducts = await Inventory.find({ 
            user: req.user.id,
            name: new RegExp(q, 'i')
        })
        .select('name imageUrl')
        .limit(5);

        userProducts.forEach(product => {
            if (!suggestions.find(s => s.name.toLowerCase() === product.name.toLowerCase())) {
                suggestions.push({
                    name: product.name,
                    imageUrl: product.imageUrl,
                    isCommon: false,
                    fromHistory: true
                });
            }
        });

        res.status(200).json({
            success: true,
            query: q,
            suggestions: suggestions.slice(0, 10) // Limitar a 10 resultados
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener todas las imágenes de productos comunes del banco
 * @route   GET /api/inventory/product-images
 * @access  Public
 */
exports.getProductImages = async (req, res) => {
    try {
        const { PRODUCT_IMAGE_MAP, CATEGORY_IMAGE_MAP } = require('../utils/productImages');
        
        // Convertir mapas a arrays
        const products = Object.entries(PRODUCT_IMAGE_MAP).map(([name, imageUrl]) => ({
            name,
            imageUrl: imageUrl.includes('/uploads') ? imageUrl : imageUrl, // Las URLs ya son strings del servidor
            category: 'General'
        }));
        
        const categories = Object.entries(CATEGORY_IMAGE_MAP).map(([name, imageUrl]) => ({
            name,
            imageUrl,
            isCategory: true
        }));
        
        res.status(200).json({
            success: true,
            data: {
                products,
                categories,
                totalProducts: products.length,
                totalCategories: categories.length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
