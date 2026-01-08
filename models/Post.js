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
    comments: [{
        user: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
