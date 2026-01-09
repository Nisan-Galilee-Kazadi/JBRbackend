// Système d'agrégation automatique des actualités foot
const News = require('./models/News');
const Parser = require('rss-parser');
const parser = new Parser();

// Fonction d'agrégation des actualités
const aggregateNewsFromFeeds = async () => {
    // Sources d'actualités foot
    const feeds = [
        { name: 'RADIO OKAPI (direct)', url: 'https://www.radiookapi.net/rss.xml', category: 'RDC' },
        { name: 'FOOT.CD (direct)', url: 'httpss://foot.cd/feed/', category: 'RDC' },
        { name: 'L\'ÉQUIPE (direct)', url: 'httpss://www.lequipe.fr/rss/actu_rss_Football.xml', category: 'International' },
        { name: 'LEOPARDS FOOT (direct)', url: 'httpss://www.leopardsfoot.com/feed/', category: 'Léopards' },
        { name: 'MERCATO (search)', url: 'httpss://news.google.com/rss/search?q=football+top+transferts+Ligue+1+Mercato&hl=fr&gl=FR&ceid=FR:fr', category: 'Mercato' }
    ];

    const footballKeywords = ['football', 'foot', 'ballon', 'mercato', 'ligue', 'match', 'joueur', 'club', 'fifa', 'caf', 'leopards', 'congolais', 'transfert', 'vitesse', 'but', 'attaquant', 'stade'];

    try {
        // Récupérer les actualités existantes pour éviter les doublons
        const existingNews = await News.find({}, 'title').lean();
        const publishedTitles = new Set(existingNews.map(n => n.title.toLowerCase().trim()));

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
                    
                    // Ne garder que les articles des 5 derniers jours
                    if (nowMs - itemMs > FIVE_DAYS_MS) return false;
                    
                    // Vérifier les mots-clés football
                    const title = (item.title || '').toLowerCase();
                    const content = (item.contentSnippet || item.content || '').toLowerCase();
                    const fullText = title + ' ' + content;
                    
                    return footballKeywords.some(keyword => fullText.includes(keyword));
                });

                // Traiter chaque article
                for (const item of recentItems) {
                    const titleSlug = item.title.toLowerCase().trim();
                    
                    // Éviter les doublons
                    if (publishedTitles.has(titleSlug)) continue;
                    
                    // Nettoyer et extraire l'image
                    const cleanedContent = cleanHtmlContent(item.content || item.contentSnippet || '');
                    const imageUrl = await fetchOGImage(item.link);
                    
                    const newsItem = {
                        title: item.title,
                        content: cleanedContent,
                        excerpt: (item.contentSnippet || '').substring(0, 200) + '...',
                        imageUrl: imageUrl || '/default-news.jpg',
                        source: feed.name,
                        category: feed.category,
                        link: item.link,
                        date: new Date(item.isoDate || item.pubDate || item.date),
                        createdAt: new Date(),
                        published: true
                    };
                    
                    aggregatedNews.push(newsItem);
                    publishedTitles.add(titleSlug);
                }
                
                // Délai entre les requêtes pour éviter d'être bloqué
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`[AGGREGATION] Erreur avec ${feed.name}:`, error.message);
            }
        }

        // Sauvegarder les nouvelles actualités
        if (aggregatedNews.length > 0) {
            await News.insertMany(aggregatedNews);
            console.log(`[AGGREGATION] ${aggregatedNews.length} nouvelles actualités ajoutées!`);
        } else {
            console.log('[AGGREGATION] Aucune nouvelle actualité trouvée');
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

// Extraction de l'image OG
const fetchOGImage = async (url) => {
    try {
        // Pour l'instant, retourner une image par défaut
        // Peut être amélioré avec cheerio pour extraire les images OG
        return null;
    } catch (error) {
        return null;
    }
};

// Système de planification automatique
const scheduleDailyNewsAggregation = () => {
    // Exécuter immédiatement au démarrage
    setTimeout(() => {
        console.log('[SCHEDULE] Démarrage de l\'agrégation automatique...');
        aggregateNewsScheduled();
    }, 5000);

    // Puis toutes les 6 heures
    setInterval(() => {
        console.log('[SCHEDULE] Agrégation automatique programmée...');
        aggregateNewsScheduled();
    }, 6 * 60 * 60 * 1000); // 6 heures

    // Optionnel: tous les jours à 8h du matin
    const scheduleDaily = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);
        
        const msUntilTomorrow = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            console.log('[SCHEDULE] Agrégation quotidienne à 8h du matin...');
            aggregateNewsScheduled();
            scheduleDaily();
        }, msUntilTomorrow);
    };
    
    // Décommenter pour activer l'agrégation quotidienne à 8h
    // scheduleDaily();
};

// Fonction d'agrégation programmée
const aggregateNewsScheduled = async () => {
    try {
        console.log('[AGGREGATION] Début de l\'agrégation automatique...');
        const aggregatedNews = await aggregateNewsFromFeeds();
        console.log(`[AGGREGATION] Succès: ${aggregatedNews.length} nouvelles actualités trouvées`);
        
        if (aggregatedNews.length > 0) {
            console.log(`[AGGREGATION] ${aggregatedNews.length} actualités ajoutées automatiquement!`);
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
