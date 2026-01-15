const mongoose = require('mongoose');

const subscriptionCatalogSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    iconUrl: {
        type: String,
        default: null
    },
    color: {
        type: String,
        default: '#6366f1'
    },
    visible: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Índice para ordenamiento y búsqueda
subscriptionCatalogSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('SubscriptionCatalog', subscriptionCatalogSchema);
