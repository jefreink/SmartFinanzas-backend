const Merchant = require('../models/Merchant');

/**
 * @desc    Buscar comercios (Autocomplete)
 * @route   GET /api/merchants?query=...
 */
exports.searchMerchants = async (req, res) => {
  try {
    const { query } = req.query;
    // Búsqueda case-insensitive (regex)
    const merchants = await Merchant.find({
        user: req.user.id,
        name: { $regex: query, $options: 'i' }
    }).limit(5);

    res.status(200).json({ success: true, data: merchants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener o Crear un Merchant (Upsert)
 * @route   POST /api/merchants
 * Lógica: Si ya existe, devuelve el logo. Si no, lo crea (opcional).
 */
exports.upsertMerchant = async (req, res) => {
    try {
        const { name, logoUrl, defaultCategory, latitude, longitude, address } = req.body;
        
        let merchant = await Merchant.findOne({ user: req.user.id, name: name });

        if (merchant) {
            // Actualizar si viene logo nuevo o ubicación
            if (logoUrl) merchant.logoUrl = logoUrl;
            if (defaultCategory) merchant.defaultCategory = defaultCategory;
            if (latitude && longitude) {
                merchant.location = {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                    address: address || merchant.location?.address
                };
            }
            merchant.lastVisit = Date.now();
            merchant.visitCount = (merchant.visitCount || 0) + 1;
            await merchant.save();
        } else {
            // Crear nuevo
            const merchantData = {
                user: req.user.id,
                name,
                logoUrl,
                defaultCategory
            };

            if (latitude && longitude) {
                merchantData.location = {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                    address
                };
            }

            merchant = await Merchant.create(merchantData);
        }

        res.status(200).json({ success: true, data: merchant });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Agregar producto conocido a un comercio
 * @route   POST /api/merchants/:id/products
 */
exports.addProductToMerchant = async (req, res) => {
    try {
        const { name, imageUrl, price } = req.body;
        const merchant = await Merchant.findById(req.params.id);

        if (!merchant) return res.status(404).json({ msg: 'Merchant not found' });
        
        // Verificar si ya existe el producto
        const productIndex = merchant.products.findIndex(p => p.name === name);
        if (productIndex > -1) {
            // Actualizar imagen o precio
            if(imageUrl) merchant.products[productIndex].imageUrl = imageUrl;
            if(price) merchant.products[productIndex].lastPrice = price;
        } else {
            // Agregar nuevo
            merchant.products.push({ name, imageUrl, lastPrice: price });
        }

        await merchant.save();
        res.status(200).json({ success: true, data: merchant });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Buscar merchants cercanos (Geofencing)
 * @route   GET /api/merchants/nearby?latitude=X&longitude=Y&radius=1000
 * @access  Private
 */
exports.getNearbyMerchants = async (req, res) => {
    try {
        const { latitude, longitude, radius = 1000 } = req.query; // radius en metros, default 1km

        if (!latitude || !longitude) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requieren latitude y longitude' 
            });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const maxDistance = parseInt(radius);

        // Query geoespacial usando $geoNear o $near
        const merchants = await Merchant.find({
            user: req.user.id,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: maxDistance
                }
            }
        }).limit(10);

        // Calcular distancia aproximada para cada merchant
        const merchantsWithDistance = merchants.map(merchant => {
            if (merchant.location && merchant.location.coordinates) {
                const [mLng, mLat] = merchant.location.coordinates;
                const distance = calculateDistance(lat, lng, mLat, mLng);
                return {
                    ...merchant.toObject(),
                    distance: Math.round(distance)
                };
            }
            return merchant.toObject();
        });

        res.status(200).json({ 
            success: true, 
            data: merchantsWithDistance,
            count: merchantsWithDistance.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener sugerencias inteligentes basadas en ubicación e historial
 * @route   GET /api/merchants/suggestions?latitude=X&longitude=Y
 * @access  Private
 */
exports.getMerchantSuggestions = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requieren latitude y longitude' 
            });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        // 1. Encontrar merchants cercanos (500m)
        const nearbyMerchants = await Merchant.find({
            user: req.user.id,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 500
                }
            }
        }).sort({ visitCount: -1, lastVisit: -1 }).limit(5);

        // 2. Si hay merchants cercanos, agregar info útil
        const suggestions = nearbyMerchants.map(merchant => {
            const [mLng, mLat] = merchant.location.coordinates;
            const distance = calculateDistance(lat, lng, mLat, mLng);
            
            return {
                merchantId: merchant._id,
                name: merchant.name,
                logoUrl: merchant.logoUrl,
                distance: Math.round(distance),
                visitCount: merchant.visitCount,
                lastVisit: merchant.lastVisit,
                products: merchant.products.slice(0, 3), // Top 3 productos
                suggestion: `Estás a ${Math.round(distance)}m de ${merchant.name}`
            };
        });

        res.status(200).json({ 
            success: true, 
            data: suggestions,
            message: suggestions.length > 0 
                ? `Encontramos ${suggestions.length} lugares que frecuentas cerca` 
                : 'No hay lugares conocidos cerca de tu ubicación'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Fórmula de Haversine para calcular distancia entre dos coordenadas
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en metros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
}

