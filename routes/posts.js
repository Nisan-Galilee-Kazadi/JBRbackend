const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const catchAsync = require('../middleware/catchAsync');

router.get('/', catchAsync(postController.getAllPosts));
router.post('/', catchAsync(postController.createPost));
router.post('/:id/react', catchAsync(postController.reactToPost));
router.post('/:id/comment', catchAsync(postController.commentOnPost));
router.delete('/:id', catchAsync(postController.deletePost));

module.exports = router;
