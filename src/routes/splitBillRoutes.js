/**
 * Split Bill Routes
 * Rutas para la división de gastos
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSplitBill,
  getSplitBill,
  updateItemAssignment,
  markAsPaid,
  getSplitsByTransaction,
  deleteSplitBill,
  sendPaymentReminder
} = require('../controllers/splitBillController');

// Proteger todas las rutas
router.use(protect);

// POST /api/split-bill - Crear nueva división
router.post('/', createSplitBill);

// GET /api/split-bill/:id - Obtener división específica
router.get('/:id', getSplitBill);

// PATCH /api/split-bill/:id/assign - Actualizar asignación de items
router.patch('/:id/assign', updateItemAssignment);

// PATCH /api/split-bill/:id/mark-paid/:participantId - Marcar como pagado
router.patch('/:id/mark-paid/:participantId', markAsPaid);

// GET /api/split-bill/transaction/:transactionId - Obtener divisiones de una transacción
router.get('/transaction/:transactionId', getSplitsByTransaction);

// DELETE /api/split-bill/:id - Eliminar división
router.delete('/:id', deleteSplitBill);

// POST /api/split-bill/:id/remind/:participantId - Enviar recordatorio
router.post('/:id/remind/:participantId', sendPaymentReminder);

module.exports = router;
