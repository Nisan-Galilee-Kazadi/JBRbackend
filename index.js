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
const http = require('http');
const https = require('https');

dotenv.config();

/* =========================
   RSS PARSER CONFIG
========================= */
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
    },
    timeout: 8000
});

/* =========================
   HELPERS
========================= */
const fetchOGImage = async (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve("");
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, { timeout: 6000 }, (res) => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
                const match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (match) {
                    resolve(match[1]);
                    req.destroy();
                }
            });
            res.on('end', () => resolve(""));
        });
        req.on('error', () => resolve(""));
        req.on('timeout', () => {
            req.destroy();
            resolve("");
        });
    });
};

const cleanTitle = (title = "") =>
    title.split(/ - | \| | — /)[0].trim();

const cleanSummary = (summary = "") =>
    summary.replace(/<[^>]*>/g, '').substring(0, 200).trim();

/* =========================
   RSS AGGREGATOR (FIX)
========================= */
const aggregateNewsFromFeeds = async () => {
    const feeds = [
        'https://www.radiookapi.net/rss',
        'https://news.google.com/rss?hl=fr&gl=CD&ceid=CD:fr'
    ];

    let aggregated = [];

    for (const url of feeds) {
        try {
            const feed = await parser.parseURL(url);
            for (const item of feed.items.slice(0, 10)) {
                aggregated.push({
                    title: cleanTitle(item.title),
                    summary: cleanSummary(item.contentSnippet || item.content || ''),
                    link: item.link,
                    source: feed.title || url,
                    image:
                        item.enclosure?.url ||
                        item.mediaContent?.[0]?.url ||
                        await fetchOGImage(item.link),
                    publishedAt: item.pubDate || new Date()
                });
            }
        } catch (err) {
            console.warn('[RSS ERROR]', url, err.message);
        }
    }
    return aggregated;
};

/* =========================
   EXPRESS APP
========================= */
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   DATABASE
========================= */
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jbr')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

/* =========================
   POSTS
========================= */
app.get('/api/posts', async (_, res) => {
    res.json(await Post.find().sort({ createdAt: -1 }));
});

app.post('/api/posts', async (req, res) => {
    const post = new Post({ ...req.body, reactions: {}, comments: [] });
    res.status(201).json(await post.save());
});

app.post('/api/posts/:id/react', async (req, res) => {
    const post = await Post.findById(req.params.id);
    post.reactions[req.body.type] = (post.reactions[req.body.type] || 0) + 1;
    await post.save();
    res.json(post);
});

app.post('/api/posts/:id/comment', async (req, res) => {
    const post = await Post.findById(req.params.id);
    post.comments.push({ ...req.body, createdAt: new Date() });
    await post.save();
    res.json(post);
});

/* =========================
   VISITORS
========================= */
app.post('/api/visitors', async (req, res) => {
    const visitor = await Visitor.findOneAndUpdate(
        { name: req.body.name },
        { lastVisit: new Date() },
        { upsert: true, new: true }
    );
    res.json(visitor);
});

app.get('/api/visitors', async (_, res) => {
    res.json(await Visitor.find().sort({ lastVisit: -1 }));
});

/* =========================
   NEWS CRUD
========================= */
app.get('/api/news', async (_, res) => {
    res.json(await News.find().sort({ createdAt: -1 }));
});

app.post('/api/news', async (req, res) => {
    res.status(201).json(await new News(req.body).save());
});

app.put('/api/news/:id', async (req, res) => {
    res.json(await News.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

app.delete('/api/news/:id', async (req, res) => {
    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

/* =========================
   RSS ADMIN (FIX 404)
========================= */
app.get('/api/admin/aggregate-news', async (_, res) => {
    const data = await aggregateNewsFromFeeds();
    res.json({ success: true, count: data.length, data });
});

app.post('/api/admin/aggregate-news/save', async (_, res) => {
    const data = await aggregateNewsFromFeeds();
    const saved = await News.insertMany(data, { ordered: false });
    res.json({ success: true, inserted: saved.length });
});

/* =========================
   PARTNERS
========================= */
app.get('/api/partners', async (_, res) => {
    res.json(await Partner.find());
});

app.post('/api/partners', async (req, res) => {
    res.status(201).json(await new Partner(req.body).save());
});

/* =========================
   MESSAGES
========================= */
app.get('/api/admin/messages', async (_, res) => {
    res.json(await Message.find().sort({ createdAt: -1 }));
});

app.post('/api/messages', async (req, res) => {
    res.status(201).json(await new Message(req.body).save());
});

app.delete('/api/admin/messages/:id', async (req, res) => {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

/* =========================
   STATS + HEALTH
========================= */
app.get('/api/admin/stats', async (_, res) => {
    const posts = await Post.find();
    res.json({
        posts: posts.length,
        news: await News.countDocuments(),
        partners: await Partner.countDocuments(),
        engagement: posts.reduce((a, p) => a + (p.comments?.length || 0), 0)
    });
});

app.get('/health', (_, res) => {
    res.json({ status: 'OK', uptime: process.uptime() });
});


/* =========================
   DELETE POST (LA SOLUTION)
========================= */
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) {
            return res.status(404).json({ success: false, message: "Post non trouvé" });
        }
        res.json({ success: true, message: "Post supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
