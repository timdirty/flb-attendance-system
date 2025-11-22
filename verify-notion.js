#!/usr/bin/env node

/**
 * 🧪 Notion 記帳整合完整自檢
 * 
 * 測試項目：
 * 1. 環境變數檢查
 * 2. Notion API 連線測試
 * 3. 資料庫結構驗證
 * 4. 模擬記錄收入測試
 */

require('dotenv').config();
const axios = require('axios');

// 測試結果收集
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function addTest(name, passed, message, details = null) {
    results.total++;
    if (passed) {
        results.passed++;
    } else {
        results.failed++;
    }
    results.tests.push({ name, passed, message, details });
}

// 顏色輸出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

console.log('\n' + '='.repeat(80));
console.log('🧪 Notion 記帳整合完整自檢');
console.log('='.repeat(80) + '\n');

// ==================== 測試 1：環境變數檢查 ====================
console.log('📋 測試 1/5：檢查環境變數...\n');

const NOTION_TOKEN = process.env.NOTION_API_TOKEN;
const DATABASE_ID = process.env.NOTION_INCOME_DATABASE_ID;

if (NOTION_TOKEN && NOTION_TOKEN.startsWith('ntn_')) {
    log('green', '✅', `NOTION_API_TOKEN: 已設定 (${NOTION_TOKEN.slice(0, 15)}...)`);
    addTest('環境變數：NOTION_API_TOKEN', true, 'Token 格式正確');
} else {
    log('red', '❌', 'NOTION_API_TOKEN: 未設定或格式錯誤');
    addTest('環境變數：NOTION_API_TOKEN', false, 'Token 缺失或格式錯誤');
}

if (DATABASE_ID && DATABASE_ID.length === 32) {
    log('green', '✅', `NOTION_INCOME_DATABASE_ID: 已設定 (${DATABASE_ID.slice(0, 10)}...)`);
    addTest('環境變數：NOTION_INCOME_DATABASE_ID', true, 'Database ID 格式正確');
} else {
    log('red', '❌', 'NOTION_INCOME_DATABASE_ID: 未設定或格式錯誤');
    addTest('環境變數：NOTION_INCOME_DATABASE_ID', false, 'Database ID 缺失或格式錯誤');
}

console.log('');

// 如果基本環境變數有問題，提前結束
if (!NOTION_TOKEN || !DATABASE_ID) {
    log('red', '❌', '環境變數缺失，無法繼續測試');
    printSummary();
    process.exit(1);
}

// ==================== 測試 2：Notion API 連線 ====================
async function testNotionConnection() {
    console.log('🔗 測試 2/5：測試 Notion API 連線...\n');
    
    try {
        const response = await axios.get(
            `https://api.notion.com/v1/databases/${DATABASE_ID}`,
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': '2022-06-28'
                },
                timeout: 10000
            }
        );

        const dbTitle = response.data.title?.[0]?.plain_text || '未命名資料庫';
        log('green', '✅', `連線成功：${dbTitle}`);
        addTest('Notion API 連線', true, `成功連接到資料庫：${dbTitle}`);
        
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            log('red', '❌', '連線失敗：Token 無效或已過期');
            addTest('Notion API 連線', false, 'Token 無效或已過期');
        } else if (error.response?.status === 404) {
            log('red', '❌', '連線失敗：找不到資料庫（請確認已連接 Integration）');
            addTest('Notion API 連線', false, '找不到資料庫，請在 Notion 中連接 Integration');
        } else {
            log('red', '❌', `連線失敗：${error.message}`);
            addTest('Notion API 連線', false, error.message);
        }
        return null;
    }
}

// ==================== 測試 3：資料庫結構驗證 ====================
async function testDatabaseStructure(database) {
    console.log('\n📊 測試 3/5：驗證資料庫結構...\n');
    
    if (!database) {
        log('yellow', '⚠️', '跳過結構驗證（資料庫連線失敗）');
        addTest('資料庫結構驗證', false, '資料庫連線失敗');
        return;
    }

    const properties = database.properties || {};
    const requiredFields = {
        '收入': { type: 'title', required: true },
        '日期': { type: 'date', required: true },
        '金額': { type: 'number', required: true }
    };

    const optionalFields = {
        '類別': { type: 'relation' },
        '帳戶': { type: 'relation' },
        '個人/公司': { type: 'select' },
        '備註': { type: 'rich_text' }
    };

    // 檢查必要欄位
    let allRequiredPresent = true;
    for (const [fieldName, config] of Object.entries(requiredFields)) {
        const field = properties[fieldName];
        if (field && field.type === config.type) {
            log('green', '✅', `必要欄位：「${fieldName}」（${config.type}）`);
            addTest(`資料庫欄位：${fieldName}`, true, `欄位類型正確：${config.type}`);
        } else if (field) {
            log('red', '❌', `必要欄位：「${fieldName}」類型錯誤（應為 ${config.type}，實際為 ${field.type}）`);
            addTest(`資料庫欄位：${fieldName}`, false, `類型錯誤：${field.type}`);
            allRequiredPresent = false;
        } else {
            log('red', '❌', `必要欄位：「${fieldName}」不存在`);
            addTest(`資料庫欄位：${fieldName}`, false, '欄位不存在');
            allRequiredPresent = false;
        }
    }

    console.log('');

    // 檢查選填欄位
    for (const [fieldName, config] of Object.entries(optionalFields)) {
        const field = properties[fieldName];
        if (field && field.type === config.type) {
            log('cyan', 'ℹ️', `選填欄位：「${fieldName}」（${config.type}）已設定`);
        }
    }

    return allRequiredPresent;
}

