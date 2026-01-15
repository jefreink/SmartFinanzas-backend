const Currency = require('../models/Currency');

// Obtener todas las monedas activas
exports.getAllCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find({ active: true }).sort({ code: 1 });
    
    if (!currencies || currencies.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No hay monedas disponibles'
      });
    }

    res.status(200).json({
      success: true,
      data: currencies,
      count: currencies.length
    });
  } catch (error) {
    console.error('Error getting currencies:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'No se pudo obtener las monedas'
    });
  }
};

// Obtener una moneda por código
exports.getCurrencyByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const currency = await Currency.findOne({ code: code.toUpperCase() });

    if (!currency) {
      return res.status(404).json({
        success: false,
        error: 'Moneda no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: currency
    });
  } catch (error) {
    console.error('Error getting currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'No se pudo obtener la moneda'
    });
  }
};

// Crear una nueva moneda (admin)
exports.createCurrency = async (req, res) => {
  try {
    const { code, name, symbol, decimals } = req.body;

    // Validaciones
    if (!code || !name || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'code, name y symbol son requeridos'
      });
    }

    // Verificar si ya existe
    const existing = await Currency.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Esta moneda ya existe'
      });
    }

    const currency = new Currency({
      code: code.toUpperCase(),
      name,
      symbol,
      decimals: decimals || 2
    });

    await currency.save();

    res.status(201).json({
      success: true,
      data: currency,
      message: 'Moneda creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'No se pudo crear la moneda'
    });
  }
};

// Actualizar una moneda (admin)
exports.updateCurrency = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, symbol, decimals, active } = req.body;

    const currency = await Currency.findOneAndUpdate(
      { code: code.toUpperCase() },
      { name, symbol, decimals, active },
      { new: true, runValidators: true }
    );

    if (!currency) {
      return res.status(404).json({
        success: false,
        error: 'Moneda no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: currency,
      message: 'Moneda actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'No se pudo actualizar la moneda'
    });
  }
};

// Eliminar una moneda (admin)
exports.deleteCurrency = async (req, res) => {
  try {
    const { code } = req.params;

    const currency = await Currency.findOneAndDelete({ code: code.toUpperCase() });

    if (!currency) {
      return res.status(404).json({
        success: false,
        error: 'Moneda no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Moneda eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'No se pudo eliminar la moneda'
    });
  }
};
