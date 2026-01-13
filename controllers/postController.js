const Post = require('../models/Post');
const AppError = require('../middleware/appError');
const logger = require('../middleware/logger');
const { v4: uuidv4 } = require('uuid');

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
    const { type, userIdentifier } = req.body; // userIdentifier = IP + localStorage ID

    const post = await Post.findById(id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    // Initialize likes tracking if not exists
    if (!post.likesTracking) {
      post.likesTracking = [];
    }

    // Check if user already liked this post
    const existingLike = post.likesTracking.find(like => like.userIdentifier === userIdentifier);
    
    if (type === 'likes') {
      if (existingLike) {
        // Unlike - remove the like and decrement count
        post.likesTracking = post.likesTracking.filter(like => like.userIdentifier !== userIdentifier);
        post.reactions.likes = Math.max(0, (post.reactions?.likes || 0) - 1);
      } else {
        // Like - add the like and increment count
        post.likesTracking.push({
          userIdentifier,
          createdAt: new Date()
        });
        post.reactions.likes = (post.reactions?.likes || 0) + 1;
      }
    } else {
      return next(new AppError('Invalid reaction type', 400));
    }

    await post.save();
    logger.info(`Post ${id} received ${type} reaction from ${userIdentifier}`);
    res.status(200).json({
      success: true,
      data: {
        ...post.toObject(),
        isLiked: !existingLike // Return the new state
      }
    });
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
      _id: uuidv4(), // Generate unique ID for each comment
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
