/**
 * Modelo de Usuario (User)
 * Esquema de Mongoose para almacenar la información del usuario y configuración global.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Por favor ingrese un nombre'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Por favor ingrese un correo electrónico'],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor ingrese un correo válido',
      ],
    },
    profileImage: {
      type: String,
      default: null, // URL de la imagen de perfil
    },
    password: {
      type: String,
      required: [true, 'Por favor ingrese una contraseña'],
      minlength: 6,
      select: false, // No devolver la contraseña en consultas por defecto
    },
    skills: {
      type: [String], // Array de habilidades (p. ej. 'Diseño', 'Programación') - Para Generador de Prosperidad
      default: [],
    },
    viewedIdeas: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'ProsperityIdea',
      default: [],
    },
    savedIdeas: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'ProsperityIdea',
      default: [],
    },
    implementedIdeas: {
      type: [{
        idea: { type: mongoose.Schema.Types.ObjectId, ref: 'ProsperityIdea' },
        implementedAt: { type: Date, default: Date.now },
        earningsGenerated: { type: Number, default: 0 }
      }],
      default: [],
    },
    ghostModeSettings: {
      sensitiveFields: {
        type: [String],
        default: ['balance', 'savings', 'income'], // Campos a ocultar por defecto
      },
      isEnabled: {
        type: Boolean,
        default: true,
      },
      triggerDistanceCM: {
        type: Number,
        default: 5
      }
    },
    financialProfile: {
      monthlyBudget: { type: Number, default: 0 },
      survivalMode: { type: Boolean, default: false }, // Se activa si freeMoney < 10%
      viceTaxRate: { type: Number, default: 0.10 } // 10% por defecto
    },
    isSurvivalMode: {
      type: Boolean,
      default: false,
    },
    survivalModeActivatedAt: {
      type: Date,
    },
    survivalModeDeactivatedAt: {
      type: Date,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Middleware pre-save para hashear la contraseña antes de guardar.
 */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Método para comparar contraseñas ingresadas con el hash almacenado.
 * @param {string} enteredPassword - Contraseña ingresada por el usuario.
 * @returns {boolean} - Verdadero si coinciden.
 */
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
