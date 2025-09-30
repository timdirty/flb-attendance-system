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
     * 獲取當前配置
     */
    app.get('/api/settings', (req, res) => {
        try {
            console.log('📖 讀取系統配置...');
            
            const config = configManager.readConfig();
            
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
            
            // 備份現有配置
            const backupPath = configManager.backupConfig();
            if (backupPath) {
                console.log(`📦 配置已備份至: ${backupPath}`);
            }
            
            // 寫入新配置
            configManager.writeConfig(newConfig);
            
            console.log('✅ 配置儲存成功');
            console.log('⚠️  注意: 部分配置需要重新啟動系統才能生效');
            
            res.json({
                success: true,
                message: '配置已成功儲存',
                backupPath: backupPath,
                note: '部分配置需要重新啟動系統才能生效'
            });
            
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

