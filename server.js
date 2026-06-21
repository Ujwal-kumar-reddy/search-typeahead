const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { createClient } = require('redis'); // Using real Redis!

const app = express();
app.use(cors());
app.use(express.json()); 
app.use(express.static(__dirname));

// --- 1. LOAD PRIMARY DATATBASE ---
const primaryDB = {}; 
try {
    const rawJSON = JSON.parse(fs.readFileSync('./dataset.json', 'utf-8'));
    rawJSON.forEach(record => {
        primaryDB[record.query.toLowerCase()] = { historical: record.count, recent: 0 };
    });
} catch (e) {
    console.error("Missing dataset.json. Please run 'node generateData.js' first.");
    process.exit(1);
}

// --- 2. REAL REDIS CLUSTER SETUP ---
const redisUrls = {
    'Instance_Alpha': 'redis://localhost:6379',
    'Instance_Beta': 'redis://localhost:6380',
    'Instance_Gamma': 'redis://localhost:6381'
};

const cacheNodes = {};

Object.entries(redisUrls).forEach(([name, url]) => {
    const client = createClient({ url });
    client.on('error', (err) => console.error(`[${name}] Redis Error:`, err));
    client.connect().then(() => console.log(`[System] Connected to Docker Redis: ${name}`));
    cacheNodes[name] = client;
});

// Consistent Hashing Algorithm
function assignCacheNode(searchStr) {
    let hash = 5381;
    for (let i = 0; i < searchStr.length; i++) {
        hash = ((hash << 5) + hash) + searchStr.charCodeAt(i);
    }
    const availableNodes = Object.keys(cacheNodes);
    return availableNodes[Math.abs(hash) % availableNodes.length];
}

// --- 3. ASYNC BATCH WRITER ---
let memoryBuffer = {};

setInterval(async () => {
    const pendingSearches = Object.keys(memoryBuffer);
    if (pendingSearches.length === 0) return;

    console.log(`[Batch Processor] Committing ${pendingSearches.length} aggregated searches to primary DB...`);
    
    for (const term of pendingSearches) {
        if (!primaryDB[term]) primaryDB[term] = { historical: 0, recent: 0 };
        
        const count = memoryBuffer[term];
        primaryDB[term].historical += count;
        primaryDB[term].recent += count;
        
        for (let i = 1; i <= term.length; i++) {
            const subStr = term.substring(0, i);
            const designatedNode = assignCacheNode(subStr);
            try { await cacheNodes[designatedNode].del(subStr); } catch (e) {}
        }
    }
    memoryBuffer = {}; 
}, 10000); 

setInterval(() => {
    for (const key in primaryDB) {
        primaryDB[key].historical = Math.floor(primaryDB[key].historical * 0.9);
        primaryDB[key].recent = Math.floor(primaryDB[key].recent * 0.9);
    }
}, 3600000);

// --- 4. API ROUTES ---
app.get('/suggest', async (req, res) => { 
    const input = (req.query.q || '').toLowerCase().trim();
    if (input.length < 3) return res.json([]);

    const targetRedis = assignCacheNode(input);

    try {
        const cachedPayload = await cacheNodes[targetRedis].get(input);
        if (cachedPayload) {
            return res.json(JSON.parse(cachedPayload));
        }

        const generatedSuggestions = Object.keys(primaryDB)
            .filter(key => key.startsWith(input))
            .map(key => ({
                text: key,
                rank: primaryDB[key].historical + (primaryDB[key].recent * 5) 
            }))
            .sort((a, b) => b.rank - a.rank)
            .slice(0, 10)
            .map(obj => obj.text);

        await cacheNodes[targetRedis].setEx(input, 300, JSON.stringify(generatedSuggestions));
        return res.json(generatedSuggestions);
    } catch (error) {
        res.status(500).json({ error: "Cache retrieval failed" });
    }
});

app.post('/search', (req, res) => { 
    const searchString = (req.body.query || '').toLowerCase().trim();
    if (searchString) {
        memoryBuffer[searchString] = (memoryBuffer[searchString] || 0) + 1;
    }
    res.json({ success: true, status: "Added to batch buffer" });
});

app.listen(3000, () => console.log(`[System] Typeahead Engine live on http://localhost:3000`));