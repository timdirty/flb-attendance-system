/**
 * Webhook 轉發模組
 * 
 * 功能：將接收到的 LINE webhook 事件轉發到其他服務
 * 使用場景：
 * - 微服務架構：不同服務處理不同功能
 * - 開發測試：同時轉發到測試環境
 * - 備份服務：主服務故障時的備援
 * - 資料分析：將訊息轉發到分析服務
 */

const axios = require('axios');

class WebhookForwarder {
    constructor(config = {}) {
        // 轉發目標列表
        this.targets = config.targets || [];
        
        // 全域設定
        this.timeout = config.timeout || 5000; // 5秒超時
        this.retries = config.retries || 0; // 預設不重試
        this.logEnabled = config.logEnabled !== false; // 預設啟用日誌
        
        // 過濾設定
        this.filters = config.filters || {};
        
        console.log(`🔄 Webhook 轉發器已初始化，共 ${this.targets.length} 個目標`);
    }
    
    /**
     * 轉發 webhook 到所有目標
     * @param {Object} webhookData - LINE webhook 資料
     * @param {Object} options - 轉發選項
     */
    async forward(webhookData, options = {}) {
        if (this.targets.length === 0) {
            if (this.logEnabled) {
                console.log('⚠️  未設定轉發目標，跳過轉發');
            }
            return { success: true, results: [] };
        }
        
        // 應用過濾器
        if (!this.shouldForward(webhookData)) {
            if (this.logEnabled) {
                console.log('🚫 Webhook 不符合轉發條件，已過濾');
            }
            return { success: true, filtered: true };
        }
        
        const results = [];
        const forwardPromises = [];
        
        for (const target of this.targets) {
            // 檢查目標是否啟用
            if (target.enabled === false) {
                if (this.logEnabled) {
                    console.log(`⏭️  目標 ${target.name} 已停用，跳過`);
                }
                continue;
            }
            
            // 非同步轉發（不阻塞主流程）
            const forwardPromise = this.forwardToTarget(target, webhookData, options)
                .then(result => {
                    results.push(result);
                    return result;
                })
                .catch(error => {
                    const errorResult = {
                        target: target.name,
                        url: target.url,
                        success: false,
                        error: error.message
                    };
                    results.push(errorResult);
                    return errorResult;
                });
            
            forwardPromises.push(forwardPromise);
        }
        
        // 等待所有轉發完成（如果需要）
        if (options.waitForAll) {
            await Promise.all(forwardPromises);
        } else {
            // 不等待，讓轉發在背景執行
            Promise.all(forwardPromises).then(() => {
                if (this.logEnabled) {
                    const successCount = results.filter(r => r.success).length;
                    console.log(`✅ Webhook 轉發完成：${successCount}/${results.length} 成功`);
                }
            });
        }
        
        return {
            success: true,
            forwarded: true,
            targetCount: this.targets.length,
            results: results
        };
    }
    
    /**
     * 轉發到單一目標
     * @param {Object} target - 目標設定
     * @param {Object} webhookData - webhook 資料
     * @param {Object} options - 選項
     */
    async forwardToTarget(target, webhookData, options = {}) {
        const startTime = Date.now();
        
        try {
            if (this.logEnabled) {
                console.log(`📤 轉發到 ${target.name} (${target.url})`);
            }
            
            // 準備請求資料
            let payload = webhookData;
            
            // 如果目標有自訂轉換函數
            if (target.transform && typeof target.transform === 'function') {
                payload = target.transform(webhookData);
            }
            
            // 準備標頭
            const headers = {
                'Content-Type': 'application/json',
                'X-Forwarded-From': 'FLB-LINE-Bot',
                'X-Forward-Time': new Date().toISOString(),
                ...target.headers
            };
            
            // 發送請求
            const response = await axios({
                method: target.method || 'POST',
                url: target.url,
                data: payload,
                headers: headers,
                timeout: target.timeout || this.timeout,
                validateStatus: () => true // 接受所有狀態碼
            });
            
            const duration = Date.now() - startTime;
            const success = response.status >= 200 && response.status < 300;
            
            if (this.logEnabled) {
                if (success) {
                    console.log(`✅ ${target.name} 轉發成功 (${response.status}, ${duration}ms)`);
                } else {
                    console.log(`⚠️  ${target.name} 回應異常 (${response.status}, ${duration}ms)`);
                }
            }
            
            return {
                target: target.name,
                url: target.url,
                success: success,
                status: response.status,
                duration: duration,
                response: response.data
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            if (this.logEnabled) {
                console.error(`❌ ${target.name} 轉發失敗 (${duration}ms):`, error.message);
            }
            
            // 如果設定了重試
            if (this.retries > 0 && !options.noRetry) {
                if (this.logEnabled) {
                    console.log(`🔄 重試轉發到 ${target.name}...`);
                }
                return await this.retryForward(target, webhookData, options);
            }
            
            return {
                target: target.name,
                url: target.url,
                success: false,
                duration: duration,
                error: error.message
            };
        }
    }
    
    /**
     * 重試轉發
     */
    async retryForward(target, webhookData, options, attempt = 1) {
        if (attempt > this.retries) {
            return {
                target: target.name,
                url: target.url,
                success: false,
                error: `重試 ${this.retries} 次後仍失敗`
            };
        }
        
        // 等待一段時間後重試（指數退避）
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            return await this.forwardToTarget(target, webhookData, { ...options, noRetry: true });
        } catch (error) {
            return await this.retryForward(target, webhookData, options, attempt + 1);
        }
    }
    
