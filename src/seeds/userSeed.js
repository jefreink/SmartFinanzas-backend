/**
 * Seed para crear usuario de prueba
 * Se ejecuta automáticamente al iniciar el servidor
 */
const User = require('../models/User');

const seedUsers = async () => {
  try {
    // Verificar si ya existe usuario de prueba
    const existingUser = await User.findOne({ email: 'test@smartfinanzas.com' });

    if (!existingUser) {
      console.log('🌱 Creando usuario de prueba...');

      const testUser = await User.create({
        name: 'Usuario Test',
        email: 'test@smartfinanzas.com',
        password: 'Test123456!', // Se hashea automáticamente en el modelo
        currency: 'USD', // Moneda por defecto
      });

      console.log(`✅ Usuario de prueba creado:
   Email: test@smartfinanzas.com
   Contraseña: Test123456!
   ID: ${testUser._id}`);
    } else {
      console.log('✅ Usuario de prueba ya existe');
    }
  } catch (error) {
    console.error('❌ Error seeding usuarios:', error.message);
  }
};

module.exports = seedUsers;
