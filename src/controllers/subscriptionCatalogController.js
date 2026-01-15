const SubscriptionCatalog = require('../models/SubscriptionCatalog');

// Default catalog items para inicializar
const DEFAULT_CATALOG = [
  { name: 'Netflix', color: '#E50914', order: 1 },
  { name: 'Spotify', color: '#1DB954', order: 2 },
  { name: 'Disney+', color: '#113CCF', order: 3 },
  { name: 'Amazon Prime', color: '#00A8E1', order: 4 },
  { name: 'HBO Max', color: '#5822b4', order: 5 },
  { name: 'Apple TV+', color: '#000000', order: 6 },
  { name: 'YouTube Premium', color: '#FF0000', order: 7 },
  { name: 'Crunchyroll', color: '#F47521', order: 8 },
];

// Obtener catálogo del usuario (o inicializar con defaults)
exports.getCatalog = async (req, res) => {
    try {
        const userId = req.user._id;
        
        let catalog = await SubscriptionCatalog.find({ userId }).sort({ order: 1 });
        
        // Si no tiene catálogo, crear el default
        if (catalog.length === 0) {
            const defaultItems = DEFAULT_CATALOG.map(item => ({
                ...item,
                userId,
                visible: true
            }));
            
            catalog = await SubscriptionCatalog.insertMany(defaultItems);
        }
        
        res.json({
            success: true,
            catalog
        });
    } catch (error) {
        console.error('Error obteniendo catálogo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el catálogo'
        });
    }
};

// Crear nuevo item en el catálogo
exports.createCatalogItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, iconUrl, color } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'El nombre es requerido'
            });
        }
        
        // Obtener el último order
        const lastItem = await SubscriptionCatalog.findOne({ userId }).sort({ order: -1 });
        const order = lastItem ? lastItem.order + 1 : 1;
        
        const catalogItem = new SubscriptionCatalog({
            name,
            iconUrl: iconUrl || null,
            color: color || '#6366f1',
            visible: true,
            order,
            userId
        });
        
        await catalogItem.save();
        
        res.json({
            success: true,
            catalogItem
        });
    } catch (error) {
        console.error('Error creando item del catálogo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el item'
        });
    }
};

// Actualizar item del catálogo
exports.updateCatalogItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { name, iconUrl, color, visible, order } = req.body;
        
        const catalogItem = await SubscriptionCatalog.findOne({ _id: id, userId });
        
        if (!catalogItem) {
            return res.status(404).json({
                success: false,
                message: 'Item no encontrado'
            });
        }
        
        if (name !== undefined) catalogItem.name = name;
        if (iconUrl !== undefined) catalogItem.iconUrl = iconUrl;
        if (color !== undefined) catalogItem.color = color;
        if (visible !== undefined) catalogItem.visible = visible;
        if (order !== undefined) catalogItem.order = order;
        
        await catalogItem.save();
        
        res.json({
            success: true,
            catalogItem
        });
    } catch (error) {
        console.error('Error actualizando item del catálogo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el item'
        });
    }
};

// Eliminar item del catálogo
exports.deleteCatalogItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        
        const catalogItem = await SubscriptionCatalog.findOneAndDelete({ _id: id, userId });
        
        if (!catalogItem) {
            return res.status(404).json({
                success: false,
                message: 'Item no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Item eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando item del catálogo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el item'
        });
    }
};

// Reordenar catálogo
exports.reorderCatalog = async (req, res) => {
    try {
        const userId = req.user._id;
        const { items } = req.body; // Array de { id, order }
        
        if (!Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items debe ser un array'
            });
        }
        
        // Actualizar el order de cada item
        const updates = items.map(item => 
            SubscriptionCatalog.updateOne(
                { _id: item.id, userId },
                { $set: { order: item.order } }
            )
        );
        
        await Promise.all(updates);
        
        res.json({
            success: true,
            message: 'Catálogo reordenado exitosamente'
        });
    } catch (error) {
        console.error('Error reordenando catálogo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar el catálogo'
        });
    }
};
