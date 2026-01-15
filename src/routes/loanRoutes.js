const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Crear préstamo
router.post('/', loanController.createLoan);

// Listar préstamos relevantes (prestados o a pagar)
router.get('/', loanController.getLoans);

// Detalle
router.get('/:id', loanController.getLoanById);

// Editar préstamo
router.patch('/:id', loanController.updateLoan);

// Borrar préstamo
router.delete('/:id', loanController.deleteLoan);

// Acciones: marcar pagado / confirmar
router.patch('/:id/mark', loanController.markPaid);

module.exports = router;
