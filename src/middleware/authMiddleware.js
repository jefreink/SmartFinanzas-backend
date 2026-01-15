/**
 * Middleware para proteger rutas
 * Verifica el token JWT en el header Authorization.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  
  console.log('🔐 Middleware protect - path:', req.path);
  console.log('🔐 Authorization header:', req.headers.authorization?.substring(0, 30) + '...');

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Asegurarse de que el token exista
  if (!token) {
    console.log('❌ No se encontró token');
    return res.status(401).json({ success: false, msg: 'No autorizado para acceder a esta ruta' });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adjuntar usuario a la request
    const user = await User.findById(decoded.id);
    
    if (user) {
      req.user = user;
      console.log('✅ Token verificado para usuario:', req.user?._id);
    } else {
      // Si el usuario no existe en BD pero el token es válido, usar decoded
      req.user = { id: decoded.id, _id: decoded.id };
      console.log('⚠️ Token válido pero usuario no encontrado en BD, usando decoded.id:', decoded.id);
    }

    next();
  } catch (err) {
    console.log('❌ Error verificando token:', err.message);
    return res.status(401).json({ success: false, msg: 'No autorizado para acceder a esta ruta' });
  }
};
