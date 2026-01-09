const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const catchAsync = require('../middleware/catchAsync');
const { aggregateNewsFromFeeds } = require('../newsAggregator');
const logger = require('../middleware/logger');

router.get('/', catchAsync(newsController.getAllNews));
router.post('/', catchAsync(newsController.createNews));
router.put('/:id', catchAsync(newsController.updateNews));
router.delete('/:id', catchAsync(newsController.deleteNews));

// Route publique pour agréger les actualités RSS
router.get('/aggregate', catchAsync(async (req, res) => {
    try {
        const aggregatedNews = await aggregateNewsFromFeeds();
        logger.info(`Public aggregation: ${aggregatedNews.length} news items`);
        res.status(200).json({
            success: true,
            count: aggregatedNews.length,
            data: aggregatedNews
        });
    } catch (error) {
        logger.error('Error in public news aggregation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

module.exports = router;
