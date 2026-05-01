const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// CREATE contact - must be before GET /:id to avoid confusion
router.post('/', contactController.createContact);
router.post('/create', contactController.createContact); // Alias para compatibilidad

// GET all contacts (incluyendo /list como alias)
router.get('/list', contactController.getContacts);
router.get('/', contactController.getContacts);

// GET contact by id (debe estar al final)
router.get('/:id', contactController.getContactById);

// UPDATE contact
router.put('/:id', contactController.updateContact);

// DELETE contact
router.delete('/:id', contactController.deleteContact);

module.exports = router;
