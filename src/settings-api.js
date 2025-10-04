/**
 * FLB 簽到系統 - 設定 API 路由
 */

const ConfigManager = require('./config-manager');
const configManager = new ConfigManager();

/**
 * 設定 API 路由
 */
function setupSettingsRoutes(app) {
    
    /**
     * GET /api/settings
     * 獲取當前配置（優先從環境變數讀取，其次從 .env，最後使用預設值）
     */
    app.get('/api/settings', (req, res) => {
        try {
            console.log('📖 讀取系統配置...');
            
            // 從 .env 文件讀取（如果存在）
            const envConfig = configManager.readConfig();
            
            // 合併環境變數和預設值
            const config = {
                // LINE Bot 配置
                LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || envConfig.LINE_CHANNEL_ACCESS_TOKEN || '',
                LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || envConfig.LINE_CHANNEL_SECRET || '',
                LINE_BOT_2_ENABLED: process.env.LINE_BOT_2_ENABLED || envConfig.LINE_BOT_2_ENABLED || 'false',
                LINE_CHANNEL_ACCESS_TOKEN_2: process.env.LINE_CHANNEL_ACCESS_TOKEN_2 || envConfig.LINE_CHANNEL_ACCESS_TOKEN_2 || '',
                LINE_CHANNEL_SECRET_2: process.env.LINE_CHANNEL_SECRET_2 || envConfig.LINE_CHANNEL_SECRET_2 || '',
                LINE_USER_ID: process.env.LINE_USER_ID || envConfig.LINE_USER_ID || '',
                RICH_MENU_ID: process.env.RICH_MENU_ID || envConfig.RICH_MENU_ID || '6636245039f343a37a8b7edc830c8cfa',
                INTERNAL_RICH_MENU_ID: process.env.INTERNAL_RICH_MENU_ID || envConfig.INTERNAL_RICH_MENU_ID || 'richmenu-11b4aaf42c0d33cd827ad5dbfc4dec77',
                
                // 訊息發送策略
                LINE_LOAD_BALANCING: process.env.LINE_LOAD_BALANCING || envConfig.LINE_LOAD_BALANCING || 'false',
                LINE_LOAD_BALANCING_STRATEGY: process.env.LINE_LOAD_BALANCING_STRATEGY || envConfig.LINE_LOAD_BALANCING_STRATEGY || 'round_robin',
                LINE_FALLBACK_TO_PRIMARY: process.env.LINE_FALLBACK_TO_PRIMARY || envConfig.LINE_FALLBACK_TO_PRIMARY || 'true',
                LINE_BATCH_DELAY: process.env.LINE_BATCH_DELAY || envConfig.LINE_BATCH_DELAY || '100',
                LINE_MAX_RETRIES: process.env.LINE_MAX_RETRIES || envConfig.LINE_MAX_RETRIES || '3',
                
                // Google Sheets API
                GOOGLE_SHEETS_API: process.env.GOOGLE_SHEETS_API || envConfig.GOOGLE_SHEETS_API || 'https://script.google.com/macros/s/AKfycbycZtdm2SGy07Sy06i2wM8oGNnERvEyyShUdTmHowlUmQz2kjS3I5VWdI1TszT1s2DCQA/exec',
                GOOGLE_SHEETS_SYNC: process.env.GOOGLE_SHEETS_SYNC || envConfig.GOOGLE_SHEETS_SYNC || 'true',
                GOOGLE_SHEETS_SYNC_INTERVAL: process.env.GOOGLE_SHEETS_SYNC_INTERVAL || envConfig.GOOGLE_SHEETS_SYNC_INTERVAL || '3600000',
                
                // FLB API 端點
                FLB_API_URL: process.env.FLB_API_URL || envConfig.FLB_API_URL || 'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec',
                LINK_CALENDAR_API_URL: process.env.LINK_CALENDAR_API_URL || envConfig.LINK_CALENDAR_API_URL || 'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec',
                REPORT_API_URL: process.env.REPORT_API_URL || envConfig.REPORT_API_URL || 'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec',
                STUDENT_ATTENDANCE_API_URL: process.env.STUDENT_ATTENDANCE_API_URL || envConfig.STUDENT_ATTENDANCE_API_URL || 'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec',
                
                // 功能開關
                FEATURE_ATTENDANCE_QUERY: process.env.FEATURE_ATTENDANCE_QUERY || envConfig.FEATURE_ATTENDANCE_QUERY || 'true',
                FEATURE_INTERNAL_MODE: process.env.FEATURE_INTERNAL_MODE || envConfig.FEATURE_INTERNAL_MODE || 'true',
                FEATURE_TEST_MODE: process.env.FEATURE_TEST_MODE || envConfig.FEATURE_TEST_MODE || 'true',
                FEATURE_TEACHER_CHECKIN: process.env.FEATURE_TEACHER_CHECKIN || envConfig.FEATURE_TEACHER_CHECKIN || 'true',
                FEATURE_STUDENT_CHECKIN: process.env.FEATURE_STUDENT_CHECKIN || envConfig.FEATURE_STUDENT_CHECKIN || 'true',
                FEATURE_REPORTS: process.env.FEATURE_REPORTS || envConfig.FEATURE_REPORTS || 'true',
                
                // 關鍵字設定
                KEYWORD_INTERNAL: process.env.KEYWORD_INTERNAL || envConfig.KEYWORD_INTERNAL || '#內部人員',
                KEYWORD_UNBIND: process.env.KEYWORD_UNBIND || envConfig.KEYWORD_UNBIND || '#解綁',
                KEYWORD_TEST: process.env.KEYWORD_TEST || envConfig.KEYWORD_TEST || '#測試',
                KEYWORD_ATTENDANCE_QUERY: process.env.KEYWORD_ATTENDANCE_QUERY || envConfig.KEYWORD_ATTENDANCE_QUERY || '#查詢出缺勤',
                
                // UI 配置
                UI_PRIMARY_COLOR: process.env.UI_PRIMARY_COLOR || envConfig.UI_PRIMARY_COLOR || '#667EEA',
                UI_SUCCESS_COLOR: process.env.UI_SUCCESS_COLOR || envConfig.UI_SUCCESS_COLOR || '#06C755',
                UI_WARNING_COLOR: process.env.UI_WARNING_COLOR || envConfig.UI_WARNING_COLOR || '#FFB400',
                UI_DANGER_COLOR: process.env.UI_DANGER_COLOR || envConfig.UI_DANGER_COLOR || '#FF334B',
                
                // 安全配置
                SECURITY_VERIFY_SIGNATURE: process.env.SECURITY_VERIFY_SIGNATURE || envConfig.SECURITY_VERIFY_SIGNATURE || 'true',
                SECURITY_RATE_LIMIT: process.env.SECURITY_RATE_LIMIT || envConfig.SECURITY_RATE_LIMIT || 'true',
                SECURITY_RATE_LIMIT_MAX: process.env.SECURITY_RATE_LIMIT_MAX || envConfig.SECURITY_RATE_LIMIT_MAX || '100',
                
                // 日誌配置
                LOG_LEVEL: process.env.LOG_LEVEL || envConfig.LOG_LEVEL || 'info',
                LOG_VERBOSE: process.env.LOG_VERBOSE || envConfig.LOG_VERBOSE || 'false'
            };
            
            console.log('✅ 配置讀取成功');
            
            res.json(config);
        } catch (error) {
            console.error('❌ 讀取配置失敗:', error);
            res.status(500).json({ 
                error: '讀取配置失敗',
                message: error.message 
            });
        }
    });

    /**
     * POST /api/settings
     * 更新配置
     */
    app.post('/api/settings', async (req, res) => {
        try {
            console.log('💾 儲存系統配置...');
            
            const newConfig = req.body;
            
            // 驗證必要欄位
            if (!newConfig.LINE_CHANNEL_ACCESS_TOKEN) {
                return res.status(400).json({
                    error: 'LINE_CHANNEL_ACCESS_TOKEN 是必填欄位'
                });
            }
            
            // 檢測運行環境
            const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
            
            if (isRailway) {
                // Railway 環境：更新 process.env（臨時生效，直到重啟）
                console.log('🚂 偵測到 Railway 環境，更新環境變數（臨時）...');
                
                Object.keys(newConfig).forEach(key => {
                    if (newConfig[key]) {
                        process.env[key] = newConfig[key];
                    }
                });
                
                console.log('✅ 配置已更新到當前實例');
                
                res.json({
                    success: true,
                    message: '配置已更新（當前實例臨時生效）',
                    environment: 'Railway',
                    note: '⚠️ 重要：配置只在當前實例生效。要永久保存，請前往 Railway Settings → Variables 手動設定環境變數。',
                    railwayUrl: 'https://railway.com/project/03d500c8-66cc-48a6-9e07-b5eb29b61913/service/83e4c777-b44c-40d3-bbb1-7d2fdb114124?environmentId=e9a493c1-d31e-442c-83d8-d4c49cf46a7a'
                });
                
            } else {
                // 本地/NAS 環境：寫入 .env 文件
                console.log('🏠 偵測到本地/NAS 環境，寫入 .env 文件...');
                
                // 備份現有配置
                const backupPath = configManager.backupConfig();
                if (backupPath) {
                    console.log(`📦 配置已備份至: ${backupPath}`);
                }
                
                // 寫入新配置到 .env
                configManager.writeConfig(newConfig);
                
                // 同時更新 process.env
                Object.keys(newConfig).forEach(key => {
                    if (newConfig[key]) {
                        process.env[key] = newConfig[key];
                    }
                });
                
                console.log('✅ 配置已儲存到 .env 文件並更新到當前實例');
                
                res.json({
                    success: true,
                    message: '配置已成功儲存',
                    environment: 'Local/NAS',
                    backupPath: backupPath,
                    note: '配置已儲存，部分設定需要重新啟動才能完全生效'
                });
            }
            
        } catch (error) {
            console.error('❌ 儲存配置失敗:', error);
            res.status(500).json({ 
                error: '儲存配置失敗',
                message: error.message 
            });
        }
    });

    /**
     * GET /api/settings/test
     * 測試連線
     */
    app.get('/api/settings/test', async (req, res) => {
        try {
            console.log('🔌 測試系統連線...');
            
            const config = configManager.readConfig();
            const results = await configManager.testConnection(config);
            
            console.log('測試結果:', results);
            
            res.json(results);
        } catch (error) {
            console.error('❌ 連線測試失敗:', error);
            res.status(500).json({ 
                error: '連線測試失敗',
                message: error.message 
            });
        }
    });

    /**
     * GET /api/settings/backup
     * 備份配置
     */
    app.get('/api/settings/backup', (req, res) => {
        try {
            console.log('📦 備份系統配置...');
            
            const backupPath = configManager.backupConfig();
            
            if (!backupPath) {
                return res.status(404).json({
                    error: '沒有配置文件可以備份'
                });
            }
            
            console.log(`✅ 配置已備份至: ${backupPath}`);
            
            res.json({
                success: true,
                message: '配置備份成功',
                backupPath: backupPath
            });
        } catch (error) {
            console.error('❌ 備份配置失敗:', error);
            res.status(500).json({ 
                error: '備份配置失敗',
                message: error.message 
            });
        }
    });

    /**
     * GET /api/settings/export
     * 匯出配置（下載）
     */
    app.get('/api/settings/export', (req, res) => {
        try {
            console.log('📥 匯出系統配置...');
            
            const config = configManager.readConfig();
            
            // 設定下載標頭
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="config-${timestamp}.json"`);
            
            res.json(config);
        } catch (error) {
            console.error('❌ 匯出配置失敗:', error);
            res.status(500).json({ 
                error: '匯出配置失敗',
                message: error.message 
            });
        }
    });

    console.log('✅ 設定 API 路由已註冊');
}

module.exports = setupSettingsRoutes;

