/**
 * FLB 簽到系統 - 配置管理器
 * 
 * 負責讀取和寫入 .env 文件
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.envPath = path.join(__dirname, '.env');
    }

    /**
     * 讀取當前配置
     */
    readConfig() {
        try {
            // 如果 .env 文件不存在，返回空配置
            if (!fs.existsSync(this.envPath)) {
                return {};
            }

            const envContent = fs.readFileSync(this.envPath, 'utf8');
            const config = {};

            // 解析 .env 文件
            envContent.split('\n').forEach(line => {
                // 跳過註釋和空行
                if (line.trim().startsWith('#') || !line.trim()) {
                    return;
                }

                // 解析 KEY=VALUE
                const match = line.match(/^\s*([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    
                    // 移除引號
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    
                    config[key] = value;
                }
            });

            return config;
        } catch (error) {
            console.error('讀取配置錯誤:', error);
            throw error;
        }
    }

    /**
     * 寫入配置
     */
    writeConfig(config) {
        try {
            let existingContent = '';
            let existingConfig = {};

            // 讀取現有配置（保留註釋）
            if (fs.existsSync(this.envPath)) {
                existingContent = fs.readFileSync(this.envPath, 'utf8');
                existingConfig = this.readConfig();
            }

            // 合併配置
            const mergedConfig = { ...existingConfig, ...config };

            // 生成新的 .env 內容
            let newContent = this._generateEnvContent(mergedConfig);

            // 寫入文件
            fs.writeFileSync(this.envPath, newContent, 'utf8');

            return true;
        } catch (error) {
            console.error('寫入配置錯誤:', error);
            throw error;
        }
    }

    /**
     * 生成 .env 文件內容
     */
    _generateEnvContent(config) {
        const lines = [];

        // 添加文件標題
        lines.push('# FLB 簽到系統 - 環境變數配置');
        lines.push('# 此文件由系統自動生成，請勿手動編輯');
        lines.push('# 最後更新: ' + new Date().toLocaleString('zh-TW'));
        lines.push('');

        // LINE Bot 配置
        lines.push('# ==================== LINE Bot 配置 ====================');
        lines.push('');
        lines.push('# Bot 1 (主要)');
        this._addConfigLine(lines, config, 'LINE_CHANNEL_ACCESS_TOKEN');
        this._addConfigLine(lines, config, 'LINE_CHANNEL_SECRET');
        lines.push('');
        lines.push('# Bot 2 (備用)');
        this._addConfigLine(lines, config, 'LINE_BOT_2_ENABLED');
        this._addConfigLine(lines, config, 'LINE_CHANNEL_ACCESS_TOKEN_2');
        this._addConfigLine(lines, config, 'LINE_CHANNEL_SECRET_2');
        lines.push('');
        lines.push('# 管理員設定');
        this._addConfigLine(lines, config, 'LINE_USER_ID');
        lines.push('');
        lines.push('# Rich Menu');
        this._addConfigLine(lines, config, 'RICH_MENU_ID');
        this._addConfigLine(lines, config, 'INTERNAL_RICH_MENU_ID');
        lines.push('');
        lines.push('# 訊息發送策略');
        this._addConfigLine(lines, config, 'LINE_LOAD_BALANCING');
        this._addConfigLine(lines, config, 'LINE_LOAD_BALANCING_STRATEGY');
        this._addConfigLine(lines, config, 'LINE_FALLBACK_TO_PRIMARY');
        this._addConfigLine(lines, config, 'LINE_BATCH_DELAY');
        this._addConfigLine(lines, config, 'LINE_MAX_RETRIES');
        lines.push('');

        // Google Sheets API
        lines.push('# ==================== Google Sheets API ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'GOOGLE_SHEETS_API');
        this._addConfigLine(lines, config, 'GOOGLE_SHEETS_SYNC');
        this._addConfigLine(lines, config, 'GOOGLE_SHEETS_SYNC_INTERVAL');
        lines.push('');

        // FLB API
        lines.push('# ==================== FLB API 端點 ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'FLB_API_URL');
        this._addConfigLine(lines, config, 'LINK_CALENDAR_API_URL');
        this._addConfigLine(lines, config, 'REPORT_API_URL');
        this._addConfigLine(lines, config, 'STUDENT_ATTENDANCE_API_URL');
        lines.push('');

        // 功能開關
        lines.push('# ==================== 功能開關 ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'FEATURE_ATTENDANCE_QUERY');
        this._addConfigLine(lines, config, 'FEATURE_INTERNAL_MODE');
        this._addConfigLine(lines, config, 'FEATURE_TEST_MODE');
        this._addConfigLine(lines, config, 'FEATURE_TEACHER_CHECKIN');
        this._addConfigLine(lines, config, 'FEATURE_STUDENT_CHECKIN');
        this._addConfigLine(lines, config, 'FEATURE_REPORTS');
        lines.push('');

        // 關鍵字設定
        lines.push('# ==================== 關鍵字設定 ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'KEYWORD_INTERNAL');
        this._addConfigLine(lines, config, 'KEYWORD_UNBIND');
        this._addConfigLine(lines, config, 'KEYWORD_TEST');
        this._addConfigLine(lines, config, 'KEYWORD_ATTENDANCE_QUERY');
        lines.push('');

        // UI 配置
        lines.push('# ==================== UI 配置 ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'UI_PRIMARY_COLOR');
        this._addConfigLine(lines, config, 'UI_SUCCESS_COLOR');
        this._addConfigLine(lines, config, 'UI_WARNING_COLOR');
        this._addConfigLine(lines, config, 'UI_DANGER_COLOR');
        lines.push('');

        // 安全配置
        lines.push('# ==================== 安全配置 ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'SECURITY_VERIFY_SIGNATURE');
        this._addConfigLine(lines, config, 'SECURITY_RATE_LIMIT');
        this._addConfigLine(lines, config, 'SECURITY_RATE_LIMIT_MAX');
        lines.push('');

        // 日誌配置
        lines.push('# ==================== 日誌配置 ====================');
        lines.push('');
        this._addConfigLine(lines, config, 'LOG_LEVEL');
        this._addConfigLine(lines, config, 'LOG_VERBOSE');
        lines.push('');

        return lines.join('\n');
    }

    /**
     * 添加配置行
     */
    _addConfigLine(lines, config, key) {
        const value = config[key];
        if (value !== undefined && value !== null && value !== '') {
            // 如果值包含空格或特殊字符，加上引號
            const needsQuotes = /[\s#]/.test(value);
            const formattedValue = needsQuotes ? `"${value}"` : value;
            lines.push(`${key}=${formattedValue}`);
        }
    }

    /**
     * 測試連線
     */
    async testConnection(config) {
        const axios = require('axios');
        const results = {
            bot1: false,
            bot2: false,
            bot2Enabled: false,
            googleSheets: false,
            success: false
        };

        try {
            // 測試 Bot 1
            if (config.LINE_CHANNEL_ACCESS_TOKEN) {
                try {
                    const response = await axios.get('https://api.line.me/v2/bot/info', {
                        headers: {
                            'Authorization': `Bearer ${config.LINE_CHANNEL_ACCESS_TOKEN}`
                        },
                        timeout: 5000
                    });
                    results.bot1 = response.status === 200;
                } catch (error) {
                    console.error('Bot 1 測試失敗:', error.message);
                }
            }

            // 測試 Bot 2
            if (config.LINE_BOT_2_ENABLED === 'true' && config.LINE_CHANNEL_ACCESS_TOKEN_2) {
                results.bot2Enabled = true;
                try {
                    const response = await axios.get('https://api.line.me/v2/bot/info', {
                        headers: {
                            'Authorization': `Bearer ${config.LINE_CHANNEL_ACCESS_TOKEN_2}`
                        },
                        timeout: 5000
                    });
                    results.bot2 = response.status === 200;
                } catch (error) {
                    console.error('Bot 2 測試失敗:', error.message);
                }
            }

            // 測試 Google Sheets
            if (config.GOOGLE_SHEETS_API) {
                try {
                    const response = await axios.get(config.GOOGLE_SHEETS_API, {
                        timeout: 5000
                    });
                    results.googleSheets = response.status === 200;
                } catch (error) {
                    console.error('Google Sheets 測試失敗:', error.message);
                }
            }

            // 判斷整體成功
            results.success = results.bot1 && (!results.bot2Enabled || results.bot2);

            return results;
        } catch (error) {
            console.error('連線測試錯誤:', error);
            return results;
        }
    }

    /**
     * 備份配置
     */
    backupConfig() {
        try {
            if (!fs.existsSync(this.envPath)) {
                return null;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, `.env.backup.${timestamp}`);
            
            fs.copyFileSync(this.envPath, backupPath);
            
            return backupPath;
        } catch (error) {
            console.error('備份配置錯誤:', error);
            throw error;
        }
    }
}

module.exports = ConfigManager;


