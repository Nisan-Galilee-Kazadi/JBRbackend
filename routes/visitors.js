const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const catchAsync = require('../middleware/catchAsync');

router.post('/', catchAsync(visitorController.createOrUpdateVisitor));
router.get('/', catchAsync(visitorController.getAllVisitors));
router.post('/:name/activity', catchAsync(visitorController.updateVisitorActivity));

module.exports = router;