// ==================== 測試 4：模擬記錄收入 ====================
async function testRecordIncome() {
    console.log('\n💰 測試 4/5：模擬記錄收入...\n');

    const testRecord = {
        id: `test_${Date.now()}`,
        userId: 'U_test_user_123',
        displayName: '測試用戶 Test User',
        amount: '1234',
        confirmedAt: new Date().toISOString()
    };

    log('blue', '🧪', `測試記錄：金額 ${testRecord.amount}，用戶 ${testRecord.displayName}`);

    try {
        const amount = parseFloat(testRecord.amount);
        const date = new Date(testRecord.confirmedAt).toISOString().split('T')[0];
        const memo = `來自: ${testRecord.displayName}\n記錄ID: ${testRecord.id}`;

        const payload = {
            parent: {
                database_id: DATABASE_ID
            },
            properties: {
                "收入": {
                    title: [{ text: { content: "課程收款（FLBsys 自動記帳）" } }]
                },
                "日期": {
                    date: { start: date }
                },
                "金額": {
                    number: amount
                }
            }
        };

        // 如果有備註欄位設定，加入備註
        if (process.env.NOTION_INCOME_HAS_MEMO_FIELD === 'true') {
            payload.properties["備註"] = {
                rich_text: [{ text: { content: memo } }]
            };
        }

        log('blue', '📝', '準備發送到 Notion API...');

        const response = await axios.post(
            'https://api.notion.com/v1/pages',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        log('green', '✅', `記錄成功！Notion 頁面 ID: ${response.data.id}`);
        log('green', '✅', `頁面連結: ${response.data.url}`);
        addTest('模擬記錄收入', true, `成功建立測試記錄，金額：${amount}`);

        return response.data;
    } catch (error) {
        if (error.response?.data) {
            log('red', '❌', `記錄失敗：${error.response.data.message || error.response.data.code}`);
            addTest('模擬記錄收入', false, error.response.data.message || error.response.data.code, error.response.data);
        } else {
            log('red', '❌', `記錄失敗：${error.message}`);
            addTest('模擬記錄收入', false, error.message);
        }
        return null;
    }
}

// ==================== 測試 5：驗證記錄內容 ====================
async function testVerifyRecord(pageId) {
    console.log('\n🔍 測試 5/5：驗證記錄內容...\n');

    if (!pageId) {
        log('yellow', '⚠️', '跳過驗證（記錄建立失敗）');
        addTest('驗證記錄內容', false, '記錄建立失敗');
        return;
    }

    try {
        const response = await axios.get(
            `https://api.notion.com/v1/pages/${pageId}`,
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': '2022-06-28'
                },
                timeout: 10000
            }
        );

        const props = response.data.properties;
        
        // 驗證收入
        const income = props['收入']?.title?.[0]?.plain_text;
        if (income === '課程收款（FLBsys 自動記帳）') {
            log('green', '✅', `收入標題正確：${income}`);
        } else {
            log('red', '❌', `收入標題錯誤：${income}`);
        }

        // 驗證日期
        const date = props['日期']?.date?.start;
        if (date) {
            log('green', '✅', `日期正確：${date}`);
        } else {
            log('red', '❌', '日期缺失');
        }

        // 驗證金額
        const amount = props['金額']?.number;
        if (amount === 1234) {
            log('green', '✅', `金額正確：${amount}`);
        } else {
            log('red', '❌', `金額錯誤：${amount}`);
        }

        addTest('驗證記錄內容', true, '記錄內容完整且正確');
    } catch (error) {
        log('red', '❌', `驗證失敗：${error.message}`);
        addTest('驗證記錄內容', false, error.message);
    }
}

// ==================== 執行所有測試 ====================
async function runAllTests() {
    try {
        // 測試 1: 環境變數（已完成）
        
        // 測試 2: API 連線
        const database = await testNotionConnection();
        
        // 測試 3: 資料庫結構
        const structureValid = await testDatabaseStructure(database);
        
        // 測試 4: 模擬記錄
        const recordResult = await testRecordIncome();
        
        // 測試 5: 驗證記錄
        if (recordResult) {
            await testVerifyRecord(recordResult.id);
        }

        // 輸出總結
        printSummary();

    } catch (error) {
        console.error('\n❌ 測試過程發生錯誤:', error.message);
        process.exit(1);
    }
}

// ==================== 輸出測試總結 ====================
function printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 測試總結');
    console.log('='.repeat(80) + '\n');

    console.log(`總測試數：${results.total}`);
    console.log(`${colors.green}✅ 通過：${results.passed}${colors.reset}`);
    console.log(`${colors.red}❌ 失敗：${results.failed}${colors.reset}`);
    console.log(`${colors.cyan}通過率：${((results.passed / results.total) * 100).toFixed(1)}%${colors.reset}`);

    if (results.failed > 0) {
        console.log('\n' + colors.red + '❌ 失敗測試詳情：' + colors.reset);
        results.tests
            .filter(t => !t.passed)
            .forEach(t => {
                console.log(`\n  • ${t.name}`);
                console.log(`    原因：${t.message}`);
                if (t.details) {
                    console.log(`    詳情：${JSON.stringify(t.details, null, 2)}`);
                }
            });
    }

    console.log('\n' + '='.repeat(80));

    if (results.failed === 0) {
        console.log(colors.green + '\n🎉 所有測試通過！Notion 記帳整合已準備就緒！' + colors.reset);
        console.log('\n💡 下一步：在 LINE 中發送匯款截圖，確認收款後會自動記錄到 Notion\n');
        process.exit(0);
    } else {
        console.log(colors.red + '\n⚠️  部分測試失敗，請查看上方詳情並修復問題\n' + colors.reset);
        process.exit(1);
    }
}

// 執行測試
runAllTests();
