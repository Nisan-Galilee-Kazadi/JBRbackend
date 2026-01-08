
const RSSParser = require('rss-parser');
const parser = new RSSParser();

async function test() {
    const now = new Date();
    console.log('Current Server Time:', now.toString());
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

    const url = 'https://foot.cd/feed/';
    const feed = await parser.parseURL(url);
    console.log(`Feed: ${feed.title}, Items: ${feed.items.length}`);

    const recent = feed.items.filter(item => {
        const itemDate = new Date(item.isoDate || item.pubDate || item.date);
        const age = now.getTime() - itemDate.getTime();
        const isRecent = age <= FIVE_DAYS_MS;
        console.log(`Item: ${item.title.substring(0, 30)}, Date: ${item.pubDate}, Age (days): ${(age / (1000 * 60 * 60 * 24)).toFixed(1)}, Recent: ${isRecent}`);
        return isRecent;
    });

    console.log(`Total recent: ${recent.length}`);
}

test();
