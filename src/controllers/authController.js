/**
 * Controlador de Autenticación
 * Maneja el registro, inicio de sesión y obtención del usuario actual.
 */
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT firmado.
 * @param {string} id - ID del usuario.
 * @returns {string} - Token JWT.
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    // expiresIn: process.env.JWT_EXPIRE, // Token sin expiración
  });
};

/**
 * @desc    Registrar un nuevo usuario
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, msg: 'El usuario ya existe' });
    }

    // Crear usuario
    user = await User.create({
      name,
      email,
      password,
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Iniciar sesión
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar email y password
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: 'Por favor ingrese email y contraseña' });
    }

    // Verificar usuario (incluyendo password que está excluida por defecto)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, msg: 'Credenciales inválidas' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener usuario actual
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Actualizar detalles de usuario (Ghost Mode, Budget)
 * @route   PUT /api/auth/updatedetails
 * @access  Private
 */
exports.updateDetails = async (req, res) => {
  try {
      const { ghostModeSettings, financialProfile, currency, profileImage } = req.body;
      const fieldsToUpdate = {};

      if(ghostModeSettings) fieldsToUpdate.ghostModeSettings = ghostModeSettings;
      if(financialProfile) fieldsToUpdate.financialProfile = financialProfile;
      if(currency) fieldsToUpdate.currency = currency;
      if(profileImage) fieldsToUpdate.profileImage = profileImage;

      const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
          new: true,
          runValidators: true
      });

      res.status(200).json({ success: true, data: user });
  } catch (err) {
      res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Respuesta helper para enviar token y datos
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      onboardingComplete: user.onboardingComplete,
      ghostModeSettings: user.ghostModeSettings,
      currency: user.currency,
      profileImage: user.profileImage
    },
  });
};
