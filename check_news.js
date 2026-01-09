
const https = require('https');

https.get('https://jbrbackend.onrender.com/api/admin/aggregate-news', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const news = JSON.parse(data);
            console.log(`Total news aggregated: ${news.length}`);
            news.slice(0, 5).forEach(item => {
                console.log(`- [${item.source}] ${item.title} (${item.date}) - Image: ${item.imageUrl ? 'YES' : 'NO'}`);
            });
        } catch (e) {
            console.error('Failed to parse response', e.message);
        }
    });
}).on('error', (e) => {
    console.error('Failed to connect to server', e.message);
});
