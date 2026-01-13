const Post = require('../models/Post');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');

const postController = {
  getAllPosts: async (req, res, next) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    logger.info(`Fetched ${posts.length} posts`);
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  },

  createPost: async (req, res, next) => {
    const post = new Post(req.body);
    const newPost = await post.save();
    logger.info(`Created new post: ${newPost._id}`);
    res.status(201).json({
      success: true,
      data: newPost
    });
  },

  updatePost: async (req, res, next) => {
    const { id } = req.params;
    
    const post = await Post.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    logger.info(`Updated post: ${id}`);
    res.status(200).json({
      success: true,
      data: post
    });
  },

  reactToPost: async (req, res, next) => {
    const { id } = req.params;
    const { type } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    if (post.reactions[type] !== undefined) {
      post.reactions[type] += 1;
      await post.save();
      logger.info(`Post ${id} received ${type} reaction`);
      res.status(200).json({
        success: true,
        data: post
      });
    } else {
      return next(new AppError('Invalid reaction type', 400));
    }
  },

  commentOnPost: async (req, res, next) => {
    const { id } = req.params;
    const { user, text, replyToCommentId, replyTo, level = 0 } = req.body;

    if (!user || !text) {
      return next(new AppError('User and text are required', 400));
    }

    const post = await Post.findById(id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    const newComment = {
      user,
      text,
      createdAt: new Date(),
      isReply: replyToCommentId ? true : false,
      replyTo: replyTo || null,
      replyToCommentId: replyToCommentId || null,
      level: level || 0
    };

    post.comments.push(newComment);
    await post.save();
    logger.info(`New comment added to post ${id}`);
    res.status(200).json({
      success: true,
      data: post
    });
  },

  deletePost: async (req, res, next) => {
    const { id } = req.params;
    
    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    logger.info(`Deleted post: ${id}`);
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  }
};

module.exports = postController;
