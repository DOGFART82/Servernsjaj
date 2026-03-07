const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const API_URL = 'https://api.ethplorer.io/getTokenHistory/0xdac17f958d2ee523a2206206994597c13d831ec7?apiKey=freekey&limit=50';
const TARGET_AMOUNTS = [100000, 150000, 500000, 1000000, 1500000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000];

// مخزن البيانات التراكمي
let cachedData = {
    timestamp: Date.now(),
    operations: []
};

async function updateBlockchainData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data && data.operations) {
            // 1. تصفية البيانات الجديدة القادمة من API
            const newFiltered = data.operations.filter(op => 
                TARGET_AMOUNTS.includes(Math.floor(parseFloat(op.value)))
            );

            // 2. دمج البيانات الجديدة مع القديمة ومنع التكرار بناءً على الـ Hash
            const existingHashes = new Set(cachedData.operations.map(op => op.transactionHash));
            const uniqueNewItems = newFiltered.filter(op => !existingHashes.has(op.transactionHash));

            if (uniqueNewItems.length > 0) {
                // إضافة الجديد في بداية المصفوفة
                cachedData.operations = [...uniqueNewItems, ...cachedData.operations];
                
                // اختياري: تحديد سقف للسجل (مثلاً آخر 500 معاملة) لعدم إبطاء المتصفح
                if (cachedData.operations.length > 500) {
                    cachedData.operations = cachedData.operations.slice(0, 500);
                }
                
                cachedData.timestamp = Date.now();
                console.log(`New Transactions Found: ${uniqueNewItems.length}. Total in history: ${cachedData.operations.length}`);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

setInterval(updateBlockchainData, 5000);
updateBlockchainData(); 

app.get('/api/data', (req, res) => {
    res.json(cachedData);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Cloud server active with History Mode on port ${PORT}`);
});
