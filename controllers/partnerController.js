const Partner = require('../models/Partner');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');

const partnerController = {
  getAllPartners: async (req, res, next) => {
    const partners = await Partner.find().sort({ createdAt: -1 });
    logger.info(`Fetched ${partners.length} partners`);
    res.status(200).json({
      success: true,
      count: partners.length,
      data: partners
    });
  },

  createPartner: async (req, res, next) => {
    const partner = new Partner(req.body);
    const savedPartner = await partner.save();
    logger.info(`Created new partner: ${savedPartner._id}`);
    res.status(201).json({
      success: true,
      data: savedPartner
    });
  },

  getPartnerById: async (req, res, next) => {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return next(new AppError('Partner not found', 404));
    }
    logger.info(`Fetched partner: ${partner._id}`);
    res.status(200).json({
      success: true,
      data: partner
    });
  },

  updatePartner: async (req, res, next) => {
    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!partner) {
      return next(new AppError('Partner not found', 404));
    }
    logger.info(`Updated partner: ${partner._id}`);
    res.status(200).json({
      success: true,
      data: partner
    });
  },

  deletePartner: async (req, res, next) => {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) {
      return next(new AppError('Partner not found', 404));
    }
    logger.info(`Deleted partner: ${partner._id}`);
    res.status(200).json({
      success: true,
      message: 'Partner deleted successfully'
    });
  }
};

module.exports = partnerController;
