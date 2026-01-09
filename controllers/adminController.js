const Post = require('../models/Post');
const News = require('../models/News');
const Partner = require('../models/Partner');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');

const adminController = {
  getStats: async (req, res, next) => {
    try {
      const postCount = await Post.countDocuments();
      const newsCount = await News.countDocuments();
      const partnerCount = await Partner.countDocuments();
      const allPosts = await Post.find();

      const totalLikes = allPosts.reduce((acc, p) => acc + ((p.reactions?.likes) || 0), 0);
      const totalComments = allPosts.reduce((acc, p) => acc + ((p.comments?.length) || 0), 0);

      const stats = {
        posts: postCount,
        news: newsCount,
        partners: partnerCount,
        engagement: totalLikes + totalComments,
        recentActivity: await Post.find().sort({ createdAt: -1 }).limit(5)
      };

      logger.info('Admin stats fetched successfully');
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      logger.error('Error fetching admin stats:', err);
      return next(new AppError('Erreur lors de la récupération des statistiques', 500));
    }
  }
};

module.exports = adminController;
