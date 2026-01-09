const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const catchAsync = require('../middleware/catchAsync');

router.get('/', catchAsync(newsController.getAllNews));
router.post('/', catchAsync(newsController.createNews));
router.put('/:id', catchAsync(newsController.updateNews));
router.delete('/:id', catchAsync(newsController.deleteNews));

module.exports = router;
