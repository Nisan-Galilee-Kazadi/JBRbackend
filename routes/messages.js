const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const catchAsync = require('../middleware/catchAsync');

router.get('/admin/messages', catchAsync(messageController.getAllMessages));
router.post('/messages', catchAsync(messageController.createMessage));
router.patch('/admin/messages/:id/status', catchAsync(messageController.updateMessageStatus));
router.delete('/admin/messages/:id', catchAsync(messageController.deleteMessage));
router.put('/admin/messages/:id', catchAsync(messageController.updateMessage));

module.exports = router;
