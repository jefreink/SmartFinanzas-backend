const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', contactController.createContact);
router.get('/', contactController.getContacts);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
