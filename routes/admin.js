const express = require('express');
const router = express.Router();
const catchAsync = require('../middleware/catchAsync');
const { aggregateNewsFromFeeds } = require('../newsAggregator');
const News = require('../models/News');
const adminController = require('../controllers/adminController');
const logger = require('../middleware/logger');

// Route pour les statistiques admin
router.get('/stats', catchAsync(adminController.getStats));

// Route pour agréger les actualités depuis les feeds RSS
router.get('/aggregate-news', catchAsync(async (req, res) => {
    try {
        const aggregatedNews = await aggregateNewsFromFeeds();
        logger.info(`Aggregated ${aggregatedNews.length} news items`);
        res.status(200).json({
            success: true,
            count: aggregatedNews.length,
            data: aggregatedNews
        });
    } catch (error) {
        logger.error('Error aggregating news:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

// Route pour vérifier une source RSS
router.post('/verify-source', catchAsync(async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }

    try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        
        // Extraire le domaine de l'URL
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Vérifier si le domaine est dans une liste blanche
        const trustedDomains = [
            'radiookapi.net',
            'foot.cd',
            'lequipe.fr',
            'leopardsfoot.com',
            'news.google.com'
        ];
        
        const isTrusted = trustedDomains.some(trusted => domain.includes(trusted));
        
        // Tenter de parser le feed
        const feed = await parser.parseURL(url);
        
        res.status(200).json({
            success: true,
            verified: true,
            domain: domain,
            reputation: isTrusted ? 'high' : 'medium',
            sslValid: url.startsWith('https://'),
            itemCount: feed.items.length,
            lastUpdated: feed.lastBuildDate || feed.pubDate
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            verified: false,
            domain: new URL(url).hostname,
            reputation: 'low',
            sslValid: url.startsWith('https://'),
            error: error.message
        });
    }
}));

module.exports = router;
