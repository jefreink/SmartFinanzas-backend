/**
 * Trip Controller
 * Controlador para gestionar viajes compartidos
 */

const mongoose = require('mongoose');
const Trip = require('../models/Trip');

/**
 * Crear un nuevo viaje
 */
exports.createTrip = async (req, res) => {
  try {
    console.log('📝 Creando viaje - Body:', req.body);
    console.log('👤 Usuario:', req.user?._id, req.user?.name);

    const { name, description, destination, startDate, endDate, participants } = req.body;
    const userId = req.user._id;

    // Validaciones
    if (!name || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y fecha de inicio son requeridos',
      });
    }

    // Filtrar participantes para evitar duplicar al usuario creador
    const filteredParticipants = (participants || []).filter(
      (p) => p.email !== req.user.email && p.name !== req.user.name
    );

    const newTrip = new Trip({
      user: userId,
      name,
      description,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      participants: [
        {
          userId,
          name: req.user.name || 'Yo',
          avatar: req.user.avatar,
          email: req.user.email,
        },
        ...filteredParticipants,
      ],
      status: 'active',
    });

    await newTrip.save();
    console.log('✅ Viaje creado:', newTrip._id);

    res.status(201).json({
      success: true,
      message: 'Viaje creado exitosamente',
      trip: newTrip,
    });
  } catch (error) {
    console.error('❌ Error creando viaje:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear viaje',
      error: error.message,
    });
  }
};

/**
 * Eliminar un viaje
 */
exports.deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    console.log('🗑️ Eliminando viaje:', tripId, '- Usuario:', userId);

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    // Validar que el usuario sea el propietario del viaje
    if (trip.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este viaje',
      });
    }

    await Trip.findByIdAndDelete(tripId);
    console.log('✅ Viaje eliminado:', tripId);

    res.status(200).json({
      success: true,
      message: 'Viaje eliminado exitosamente',
    });
  } catch (error) {
    console.error('❌ Error eliminando viaje:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar viaje',
      error: error.message,
    });
  }
};

/**
 * Obtener todos los viajes del usuario
 */
exports.getTrips = async (req, res) => {
  try {
    console.log('🎯 GET /trips - User:', req.user?._id);
    const userId = req.user._id;

    const trips = await Trip.find({ user: userId })
      .populate('participants.userId')
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      trips,
      total: trips.length,
    });
  } catch (error) {
    console.error('Error obteniendo viajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener viajes',
      error: error.message,
    });
  }
};

/**
 * Obtener detalles de un viaje
 */
exports.getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, user: userId })
      .populate('participants.userId')
      .populate('expenses.paidBy.userId')
      .populate('expenses.splitBetween.userId');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      trip,
      balances: trip.balances,
    });
  } catch (error) {
    console.error('Error obteniendo viaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener viaje',
      error: error.message,
    });
  }
};

/**
 * Agregar gasto a un viaje
 */
exports.addExpense = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;
    console.log('➕ Agregando gasto - Trip:', tripId, '- Usuario:', userId, '- Body:', req.body);
    const { description, amount, paidBy, splitBetween, category, date, currency } = req.body;

    const trip = await Trip.findOne({ _id: tripId, user: userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    // Validar que paidBy es participante
    const paidByParticipant = trip.participants.find(
      (p) => p.userId?.toString() === paidBy.userId || p.name === paidBy.name
    );

    if (!paidByParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Pagador no es participante del viaje',
      });
    }

    // Validar que splitBetween son participantes
    const validSplit = splitBetween.every((s) =>
      trip.participants.some(
        (p) => p.userId?.toString() === s.userId || p.name === s.name
      )
    );

    if (!validSplit) {
      return res.status(400).json({
        success: false,
        message: 'Algunos participantes en la división no existen',
      });
    }

    // Calcular total de splitBetween
    const splitTotal = splitBetween.reduce((sum, s) => sum + (s.amount || 0), 0);

    if (Math.abs(splitTotal - amount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'La suma de división no coincide con el monto total',
      });
    }

    const newExpense = {
      _id: new mongoose.Types.ObjectId(),
      description,
      amount,
      paidBy,
      splitBetween,
      category: category || 'other',
      date: date || new Date(),
      currency: currency || 'USD',
    };

    trip.expenses.push(newExpense);
    trip.totalAmount = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

    await trip.save();

    res.status(201).json({
      success: true,
      message: 'Gasto agregado exitosamente',
      trip,
    });
  } catch (error) {
    console.error('Error agregando gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar gasto',
      error: error.message,
    });
  }
};

/**
 * Eliminar gasto de un viaje
 */
exports.removeExpense = async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, user: userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    trip.expenses = trip.expenses.filter((e) => e._id.toString() !== expenseId);
    trip.totalAmount = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Gasto eliminado exitosamente',
      trip,
    });
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar gasto',
      error: error.message,
    });
  }
};

/**
 * Agregar participante al viaje
 */
exports.addParticipant = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;
    const { name, email, avatar } = req.body;

    const trip = await Trip.findOne({ _id: tripId, user: userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    // Evitar duplicados
    const exists = trip.participants.some((p) => p.email === email || p.name === name);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Participante ya existe en el viaje',
      });
    }

    trip.participants.push({
      name,
      email,
      avatar,
    });

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Participante agregado exitosamente',
      trip,
    });
  } catch (error) {
    console.error('Error agregando participante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar participante',
      error: error.message,
    });
  }
};

/**
 * Eliminar participante del viaje
 */
exports.removeParticipant = async (req, res) => {
  try {
    const { tripId, participantId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, user: userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    trip.participants = trip.participants.filter(
      (p) => p.userId?.toString() !== participantId && p.name !== participantId
    );

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Participante eliminado exitosamente',
      trip,
    });
  } catch (error) {
    console.error('Error eliminando participante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar participante',
      error: error.message,
    });
  }
};

/**
 * Calcular quién le debe a quién
 */
exports.calculateSettlement = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, user: userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    const balances = trip.balances;
    const settlements = [];

    // Algoritmo greedy para minimizar transacciones
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([participantId, balance]) => {
      if (balance < -0.01) {
        debtors.push({ id: participantId, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ id: participantId, amount: balance });
      }
    });

    // Emparejar deudores y acreedores
    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];

      const amount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: parseFloat(amount.toFixed(2)),
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) debtors.shift();
      if (creditor.amount < 0.01) creditors.shift();
    }

    res.status(200).json({
      success: true,
      trip,
      balances,
      settlements,
    });
  } catch (error) {
    console.error('Error calculando liquidación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular liquidación',
      error: error.message,
    });
  }
};

/**
 * Actualizar viaje (nombre, fechas, participantes, coverImage)
 */
exports.updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    // Campos permitidos para actualizar
    const allowedUpdates = ['name', 'startDate', 'endDate', 'participants', 'coverImage', 'status'];
    const actualUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        actualUpdates[key] = updates[key];
      }
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, user: userId },
      actualUpdates,
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Viaje actualizado',
      trip,
    });
  } catch (error) {
    console.error('Error actualizando viaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar viaje',
      error: error.message,
    });
  }
};

/**
 * Actualizar estado del viaje
 */
exports.updateTripStatus = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido',
      });
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, user: userId },
      { status },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Estado actualizado',
      trip,
    });
  } catch (error) {
    console.error('Error actualizando viaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar viaje',
      error: error.message,
    });
  }
};
