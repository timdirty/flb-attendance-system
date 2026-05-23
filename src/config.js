/**
 * FLB 簽到系統 - 配置文件
 * 
 * 此文件集中管理所有系統配置參數
 * 可通過環境變數覆蓋預設值
 */

require('dotenv').config();

const config = {
    // ==================== 伺服器配置 ====================
    server: {
        // 伺服器端口
        port: process.env.PORT || 3000,
        
        // 系統 URL（用於生成連結）
        systemUrl: process.env.RAILWAY_PUBLIC_DOMAIN 
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
            : process.env.SYSTEM_URL || 'http://localhost:3000',
        
        // CORS 配置
        cors: {
            enabled: true,
            origin: '*'
        },
        
        // 請求超時設定（毫秒）
        timeout: {
            api: parseInt(process.env.API_TIMEOUT) || 30000,
            line: parseInt(process.env.LINE_TIMEOUT) || 10000,
            webhook: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000
        }
    },

    // ==================== LINE Bot 配置 ====================
    line: {
        // 多個 LINE Bot 支援
        bots: {
            // 主要 Bot（用於接收 webhook）
            primary: {
                channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
                channelSecret: process.env.LINE_CHANNEL_SECRET || '',
                name: 'Primary Bot',
                enabled: true
            },
            // 備用 Bot（用於發送訊息，避免 API 限制）
            secondary: {
                channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN_2 || '',
                channelSecret: process.env.LINE_CHANNEL_SECRET_2 || '',
                name: 'Secondary Bot',
                enabled: process.env.LINE_BOT_2_ENABLED === 'false'
            }
        },
        
        // 預設使用的 Bot（用於向後相容）
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
        channelSecret: process.env.LINE_CHANNEL_SECRET || '',
        
        // 管理員 User ID（單一管理員，向後相容）
        adminUserId: process.env.LINE_USER_ID || '',
        
        // 多管理員支援
        admins: {
            // 從環境變數讀取（逗號分隔）
            userIds: process.env.ADMIN_USER_IDS 
                ? process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()).filter(Boolean)
                : [],
            
            // 管理員設定檔案路徑
            configFile: process.env.ADMIN_CONFIG_FILE || 
                require('path').join(__dirname, 'data', 'admin-users.json'),
            
            // 是否啟用多管理員模式
            enabled: process.env.ENABLE_MULTI_ADMINS !== 'false'
        },
        
        // LINE API 端點
        messagingApi: 'https://api.line.me/v2/bot/message/push',
        richMenuApi: 'https://api.line.me/v2/bot/user/{userId}/richmenu',
        profileApi: 'https://api.line.me/v2/bot/profile',
        
        // Rich Menu ID
        richMenu: {
            default: process.env.RICH_MENU_ID || '6636245039f343a37a8b7edc830c8cfa',
            internal: process.env.INTERNAL_RICH_MENU_ID || 'richmenu-11b4aaf42c0d33cd827ad5dbfc4dec77'
        },

        // 官方帳號（LINE Official Account）資訊
        officialAccount: {
            bizId: process.env.LINE_OFFICIAL_BIZ_ID || '',
            chatBaseUrl: process.env.LINE_OFFICIAL_CHAT_BASE || '',
            botUserId: process.env.LINE_OFFICIAL_BOT_USER_ID || '',
            managerId: process.env.LINE_OFFICIAL_MANAGER_ID || ''
        },
        
        // 測試模式設定
        testMode: {
            // 測試模式持續時間（毫秒）
            duration: parseInt(process.env.TEST_MODE_DURATION) || 300000, // 5分鐘
            
            // 是否在測試模式結束後自動重新綁定
            autoRebind: process.env.TEST_MODE_AUTO_REBIND !== 'false'
        },
        
        // 訊息發送設定
        messaging: {
            // 批次發送延遲（毫秒）
            batchDelay: parseInt(process.env.LINE_BATCH_DELAY) || 100,
            
            // 最大重試次數
            maxRetries: parseInt(process.env.LINE_MAX_RETRIES) || 3,
            
            // 多 Bot 輪詢設定
            loadBalancing: {
                enabled: process.env.LINE_LOAD_BALANCING === 'true',
                strategy: process.env.LINE_LOAD_BALANCING_STRATEGY || 'round_robin', // 'round_robin' | 'random' | 'primary_first'
                fallbackToPrimary: process.env.LINE_FALLBACK_TO_PRIMARY !== 'false'
            }
        }
    },

    // ==================== Google Sheets API 配置 ====================
    googleSheets: {
        // 主要 API
        mainApi: process.env.GOOGLE_SHEETS_API || 
            'https://script.google.com/macros/s/AKfycbycZtdm2SGy07Sy06i2wM8oGNnERvEyyShUdTmHowlUmQz2kjS3I5VWdI1TszT1s2DCQA/exec',
        
        // Cookie（如需要）
        cookie: process.env.GOOGLE_SHEETS_COOKIE || 
            'NID=525=IPIqwCVm1Z3C00Y2MFXoevvCftm-rj9UdMlgYFhlRAHY0MKSCbEO7I8EBlGrz-nwjYxoXSFUrDHBqGrYNUotcoSE3v2npcVn-j3QZsc6SAKkZcMLR6y1MkF5dZlXnbBIqWgw9cJLT3SvAvmpXUZa6RADuBXFDZpvSM85zYAoym0yXcBn3C4ayGgOookqVJaH',
        
        // 同步設定
        sync: {
            // 是否啟用自動同步
            enabled: process.env.GOOGLE_SHEETS_SYNC !== 'false',
            
            // 同步間隔（毫秒）
            interval: parseInt(process.env.GOOGLE_SHEETS_SYNC_INTERVAL) || 3600000 // 1小時
        }
    },

    // ==================== FLB API 端點 ====================
    api: {
        // 主要 FLB API（處理講師、課程和學生資料）
        flb: process.env.FLB_API_URL || 
            'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec',
        
        // Link Calendar API（處理課程日曆相關資料）
        linkCalendar: process.env.LINK_CALENDAR_API_URL || 
            'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec',
        
        // 報表查詢 API
        report: process.env.REPORT_API_URL || 
            'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec',
        
        // 學生資料 API
        studentData: process.env.STUDENT_DATA_API_URL || 
            'https://calendar.funlearnbar.synology.me/api/student-data',
        
        // 學生簽到狀態 API
        studentAttendance: process.env.STUDENT_ATTENDANCE_API_URL || 
            'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec'
    },

    // ==================== 資料庫配置 ====================
    database: {
        // 資料庫類型
        type: process.env.DB_TYPE || 'google-sheets',
        
        // 本地資料存儲路徑
        dataPath: process.env.DATA_PATH || './data',
        
        // 資料檔案
        files: {
            users: process.env.USERS_FILE || 'users.json',
            bindings: process.env.BINDINGS_FILE || 'bindings.json',
            syncFlag: process.env.SYNC_FLAG_FILE || 'sync_flag.json'
        },
        
        // 快取設定
        cache: {
            enabled: process.env.DB_CACHE_ENABLED !== 'false',
            ttl: parseInt(process.env.DB_CACHE_TTL) || 300000 // 5分鐘
        }
    },

    // ==================== 功能開關 ====================
    features: {
        // 是否啟用出缺勤查詢功能
        attendanceQuery: process.env.FEATURE_ATTENDANCE_QUERY !== 'false',
        
        // 是否啟用內部人員模式
        internalMode: process.env.FEATURE_INTERNAL_MODE !== 'false',
        
        // 是否啟用測試模式
        testMode: process.env.FEATURE_TEST_MODE !== 'false',
        
        // 是否啟用講師簽到功能
        teacherCheckin: process.env.FEATURE_TEACHER_CHECKIN !== 'false',
        
        // 是否啟用學生簽到功能
        studentCheckin: process.env.FEATURE_STUDENT_CHECKIN !== 'false',
        
        // 是否啟用報表功能
        reports: process.env.FEATURE_REPORTS !== 'false',
        
        // 是否啟用 Webhook 自動註冊
        autoRegister: process.env.FEATURE_AUTO_REGISTER !== 'false'
    },

    // ==================== 關鍵字設定 ====================
    keywords: {
        // 內部人員綁定
        internal: process.env.KEYWORD_INTERNAL || '#內部人員',
        
        // 解除綁定
        unbind: process.env.KEYWORD_UNBIND || '#解綁',
        
        // 測試模式
        test: process.env.KEYWORD_TEST || '#測試',
        
        // 查詢出缺勤
        attendanceQuery: process.env.KEYWORD_ATTENDANCE_QUERY || '#查詢出缺勤',
        
        // 查詢報表
        reportQuery: process.env.KEYWORD_REPORT_QUERY || '#查詢報表'
    },

    // ==================== 家長入口 ====================
    parentPortal: {
        // 統一引導家長到家長入口 LIFF
        liffUrl: process.env.PARENT_PORTAL_LIFF_URL || 'https://liff.line.me/1657746214-Vbr2GNK7'
    },

    // ==================== UI 配置 ====================
    ui: {
        // Flex Message 主題色彩
        colors: {
            primary: process.env.UI_PRIMARY_COLOR || '#667EEA',
            success: process.env.UI_SUCCESS_COLOR || '#06C755',
            warning: process.env.UI_WARNING_COLOR || '#FFB400',
            danger: process.env.UI_DANGER_COLOR || '#FF334B',
            text: process.env.UI_TEXT_COLOR || '#111111',
            textSecondary: process.env.UI_TEXT_SECONDARY_COLOR || '#8C8C8C',
            background: process.env.UI_BACKGROUND_COLOR || '#F7F7F7'
        },
        
        // 出席記錄顯示數量
        attendanceRecordLimit: parseInt(process.env.UI_ATTENDANCE_LIMIT) || 10,
        
        // 剩餘堂數警示閾值
        remainingThreshold: {
            warning: parseInt(process.env.UI_REMAINING_WARNING) || 5,
            danger: parseInt(process.env.UI_REMAINING_DANGER) || 0
        }
    },

    // ==================== 匯款通知配置 ====================
    remittance: {
        // 要推送匯款提醒的內部群組 ID（正職群組）
        alertGroupId: process.env.REMITTANCE_GROUP_ID || '',

        // 按鈕資料標識（如需與其他 postback 區分可調整）
        confirmAction: process.env.REMITTANCE_CONFIRM_ACTION || 'remittance_confirm',

        // 🔍 匯款關鍵字檢測策略（兩階段）
        // 1. 基礎關鍵字：匯款相關動作詞
        keywords: (process.env.REMITTANCE_KEYWORDS || '匯款,轉帳,ATM轉帳,銀行轉帳').split(',').map(k => k.trim()).filter(Boolean),
        
        // 2. 完成詞：表示動作已完成的詞彙
        completionWords: (process.env.REMITTANCE_COMPLETION_WORDS || '已,完成,好了,成功,剛剛,剛才,剛,已經,轉好,匯好').split(',').map(k => k.trim()).filter(Boolean),
        
        // 3. 明確完成短語：直接表示完成匯款的片語（優先級最高）
        explicitPhrases: (process.env.REMITTANCE_EXPLICIT_PHRASES || '已匯款,已轉帳,轉帳完成,匯款完成,已轉,已匯,轉好了,匯好了,已付款,付款完成').split(',').map(k => k.trim()).filter(Boolean),

        // Flex 主題色（接近 LINE Pay 風格的綠色）
        themeColor: process.env.REMITTANCE_THEME_COLOR || '#00C300',

        // 語意過濾設定
        intentFilters: {
            postponeKeywords: (process.env.REMITTANCE_POSTPONE_KEYWORDS || '明天,明日,明後天,稍後,稍晚,晚點,之後,過兩天,等一下,等候,等等,準備,先不,稍等,等我匯,待會,等下').split(',').map(k => k.trim()).filter(Boolean),
            negativeKeywords: (process.env.REMITTANCE_NEGATIVE_KEYWORDS || '還沒,尚未,未匯,未轉,不會匯,暫不匯,暫不轉,不用匯,不用轉,取消匯款,沒匯,沒轉').split(',').map(k => k.trim()).filter(Boolean),
            inquiryKeywords: (process.env.REMITTANCE_INQUIRY_KEYWORDS || '請問,如何匯,怎麼匯,匯款方式,匯款資訊,匯款帳號,想詢問,可以匯嗎,怎樣付款,如何付款,匯到哪,匯去哪,要匯到,怎麼付,想問').split(',').map(k => k.trim()).filter(Boolean),
            instructionKeywords: (process.env.REMITTANCE_INSTRUCTION_KEYWORDS || '繳費方式,繳費資訊,繳費說明,付款方式,付款資訊,匯款說明,匯款繳費,繳款方式,繳費提醒,匯款提醒').split(',').map(k => k.trim()).filter(Boolean),
            questionIndicators: (process.env.REMITTANCE_QUESTION_INDICATORS || '?,？,嗎,嘛,呢').split(',').map(k => k.trim()).filter(Boolean),
            announcementKeywords: (process.env.REMITTANCE_ANNOUNCEMENT_KEYWORDS || '@All,@all,各位,薪資,薪水,發薪,入帳,會匯款,將匯款,會轉帳,將轉帳,通知,公告,提醒各位').split(',').map(k => k.trim()).filter(Boolean),
            deferReplyMessage: process.env.REMITTANCE_DEFER_REPLY || '👀 已收到您的訊息，完成匯款後請再通知，我們會立即協助 🙏'
        }
    },

    // ==================== AI 摘要設定 ====================
    ai: {
        provider: process.env.AI_PROVIDER || 'none',
        gemini: {
            apiKey: process.env.GEMINI_API_KEY || '',
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        }
    },

    // ==================== OCR 配置 ====================
    ocr: {
        provider: process.env.OCR_PROVIDER || 'none',
        googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || process.env.GCLOUD_VISION_API_KEY || '',
        googleVisionEndpoint: process.env.GOOGLE_VISION_ENDPOINT || 'https://vision.googleapis.com/v1/images:annotate',
        enabled: (() => {
            const provider = process.env.OCR_PROVIDER || 'none';
            if (provider === 'google_vision') {
                return Boolean(process.env.GOOGLE_VISION_API_KEY || process.env.GCLOUD_VISION_API_KEY);
            }
            return false;
        })()
    },

    // ==================== 日誌配置 ====================
    logging: {
        // 日誌級別: 'debug' | 'info' | 'warn' | 'error'
        level: process.env.LOG_LEVEL || 'info',
        
        // 是否啟用詳細日誌
        verbose: process.env.LOG_VERBOSE === 'true',
        
        // 是否記錄 API 請求
        logApiRequests: process.env.LOG_API_REQUESTS !== 'false',
        
        // 是否記錄 Webhook 事件
        logWebhookEvents: process.env.LOG_WEBHOOK_EVENTS !== 'false'
    },

    // ==================== 安全配置 ====================
    security: {
        // 是否驗證 LINE Webhook 簽名
        verifySignature: process.env.SECURITY_VERIFY_SIGNATURE !== 'false',
        
        // 允許的來源 IP（留空表示允許所有）
        allowedIPs: process.env.SECURITY_ALLOWED_IPS 
            ? process.env.SECURITY_ALLOWED_IPS.split(',').map(ip => ip.trim())
            : [],
        
        // API Rate Limiting
        rateLimit: {
            enabled: process.env.SECURITY_RATE_LIMIT !== 'false',
            windowMs: parseInt(process.env.SECURITY_RATE_LIMIT_WINDOW) || 60000, // 1分鐘
            max: parseInt(process.env.SECURITY_RATE_LIMIT_MAX) || 100 // 最多100個請求
        }
    },

    // ==================== 開發模式 ====================
    development: {
        // 是否為開發模式
        enabled: process.env.NODE_ENV === 'development',
        
        // 是否啟用模擬模式（不實際發送 LINE 訊息）
        mockMode: process.env.DEV_MOCK_MODE === 'true',
        
        // 是否啟用詳細錯誤訊息
        verboseErrors: process.env.DEV_VERBOSE_ERRORS !== 'false'
    }
};

