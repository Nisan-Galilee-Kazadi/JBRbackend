const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, default: 'Admin' },
    imageUrl: String,
    category: { type: String, default: 'Général' },
    isExternal: { type: Boolean, default: false },
    sourceUrl: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('News', NewsSchema);
