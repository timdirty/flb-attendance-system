#!/usr/bin/env node

/**
 * 🧪 OCR 金額提取測試腳本
 * 
 * 測試各種常見的台灣銀行轉帳格式
 * 確保金額提取邏輯正確運作
 */

// 複製 server.js 中的金額提取函數（2025-12-11 更新版）
function parseAmountFromText(text) {
    if (!text) return null;
    
    // 策略 1：優先匹配有明確金額關鍵字的數字
    const keywordPatterns = [
        // 支援 "轉帳金額 TWD1,000.00" 格式（保留逗號和小數點）
        /(?:金額|轉帳金額|匯款金額|付款金額|繳費金額|應繳金額|轉出金額|轉入金額|交易金額)[\s:：]*(?:TWD|NTD|NT\$|USD|\$)?[\s]*(\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
        // 支援 "NT$ 1000" 或 "新臺幣 2,090" 格式（含千分位逗號）
        /(?:NT\$|NT|USD|TWD|NTD|台幣|新臺幣|新台幣)[\s]*(\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
        // 支援 "2,090元" 或 "2,090 元" 格式（含千分位逗號）
        // 支援 "2,090元" 或 "169,307.00元" 格式（千分位逗號+可選小數點）
        /(\d{1,}(?:,\d{3})+(?:\.\d+)?)\s*(?:元|塊)/i,
        // 支援 "1000.00元" 或 "50元" 格式（含小數點）
        /(\d+(?:\.\d+)?)\s*(?:元|塊)/i
    ];
    
    for (const pattern of keywordPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            // 移除逗號和小數點後的部分，只保留整數
            let amount = match[1].replace(/,/g, '').split('.')[0];
            
            // ✅ 有明確金額關鍵字時，不過濾年份範圍的數字
            // 因為「新臺幣 2,090 元」這種格式已經明確是金額
            return amount;
        }
    }
    
    // 移除逗號用於策略 2 和 3
    const cleanText = text.replace(/,/g, '');

    // 先移除常見的「銀行代碼 + 長帳號」格式，避免把 812 這類銀行代碼誤判為金額
    // 例如："(812)0028881014624669"、"812-0028881014624669"、"8120028881014624669"
    let sanitizedText = cleanText
        // 格式一：(812)0028881014624669
        .replace(/\(\d{3}\)\d{5,}/g, ' ')
        // 格式二：812-0028881014624669
        .replace(/\b\d{3}-\d{5,}\b/g, ' ')
        // 格式三：8120028881014624669（3 碼開頭後接 7 碼以上）
        .replace(/\b\d{3}\d{7,}\b/g, ' ')
        // 帳號尾碼：「末五碼XXXXX」「後五碼XXXXX」
        .replace(/(?:末|後|尾|最後).{0,5}碼[\s]*\d{3,}/gi, ' ')
        // 帳號：「帳號XXXXX」「帳號尾數XXXXX」
        .replace(/帳號(?:尾數|後[\s]*\d+[\s]*碼)?[\s]*\d{3,}/gi, ' ')
        // 電話號碼：02-12345678、0912345678、0988-123456
        .replace(/\b0\d{1,3}[-\s]?\d{5,8}\b/g, ' ')
        // 地址門牌：100號、12-1號
        .replace(/\d+(?:-\d+)?號/g, ' ')
        // 學號/編號：A123456789（字母開頭+數字）
        .replace(/[A-Za-z]\d{6,}/g, ' ')
        // 訂單編號：純數字10位以上
        .replace(/\b\d{10,}\b/g, ' ');
    
    // 策略 2：匹配獨立的數字（避免日期格式）
    // 排除 YYYY-MM-DD 或 YYYY/MM/DD 格式中的數字
    const amounts = sanitizedText.match(/(?<![\d-\/])\d{3,}(?![\d-\/])/g);
    if (amounts && amounts.length > 0) {
        // 過濾掉可能是年份的數字（2000-2099）
        const validAmounts = amounts.filter(num => {
            const n = parseInt(num);
            return !(n >= 2000 && n <= 2099);
        });
        
        if (validAmounts.length > 0) {
            // 返回第一個有效金額
            return validAmounts[0];
        }
    }
    
    // 策略 3：回退到原始匹配（但排除年份）
    const fallbackMatch = sanitizedText.match(/\d{3,}/g);
    if (fallbackMatch && fallbackMatch.length > 0) {
        // 找第一個不是年份的數字
        for (const num of fallbackMatch) {
            const n = parseInt(num);
            if (n < 2000 || n > 2099) {
                return num;
            }
        }
    }
    
    return null;
}

// 測試案例（基於真實台灣銀行轉帳格式）
const testCases = [
    // ==================== 台灣常見銀行格式 ====================
    
    // 1. 台灣銀行（TWD 前綴）
    {
        name: '台灣銀行 - TWD 格式',
        ocrText: `轉帳結果
交易成功
台幣轉帳
轉出帳號 夢世代活期儲蓄存款
.........88888 ***
轉入銀行 052 渣打銀行 8888888888
帳號
轉帳金額 TWD1,000.00
轉出帳號 TWD R
餘額
轉帳日期 即時2024/`,
        expected: '1000',
        description: '測試 TWD 前綴 + 逗號 + 小數點'
    },
    
    // 2. 富邦銀行
    {
        name: '富邦銀行 - 標準格式',
        ocrText: `交易結果轉帳成功
2025-11-22 15:54:07
1935***3957
012 台北富邦
交易時間
轉出帳號
轉入銀行
轉入帳號
轉帳金額
2,250
8211***0220178`,
        expected: '2250',
        description: '測試純數字 + 逗號格式'
    },
    
    // 3. 中國信託
    {
        name: '中國信託 - NT$ 格式',
        ocrText: `轉帳成功
轉帳金額：NT$ 5,000
轉入帳號：822-123456789
手續費：0元
交易時間：2024/11/22 14:30`,
        expected: '5000',
        description: '測試 NT$ 前綴'
    },
    
    // 4. 國泰世華
    {
        name: '國泰世華 - 元字後綴',
        ocrText: `轉帳結果
狀態：成功
金額：3500元
受款人：張三
帳號：013-1234567890
時間：2024-11-22`,
        expected: '3500',
        description: '測試「元」字後綴'
    },
    
    // 5. 玉山銀行
    {
        name: '玉山銀行 - NTD 格式',
        ocrText: `交易明細
交易成功
轉帳金額 NTD2,800.00
轉入銀行 808 玉山銀行
轉入帳號 0123456789012
交易序號 20241122001`,
        expected: '2800',
        description: '測試 NTD 前綴'
    },
    
    // 6. 台新銀行
    {
        name: '台新銀行 - 台幣格式',
        ocrText: `轉帳交易
交易狀態：完成
台幣 1,500
收款銀行：812 台新銀行
收款帳號：9876543210
日期：2024/11/22 15:00`,
        expected: '1500',
        description: '測試「台幣」關鍵字'
    },
    
    // ==================== 邊界案例測試 ====================
    
    // 7. 大額金額
    {
        name: '大額金額測試',
        ocrText: `匯款成功
金額：NT$ 123,456
受款人：公司名稱
時間：2024-11-22`,
        expected: '123456',
        description: '測試六位數大額'
    },
    
    // 8. 小額金額（低於1000）
    {
        name: '小額金額測試',
        ocrText: `轉帳完成
轉帳金額：500元
手續費：0元`,
        expected: '500',
        description: '測試三位數小額'
    },
    
    // 9. 有年份干擾
    {
        name: '年份干擾測試',
        ocrText: `交易結果
交易成功
2025-11-22 15:54:07
轉帳金額 3,300
帳號 1234567890`,
        expected: '3300',
        description: '測試排除年份 2025'
    },
    
    // 10. 多個數字干擾
    {
        name: '多數字干擾測試',
        ocrText: `轉帳結果
帳號：1234567890
轉帳金額：NT$ 4,200
手續費：15元
序號：20241122001`,
        expected: '4200',
        description: '測試在多個數字中提取正確金額'
    },
    
    // 11. 無空格緊貼格式
    {
        name: '緊貼格式測試',
        ocrText: `轉帳成功
金額:TWD6,800.00
帳號:1234567890`,
        expected: '6800',
        description: '測試冒號後無空格'
    },
    
    // 12. 全形符號
    {
        name: '全形符號測試',
        ocrText: `轉帳結果
金額：７，２００元
狀態：成功`,
        expected: null, // 全形數字無法匹配，預期為 null
        description: '測試全形數字（應無法匹配）'
    },
    
    // 13. USD 外幣格式
    {
        name: 'USD 外幣測試',
        ocrText: `International Transfer
Amount: USD 1,500.00
Status: Completed`,
        expected: '1500',
        description: '測試 USD 外幣格式'
    },
    
    // 14. 混合格式
    {
        name: '混合格式測試',
        ocrText: `轉帳明細
2024/11/22 16:30
帳號 987654321
匯款金額 NT$9,999
手續費 30元`,
        expected: '9999',
        description: '測試混合多種格式'
    },
    
    // ==================== 錯誤案例（應該無法提取） ====================
    
    // 15. 只有日期無金額
    {
        name: '無金額測試',
        ocrText: `轉帳記錄
日期：2024/11/22
帳號：1234567890
狀態：處理中`,
        expected: null,
        description: '無明確金額關鍵字時應回傳 null（不再拿帳號當金額）'
    },
    
    // 16. 金額少於3位數
    {
        name: '兩位數金額',
        ocrText: `手續費
金額：50元`,
        expected: '50', // 「元」後綴可以匹配任意位數
        description: '測試兩位數（有「元」後綴可匹配）'
    },
    {
        name: '銀行代碼 812 + 轉出金額 $300',
        ocrText: `轉帳
交易成功
轉出帳號 (812)0028881014624669
轉入帳號 (012)0082110000220178
交易日期 2025/11/23 16:34:42
轉出金額 $300`,
        expected: '300',
        description: '應忽略 812 銀行代碼與長帳號，抓到轉出金額 $300'
    },
    
    // 🆕 17. 末五碼測試（真實案例）
    {
        name: '末五碼 11204 應被排除',
        ocrText: `訂金已匯，末五碼11204，戶名私立卓盟文理補習班，然後再跟你確認一下課程與時間，1/26-30minecraft創意程式，2/2-6雷射切割創作，每天上課時間為下午2：15-3：45`,
        expected: null,
        description: '應排除「末五碼11204」，不應誤判為金額 11,204'
    },
    {
        name: '後五碼測試',
        ocrText: `已轉帳，後五碼 99888`,
        expected: null,
        description: '應排除「後五碼99888」'
    },
    {
        name: '帳號尾數測試',
        ocrText: `匯款完成，帳號尾數12345`,
        expected: null,
        description: '應排除「帳號尾數12345」'
    },
    
    // ==================== 2025-12-11 新增：千分位逗號修復測試 ====================
    
    // 18. 原始問題案例：新臺幣 2,090 元
    {
        name: '🔴 原始問題：新臺幣 2,090 元',
        ocrText: `我已經轉帳新臺幣 2,090 元給您，（華南銀行 008，帳號末五碼 38451），請您確認，謝謝！`,
        expected: '2090',
        description: '修復：新臺幣 + 千分位逗號格式'
    },
    
    // 19. 新台幣變體
    {
        name: '新台幣 1,500 元',
        ocrText: `已匯款新台幣 1,500 元`,
        expected: '1500',
        description: '測試「新台幣」（簡體台）'
    },
    
    // 20. 含銀行代碼的千分位格式
    {
        name: '華南銀行 + 2,090 元',
        ocrText: `華南銀行(008) 轉帳 2,090 元`,
        expected: '2090',
        description: '測試銀行代碼不干擾千分位金額'
    },
    
    // 21. 大金額千分位
    {
        name: '10,000 元',
        ocrText: `匯款 10,000 元整`,
        expected: '10000',
        description: '測試萬元級千分位'
    },
    
    // 22. 超大金額
    {
        name: '1,234,567 元',
        ocrText: `轉帳 NT$ 1,234,567`,
        expected: '1234567',
        description: '測試百萬級多逗號'
    },
    
    // 23. 2,000-2,099 範圍（之前會被誤判為年份）
    {
        name: '2,050 元（年份範圍）',
        ocrText: `繳費金額 2,050 元`,
        expected: '2050',
        description: '修復：2050 不應被誤判為年份'
    },
    
    // 24. 無空格緊貼千分位
    {
        name: '3,600元（無空格）',
        ocrText: `已付款3,600元`,
        expected: '3600',
        description: '測試千分位緊貼「元」'
    }
];

// 執行測試
console.log('🧪 開始執行 OCR 金額提取測試\n');
console.log('=' .repeat(80));

let passedCount = 0;
let failedCount = 0;
const failures = [];

testCases.forEach((testCase, index) => {
    const result = parseAmountFromText(testCase.ocrText);
    const passed = result === testCase.expected;
    
    if (passed) {
        console.log(`\n✅ 測試 ${index + 1}/${testCases.length}: ${testCase.name}`);
        console.log(`   描述：${testCase.description}`);
        console.log(`   預期：${testCase.expected} | 實際：${result}`);
        passedCount++;
    } else {
        console.log(`\n❌ 測試 ${index + 1}/${testCases.length}: ${testCase.name}`);
        console.log(`   描述：${testCase.description}`);
        console.log(`   預期：${testCase.expected} | 實際：${result}`);
        console.log(`   OCR 文字預覽：${testCase.ocrText.slice(0, 100)}...`);
        failedCount++;
        failures.push({
            name: testCase.name,
            expected: testCase.expected,
            actual: result,
            description: testCase.description
        });
    }
});

console.log('\n' + '='.repeat(80));
console.log('\n📊 測試結果統計');
console.log(`   總測試數：${testCases.length}`);
console.log(`   ✅ 通過：${passedCount} (${(passedCount / testCases.length * 100).toFixed(1)}%)`);
console.log(`   ❌ 失敗：${failedCount} (${(failedCount / testCases.length * 100).toFixed(1)}%)`);

if (failures.length > 0) {
    console.log('\n❌ 失敗案例詳情：');
    failures.forEach((failure, idx) => {
        console.log(`\n${idx + 1}. ${failure.name}`);
        console.log(`   ${failure.description}`);
        console.log(`   預期：${failure.expected}`);
        console.log(`   實際：${failure.actual}`);
    });
}

console.log('\n' + '='.repeat(80));

// 返回退出碼
process.exit(failedCount > 0 ? 1 : 0);
