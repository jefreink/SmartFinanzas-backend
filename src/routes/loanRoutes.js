const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Crear préstamo
router.post('/', loanController.createLoan);

// Listar préstamos relevantes (prestados o a pagar)
router.get('/', loanController.getLoans);

// RUTAS ESPECÍFICAS CON :id (deben venir ANTES de /:id)
// Acciones: marcar pagado / confirmar
router.patch('/:id/mark', loanController.markPaid);

// Realizar pago parcial
router.post('/:id/partial-payment', loanController.makePartialPayment);

// RUTAS GENÉRICAS CON :id (después de las específicas)
// Detalle
router.get('/:id', loanController.getLoanById);

// Editar préstamo
router.patch('/:id', loanController.updateLoan);

// Borrar préstamo
router.delete('/:id', loanController.deleteLoan);

module.exports = router;


