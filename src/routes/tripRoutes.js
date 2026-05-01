const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createTrip,
    getTrips,
    getTripById,
    updateTrip,
    deleteTrip
} = require('../controllers/tripController');

router.use(protect); // All routes are protected

router.route('/')
    .post(createTrip)
    .get(getTrips);

router.route('/:id')
    .get(getTripById)
    .patch(updateTrip)
    .delete(deleteTrip); // Modified deleteTrip allows to update status, but also delete? Frontend assumes delete.

router.route('/:id/expenses')
    .post(require('../controllers/tripController').addExpense);

router.route('/:id/expenses/:expenseId')
    .patch(require('../controllers/tripController').updateExpense)
    .delete(require('../controllers/tripController').deleteExpense);

router.route('/:id/settlement')
    .get(require('../controllers/tripController').getSettlement);

module.exports = router;