// ==================== 配置驗證 ====================
function validateConfig() {
    const errors = [];

    // 驗證必要配置
    if (!config.line.channelAccessToken) {
        errors.push('LINE_CHANNEL_ACCESS_TOKEN 未設定');
    }

    if (!config.line.adminUserId && !config.development.mockMode) {
        errors.push('LINE_USER_ID 未設定（管理員 User ID）');
    }

    // 驗證數值範圍
    if (config.server.port < 1 || config.server.port > 65535) {
        errors.push(`PORT 設定錯誤: ${config.server.port}（應在 1-65535 之間）`);
    }

    if (config.server.timeout.api < 1000) {
        errors.push(`API_TIMEOUT 設定過小: ${config.server.timeout.api}（建議至少 1000ms）`);
    }

    // 顯示警告
    if (errors.length > 0) {
        console.warn('⚠️  配置驗證發現問題:');
        errors.forEach(error => console.warn(`   - ${error}`));
        
        if (!config.development.mockMode) {
            console.warn('\n💡 提示: 請檢查 .env 檔案或環境變數設定');
        }
    }

    return errors;
}

// ==================== 配置輸出函數 ====================
function printConfig() {
    console.log('\n📋 系統配置摘要:');
    console.log('='.repeat(50));
    console.log(`🌐 伺服器端口: ${config.server.port}`);
    console.log(`🔗 系統 URL: ${config.server.systemUrl}`);
    console.log(`🤖 LINE Bot: ${config.line.channelAccessToken ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`👤 管理員 ID: ${config.line.adminUserId ? '✅ 已設定' : '❌ 未設定'}`);
    console.log(`📊 資料庫類型: ${config.database.type}`);
    console.log(`🖼️ OCR: ${config.ocr.enabled ? `✅ ${config.ocr.provider}` : '❌ 未啟用'}`);
    console.log(`🔧 開發模式: ${config.development.enabled ? '✅ 啟用' : '❌ 停用'}`);
    console.log(`🧪 模擬模式: ${config.development.mockMode ? '✅ 啟用' : '❌ 停用'}`);
    console.log('='.repeat(50) + '\n');
}

// ==================== 環境檢查 ====================
function checkEnvironment() {
    const warnings = [];

    if (config.development.enabled) {
        warnings.push('⚠️  目前在開發模式下運行');
    }

    if (config.development.mockMode) {
        warnings.push('⚠️  模擬模式已啟用，不會實際發送 LINE 訊息');
    }

    if (!config.line.channelAccessToken) {
        warnings.push('⚠️  LINE Channel Access Token 未設定');
    }

    if (warnings.length > 0) {
        console.log('\n⚠️  環境檢查:');
        warnings.forEach(warning => console.log(`   ${warning}`));
        console.log('');
    }
}

// ==================== 管理員管理函數 ====================
/**
 * 獲取所有管理員 User ID
 * 優先級：設定檔案 > 環境變數（ADMIN_USER_IDS）> 單一管理員（LINE_USER_ID）
 */
function getAllAdminUserIds() {
    const fs = require('fs');
    const adminIds = new Set();
    
    // 1. 從設定檔案讀取（最高優先級）
    if (config.line.admins.enabled) {
        try {
            if (fs.existsSync(config.line.admins.configFile)) {
                const adminUsers = JSON.parse(fs.readFileSync(config.line.admins.configFile, 'utf8'));
                adminUsers
                    .filter(admin => admin.enabled !== false)
                    .forEach(admin => {
                        if (admin.userId) {
                            adminIds.add(admin.userId);
                        }
                    });
            }
        } catch (error) {
            console.error('❌ 讀取管理員設定檔案失敗:', error.message);
        }
    }
    
    // 2. 從環境變數讀取（ADMIN_USER_IDS）
    if (config.line.admins.userIds.length > 0) {
        config.line.admins.userIds.forEach(id => adminIds.add(id));
    }
    
    // 3. 向後相容：單一管理員（LINE_USER_ID）
    if (config.line.adminUserId && 
        config.line.adminUserId !== 'YOUR_USER_ID_HERE' &&
        config.line.adminUserId !== '') {
        adminIds.add(config.line.adminUserId);
    }
    
    return Array.from(adminIds);
}

/**
 * 檢查是否為管理員
 */
function isAdmin(userId) {
    const adminIds = getAllAdminUserIds();
    return adminIds.includes(userId);
}

// 將輔助函數加入 config
config.getAllAdminUserIds = getAllAdminUserIds;
config.isAdmin = isAdmin;

// 執行驗證
validateConfig();

// 在非靜默模式下輸出配置
if (process.env.SILENT !== 'true') {
    printConfig();
    checkEnvironment();
}

module.exports = config;
