const News = require('../models/News');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');

const newsController = {
  getAllNews: async (req, res, next) => {
    const news = await News.find().sort({ createdAt: -1 });
    logger.info(`Fetched ${news.length} news items`);
    res.status(200).json({
      success: true,
      count: news.length,
      data: news
    });
  },

  createNews: async (req, res, next) => {
    const newsItem = new News(req.body);
    const savedNews = await newsItem.save();
    logger.info(`Created new news item: ${savedNews._id}`);
    res.status(201).json({
      success: true,
      data: savedNews
    });
  },

  updateNews: async (req, res, next) => {
    const { id } = req.params;
    const updatedNews = await News.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedNews) {
      return next(new AppError('Actualité non trouvée', 404));
    }

    logger.info(`Updated news item: ${id}`);
    res.status(200).json({
      success: true,
      data: updatedNews
    });
  },

  deleteNews: async (req, res, next) => {
    const { id } = req.params;
    const deletedNews = await News.findByIdAndDelete(id);

    if (!deletedNews) {
      return next(new AppError('Actualité non trouvée', 404));
    }

    logger.info(`Deleted news item: ${id}`);
    res.status(200).json({
      success: true,
      message: 'Actualité supprimée avec succès'
    });
  }
};

module.exports = newsController;
