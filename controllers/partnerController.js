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
  }
};

module.exports = partnerController;
