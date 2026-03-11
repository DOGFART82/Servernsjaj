const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// USDT Decimals on Ethereum is 6
const USDT_DECIMALS = 1000000; 

const API_URL = 'https://api.ethplorer.io/getTokenHistory/0xdac17f958d2ee523a2206206994597c13d831ec7?apiKey=freekey&limit=50';

// المبالغ المستهدفة بالدولار الحقيقي (بعد القسمة على الخانات العشرية)
const TARGET_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000, 50000, 100000];

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
            // 1. معالجة وتصفية البيانات الجديدة
            const newFiltered = data.operations.map(op => {
                // تحويل القيمة الخام إلى قيمة حقيقية بالدولار
                // ملاحظة: بعض مقدمي الخدمة يرسلون القيمة مقسومة جاهزة، لذا نتحقق
                const rawValue = parseFloat(op.value);
                const actualValue = op.tokenInfo && op.tokenInfo.decimals 
                    ? rawValue / Math.pow(10, op.tokenInfo.decimals)
                    : rawValue / USDT_DECIMALS;

                return { ...op, actualValue: Math.floor(actualValue) };
            }).filter(op => 
                // تصفية المعاملات بناءً على المبالغ التي حددتها أنت
                TARGET_AMOUNTS.includes(op.actualValue)
            );

            // 2. منع التكرار بناءً على الـ Hash
            const existingHashes = new Set(cachedData.operations.map(op => op.transactionHash));
            const uniqueNewItems = newFiltered.filter(op => !existingHashes.has(op.transactionHash));

            if (uniqueNewItems.length > 0) {
                // تحديث القيمة المعروضة لتكون القيمة الحقيقية بدلاً من الخام
                const formattedNewItems = uniqueNewItems.map(item => ({
                    ...item,
                    value: item.actualValue // استبدال القيمة القديمة بالصححة
                }));

                cachedData.operations = [...formattedNewItems, ...cachedData.operations];
                
                // سقف السجل
                if (cachedData.operations.length > 500) {
                    cachedData.operations = cachedData.operations.slice(0, 500);
                }
                
                cachedData.timestamp = Date.now();
                console.log(`New Transactions Found: ${formattedNewItems.length}. Total in history: ${cachedData.operations.length}`);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

// التحديث كل 5 ثوانٍ
setInterval(updateBlockchainData, 5000);
updateBlockchainData(); 

app.get('/api/data', (req, res) => {
    res.json(cachedData);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Cloud server active on port ${PORT} - Monitoring USDT (6 Decimals)`);
});
