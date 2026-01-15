/**
 * Rutas para División de Gastos (Split Bill)
 */
const express = require('express');
const {
  createSplit,
  assignItems,
  updateTip,
  markAsPaid,
  getSplitDetail,
  getMySplits,
  cancelSplit,
} = require('../controllers/splitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Crear nueva división
router.post('/create', createSplit);

// Obtener mis divisiones
router.get('/my-splits', getMySplits);

// Obtener detalle de una división
router.get('/:id', getSplitDetail);

// Asignar items a participantes
router.put('/:id/assign-items', assignItems);

// Actualizar propina
router.put('/:id/tip', updateTip);

// Marcar participante como pagado
router.put('/:id/mark-paid/:participantId', markAsPaid);

// Cancelar división
router.delete('/:id', cancelSplit);

module.exports = router;
