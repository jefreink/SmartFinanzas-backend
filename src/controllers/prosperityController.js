/**
 * Controlador de Prosperidad (Prosperity)
 * Gestiona el sistema de ideas de ingresos extra y ahorro
 */

const ProsperityIdea = require('../models/ProsperityIdea');
const User = require('../models/User');

/**
 * @desc    Obtener ideas personalizadas (no vistas)
 * @route   GET /api/prosperity/ideas
 * @access  Private
 */
const getIdeas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const limit = parseInt(req.query.limit) || 10;

    // Obtener IDs de ideas ya vistas
    const viewedIds = user.viewedIdeas || [];

    // Filtrar ideas no vistas
    let query = { _id: { $nin: viewedIds } };

    // Si el usuario tiene skills, priorizar ideas que matcheen
    if (user.skills && user.skills.length > 0) {
      // Primero intentar obtener ideas que matcheen con las skills
      const matchedIdeas = await ProsperityIdea.find({
        ...query,
        requiredSkills: { $in: user.skills }
      }).limit(limit);

      if (matchedIdeas.length >= limit) {
        return res.status(200).json({
          success: true,
          count: matchedIdeas.length,
          data: matchedIdeas
        });
      }

      // Si no hay suficientes, complementar con ideas sin skills
      const remaining = limit - matchedIdeas.length;
      const otherIdeas = await ProsperityIdea.find({
        ...query,
        requiredSkills: { $nin: user.skills },
        _id: { $nin: matchedIdeas.map(i => i._id) }
      }).limit(remaining);

      const allIdeas = [...matchedIdeas, ...otherIdeas];

      return res.status(200).json({
        success: true,
        count: allIdeas.length,
        data: allIdeas
      });
    }

    // Si no tiene skills, devolver ideas aleatorias
    const ideas = await ProsperityIdea.aggregate([
      { $match: query },
      { $sample: { size: limit } }
    ]);

    res.status(200).json({
      success: true,
      count: ideas.length,
      data: ideas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Guardar idea (swipe right)
 * @route   POST /api/prosperity/save
 * @access  Private
 */
const saveIdea = async (req, res) => {
  try {
    const { ideaId } = req.body;

    if (!ideaId) {
      return res.status(400).json({
        success: false,
        message: 'ID de idea requerido'
      });
    }

    const user = await User.findById(req.user.id);

    // Añadir a vistas y guardadas
    if (!user.viewedIdeas.includes(ideaId)) {
      user.viewedIdeas.push(ideaId);
    }

    if (!user.savedIdeas.includes(ideaId)) {
      user.savedIdeas.push(ideaId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Idea guardada exitosamente'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Descartar idea (swipe left)
 * @route   POST /api/prosperity/dismiss
 * @access  Private
 */
const dismissIdea = async (req, res) => {
  try {
    const { ideaId } = req.body;

    if (!ideaId) {
      return res.status(400).json({
        success: false,
        message: 'ID de idea requerido'
      });
    }

    const user = await User.findById(req.user.id);

    // Solo añadir a vistas
    if (!user.viewedIdeas.includes(ideaId)) {
      user.viewedIdeas.push(ideaId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Idea descartada'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener ideas guardadas
 * @route   GET /api/prosperity/saved
 * @access  Private
 */
const getSavedIdeas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedIdeas');

    res.status(200).json({
      success: true,
      count: user.savedIdeas.length,
      data: user.savedIdeas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Marcar idea como implementada
 * @route   POST /api/prosperity/implement
 * @access  Private
 */
const implementIdea = async (req, res) => {
  try {
    const { ideaId, earningsGenerated } = req.body;

    if (!ideaId) {
      return res.status(400).json({
        success: false,
        message: 'ID de idea requerido'
      });
    }

    const user = await User.findById(req.user.id);

    // Verificar que la idea esté guardada
    if (!user.savedIdeas.includes(ideaId)) {
      return res.status(400).json({
        success: false,
        message: 'La idea debe estar guardada primero'
      });
    }

    // Verificar que no esté ya implementada
    const alreadyImplemented = user.implementedIdeas.some(
      item => item.idea.toString() === ideaId
    );

    if (alreadyImplemented) {
      return res.status(400).json({
        success: false,
        message: 'Esta idea ya fue marcada como implementada'
      });
    }

    // Añadir a implementadas
    user.implementedIdeas.push({
      idea: ideaId,
      implementedAt: new Date(),
      earningsGenerated: earningsGenerated || 0
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: '¡Felicitaciones! Idea implementada 🎉'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener ideas implementadas
 * @route   GET /api/prosperity/implemented
 * @access  Private
 */
const getImplementedIdeas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('implementedIdeas.idea');

    const totalEarnings = user.implementedIdeas.reduce(
      (sum, item) => sum + (item.earningsGenerated || 0),
      0
    );

    res.status(200).json({
      success: true,
      count: user.implementedIdeas.length,
      totalEarnings,
      data: user.implementedIdeas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Resetear ideas vistas (para testing)
 * @route   POST /api/prosperity/reset
 * @access  Private
 */
const resetViewedIdeas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.viewedIdeas = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Ideas reiniciadas'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Seed de ideas (crear todas las ideas iniciales)
 * @route   POST /api/prosperity/seed
 * @access  Public (solo para desarrollo)
 */
const seedIdeas = async (req, res) => {
  try {
    const prosperityIdeas = require('../seeds/prosperityIdeas');

    // Limpiar colección existente
    await ProsperityIdea.deleteMany({});

    // Insertar nuevas ideas
    const ideas = await ProsperityIdea.insertMany(prosperityIdeas);

    res.status(201).json({
      success: true,
      count: ideas.length,
      message: `${ideas.length} ideas creadas exitosamente`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getIdeas = getIdeas;
exports.saveIdea = saveIdea;
exports.dismissIdea = dismissIdea;
exports.getSavedIdeas = getSavedIdeas;
exports.implementIdea = implementIdea;
exports.getImplementedIdeas = getImplementedIdeas;
exports.resetViewedIdeas = resetViewedIdeas;
exports.seedIdeas = seedIdeas;
