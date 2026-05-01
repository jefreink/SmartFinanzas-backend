const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createGroup, joinGroup, getMyGroup, leaveGroup } = require('../controllers/familyController');

router.use(protect);

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/me', getMyGroup);
router.post('/leave', leaveGroup);

module.exports = router;
