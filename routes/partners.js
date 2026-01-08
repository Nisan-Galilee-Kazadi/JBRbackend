const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const catchAsync = require('../middleware/catchAsync');

router.get('/', catchAsync(partnerController.getAllPartners));
router.post('/', catchAsync(partnerController.createPartner));

module.exports = router;
