/**
 * Trip Routes
 * Rutas para gestionar viajes compartidos
 */

const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(protect);

/**
 * Viajes
 */
// Crear nuevo viaje
router.post('/create', tripController.createTrip);

// Obtener todos los viajes del usuario
router.get('/', tripController.getTrips);

// Obtener detalles de un viaje
router.get('/:tripId', tripController.getTripById);

// Actualizar viaje (nombre, fechas, participantes, coverImage)
router.patch('/:tripId', tripController.updateTrip);

// Actualizar estado del viaje
router.patch('/:tripId/status', tripController.updateTripStatus);

// Eliminar un viaje
router.delete('/:tripId', tripController.deleteTrip);

/**
 * Gastos
 */
// Agregar gasto a un viaje
router.post('/:tripId/expenses', tripController.addExpense);

// Eliminar gasto de un viaje
router.delete('/:tripId/expenses/:expenseId', tripController.removeExpense);

/**
 * Participantes
 */
// Agregar participante
router.post('/:tripId/participants', tripController.addParticipant);

// Eliminar participante
router.delete('/:tripId/participants/:participantId', tripController.removeParticipant);

/**
 * Liquidación
 */
// Calcular quién debe a quién
router.get('/:tripId/settlement', tripController.calculateSettlement);

module.exports = router;
