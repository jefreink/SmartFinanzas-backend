const mongoose = require('mongoose');
const Currency = require('../models/Currency');

const currencies = [
  { code: 'USD', name: 'Dólar (USD)', symbol: '$', decimals: 2 },
  { code: 'CLP', name: 'Peso Chileno (CLP)', symbol: '$', decimals: 0 },
  { code: 'ARS', name: 'Peso Argentino (ARS)', symbol: '$', decimals: 2 },
  { code: 'MXN', name: 'Peso Mexicano (MXN)', symbol: '$', decimals: 2 },
  { code: 'COP', name: 'Peso Colombiano (COP)', symbol: '$', decimals: 0 },
  { code: 'EUR', name: 'Euro (EUR)', symbol: '€', decimals: 2 },
  { code: 'BRL', name: 'Real Brasileño (BRL)', symbol: 'R$', decimals: 2 },
  { code: 'PEN', name: 'Sol Peruano (PEN)', symbol: 'S/', decimals: 2 },
  { code: 'UYU', name: 'Peso Uruguayo (UYU)', symbol: '$U', decimals: 2 },
];

const seedCurrencies = async () => {
  try {
    const count = await Currency.countDocuments();
    
    if (count === 0) {
      console.log('Sembrando monedas...');
      await Currency.insertMany(currencies);
      console.log('✅ Monedas sembradas exitosamente');
    } else {
      console.log('✓ Las monedas ya existen en la base de datos');
    }
  } catch (error) {
    console.error('❌ Error sembrando monedas:', error);
  }
};

module.exports = seedCurrencies;
