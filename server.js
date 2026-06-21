const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { createClient } = require('redis');

const app = express();
app.use(cors());
app.use(express.json()); 
app.use(express.static(__dirname));

const primaryDB = {}; 
try {
    const rawJSON = JSON.parse(fs.readFileSync('./dataset.json', 'utf-8'));
    rawJSON.forEach(record => {
        primaryDB[record.query.toLowerCase()] = { historical: record.count };
    });
} catch (e) { process.exit(1); }

const redisUrls = {
    'Instance_Alpha': 'redis://localhost:6379',
    'Instance_Beta': 'redis://localhost:6380',
    'Instance_Gamma': 'redis://localhost:6381'
};

const cacheNodes = {};
Object.entries(redisUrls).forEach(([name, url]) => {
    const client = createClient({ url });
    client.on('error', (err) => {});
    client.connect().then(() => console.log(`[System] Connected to Docker Redis: ${name}`));
    cacheNodes[name] = client;
});

let memoryBuffer = {};
setInterval(async () => {
    const pendingSearches = Object.keys(memoryBuffer);
    if (pendingSearches.length > 0) {
        console.log(`[Batch Processor] Committing ${pendingSearches.length} aggregated searches to primary DB...`);
        memoryBuffer = {}; 
    }
}, 10000);

function assignCacheNode(searchStr) {
    let hash = 5381;
    for (let i = 0; i < searchStr.length; i++) hash = ((hash << 5) + hash) + searchStr.charCodeAt(i);
    const nodes = Object.keys(cacheNodes);
    return nodes[Math.abs(hash) % nodes.length];
}

app.get('/suggest', async (req, res) => {
    const input = (req.query.q || '').toLowerCase().trim();
    if (input.length < 3) return res.json([]);
    const node = assignCacheNode(input);
    try {
        const cached = await cacheNodes[node].get(input);
        if (cached) return res.json(JSON.parse(cached));
        const suggestions = Object.keys(primaryDB).filter(key => key.startsWith(input)).slice(0, 10);
        await cacheNodes[node].setEx(input, 300, JSON.stringify(suggestions));
        res.json(suggestions);
    } catch (e) { res.json([]); }
});

app.post('/search', async (req, res) => {
    const term = (req.body.query || '').toLowerCase().trim();
    if (term) {
        await cacheNodes['Instance_Alpha'].zIncrBy('trending_searches', 1, term);
        
        memoryBuffer[term] = (memoryBuffer[term] || 0) + 1;
        
        if (!primaryDB[term]) primaryDB[term] = { historical: 1 };
        else primaryDB[term].historical += 1;

        for (let i = 3; i <= term.length; i++) {
            const prefix = term.substring(0, i);
            const node = assignCacheNode(prefix);
            try { await cacheNodes[node].del(prefix); } catch (e) {}
        }
    }
    res.status(200).send('Logged');
});

app.get('/api/trending', async (req, res) => {
    try {
        const results = await cacheNodes['Instance_Alpha'].zRangeWithScores('trending_searches', 0, 9, { REV: true });
        res.json(results);
    } catch (e) { res.json([]); }
});

app.listen(3000, () => console.log(`[System] Typeahead Engine live on http://localhost:3000`));