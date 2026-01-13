const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: String,
    type: { type: String, enum: ['instagram', 'news', 'blog'], default: 'blog' },
    caption: String,
    imageUrl: String,
    videoUrl: String,
    reactions: {
        likes: { type: Number, default: 0 },
        hearts: { type: Number, default: 0 }
    },
    likesTracking: [{
        userIdentifier: String,
        createdAt: { type: Date, default: Date.now }
    }],
    comments: [{
        user: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
        isReply: { type: Boolean, default: false },
        replyTo: String,
        replyToCommentId: { type: mongoose.Schema.Types.ObjectId, default: null },
        level: { type: Number, default: 0 }, // 0 for main comment, 1 for reply, 2 for reply to reply, etc.
        replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
