const fs = require('fs');

const manufacturers = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'google', 'microsoft', 'dell', 'hp', 'lenovo', 'asus'];
const categories = ['laptop', 'phone', 'headphones', 'charger', 'case', 'shoes', 'watch', 'tablet', 'monitor', 'keyboard', 'mouse'];
const features = ['wireless', 'bluetooth', 'pro', 'max', 'usb-c', 'gaming', 'mechanical', 'smart', 'portable', 'refurbished', 'new'];

const searchRecords = [];
const seenQueries = new Set();

for (const company of manufacturers) {
    for (const type of categories) {
        for (const trait of features) {
            const queryMixes = [
                `${company} ${type}`,
                `${company} ${type} ${trait}`,
                `${trait} ${type}`,
                `buy ${company} ${type}`,
                `cheap ${company} ${trait} ${type}`
            ];

            for (const text of queryMixes) {
                if (!seenQueries.has(text)) {
                    seenQueries.add(text);
                    searchRecords.push({
                        query: text,
                        count: Math.floor(Math.random() * 50000) + 150 
                    });
                }
            }
        }
    }
}

let index = 1;
while (searchRecords.length < 105000) {
    searchRecords.push({
        query: `how to code module ${index}`,
        count: Math.floor(Math.random() * 400) + 5
    });
    index++;
}

searchRecords.sort((a, b) => b.count - a.count);

fs.writeFileSync('dataset.json', JSON.stringify(searchRecords, null, 2));
console.log(`Successfully generated ${searchRecords.length} queries in dataset.json!`);