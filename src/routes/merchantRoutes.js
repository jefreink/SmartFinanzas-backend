const express = require('express');
const { 
    searchMerchants, 
    upsertMerchant, 
    addProductToMerchant,
    getNearbyMerchants,
    getMerchantSuggestions
} = require('../controllers/merchantController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', searchMerchants);
router.get('/nearby', getNearbyMerchants);
router.get('/suggestions', getMerchantSuggestions);
router.post('/', upsertMerchant);
router.post('/:id/products', addProductToMerchant);

module.exports = router;
