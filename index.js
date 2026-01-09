const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Post = require('./models/Post');
const News = require('./models/News');
const Partner = require('./models/Partner');
const Visitor = require('./models/Visitor');
const Message = require('./models/Message');
const RSSParser = require('rss-parser');

const parser = new RSSParser({
    customFields: {
        item: [
            ['media:content', 'mediaContent', { keepArray: true }],
            ['media:thumbnail', 'mediaThumbnail'],
            ['enclosure', 'enclosure'],
            ['content:encoded', 'contentEncoded'],
            ['image', 'image']
        ]
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
    },
    timeout: 8000
});

dotenv.config();

// Helper functions
const fetchOGImage = async (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve("");
        const protocol = url.startsWith('https') ? require('https') : require('http');
        const timeout = 6000;

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            },
            timeout: timeout
        }, (res) => {
            console.log(`[DEBUG] OG Fetch Status: ${res.statusCode} for ${url.substring(0, 40)}...`);
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
                let match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                    || data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
                    || data.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);

                if (match && match[1]) {
                    resolve(match[1]);
                    req.destroy();
                    return;
                }

                if (data.length > 300000) req.destroy();
            });

            res.on('end', () => {
                if (!data) return resolve("");
                let match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                    || data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
                    || data.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                    || data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i)
                    || data.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
                    || data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
                    || data.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

                resolve(match && match[1] ? match[1] : "");
            });
        });

        req.on('error', (e) => {
            console.error(`[ERR] OG fallback error for ${url}: ${e.message}`);
            resolve("");
        });
        req.on('timeout', () => {
            req.destroy();
            resolve("");
        });
    });
};

const cleanTitle = (title) => {
    if (!title) return "";
    let cleaned = title.split(/ - (?!.* - )| \| (?!.* \| )| — (?!.* — )/)[0];

    const sites = ["Foot Mercato", "Maxifoot", "So Foot", "L'Equipe", "RFI", "Radio Okapi", "Google News", "L'Équipe"];
    sites.forEach(site => {
        const regex = new RegExp(`[\\s\\-\\p{Pd}|:]+${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'ui');
        cleaned = cleaned.replace(regex, '');
    });

    return cleaned.trim();
};

const cleanSummary = (summary) => {
    if (!summary) return "";
    return summary.replace(/<[^>]*>/g, '').substring(0, 200).trim() + (summary.length > 200 ? "..." : "");
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jbr')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// --- POST ROUTES ---
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/posts', async (req, res) => {
    const post = new Post(req.body);
    if (!post.reactions) post.reactions = {};
    if (!post.comments) post.comments = [];
    try {
        const newPost = await post.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.post('/api/posts/:id/react', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post.reactions) post.reactions = {};
        const { type } = req.body;
        if (post.reactions[type] === undefined) post.reactions[type] = 0;
        post.reactions[type] += 1;
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/posts/:id/comment', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post.comments) post.comments = [];
        const { user, text } = req.body;
        post.comments.push({ user, text, createdAt: new Date() });
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- VISITOR ROUTES ---
app.post('/api/visitors', async (req, res) => {
    try {
        const { name } = req.body;
        let visitor = await Visitor.findOne({ name });
        if (visitor) {
            visitor.lastVisit = new Date();
            await visitor.save();
        } else {
            visitor = new Visitor({ name, commentsCount: 0, likesCount: 0 });
            await visitor.save();
        }
        res.json(visitor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/visitors', async (req, res) => {
    try {
        const visitors = await Visitor.find().sort({ lastVisit: -1 });
        res.json(visitors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/visitors/:name/activity', async (req, res) => {
    try {
        const { name } = req.params;
        const { type } = req.body;
        const visitor = await Visitor.findOne({ name });
        if (visitor) {
            if (type === 'comment') visitor.commentsCount = (visitor.commentsCount || 0) + 1;
            else if (type === 'like') visitor.likesCount = (visitor.likesCount || 0) + 1;
            visitor.lastVisit = new Date();
            await visitor.save();
            res.json(visitor);
        } else {
            res.status(404).json({ message: 'Visitor not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- NEWS ROUTES ---
app.get('/api/news', async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/news', async (req, res) => {
    const newsItem = new News(req.body);
    try {
        const savedNews = await newsItem.save();
        res.status(201).json(savedNews);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/news/:id', async (req, res) => {
    try {
        const updatedNews = await News.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedNews) return res.status(404).json({ message: 'Actualité non trouvée' });
        res.json(updatedNews);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/news/:id', async (req, res) => {
    try {
        const deletedNews = await News.findByIdAndDelete(req.params.id);
        if (!deletedNews) return res.status(404).json({ message: 'Actualité non trouvée' });
        res.json({ message: 'Actualité supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- PARTNER ROUTES ---
app.get('/api/partners', async (req, res) => {
    try {
        const partners = await Partner.find().sort({ createdAt: -1 });
        res.json(partners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/partners', async (req, res) => {
    const partner = new Partner(req.body);
    try {
        const savedPartner = await partner.save();
        res.status(201).json(savedPartner);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- MESSAGE ROUTES ---
app.get('/api/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/messages', async (req, res) => {
    const message = new Message(req.body);
    try {
        const savedMessage = await message.save();
        res.status(201).json(savedMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.patch('/api/admin/messages/:id/status', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (message) {
            message.status = req.body.status || 'read';
            await message.save();
            res.json(message);
        } else res.status(404).json({ message: 'Message not found' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/admin/messages/:id', async (req, res) => {
    try {
        const deletedMessage = await Message.findByIdAndDelete(req.params.id);
        if (!deletedMessage) return res.status(404).json({ message: 'Message non trouvé' });
        res.json({ message: 'Message supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/admin/messages/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message non trouvé' });
        if (req.body.starred !== undefined) message.starred = req.body.starred;
        if (req.body.archived !== undefined) message.archived = req.body.archived;
        if (req.body.status !== undefined) message.status = req.body.status;
        const updatedMessage = await message.save();
        res.json(updatedMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
