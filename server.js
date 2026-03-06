const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات الـ API والمبالغ المستهدفة
const API_URL = 'https://api.ethplorer.io/getTokenHistory/0xdac17f958d2ee523a2206206994597c13d831ec7?apiKey=freekey&limit=50';
const TARGET_AMOUNTS = [100, 150, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

// مخزن البيانات المؤقت
let cachedData = {
    timestamp: Date.now(),
    operations: []
};

// وظيفة جلب البيانات من البلوكشين كل 5 ثوانٍ
async function updateBlockchainData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data && data.operations) {
            const filtered = data.operations.filter(op => 
                TARGET_AMOUNTS.includes(Math.floor(parseFloat(op.value)))
            );
            
            cachedData = {
                timestamp: Date.now(),
                operations: filtered
            };
            console.log(`Sync OK: ${filtered.length} operations found.`);
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

// تحديث مستمر
setInterval(updateBlockchainData, 5000);
updateBlockchainData(); 

// نقطة الوصول للمستخدمين
app.get('/api/data', (req, res) => {
    res.json(cachedData);
});

// تقديم ملف الواجهة من المسار الرئيسي مباشرة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Cloud server active on port ${PORT}`);
});

