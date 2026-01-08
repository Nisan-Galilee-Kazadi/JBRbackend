const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    logoUrl: { type: String, required: true },
    website: String,
    description: String,
    type: { type: String, enum: ['Sponsor', 'Collaborateur', 'Média'], default: 'Sponsor' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Partner', PartnerSchema);
