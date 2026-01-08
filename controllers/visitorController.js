const Visitor = require('../models/Visitor');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');

const visitorController = {
  createOrUpdateVisitor: async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
      return next(new AppError('Visitor name is required', 400));
    }

    let visitor = await Visitor.findOne({ name });

    if (visitor) {
      visitor.lastVisit = new Date();
      await visitor.save();
      logger.info(`Updated visitor: ${name}`);
    } else {
      visitor = new Visitor({ name });
      await visitor.save();
      logger.info(`Created new visitor: ${name}`);
    }

    res.status(200).json({
      success: true,
      data: visitor
    });
  },

  getAllVisitors: async (req, res, next) => {
    const visitors = await Visitor.find().sort({ lastVisit: -1 });
    logger.info(`Fetched ${visitors.length} visitors`);
    res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  },

  updateVisitorActivity: async (req, res, next) => {
    const { name } = req.params;
    const { type } = req.body;

    if (!['comment', 'like'].includes(type)) {
      return next(new AppError('Invalid activity type', 400));
    }

    const visitor = await Visitor.findOne({ name });
    if (!visitor) {
      return next(new AppError('Visitor not found', 404));
    }

    if (type === 'comment') {
      visitor.commentsCount += 1;
    } else if (type === 'like') {
      visitor.likesCount += 1;
    }

    visitor.lastVisit = new Date();
    await visitor.save();
    logger.info(`Updated activity for visitor: ${name}, type: ${type}`);

    res.status(200).json({
      success: true,
      data: visitor
    });
  }
};

module.exports = visitorController;
