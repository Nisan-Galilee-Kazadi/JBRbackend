const Message = require('../models/Message');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');

const messageController = {
  getAllMessages: async (req, res, next) => {
    const messages = await Message.find().sort({ createdAt: -1 });
    logger.info(`Fetched ${messages.length} messages`);
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  },

  createMessage: async (req, res, next) => {
    const message = new Message(req.body);
    const savedMessage = await message.save();
    logger.info(`Created new message: ${savedMessage._id}`);
    res.status(201).json({
      success: true,
      data: savedMessage
    });
  },

  updateMessageStatus: async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    message.status = status || 'read';
    await message.save();
    logger.info(`Updated message status: ${id} to ${status}`);

    res.status(200).json({
      success: true,
      data: message
    });
  },

  deleteMessage: async (req, res, next) => {
    const { id } = req.params;
    const deletedMessage = await Message.findByIdAndDelete(id);

    if (!deletedMessage) {
      return next(new AppError('Message non trouvé', 404));
    }

    logger.info(`Deleted message: ${id}`);
    res.status(200).json({
      success: true,
      message: 'Message supprimé avec succès'
    });
  },

  updateMessage: async (req, res, next) => {
    const { id } = req.params;
    const message = await Message.findById(id);

    if (!message) {
      return next(new AppError('Message non trouvé', 404));
    }

    if (req.body.starred !== undefined) message.starred = req.body.starred;
    if (req.body.archived !== undefined) message.archived = req.body.archived;
    if (req.body.status !== undefined) message.status = req.body.status;

    const updatedMessage = await message.save();
    logger.info(`Updated message: ${id}`);

    res.status(200).json({
      success: true,
      data: updatedMessage
    });
  }
};

module.exports = messageController;
