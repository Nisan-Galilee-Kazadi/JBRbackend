// Système d'agrégation automatique des actualités foot
const News = require('./models/News');
const Parser = require('rss-parser');
const http = require('http');
const https = require('https');

// Configuration du parser avec User-Agent pour éviter d'être bloqué
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
    },
    timeout: 10000
});

// Extraction de l'image OG (OpenGraph)
const fetchOGImage = async (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        try {
            const protocol = url.startsWith('https') ? https : http;
            const req = protocol.get(url, {
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JBR-Bot/1.0' }
            }, (res) => {
                let data = '';
                res.on('data', chunk => {
                    data += chunk;
                    // On cherche la balise og:image
                    const match = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                        data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
                    if (match) {
                        resolve(match[1]);
                        req.destroy();
                    }
                    // Si on a déjà lu 50KB sans trouver, on arrête
                    if (data.length > 50000) {
                        resolve(null);
                        req.destroy();
                    }
                });
                res.on('end', () => resolve(null));
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });
        } catch (e) {
            resolve(null);
        }
    });
};

// Fonction d'agrégation des actualités
const aggregateNewsFromFeeds = async () => {
    // Sources d'actualités foot
    const feeds = [
        { name: 'RADIO OKAPI', url: 'https://www.radiookapi.net/rss.xml', category: 'RDC' },
        { name: 'FOOT.CD', url: 'https://foot.cd/feed/', category: 'RDC' },
        { name: 'L\'ÉQUIPE', url: 'https://www.lequipe.fr/rss/actu_rss_Football.xml', category: 'International' },
        { name: 'LEOPARDS FOOT', url: 'https://www.leopardsfoot.com/feed/', category: 'Léopards' },
        { name: 'EUROSPORT', url: 'https://www.eurosport.fr/football/rss.xml', category: 'International' },
        { name: 'MARCA (Real/Barca)', url: 'https://e00-marca.uecdn.es/rss/futbol/liga-espanola.xml', category: 'Espagne' },
        { name: 'FOOT MERCATO', url: 'https://www.footmercato.net/feed', category: 'Mercato' },
        { name: 'GOOGLE NEWS LDC', url: 'https://news.google.com/rss/search?q=Champions+League+Real+Madrid+Barcelona+PSG+Man+City&hl=fr&gl=FR&ceid=FR:fr', category: 'LDC' }
    ];

    const footballKeywords = ['football', 'foot', 'ballon', 'mercato', 'ligue', 'match', 'joueur', 'club', 'fifa', 'caf', 'leopards', 'congolais', 'transfert', 'vitesse', 'but', 'attaquant', 'stade'];

    try {
        // Récupérer les actualités existantes pour éviter les doublons
        const existingNews = await News.find({}, 'link').lean();
        const publishedLinks = new Set(existingNews.map(n => n.link));

        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const nowMs = now.getTime();

        const aggregatedNews = [];
        console.log(`[AGGREGATION] Début de l'agrégation à ${new Date().toString()}`);

        for (const feed of feeds) {
            try {
                console.log(`[AGGREGATION] Traitement de ${feed.name}: ${feed.url}`);
                const parsedFeed = await parser.parseURL(feed.url);
                console.log(`[AGGREGATION] ${feed.name} a retourné ${parsedFeed.items.length} articles`);

                // Filtrer les articles par date et mots-clés
                const recentItems = parsedFeed.items.filter(item => {
                    const itemDate = new Date(item.isoDate || item.pubDate || item.date);
                    const itemMs = itemDate.getTime();

                    // Ne garder que les articles récents (5 jours)
                    if (isNaN(itemMs) || (nowMs - itemMs > FIVE_DAYS_MS)) return false;

                    // Vérifier les mots-clés football
                    const title = (item.title || '').toLowerCase();
                    const content = (item.contentSnippet || item.content || '').toLowerCase();
                    const fullText = title + ' ' + content;

                    return footballKeywords.some(keyword => fullText.includes(keyword));
                });

                // Traiter chaque article
                for (const item of recentItems) {
                    // Éviter les doublons par lien
                    if (publishedLinks.has(item.link)) continue;

                    // Nettoyer et extraire l'image
                    const cleanedContent = cleanHtmlContent(item.content || item.contentSnippet || '');

                    // On essaie d'extraire l'image du feed d'abord, sinon on scrap l'OG image
                    let imageUrl = item.enclosure?.url ||
                        (item.mediaContent && item.mediaContent[0] && item.mediaContent[0].url) ||
                        null;

                    if (!imageUrl) {
                        imageUrl = await fetchOGImage(item.link);
                    }

                    const newsItem = {
                        id: Buffer.from(item.link || item.title).toString('base64').substring(0, 16),
                        title: item.title,
                        content: cleanedContent,
                        summary: (item.contentSnippet || item.content || '').substring(0, 200).replace(/<[^>]*>/g, '').trim(),
                        imageUrl: imageUrl || '/default-news.jpg',
                        source: feed.name,
                        category: feed.category,
                        link: item.link,
                        date: new Date(item.isoDate || item.pubDate || item.date),
                        createdAt: new Date(),
                        published: false // Par défaut non publié, l'admin doit valider
                    };

                    aggregatedNews.push(newsItem);
                    publishedLinks.add(item.link);
                }

                // Délai entre les requêtes pour éviter d'être bloqué
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`[AGGREGATION] Erreur avec ${feed.name}:`, error.message);
            }
        }

        return aggregatedNews;

    } catch (error) {
        console.error('[AGGREGATION] Erreur générale:', error);
        throw error;
    }
};

// Nettoyage du contenu HTML
const cleanHtmlContent = (html) => {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&[a-z]+;/g, '')
        .trim();
};

// Système de planification automatique
const scheduleDailyNewsAggregation = () => {
    // Exécuter immédiatement au démarrage (après un court délai)
    setTimeout(() => {
        console.log('[SCHEDULE] Démarrage de l\'agrégation automatique...');
        aggregateNewsScheduled();
    }, 10000);

    // Puis toutes les 12 heures
    setInterval(() => {
        console.log('[SCHEDULE] Agrégation automatique programmée...');
        aggregateNewsScheduled();
    }, 12 * 60 * 60 * 1000);
};

// Fonction d'agrégation programmée (sauvegarde en base)
const aggregateNewsScheduled = async () => {
    try {
        const aggregatedNews = await aggregateNewsFromFeeds();
        if (aggregatedNews.length > 0) {
            // Filtrer ceux qui existent déjà en base par titre juste au cas où
            const existingTitles = await News.find({ title: { $in: aggregatedNews.map(n => n.title) } }).lean();
            const titlesSet = new Set(existingTitles.map(n => n.title));

            const newItems = aggregatedNews.filter(n => !titlesSet.has(n.title));

            if (newItems.length > 0) {
                await News.insertMany(newItems);
                console.log(`[AGGREGATION] ${newItems.length} actualités ajoutées automatiquement!`);
            }
        }
    } catch (error) {
        console.error('[AGGREGATION] Erreur lors de l\'agrégation automatique:', error);
    }
};

module.exports = {
    aggregateNewsFromFeeds,
    scheduleDailyNewsAggregation,
    aggregateNewsScheduled
};