    /**
     * 檢查是否應該轉發
     * @param {Object} webhookData - webhook 資料
     */
    shouldForward(webhookData) {
        // 沒有設定過濾器，預設轉發所有
        if (!this.filters || Object.keys(this.filters).length === 0) {
            return true;
        }
        
        const events = webhookData.events || [];
        
        // 過濾事件類型
        if (this.filters.eventTypes && this.filters.eventTypes.length > 0) {
            const hasMatchingType = events.some(event => 
                this.filters.eventTypes.includes(event.type)
            );
            if (!hasMatchingType) {
                return false;
            }
        }
        
        // 過濾訊息類型
        if (this.filters.messageTypes && this.filters.messageTypes.length > 0) {
            const hasMatchingMessageType = events.some(event => 
                event.type === 'message' && 
                this.filters.messageTypes.includes(event.message?.type)
            );
            if (!hasMatchingMessageType) {
                return false;
            }
        }
        
        // 過濾關鍵字
        if (this.filters.keywords && this.filters.keywords.length > 0) {
            const hasKeyword = events.some(event => {
                if (event.type !== 'message' || event.message?.type !== 'text') {
                    return false;
                }
                const text = event.message.text || '';
                return this.filters.keywords.some(keyword => text.includes(keyword));
            });
            if (!hasKeyword) {
                return false;
            }
        }
        
        // 自訂過濾函數
        if (this.filters.custom && typeof this.filters.custom === 'function') {
            return this.filters.custom(webhookData);
        }
        
        return true;
    }
    
    /**
     * 新增轉發目標
     * @param {Object} target - 目標設定
     */
    addTarget(target) {
        if (!target.url) {
            throw new Error('目標必須包含 url');
        }
        
        this.targets.push({
            name: target.name || `目標-${this.targets.length + 1}`,
            url: target.url,
            method: target.method || 'POST',
            enabled: target.enabled !== false,
            headers: target.headers || {},
            timeout: target.timeout || this.timeout,
            transform: target.transform
        });
        
        if (this.logEnabled) {
            console.log(`➕ 已新增轉發目標：${target.name} (${target.url})`);
        }
    }
    
    /**
     * 移除轉發目標
     * @param {string} nameOrUrl - 目標名稱或 URL
     */
    removeTarget(nameOrUrl) {
        const index = this.targets.findIndex(t => 
            t.name === nameOrUrl || t.url === nameOrUrl
        );
        
        if (index >= 0) {
            const removed = this.targets.splice(index, 1)[0];
            if (this.logEnabled) {
                console.log(`➖ 已移除轉發目標：${removed.name}`);
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 啟用/停用目標
     * @param {string} nameOrUrl - 目標名稱或 URL
     * @param {boolean} enabled - 是否啟用
     */
    toggleTarget(nameOrUrl, enabled) {
        const target = this.targets.find(t => 
            t.name === nameOrUrl || t.url === nameOrUrl
        );
        
        if (target) {
            target.enabled = enabled;
            if (this.logEnabled) {
                console.log(`${enabled ? '✅' : '⏸️'} ${target.name} 已${enabled ? '啟用' : '停用'}`);
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 取得所有目標狀態
     */
    getStatus() {
        return {
            totalTargets: this.targets.length,
            enabledTargets: this.targets.filter(t => t.enabled !== false).length,
            targets: this.targets.map(t => ({
                name: t.name,
                url: t.url,
                enabled: t.enabled !== false
            }))
        };
    }
}

module.exports = WebhookForwarder;

