/**
 * 🧾 Notion 記帳整合模組
 * 
 * 當確認收款時，自動記錄到 Notion 資料庫
 */

const axios = require('axios');

/**
 * Notion API 配置
 */
const NOTION_CONFIG = {
    apiVersion: '2022-06-28',
    baseURL: 'https://api.notion.com/v1',
    token: process.env.NOTION_API_TOKEN || '',
    incomeDatabaseId: process.env.NOTION_INCOME_DATABASE_ID || '',
    enabled: Boolean(process.env.NOTION_API_TOKEN && process.env.NOTION_INCOME_DATABASE_ID)
};

/**
 * 建立 Notion API 客戶端
 */
function createNotionClient() {
    return axios.create({
        baseURL: NOTION_CONFIG.baseURL,
        headers: {
            'Authorization': `Bearer ${NOTION_CONFIG.token}`,
            'Notion-Version': NOTION_CONFIG.apiVersion,
            'Content-Type': 'application/json'
        },
        timeout: 10000
    });
}

/**
 * 🧾 記錄收入到 Notion
 * 
 * @param {Object} remittanceRecord - 匯款記錄
 * @param {string} remittanceRecord.id - 記錄 ID
 * @param {string} remittanceRecord.userId - 用戶 ID
 * @param {string} remittanceRecord.displayName - 顯示名稱
 * @param {string} remittanceRecord.amount - 金額
 * @param {string} remittanceRecord.confirmedAt - 確認時間
 * @param {string} remittanceRecord.confirmedBy - 確認者
 * @returns {Promise<Object>} Notion 頁面回應
 */
async function recordIncomeToNotion(remittanceRecord) {
    if (!NOTION_CONFIG.enabled) {
        console.log('⚠️ Notion 整合未啟用，跳過記帳');
        return { success: false, reason: 'disabled' };
    }

    try {
        const client = createNotionClient();
        
        // 提取金額（轉換為數字）
        const amount = parseFloat(remittanceRecord.amount);
        if (isNaN(amount) || amount <= 0) {
            console.log('⚠️ 金額無效，無法記錄到 Notion:', remittanceRecord.amount);
            return { success: false, reason: 'invalid_amount' };
        }

        // 格式化日期（使用確認時間）
        const date = remittanceRecord.confirmedAt 
            ? new Date(remittanceRecord.confirmedAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        // 建立備註（包含付款人資訊）
        const memo = `來自: ${remittanceRecord.displayName || '未知用戶'}\n記錄ID: ${remittanceRecord.id}`;

        // 建立 Notion 頁面
        const payload = {
            parent: {
                database_id: NOTION_CONFIG.incomeDatabaseId
            },
            properties: {
                // 標題：收入
                "收入": {
                    title: [
                        {
                            text: {
                                content: "課程收款（FLBsys 自動記帳）"
                            }
                        }
                    ]
                },
                // 日期
                "日期": {
                    date: {
                        start: date
                    }
                },
                // 金額
                "金額": {
                    number: amount
                }
            }
        };

        // 🔧 條件式欄位（如果環境變數有設定才加入）
        
        // 類別（課程收款）
        if (process.env.NOTION_INCOME_CATEGORY_ID) {
            payload.properties["類別"] = {
                relation: [
                    { id: process.env.NOTION_INCOME_CATEGORY_ID }
                ]
            };
        }

        // 帳戶（預設帳戶）
        if (process.env.NOTION_INCOME_ACCOUNT_ID) {
            payload.properties["帳戶"] = {
                relation: [
                    { id: process.env.NOTION_INCOME_ACCOUNT_ID }
                ]
            };
        }

        // 個人/公司
        if (process.env.NOTION_INCOME_TYPE) {
            payload.properties["個人/公司"] = {
                select: {
                    name: process.env.NOTION_INCOME_TYPE
                }
            };
        }

        // 備註
        if (process.env.NOTION_INCOME_HAS_MEMO_FIELD === 'true') {
            payload.properties["備註"] = {
                rich_text: [
                    {
                        text: {
                            content: memo
                        }
                    }
                ]
            };
        }

        // 🔧 添加頁面內容（點擊 Database 記錄後顯示的詳細資訊）
        payload.children = createDetailContent(remittanceRecord);

        console.log('📝 準備記錄收入到 Notion:', {
            amount,
            date,
            displayName: remittanceRecord.displayName,
            recordId: remittanceRecord.id
        });

        // 發送到 Notion API
        const response = await client.post('/pages', payload);

        console.log('✅ 成功記錄收入到 Notion（含詳細資訊）:', {
            notionPageId: response.data.id,
            amount,
            date
        });

        return {
            success: true,
            notionPageId: response.data.id,
            notionPageUrl: response.data.url,
            amount,
            date
        };

    } catch (error) {
        console.error('❌ 記錄收入到 Notion 失敗:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        return {
            success: false,
            error: error.message,
            notionError: error.response?.data
        };
    }
}

/**
 * 📄 建立頁面詳細內容
 * 
 * @param {Object} remittanceRecord - 匯款記錄
 * @returns {Array} Notion blocks 陣列
 */
function createDetailContent(remittanceRecord) {
    const children = [
        // 標題
        {
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{ text: { content: '💰 收款詳細資訊' } }]
            }
        },
        // 分隔線
        { object: 'block', type: 'divider', divider: {} },
        // 付款人資訊
        {
            object: 'block',
            type: 'callout',
            callout: {
                icon: { emoji: '👤' },
                rich_text: [
                    { text: { content: '付款人：' }, annotations: { bold: true } },
                    { text: { content: remittanceRecord.displayName || '未知用戶' } }
                ]
            }
        },
        // 用戶 ID
        {
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [
                    { text: { content: 'User ID：' }, annotations: { code: true } },
                    { text: { content: remittanceRecord.userId || 'N/A' }, annotations: { code: true } }
                ]
            }
        },
        // 記錄 ID
        {
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [
                    { text: { content: '記錄 ID：' }, annotations: { code: true } },
                    { text: { content: remittanceRecord.id || 'N/A' }, annotations: { code: true } }
                ]
            }
        },
        // 確認時間
        {
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [
                    { text: { content: '確認時間：' } },
                    { text: { content: new Date(remittanceRecord.confirmedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) } }
                ]
            }
        },
        // 空行
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [] } },
        // OCR 識別文字標題
        {
            object: 'block',
            type: 'heading_3',
            heading_3: {
                rich_text: [{ text: { content: '📝 OCR 識別文字' } }]
            }
        }
    ];

    // 添加 OCR 文字（如果有）
    if (remittanceRecord.messageText) {
        children.push({
            object: 'block',
            type: 'quote',
            quote: {
                rich_text: [{
                    text: {
                        content: remittanceRecord.messageText.slice(0, 2000) // Notion 限制
                    }
                }]
            }
        });
    } else {
        children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [{
                    text: { content: '（無 OCR 文字）' },
                    annotations: { italic: true, color: 'gray' }
                }]
            }
        });
    }

    // 空行
    children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });

    // 原始資料
    children.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
            rich_text: [{ text: { content: '🔧 原始資料' } }]
        }
    });

    children.push({
        object: 'block',
        type: 'code',
        code: {
            language: 'json',
            rich_text: [{
                text: {
                    content: JSON.stringify({
                        userId: remittanceRecord.userId,
                        displayName: remittanceRecord.displayName,
                        amount: remittanceRecord.amount,
                        createdAt: remittanceRecord.createdAt,
                        confirmedAt: remittanceRecord.confirmedAt,
                        confirmedBy: remittanceRecord.confirmedBy,
                        messageId: remittanceRecord.messageId,
                        sourceType: remittanceRecord.sourceType
                    }, null, 2).slice(0, 2000)
                }
            }]
        }
    });

    return children.slice(0, 100); // Notion API 限制一次最多 100 個 blocks
}

