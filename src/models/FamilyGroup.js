const mongoose = require('mongoose');

const FamilyGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del grupo es obligatorio'],
        trim: true
    },
    code: {
        type: String,
        unique: true,
        required: true
    }, // Código de invitación de 6 caracteres
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now }
    }],
    settings: {
        shareInventory: { type: Boolean, default: true },
        shareSubscription: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('FamilyGroup', FamilyGroupSchema);
