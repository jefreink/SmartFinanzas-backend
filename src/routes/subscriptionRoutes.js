const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protect);

router.post('/', subscriptionController.createSubscription);
router.get('/', subscriptionController.getSubscriptions);
router.get('/:id', subscriptionController.getSubscriptionById);
router.patch('/:id', subscriptionController.updateSubscription);
router.delete('/:id', subscriptionController.deleteSubscription);

// Rutas de pagos
router.post('/:id/confirm-payment', subscriptionController.confirmPayment);
router.post('/:id/confirm-member-payment', subscriptionController.confirmMemberPayment);
router.get('/:id/payment-history', subscriptionController.getPaymentHistory);

module.exports = router;