/**
 * 🧪 測試 Notion 連線
 */
async function testNotionConnection() {
    if (!NOTION_CONFIG.enabled) {
        return {
            success: false,
            message: '❌ Notion 整合未啟用（缺少 NOTION_API_TOKEN 或 NOTION_INCOME_DATABASE_ID）'
        };
    }

    try {
        const client = createNotionClient();
        
        // 嘗試讀取資料庫資訊
        const response = await client.get(`/databases/${NOTION_CONFIG.incomeDatabaseId}`);

        return {
            success: true,
            message: '✅ Notion 連線成功',
            databaseTitle: response.data.title?.[0]?.plain_text || '未命名資料庫',
            databaseId: response.data.id
        };

    } catch (error) {
        return {
            success: false,
            message: '❌ Notion 連線失敗',
            error: error.message,
            notionError: error.response?.data
        };
    }
}

/**
 * 🔍 檢查 Notion 配置狀態
 */
function getNotionConfigStatus() {
    return {
        enabled: NOTION_CONFIG.enabled,
        hasToken: Boolean(NOTION_CONFIG.token),
        hasDatabaseId: Boolean(NOTION_CONFIG.incomeDatabaseId),
        optionalFields: {
            categoryId: Boolean(process.env.NOTION_INCOME_CATEGORY_ID),
            accountId: Boolean(process.env.NOTION_INCOME_ACCOUNT_ID),
            incomeType: Boolean(process.env.NOTION_INCOME_TYPE),
            hasMemoField: process.env.NOTION_INCOME_HAS_MEMO_FIELD === 'true'
        }
    };
}

module.exports = {
    recordIncomeToNotion,
    testNotionConnection,
    getNotionConfigStatus,
    NOTION_CONFIG
};
