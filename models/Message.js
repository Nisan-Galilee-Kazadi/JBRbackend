const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { 
        type: String, 
        required: true, 
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    phone: { 
        type: String, 
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Numéro de téléphone invalide']
    },
    subject: { 
        type: String, 
        default: 'Contact depuis le site',
        trim: true,
        maxlength: 200
    },
    message: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 2000
    },
    priority: { 
        type: String, 
        enum: ['low', 'normal', 'high', 'urgent'], 
        default: 'normal' 
    },
    category: { 
        type: String, 
        enum: ['general', 'partnership', 'media', 'technical', 'complaint', 'other'], 
        default: 'general' 
    },
    status: { 
        type: String, 
        enum: ['unread', 'read', 'in_progress', 'resolved', 'closed'], 
        default: 'unread' 
    },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    assignedTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    internalNotes: { 
        type: String, 
        trim: true, 
        maxlength: 1000 
    },
    source: { 
        type: String, 
        enum: ['website', 'email', 'phone', 'social', 'other'], 
        default: 'website' 
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    resolvedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index pour optimiser les performances
MessageSchema.index({ status: 1, createdAt: -1 });
MessageSchema.index({ starred: 1, archived: 1 });
MessageSchema.index({ category: 1, priority: 1 });
MessageSchema.index({ email: 1 });

// Méthode virtuelle pour le temps de réponse
MessageSchema.virtual('responseTime').get(function() {
    if (this.resolvedAt) {
        return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)); // en heures
    }
    return null;
});

// Méthode statique pour les statistiques
MessageSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('Message', MessageSchema);
