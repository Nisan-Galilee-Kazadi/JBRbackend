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

// Helper to clean news content
// Helper to aggressively find an image from a URL using OG tags or standard WP meta
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
                // Try to find og:image early in the stream
                let match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
                if (!match) match = data.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);

                if (match && match[1]) {
                    resolve(match[1]);
                    req.destroy(); // Stop receiving data once found
                    return;
                }

                if (data.length > 300000) req.destroy(); // Stop after 300KB
            });
            res.on('end', () => {
                // Final check in case data was small or match failed early
                if (!data) return resolve("");

                // Try alternate attribute names if not already resolved
                let match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
                if (!match) match = data.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i);

                // Fallback to twitter:image
                if (!match) match = data.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

                // Fallback to schema.xml thumbnail
                if (!match) match = data.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

                if (match && match[1]) {
                    resolve(match[1]);
                } else {
                    resolve("");
                }
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
    // Remove common source suffixes and their variations
    // Matches " - Source", " | Source", " — Source", " : Source"
    // Also matches " - Source Name" at the end of the string
    let cleaned = title.split(/ - (?!.* - )| \| (?!.* \| )| — (?!.* — )/)[0];

    // specifically remove common site names that might still linger even without hyphens
    const sites = ["Foot Mercato", "Maxifoot", "So Foot", "L'Equipe", "RFI", "Radio Okapi", "Google News", "L'Équipe"];
    sites.forEach(site => {
        const regex = new RegExp(`[\\s\\-\\p{Pd}|:]+${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'ui');
        cleaned = cleaned.replace(regex, '');
    });

    return cleaned.trim();
};
        
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
                // Try to find og:image early in the stream
                let match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
                if (!match) match = data.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);

                if (match && match[1]) {
                    resolve(match[1]);
                    req.destroy(); // Stop receiving data once found
                    return;
                }

                if (data.length > 300000) req.destroy(); // Stop after 300KB
            });
            res.on('end', () => {
                // Final check in case data was small or match failed early
                if (!data) return resolve("");
                
                // Try alternate attribute names if not already resolved
                let match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
                if (!match) match = data.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (!match) match = data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i);
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/posts', async (req, res) => {
    const post = new Post(req.body);
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
        const { type } = req.body; // 'likes' or 'hearts'
        if (post.reactions[type] !== undefined) {
            post.reactions[type] += 1;
            await post.save();
            res.json(post);
        } else {
            res.status(400).json({ message: 'Invalid reaction type' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/posts/:id/comment', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
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
        // Check if visitor already exists
        let visitor = await Visitor.findOne({ name });

        if (visitor) {
            // Update last visit
            visitor.lastVisit = new Date();
            await visitor.save();
        } else {
            // Create new visitor
            visitor = new Visitor({ name });
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
        const { type } = req.body; // 'comment' or 'like'

        const visitor = await Visitor.findOne({ name });
        if (visitor) {
            if (type === 'comment') {
                visitor.commentsCount += 1;
            } else if (type === 'like') {
                visitor.likesCount += 1;
            }
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
        const updatedNews = await News.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedNews) {
            return res.status(404).json({ message: 'Actualité non trouvée' });
        }
        res.json(updatedNews);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/news/:id', async (req, res) => {
    try {
        const deletedNews = await News.findByIdAndDelete(req.params.id);
        if (!deletedNews) {
            return res.status(404).json({ message: 'Actualité non trouvée' });
        }
        res.json({ message: 'Actualité supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/verify-source', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ message: 'URL requise' });
    }

    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Vérification SSL
        const sslValid = urlObj.protocol === 'https:';
        
        // Vérification de domaine basique (liste blanche/noire simple)
        const trustedDomains = [
            'bbc.com', 'cnn.com', 'reuters.com', 'ap.org',
            'lequipe.fr', 'francefootball.fr', 'sofoot.com', 'footmercato.net',
            'goal.com', 'espn.com', 'skysports.com', 'marca.com', 'gazzetta.it'
        ];
        
        const suspiciousDomains = [
            'fake-news', 'spam', 'malware', 'phishing'
        ];
        
        let reputation = 'unknown';
        let verified = false;
        
        if (trustedDomains.some(trusted => domain.includes(trusted))) {
            reputation = 'trusted';
            verified = true;
        } else if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
            reputation = 'suspicious';
            verified = false;
        } else {
            reputation = 'unknown';
            verified = sslValid; // Vérifié si au moins SSL est valide
        }
        
        res.json({
            verified,
            domain,
            reputation,
            sslValid,
            message: `Source ${verified ? 'vérifiée' : 'non vérifiée'} - Réputation: ${reputation}`
        });
        
    } catch (err) {
        res.status(400).json({ 
            verified: false, 
            error: 'URL invalide ou erreur de vérification',
            message: err.message 
        });
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
        } else {
            res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/admin/messages/:id', async (req, res) => {
    try {
        const deletedMessage = await Message.findByIdAndDelete(req.params.id);
        if (!deletedMessage) {
            return res.status(404).json({ message: 'Message non trouvé' });
        }
        res.json({ message: 'Message supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/admin/messages/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: 'Message non trouvé' });
        }
        
        // Mettre à jour uniquement les champs fournis
        if (req.body.starred !== undefined) message.starred = req.body.starred;
        if (req.body.archived !== undefined) message.archived = req.body.archived;
        if (req.body.status !== undefined) message.status = req.body.status;
        
        const updatedMessage = await message.save();
        res.json(updatedMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Helpers are defined at the top of the file


// --- NEWS AGGREGATOR ---
// Endpoint pour contrôler l'agrégation manuellement
app.post('/api/admin/aggregate-news-manual', async (req, res) => {
    try {
        console.log('[MANUAL] Lancement manuel de l\'agrégation des actualités...');
        
        // Appeler la fonction d'agrégation existante
        const aggregatedNews = await aggregateNewsFromFeeds();
        
        console.log(`[MANUAL] Agrégation manuelle terminée: ${aggregatedNews.length} actualités trouvées`);
        
        res.json({
            success: true,
            message: `Agrégation terminée avec succès`,
            count: aggregatedNews.length,
            data: aggregatedNews,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[MANUAL] Erreur lors de l\'agrégation manuelle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'agrégation',
            error: error.message
        });
    }
});

// Endpoint pour vérifier le statut de l'agrégation
app.get('/api/admin/aggregation-status', async (req, res) => {
    try {
        const totalNews = await News.countDocuments();
        const recentNews = await News.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Dernières 24h
        });
        
        res.json({
            success: true,
            totalNews,
            recentNews,
            lastAggregation: new Date().toISOString(),
            nextAggregation: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // Dans 6 heures
            sources: [
                'RADIO OKAPI (RDC)',
                'FOOT.CD (RDC)', 
                'L\'ÉQUIPE (International)',
                'LEOPARDS FOOT (Léopards)',
                'GOOGLE NEWS (Mercato)'
            ]
        });
    } catch (error) {
        console.error('[STATUS] Erreur lors de la vérification du statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification du statut'
        });
    }
});

// Fonction refactorisée pour l'agrégation
const aggregateNewsFromFeeds = async () => {
    // Using Google News wrappers (site-specific) to bypass anti-scraping 403 blocks
    const feeds = [
        { name: 'RADIO OKAPI (direct)', url: 'https://www.radiookapi.net/rss.xml', category: 'RDC' },
        { name: 'FOOT.CD (direct)', url: 'https://foot.cd/feed/', category: 'RDC' },
        { name: 'L\'EQUIPE (direct)', url: 'https://www.lequipe.fr/rss/actu_rss_Football.xml', category: 'International' },
        { name: 'LEOPARDS FOOT (direct)', url: 'https://www.leopardsfoot.com/feed/', category: 'Léopards' },
        { name: 'MERCATO (search)', url: 'https://news.google.com/rss/search?q=football+top+transferts+Ligue+1+Mercato&hl=fr&gl=FR&ceid=FR:fr', category: 'Mercato' }
    ];

    const footballKeywords = ['football', 'foot', 'ballon', 'mercato', 'ligue', 'match', 'joueur', 'club', 'fifa', 'caf', 'leopards', 'congolais', 'transfert', 'vitesse', 'but', 'attaquant', 'stade'];

    try {
        // Fetch existing news titles to avoid doubles with already published news
        const existingNews = await News.find({}, 'title').lean();
        const publishedTitles = new Set(existingNews.map(n => n.title.toLowerCase().trim()));

        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const nowMs = now.getTime();

        const aggregatedNews = [];
        console.log(`[DEBUG] Aggregation started at ${new Date().toString()}`);
        for (const feed of feeds) {
            try {
                console.log(`[DEBUG] Fetching ${feed.name}: ${feed.url}`);
                const parsedFeed = await parser.parseURL(feed.url);
                console.log(`[DEBUG] ${feed.name} returned ${parsedFeed.items.length} items`);

                // Filter items by date BEFORE processing images (performance)
                // Filter out news older than 5 days
                const recentItems = parsedFeed.items.filter(item => {
                    const itemDate = new Date(item.isoDate || item.pubDate || item.date);
                    const diffDays = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
                    // Handle unparseable dates by assuming they are recent (to be safe)
                    const isRecent = isNaN(diffDays) ? true : diffDays <= 5;

                    console.log(`   - ${item.title.substring(0, 25)}: ${diffDays.toFixed(2)} days (Recent: ${isRecent})`);

                    if (!isRecent) {
                        // console.log(`[FILTER] Skipping ${item.title.substring(0, 30)}... (${Math.round(diffDays)} days old)`);
                    } else {
                        console.log(`[OK] Keeping ${item.title.substring(0, 30)}... (Age: ${diffDays.toFixed(1)} days)`);
                    }
                    return isRecent;
                }).slice(0, 15);

                const items = await Promise.all(recentItems.map(async (item) => {
                    let imageUrl = '';

                    // Priority 1: standard media:content (configured via customFields)
                    if (item.mediaContent && item.mediaContent[0]) {
                        imageUrl = item.mediaContent[0].$.url;
                    }
                    // Priority 2: media:thumbnail
                    else if (item.mediaThumbnail && item.mediaThumbnail.$) {
                        imageUrl = item.mediaThumbnail.$.url;
                    }
                    else if (item.mediaThumbnail && typeof item.mediaThumbnail === 'string') {
                        imageUrl = item.mediaThumbnail;
                    }
                    // Priority 3: enclosure
                    else if (item.enclosure && item.enclosure.url) {
                        imageUrl = item.enclosure.url;
                    }
                    // Priority 4: standard image tag
                    else if (item.image) {
                        imageUrl = typeof item.image === 'string' ? item.image : (item.image.url || '');
                    }
                    // Priority 5: regex scouting in content fields
                    else {
                        const searchFields = [item.contentEncoded, item.content, item.description, item.contentSnippet];
                        for (const field of searchFields) {
                            if (field) {
                                // Try to find images in HTML tags
                                const imgMatch = field.match(/<img[^>]+src="([^">]+)"/);
                                if (imgMatch && imgMatch[1]) {
                                    imageUrl = imgMatch[1];
                                    break;
                                }
                                // Try to find naked URLs ending with image extensions in text
                                const urlMatch = field.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|gif|png|webp)/i);
                                if (urlMatch) {
                                    imageUrl = urlMatch[0];
                                    break;
                                }
                            }
                        }
                    }

                    if (imageUrl) {
                        console.log(`[OK] ${feed.name}: Image found via RSS/Regex -> ${imageUrl.substring(0, 50)}...`);
                    } else {
                        // Priority 6: Fallback to OG tags on the page itself
                        console.log(`[INFO] ${feed.name}: Attempting OG fallback for "${item.title.substring(0, 30)}..."`);
                        imageUrl = await fetchOGImage(item.link);
                        if (imageUrl) {
                            console.log(`[OK] ${feed.name}: Image recovered via OG tags -> ${imageUrl.substring(0, 50)}...`);
                        } else {
                            // LAST EFFORT: Check if we can find ANY image URL in the link (sometimes it's in the link itself or simple patterns)
                            console.log(`[WARN] ${feed.name}: No image found for "${item.title.substring(0, 30)}..."`);
                        }
                    }

                    // Final cleanup: Ensure absolute URL and remove any tracking params
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        const feedUrl = new URL(feed.url);
                        imageUrl = `${feedUrl.protocol}//${feedUrl.host}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
                    }

                    const title = cleanTitle(item.title);
                    const summary = cleanSummary(item.contentSnippet || item.content || '');

                    // Basic slug for checking duplicates in the current fetch
                    const titleSlug = title.toLowerCase().trim().substring(0, 50);

                    return {
                        id: `agg_${item.guid || item.link}`,
                        source: feed.name,
                        title: title,
                        summary: summary,
                        link: item.link,
                        date: item.pubDate,
                        category: feed.category,
                        imageUrl: imageUrl || '',
                        titleSlug: titleSlug
                    };
                }));
                aggregatedNews.push(...items);
            } catch (feedErr) {
                console.error(`Error fetching feed ${feed.name}:`, feedErr.message);
            }
        }

        const seenTitles = new Set();
        const filteredNews = aggregatedNews.filter(item => {
            const title = item.title.toLowerCase().trim();
            const summary = (item.summary || "").toLowerCase();

            // 1. Keyword filtering to stay on football topic
            const isFootball = footballKeywords.some(kw => title.includes(kw) || summary.includes(kw));
            if (!isFootball) return false;

            // 2. Cross-check with local database (hiding already published)
            if (publishedTitles.has(title)) return false;

            // 3. Duplicate filtering within the current aggregated list
            const titleSlug = title.substring(0, 50);
            if (seenTitles.has(titleSlug)) return false;

            seenTitles.add(titleSlug);
            return true;
        });

        res.json(filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
        console.error('Aggregation error:', err.message);
        res.status(500).json({ message: 'Erreur lors de l\'agrégation des nouvelles' });
    }
});

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// --- STATS ROUTE ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        const postCount = await Post.countDocuments();
        const newsCount = await News.countDocuments();
        const partnerCount = await Partner.countDocuments();

        const allPosts = await Post.find();
        const totalLikes = allPosts.reduce((acc, p) => acc + (p.reactions?.likes || 0), 0);
        const totalComments = allPosts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);

        res.json({
            posts: postCount,
            news: newsCount,
            partners: partnerCount,
            engagement: totalLikes + totalComments,
            recentActivity: await Post.find().sort({ createdAt: -1 }).limit(5)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
