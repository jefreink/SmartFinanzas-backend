/**
 * commonProductController.js
 * Controlador para búsqueda inteligente de productos comunes
 * Maneja búsquedas exactas, por palabra clave y por categoría
 */

const CommonProduct = require('../models/CommonProduct');

/**
 * @desc    Obtener todos los productos comunes
 * @route   GET /api/common-products
 * @access  Public
 */
exports.getAllCommonProducts = async (req, res) => {
  try {
    const products = await CommonProduct.find({ isCommon: true }).select('-__v');
    
    res.status(200).json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos comunes',
      error: err.message
    });
  }
};

/**
 * @desc    Búsqueda inteligente de productos
 * @route   GET /api/common-products/search?q=cebolla
 * @access  Public
 * @query   q - Término de búsqueda
 * @logic   1. Búsqueda exacta por nombre
 *          2. Búsqueda por aliases
 *          3. Búsqueda por keywords
 *          4. Búsqueda full-text
 *          5. Retornar productos de la misma categoría detectada
 */
exports.searchCommonProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda es requerido'
      });
    }

    const searchTerm = q.toLowerCase().trim();
    
    // 1. Búsqueda exacta por nombre
    let exactMatch = await CommonProduct.findOne({
      name: searchTerm
    });

    if (exactMatch) {
      // Incrementar contador de búsquedas
      await CommonProduct.updateOne({ _id: exactMatch._id }, { $inc: { searchCount: 1 } });
      
      return res.status(200).json({
        success: true,
        matchType: 'exact',
        data: exactMatch,
        alternatives: await CommonProduct.find({ category: exactMatch.category }).limit(5)
      });
    }

    // 2. Búsqueda por aliases (singulares/plurales)
    let aliasMatch = await CommonProduct.findOne({
      aliases: searchTerm
    });

    if (aliasMatch) {
      await CommonProduct.updateOne({ _id: aliasMatch._id }, { $inc: { searchCount: 1 } });
      
      return res.status(200).json({
        success: true,
        matchType: 'alias',
        data: aliasMatch,
        alternatives: await CommonProduct.find({ category: aliasMatch.category }).limit(5)
      });
    }

    // 3. Búsqueda por keywords
    let keywordMatches = await CommonProduct.find({
      keywords: searchTerm
    });

    if (keywordMatches.length > 0) {
      await CommonProduct.updateOne(
        { _id: keywordMatches[0]._id },
        { $inc: { searchCount: 1 } }
      );
      
      return res.status(200).json({
        success: true,
        matchType: 'keyword',
        data: keywordMatches[0],
        alternatives: await CommonProduct.find({
          category: keywordMatches[0].category
        }).limit(5)
      });
    }

    // 4. Búsqueda full-text (palabras clave parciales)
    let textMatches = await CommonProduct.find(
      { $text: { $search: searchTerm } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(10);

    if (textMatches.length > 0) {
      return res.status(200).json({
        success: true,
        matchType: 'partial',
        data: textMatches[0],
        suggestions: textMatches.slice(0, 5),
        alternatives: await CommonProduct.find({
          category: textMatches[0].category
        }).limit(5)
      });
    }

    // 5. Si no hay coincidencias, retornar todas las categorías como fallback
    const allByCategory = await CommonProduct.find().sort({ category: 1, searchCount: -1 });
    
    res.status(200).json({
      success: true,
      matchType: 'none',
      message: 'No se encontraron coincidencias exactas. Aquí están todos los productos disponibles agrupados por categoría.',
      data: null,
      suggestions: allByCategory,
      categoriesSummary: {
        Lácteos: allByCategory.filter(p => p.category === 'Lácteos').length,
        Frutas: allByCategory.filter(p => p.category === 'Frutas').length,
        Verduras: allByCategory.filter(p => p.category === 'Verduras').length,
        Carnes: allByCategory.filter(p => p.category === 'Carnes').length,
        Pescado: allByCategory.filter(p => p.category === 'Pescado').length,
        Panadería: allByCategory.filter(p => p.category === 'Panadería').length,
        Bebidas: allByCategory.filter(p => p.category === 'Bebidas').length,
        Condimentos: allByCategory.filter(p => p.category === 'Condimentos').length,
        Granos: allByCategory.filter(p => p.category === 'Granos').length
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda de productos',
      error: err.message
    });
  }
};

/**
 * @desc    Obtener productos por categoría
 * @route   GET /api/common-products/category/:category
 * @access  Public
 */
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const products = await CommonProduct.find({
      category: category,
      isCommon: true
    }).sort({ searchCount: -1 });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron productos en la categoría: ${category}`
      });
    }

    res.status(200).json({
      success: true,
      category,
      data: products,
      total: products.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos por categoría',
      error: err.message
    });
  }
};

/**
 * @desc    Obtener categorías disponibles
 * @route   GET /api/common-products/categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await CommonProduct.distinct('category').sort();
    
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => ({
        name: cat,
        count: await CommonProduct.countDocuments({ category: cat, isCommon: true })
      }))
    );

    res.status(200).json({
      success: true,
      data: categoriesWithCount,
      total: categoriesWithCount.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: err.message
    });
  }
};

/**
 * @desc    Obtener imagen de producto por nombre (búsqueda inteligente)
 * @route   GET /api/common-products/image?q=cebolla morada
 * @access  Public
 */
exports.getProductImage = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro "q" es requerido'
      });
    }

    const searchResult = await this.searchCommonProducts.__wrapped__(req, res);
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener imagen',
      error: err.message
    });
  }
};
