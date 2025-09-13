const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const DatabaseManager = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// FLB API 基礎URL
const FLB_API_URL = 'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec';

// 報表查詢 API URL
const REPORT_API_URL = 'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec';

// LINE Messaging API 配置
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
const LINE_USER_ID = process.env.LINE_USER_ID || 'YOUR_USER_ID_HERE';
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message/push';
const LINE_RICH_MENU_API = 'https://api.line.me/v2/bot/user/{userId}/richmenu';
const RICH_MENU_ID = '6636245039f343a37a8b7edc830c8cfa';

// 系統配置
const SYSTEM_URL = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://your-railway-url.railway.app';

// Google Sheets API 配置
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbycZtdm2SGy07Sy06i2wM8oGNnERvEyyShUdTmHowlUmQz2kjS3I5VWdI1TszT1s2DCQA/exec';
const GOOGLE_SHEETS_COOKIE = 'NID=525=IPIqwCVm1Z3C00Y2MFXoevvCftm-rj9UdMlgYFhlRAHY0MKSCbEO7I8EBlGrz-nwjYxoXSFUrDHBqGrYNUotcoSE3v2npcVn-j3QZsc6SAKkZcMLR6y1MkF5dZlXnbBIqWgw9cJLT3SvAvmpXUZa6RADuBXFDZpvSM85zYAoym0yXcBn3C4ayGgOookqVJaH';

// 資料庫實例 - 使用Google Sheets資料庫
const GoogleSheetsDatabaseWithLocal = require('./googleSheetsDatabaseWithLocal');
const db = new GoogleSheetsDatabaseWithLocal();

// 新的資料庫會自動處理初始化同步


// LINE Messaging API 通知函數
async function sendLineMessage(message, targetUserId = null) {
    try {
        if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            console.log('LINE Channel Access Token 未設定，跳過通知');
            return { success: false, message: 'LINE Channel Access Token 未設定' };
        }

        // 準備發送目標列表
        const targetUsers = [];
        
        // 總是發送給管理員
        if (LINE_USER_ID && LINE_USER_ID !== 'YOUR_USER_ID_HERE') {
            targetUsers.push(LINE_USER_ID);
        }
        
        // 如果指定了特定使用者，也發送給該使用者
        if (targetUserId && targetUserId !== LINE_USER_ID) {
            targetUsers.push(targetUserId);
        }
        
        if (targetUsers.length === 0) {
            console.log('沒有有效的發送目標，跳過通知');
            return { success: false, message: '沒有有效的發送目標' };
        }

        // 發送給所有目標使用者（改為順序發送以便更好的錯誤處理）
        const results = [];
        
        for (const userId of targetUsers) {
            try {
                console.log(`正在發送LINE訊息給 ${userId}...`);

        const response = await axios.post(LINE_MESSAGING_API, {
                    to: userId,
            messages: [{
                type: 'text',
                text: message
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10秒超時
                });
                
                console.log(`✅ LINE 訊息發送成功給 ${userId}:`, response.data);
                results.push({ success: true, userId, data: response.data });
                
                // 添加小延遲避免API限制
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ LINE 訊息發送失敗給 ${userId}:`, error.response?.data || error.message);
                results.push({ 
                    success: false, 
                    userId, 
                    error: error.response?.data || error.message,
                    statusCode: error.response?.status
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        return { 
            success: successCount > 0, 
            message: `成功發送給 ${successCount}/${targetUsers.length} 個使用者`,
            results: results
        };
    } catch (error) {
        console.error('LINE 訊息發送失敗:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// LINE Rich Menu 綁定函數
async function bindRichMenu(userId) {
    try {
        if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            console.log('LINE Channel Access Token 未設定，跳過Rich Menu綁定');
            return { success: false, message: 'LINE Channel Access Token 未設定' };
        }

        const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/richmenu-${RICH_MENU_ID}`;
        
        const response = await axios.post(url, {}, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`✅ Rich Menu 綁定成功給 ${userId}:`, response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ Rich Menu 綁定失敗給 ${userId}:`, error.response?.data || error.message);
        return { 
            success: false, 
            error: error.response?.data || error.message,
            statusCode: error.response?.status
        };
    }
}

// LINE Rich Menu 解除綁定函數
async function unbindRichMenu(userId) {
    try {
        if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            console.log('LINE Channel Access Token 未設定，跳過Rich Menu解除綁定');
            return { success: false, message: 'LINE Channel Access Token 未設定' };
        }

        const url = `https://api.line.me/v2/bot/user/${userId}/richmenu`;
        
        const response = await axios.delete(url, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`✅ Rich Menu 解除綁定成功給 ${userId}:`, response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ Rich Menu 解除綁定失敗給 ${userId}:`, error.response?.data || error.message);
        return { 
            success: false, 
            error: error.response?.data || error.message,
            statusCode: error.response?.status
        };
    }
}

// Google Sheets 上傳使用者資訊函數
async function uploadUserToGoogleSheets(userId, displayName) {
    try {
        const payload = {
            action: "upsertUserId",
            sheetName: "user id",
            list: [
                {
                    "使用者名稱": displayName || "未知使用者",
                    "userId": userId
                }
            ]
        };

        const response = await axios.post(GOOGLE_SHEETS_API, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': GOOGLE_SHEETS_COOKIE
            },
            timeout: 10000
        });

        console.log(`✅ 使用者資訊上傳到Google Sheets成功: ${displayName} (${userId})`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ 使用者資訊上傳到Google Sheets失敗: ${displayName} (${userId})`, error.response?.data || error.message);
        return { 
            success: false, 
            error: error.response?.data || error.message,
            statusCode: error.response?.status
        };
    }
}

// 路由：首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 路由：管理後台
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 管理員API：獲取統計資料
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await db.getUserCount();
        const totalTeachers = await db.getTeacherCount();
        const activeBindings = await db.getActiveBindingCount();
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                totalTeachers,
                activeBindings,
                systemUptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('獲取統計資料失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：獲取所有使用者
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.getAllUsersWithBindings();
        res.json({ success: true, users });
    } catch (error) {
        console.error('獲取使用者資料失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：搜尋使用者
app.get('/api/admin/users/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json({ success: false, error: '請提供搜尋關鍵字' });
        }
        
        const users = await db.searchUsers(query);
        res.json({ success: true, users });
    } catch (error) {
        console.error('搜尋使用者失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：獲取所有綁定
app.get('/api/admin/bindings', async (req, res) => {
    try {
        const bindings = await db.getAllBindings();
        res.json({ success: true, bindings });
    } catch (error) {
        console.error('獲取綁定資料失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：搜尋綁定
app.get('/api/admin/bindings/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json({ success: false, error: '請提供搜尋關鍵字' });
        }
        
        const bindings = await db.searchBindings(query);
        res.json({ success: true, bindings });
    } catch (error) {
        console.error('搜尋綁定失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：停用綁定
app.post('/api/admin/bindings/:id/deactivate', async (req, res) => {
    try {
        const bindingId = req.params.id;
        const success = await db.deactivateBinding(bindingId);
        
        if (success) {
            res.json({ success: true, message: '綁定已停用' });
        } else {
            res.json({ success: false, error: '停用綁定失敗' });
        }
    } catch (error) {
        console.error('停用綁定失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：同步單一使用者名稱
app.post('/api/admin/sync-user-name', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({ success: false, error: '請提供使用者ID' });
        }

        // 從LINE API獲取最新使用者資訊
        const profileResponse = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            timeout: 10000
        });

        const newDisplayName = profileResponse.data.displayName;
        
        // 更新資料庫
        const success = db.updateUserDisplayName(userId, newDisplayName);
        
        if (success) {
            res.json({ 
                success: true, 
                message: '使用者名稱已同步',
                newDisplayName: newDisplayName
            });
        } else {
            res.json({ success: false, error: '同步失敗' });
        }
    } catch (error) {
        console.error('同步使用者名稱失敗:', error);
        res.json({ success: false, error: error.response?.data || error.message });
    }
});

// 管理員API：批量同步所有使用者名稱
app.post('/api/admin/sync-all-names', async (req, res) => {
    try {
        const users = await db.getAllUsersWithBindings();
        const results = [];
        
        for (const user of users) {
            try {
                // 從LINE API獲取最新使用者資訊
                const profileResponse = await axios.get(`https://api.line.me/v2/bot/profile/${user.userId}`, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                    },
                    timeout: 10000
                });

                const newDisplayName = profileResponse.data.displayName;
                
                // 檢查名稱是否有變更
                if (newDisplayName !== user.displayName) {
                    const success = db.updateUserDisplayName(user.userId, newDisplayName);
                    results.push({
                        userId: user.userId,
                        oldName: user.displayName,
                        newName: newDisplayName,
                        success: success,
                        updated: success
                    });
                } else {
                    results.push({
                        userId: user.userId,
                        oldName: user.displayName,
                        newName: newDisplayName,
                        success: true,
                        updated: false
                    });
                }
                
                // 避免API限制，稍作延遲
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`同步使用者 ${user.userId} 失敗:`, error);
                results.push({
                    userId: user.userId,
                    oldName: user.displayName,
                    newName: null,
                    success: false,
                    updated: false,
                    error: error.response?.data || error.message
                });
            }
        }
        
        const updatedCount = results.filter(r => r.updated).length;
        const successCount = results.filter(r => r.success).length;
        
        res.json({
            success: true,
            message: `同步完成：${updatedCount} 個使用者名稱已更新，${successCount}/${results.length} 個使用者處理成功`,
            results: results,
            summary: {
                total: results.length,
                updated: updatedCount,
                success: successCount,
                failed: results.length - successCount
            }
        });
    } catch (error) {
        console.error('批量同步使用者名稱失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：備份資料庫
app.post('/api/admin/backup-database', async (req, res) => {
    try {
        const backupPath = db.backup();
        if (backupPath) {
            res.json({ 
                success: true, 
                message: '資料庫備份成功',
                backupPath: backupPath
            });
        } else {
            res.json({ success: false, error: '備份失敗' });
        }
    } catch (error) {
        console.error('備份資料庫失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：導出資料
app.get('/api/admin/export-data', async (req, res) => {
    try {
        const exportData = await db.exportData();
        if (exportData) {
            res.json({ 
                success: true, 
                data: exportData
            });
        } else {
            res.json({ success: false, error: '導出失敗' });
        }
    } catch (error) {
        console.error('導出資料失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：手動同步Google Sheets
app.post('/api/admin/sync-google-sheets', async (req, res) => {
    try {
        console.log('🔄 手動觸發Google Sheets同步...');
        
        const syncResult = await db.syncFromGoogleSheets();
        
        if (syncResult.success) {
            res.json({
                success: true,
                message: 'Google Sheets同步成功',
                stats: {
                    users: syncResult.users.length,
                    bindings: syncResult.bindings.length
                }
            });
        } else {
            res.json({
                success: false,
                error: syncResult.error || '同步失敗'
            });
        }
    } catch (error) {
        console.error('手動同步失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 管理員API：強制重新初始化
app.post('/api/admin/reinitialize', async (req, res) => {
    try {
        console.log('🔄 強制重新初始化系統...');
        
        // 重新同步Google Sheets
        const syncResult = await db.syncFromGoogleSheets();
        
        res.json({
            success: true,
            message: '系統重新初始化完成'
        });
    } catch (error) {
        console.error('重新初始化失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 測試路由：發送測試訊息
app.post('/api/test-message', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '請提供使用者ID' });
        }
        
        const testMessage = message || `🧪 測試訊息\n\n⏰ 時間：${new Date().toLocaleString('zh-TW')}\n\n✅ 如果您收到此訊息，表示LINE通知功能正常運作！`;
        
        const result = await sendLineMessage(testMessage, userId);
        
        res.json({
            success: result.success,
            message: result.message,
            results: result.results
        });
    } catch (error) {
        console.error('測試訊息發送失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 測試路由：測試Rich Menu綁定
app.post('/api/test-richmenu', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '請提供使用者ID' });
        }
        
        const bindResult = await bindRichMenu(userId);
        
        res.json({
            success: bindResult.success,
            message: bindResult.success ? 'Rich Menu綁定測試成功' : 'Rich Menu綁定測試失敗',
            result: bindResult
        });
    } catch (error) {
        console.error('Rich Menu綁定測試失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 測試路由：測試Rich Menu解除綁定
app.post('/api/test-unbind-richmenu', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '請提供使用者ID' });
        }
        
        const unbindResult = await unbindRichMenu(userId);
        
        res.json({
            success: unbindResult.success,
            message: unbindResult.success ? 'Rich Menu解除綁定測試成功' : 'Rich Menu解除綁定測試失敗',
            result: unbindResult
        });
    } catch (error) {
        console.error('Rich Menu解除綁定測試失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 測試路由：測試Google Sheets上傳
app.post('/api/test-google-sheets', async (req, res) => {
    try {
        const { userId, displayName } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '請提供使用者ID' });
        }
        
        const uploadResult = await uploadUserToGoogleSheets(userId, displayName || '測試使用者');
        
        res.json({
            success: uploadResult.success,
            message: uploadResult.success ? 'Google Sheets上傳測試成功' : 'Google Sheets上傳測試失敗',
            result: uploadResult
        });
    } catch (error) {
        console.error('Google Sheets上傳測試失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// 測試路由：測試綁定通知
app.post('/api/test-binding-notification', async (req, res) => {
    try {
        const { userId, displayName } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '請提供使用者ID' });
        }
        
        const testDisplayName = displayName || '測試使用者';
        const bindingMessage = `🎉 歡迎使用FLB講師簽到系統！\n\n👤 您的資訊：\n• 姓名：${testDisplayName}\n• User ID：${userId}\n\n📱 請點擊以下連結開始使用：\n${SYSTEM_URL}\n\n💡 首次使用時，系統會要求您選擇講師身份進行綁定。`;
        
        const result = await sendLineMessage(bindingMessage, userId);
        
        res.json({
            success: result.success,
            message: result.success ? '綁定通知測試成功' : '綁定通知測試失敗',
            result: result
        });
    } catch (error) {
        console.error('綁定通知測試失敗:', error);
        res.json({ success: false, error: error.message });
    }
});

// API路由：檢查使用者是否已註冊
app.post('/api/check-user', async (req, res) => {
    try {
        const { userId, displayName, pictureUrl } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少使用者ID' 
            });
        }

        const userData = await db.getUser(userId);
        const isRegistered = userData !== null;
        
        // 如果使用者已註冊，更新其資訊
        if (isRegistered) {
            await db.updateUserInfo(userId, displayName, pictureUrl);
            userData.displayName = displayName || userData.displayName;
            userData.pictureUrl = pictureUrl || userData.pictureUrl;
        }

        res.json({ 
            success: true, 
            isRegistered: isRegistered,
            userData: userData
        });
        
    } catch (error) {
        console.error('檢查使用者註冊狀態錯誤:', error);
            res.status(500).json({ 
                success: false, 
            error: '檢查使用者註冊狀態失敗' 
        });
    }
});

// API路由：使用者註冊
app.post('/api/register-user', async (req, res) => {
    try {
        const { userId, displayName, pictureUrl, userName, email } = req.body;
        
        if (!userId || !userName) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要參數' 
            });
        }

        // 檢查使用者是否已註冊
        const existingUser = await db.getUser(userId);
        if (existingUser) {
            return res.json({ 
                success: true, 
                message: '使用者已註冊',
                isRegistered: true,
                userData: existingUser
            });
        }

        // 建立使用者資料
        const userData = {
            userId: userId,
            displayName: displayName || '',
            pictureUrl: pictureUrl || '',
            userName: userName,
            email: email || '',
            registeredAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        // 儲存使用者資料到資料庫
        await db.registerUser(userData);

        // 發送註冊通知
        const userNotificationMessage = `🎉 歡迎使用FLB簽到系統！\n\n` +
            `👤 您的名稱：${userName}\n` +
            `📱 LINE顯示名稱：${displayName || '無'}\n` +
            `🆔 您的ID：${userId}\n` +
            `⏰ 註冊時間：${new Date().toLocaleString('zh-TW')}\n\n` +
            `✅ 您已成功註冊，現在可以使用完整的簽到功能！`;

        const adminNotificationMessage = `📢 新使用者註冊通知\n\n` +
            `👤 使用者名稱：${userName}\n` +
            `📱 LINE顯示名稱：${displayName || '無'}\n` +
            `🆔 使用者ID：${userId}\n` +
            `📧 電子郵件：${email || '未提供'}\n` +
            `⏰ 註冊時間：${new Date().toLocaleString('zh-TW')}\n\n` +
            `✅ 新使用者已成功註冊到FLB簽到系統！`;

        // 發送通知給註冊的使用者和管理員
        sendLineMessage(userNotificationMessage, userId).catch(err => {
            console.error('使用者註冊通知發送失敗:', err);
        });
        
        sendLineMessage(adminNotificationMessage).catch(err => {
            console.error('管理員註冊通知發送失敗:', err);
        });

        res.json({ 
            success: true, 
            message: '註冊成功',
            userData: userData
        });
        
    } catch (error) {
        console.error('使用者註冊錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '使用者註冊失敗' 
        });
    }
});

// API路由：獲取所有註冊使用者
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ 
            success: true, 
            users: users,
            total: users.length
        });
    } catch (error) {
        console.error('獲取使用者列表錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取使用者列表失敗' 
        });
    }
});

// API路由：獲取使用者統計
app.get('/api/user-stats', async (req, res) => {
    try {
        const stats = await db.getUserStats();
        res.json({ 
            success: true, 
            stats: stats
        });
    } catch (error) {
        console.error('獲取使用者統計錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取使用者統計失敗' 
        });
    }
});

// API路由：獲取講師列表
app.get('/api/teachers', async (req, res) => {
    try {
        console.log('正在呼叫 FLB API:', FLB_API_URL);
        
        const response = await axios.post(FLB_API_URL, {
            action: 'getTeacherList'
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('FLB API 回應狀態:', response.status);
        console.log('FLB API 回應資料:', response.data);
        
        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.error('FLB API 回傳 HTML 錯誤頁面');
            return res.status(500).json({ 
                success: false,
                error: 'FLB API 發生錯誤，請檢查 API 連結是否正確' 
            });
        }
        
        res.json(response.data);
        
    } catch (error) {
        console.error('獲取講師列表錯誤:', error);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(500).json({ 
                success: false,
                error: '無法連接到 FLB API，請檢查網路連線' 
            });
        } else if (error.code === 'ENOTFOUND') {
            res.status(500).json({ 
                success: false,
                error: 'FLB API 網址無法解析，請檢查 API 連結' 
            });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            res.status(500).json({ 
                success: false,
                error: 'FLB API 連線超時，請稍後再試或檢查網路連線' 
            });
        } else if (error.response) {
            res.status(error.response.status).json({ 
                success: false,
                error: `FLB API 錯誤: ${error.response.status} - ${error.response.statusText}`,
                details: error.response.data
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: '獲取講師列表失敗：' + error.message 
            });
        }
    }
});

// API路由：獲取講師的課程
app.post('/api/teacher-courses', async (req, res) => {
    try {
        const { teacher } = req.body;
        const response = await axios.post(FLB_API_URL, {
            action: 'getCoursesByTeacher',
            teacher: teacher
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('獲取講師課程錯誤:', error);
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            res.status(500).json({ 
                success: false,
                error: '獲取講師課程超時，請稍後再試' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: '獲取講師課程失敗' 
            });
        }
    }
});

// API路由：獲取特定課程的學生
app.post('/api/course-students', async (req, res) => {
    try {
        const { course, time } = req.body;
        const response = await axios.post(FLB_API_URL, {
            action: 'getStudentsByCourseAndTime',
            course: course,
            time: time
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('獲取課程學生錯誤:', error);
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            res.status(500).json({ 
                success: false,
                error: '獲取課程學生超時，請稍後再試' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: '獲取課程學生失敗' 
            });
        }
    }
});

// API路由：學生簽到
app.post('/api/student-attendance', async (req, res) => {
    try {
        const { studentName, date, present, teacherName, courseName, message, batchNotification } = req.body;
        
        if (batchNotification && message) {
            const result = await sendLineMessage(message);
            res.json({ 
                success: result.success, 
                message: result.success ? '批量通知發送成功' : '批量通知發送失敗',
                error: result.error 
            });
            return;
        }
        
        if (studentName && date !== undefined && present !== undefined) {
            const response = await axios.post(FLB_API_URL, {
                action: 'update',
                name: studentName,
                date: date,
                present: present
            });
            
            console.log(`學生 ${studentName} 簽到成功：${present ? '出席' : '缺席'}`);
            
            res.json(response.data);
        } else {
            res.status(400).json({ error: '缺少必要參數' });
        }
    } catch (error) {
        console.error('學生簽到錯誤:', error);
        res.status(500).json({ error: '學生簽到失敗' });
    }
});

// API路由：講師報表簽到
app.post('/api/teacher-report', async (req, res) => {
    try {
        const { teacherName, courseName, courseTime, date, studentCount, courseContent, webApi } = req.body;
        
        let targetApi = webApi;
        if (!webApi || webApi.trim() === '') {
            console.log(`講師 ${teacherName} 的 webApi 為空，使用預設的 FLB_API_URL`);
            targetApi = FLB_API_URL;
        }
        
        let assistantCount = studentCount;
        if (studentCount !== 0 && (courseTime.includes('到府') || courseTime.includes('客製化'))) {
            assistantCount = 99;
        }
        
        const response = await axios.post(targetApi, {
            action: 'appendTeacherCourse',
            sheetName: '報表',
            teacherName: teacherName,
            '課程名稱': courseName,
            '上課時間': courseTime,
            '課程日期': date,
            '人數_助教': assistantCount.toString(),
            '課程內容': courseContent
        });
        
        // 獲取講師的 userId
        let teacherUserId = null;
        try {
            const teachersResponse = await axios.post(FLB_API_URL, {
                action: 'getTeacherList'
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (teachersResponse.data.success && teachersResponse.data.teachers) {
                const teacher = teachersResponse.data.teachers.find(t => t.name === teacherName);
                if (teacher && teacher.userId) {
                    teacherUserId = teacher.userId;
                    console.log(`找到講師 ${teacherName} 的 userId: ${teacherUserId}`);
                }
            }
        } catch (error) {
            console.log('❌ 獲取講師 userId 失敗:', error.message);
        }

        const notificationMessage = `📊 講師報表簽到通知\n\n` +
            `👨‍🏫 講師：${teacherName}\n` +
            `📖 課程：${courseName}\n` +
            `⏰ 時間：${courseTime}\n` +
            `📅 日期：${date}\n` +
            `👥 人數：${assistantCount}\n` +
            `📝 內容：${courseContent || '無'}\n\n` +
            `⏰ 簽到時間：${new Date().toLocaleString('zh-TW')}`;
        
        // 發送通知給管理員和講師
        sendLineMessage(notificationMessage, teacherUserId).catch(err => {
            console.error('LINE 通知發送失敗:', err);
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('講師報表簽到錯誤:', error);
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            res.status(500).json({ 
                success: false, 
                error: '無法連接到講師的 Web API，請檢查連結是否正確' 
            });
        } else if (error.response) {
            res.status(error.response.status).json({
                success: false,
                error: `Web API 錯誤: ${error.response.status} - ${error.response.statusText}`,
                details: error.response.data
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: '講師報表簽到失敗：網路或系統錯誤' 
            });
        }
    }
});

// 補簽到 API
app.post('/api/makeup-attendance', async (req, res) => {
    try {
        const { name, date, present, teacherName, courseName } = req.body;
        
        console.log(`補簽到請求: 學生=${name}, 日期=${date}, 出席=${present}`);
        
        const response = await axios.post(FLB_API_URL, {
            action: "update",
            name: name,
            date: date,
            present: present
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // 獲取講師的 userId
        let teacherUserId = null;
        if (teacherName && teacherName !== '未知') {
            try {
                const teachersResponse = await axios.post(FLB_API_URL, {
                    action: 'getTeacherList'
                }, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (teachersResponse.data.success && teachersResponse.data.teachers) {
                    const teacher = teachersResponse.data.teachers.find(t => t.name === teacherName);
                    if (teacher && teacher.userId) {
                        teacherUserId = teacher.userId;
                        console.log(`找到講師 ${teacherName} 的 userId: ${teacherUserId}`);
                    }
                }
            } catch (error) {
                console.log('❌ 獲取講師 userId 失敗:', error.message);
            }
        }

        const attendanceStatus = present ? '出席' : '缺席';
        const notificationMessage = `🔄 補簽到通知\n\n` +
            `👨‍🏫 講師：${teacherName || '未知'}\n` +
            `👨‍🎓 學生：${name}\n` +
            `📅 日期：${date}\n` +
            `📖 課程：${courseName || '未知'}\n` +
            `✅ 狀態：${attendanceStatus}\n\n` +
            `⏰ 補簽時間：${new Date().toLocaleString('zh-TW')}`;
        
        // 發送通知給管理員和講師
        sendLineMessage(notificationMessage, teacherUserId).catch(err => {
            console.error('LINE 通知發送失敗:', err);
        });
        
        console.log('補簽到 API 回應:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('補簽到錯誤:', error);
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            res.status(500).json({ 
                success: false, 
                error: '無法連接到 FLB API，請檢查網路連線' 
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(500).json({ 
                success: false, 
                error: '請求超時，請稍後再試' 
            });
        } else if (error.response) {
            res.status(error.response.status).json({
                success: false,
                error: `FLB API 錯誤: ${error.response.status} - ${error.response.statusText}`,
                details: error.response.data
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: '補簽到失敗：網路或系統錯誤' 
            });
        }
    }
});

// API路由：查詢報表
app.post('/api/query-report', async (req, res) => {
    try {
        const { teacherName, queryParams } = req.body;
        
        console.log('正在查詢報表:', { teacherName, queryParams });
        
        const teachersResponse = await axios.post(FLB_API_URL, {
            action: 'getTeacherList'
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!teachersResponse.data.success) {
            return res.status(500).json({ 
                success: false,
                error: '無法獲取講師列表' 
            });
        }
        
        const teacher = teachersResponse.data.teachers.find(t => t.name === teacherName);
        if (!teacher) {
            console.log('找不到講師:', teacherName);
            return res.status(404).json({ 
                success: false,
                error: '找不到指定的講師' 
            });
        }
        
        console.log('找到講師:', teacher.name, 'reportApi:', teacher.reportApi);
        
        if (!teacher.reportApi || teacher.reportApi.trim() === '') {
            console.log('講師沒有設定reportApi:', teacher.name);
            return res.status(400).json({ 
                success: false,
                error: '該講師沒有設定報表查詢 API' 
            });
        }
        
        const requestBody = {
            action: 'queryReport',
            teacherName: teacherName,
            ...queryParams
        };
        
        const response = await axios.post(teacher.reportApi, requestBody, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('報表查詢 API 回應狀態:', response.status);
        console.log('報表查詢 API 回應資料:', response.data);
        
        res.json(response.data);
        
    } catch (error) {
        console.error('查詢報表錯誤:', error);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(500).json({ 
                success: false,
                error: '無法連接到報表查詢 API，請檢查網路連線' 
            });
        } else if (error.code === 'ENOTFOUND') {
            res.status(500).json({ 
                success: false,
                error: '報表查詢 API 網址無法解析，請檢查 API 連結' 
            });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            res.status(500).json({ 
                success: false,
                error: '報表查詢 API 連線超時，請稍後再試' 
            });
        } else if (error.response) {
            res.status(error.response.status).json({ 
                success: false,
                error: `報表查詢 API 錯誤: ${error.response.status} - ${error.response.statusText}`,
                details: error.response.data
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: '查詢報表失敗：' + error.message 
            });
        }
    }
});

// LINE Webhook 端點
app.post('/webhook', async (req, res) => {
    console.log('收到 LINE Webhook 請求:', req.body);
    
    res.status(200).send('OK');
    
    const events = req.body.events;
    if (events && events.length > 0) {
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                console.log('收到訊息:', event.message.text);
                console.log('用戶 ID:', event.source?.userId || '未知');
                
                if (event.source?.userId) {
                    console.log('請將此 User ID 設定到環境變數:');
                    console.log('LINE_USER_ID =', event.source.userId);
                    
                    // 獲取使用者資訊並上傳到Google Sheets
                    try {
                        // 從LINE API獲取使用者資訊
                        const profileResponse = await axios.get(`https://api.line.me/v2/bot/profile/${event.source.userId}`, {
                            headers: {
                                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                            },
                            timeout: 10000
                        });
                        
                        const displayName = profileResponse.data.displayName;
                        console.log(`獲取到使用者資訊: ${displayName} (${event.source.userId})`);
                        
                        // 上傳到Google Sheets
                        const uploadResult = await uploadUserToGoogleSheets(event.source.userId, displayName);
                        if (uploadResult.success) {
                            console.log('✅ 使用者資訊已成功上傳到Google Sheets');
                        } else {
                            console.log('❌ 使用者資訊上傳到Google Sheets失敗:', uploadResult.error);
                        }
                        
                        // 檢查是否為講師
                        let isTeacher = false;
                        try {
                            const teacherResponse = await axios.get(FLB_API_URL, { timeout: 10000 });
                            if (teacherResponse.data.success && teacherResponse.data.teachers) {
                                const teachers = teacherResponse.data.teachers;
                                isTeacher = teachers.some(teacher => teacher.userId === event.source.userId);
                                console.log(`使用者 ${displayName} 是否為講師: ${isTeacher}`);
                            }
                        } catch (teacherError) {
                            console.log('❌ 檢查講師身份失敗:', teacherError.message);
                        }
                        
                        // 同時儲存到本地資料庫
                        try {
                            await db.registerUser({
                                userId: event.source.userId,
                                displayName: displayName,
                                userName: displayName,
                                pictureUrl: profileResponse.data.pictureUrl,
                                registeredAt: new Date().toISOString(),
                                lastLogin: new Date().toISOString()
                            });
                            console.log('✅ 使用者資訊已儲存到本地資料庫');
                            
                            // 只有講師才發送綁定通知
                            if (isTeacher) {
                                const bindingMessage = `🎉 歡迎使用FLB講師簽到系統！\n\n👤 您的資訊：\n• 姓名：${displayName}\n• User ID：${event.source.userId}\n\n📱 請點擊以下連結開始使用：\n${SYSTEM_URL}\n\n💡 首次使用時，系統會要求您選擇講師身份進行綁定。`;
                                
                                try {
                                    await sendLineMessage(bindingMessage, event.source.userId);
                                    console.log('✅ 講師綁定通知已發送');
                                } catch (notifyError) {
                                    console.log('❌ 發送講師綁定通知失敗:', notifyError.message);
                                }
                                
                                // 發送管理員通知（講師註冊）
                                const adminMessage = `🔔 講師註冊通知\n\n👤 講師資訊：\n• 姓名：${displayName}\n• User ID：${event.source.userId}\n• 註冊時間：${new Date().toLocaleString('zh-TW')}\n\n📊 系統狀態：\n• 總使用者數：${await db.getUserCount()}\n• 活躍綁定數：${await db.getActiveBindingCount()}`;
                                
                                try {
                                    await sendLineMessage(adminMessage);
                                    console.log('✅ 講師註冊管理員通知已發送');
                                } catch (adminNotifyError) {
                                    console.log('❌ 發送講師註冊管理員通知失敗:', adminNotifyError.message);
                                }
                            } else {
                                console.log(`使用者 ${displayName} 為普通客戶，不發送任何通知`);
                            }
                            
                        } catch (dbError) {
                            console.log('❌ 使用者資訊儲存到本地資料庫失敗:', dbError.message);
                        }
                        
                    } catch (error) {
                        console.error('❌ 處理使用者資訊失敗:', error.response?.data || error.message);
                        
                        // 即使獲取profile失敗，也嘗試上傳已知的userId
                        try {
                            const uploadResult = await uploadUserToGoogleSheets(event.source.userId, '未知使用者');
                            if (uploadResult.success) {
                                console.log('✅ 使用者ID已上傳到Google Sheets (無顯示名稱)');
                            }
                        } catch (uploadError) {
                            console.error('❌ 上傳使用者ID到Google Sheets失敗:', uploadError.message);
                        }
                    }
                }
            }
        }
    }
});

// API路由：檢查講師綁定狀態
app.post('/api/check-teacher-binding', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少使用者ID' 
            });
        }

        const bindingInfo = await db.isTeacherBound(userId);
        
        res.json({ 
            success: true, 
            isBound: bindingInfo.isBound,
            teacherName: bindingInfo.teacherName,
            teacherId: bindingInfo.teacherId
        });
        
    } catch (error) {
        console.error('檢查講師綁定狀態錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '檢查講師綁定狀態失敗' 
        });
    }
});

// API路由：綁定講師身份
app.post('/api/bind-teacher', async (req, res) => {
    try {
        const { userId, teacherName, teacherId } = req.body;
        
        if (!userId || !teacherName || !teacherId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要參數' 
            });
        }

        // 綁定講師身份
        const success = await db.bindTeacher(userId, teacherName, teacherId);
        
        if (success) {
            // 綁定Rich Menu
            const richMenuResult = await bindRichMenu(userId);
            console.log('Rich Menu 綁定結果:', richMenuResult);
            
            // 發送綁定成功通知
            const userBindingMessage = `🎯 講師身份綁定成功！\n\n` +
                `👨‍🏫 講師名稱：${teacherName}\n` +
                `🆔 講師ID：${teacherId}\n` +
                `⏰ 綁定時間：${new Date().toLocaleString('zh-TW')}\n\n` +
                `✅ 您現在可以直接使用簽到功能，無需重複選擇講師身份！\n` +
                `📱 已為您設定內部員工專用選單！`;

            const adminBindingMessage = `📢 講師身份綁定通知\n\n` +
                `👤 使用者ID：${userId}\n` +
                `👨‍🏫 綁定講師：${teacherName}\n` +
                `🆔 講師ID：${teacherId}\n` +
                `⏰ 綁定時間：${new Date().toLocaleString('zh-TW')}\n` +
                `📱 Rich Menu綁定：${richMenuResult.success ? '成功' : '失敗'}\n\n` +
                `✅ 使用者已成功綁定講師身份！`;

            sendLineMessage(userBindingMessage, userId).catch(err => {
                console.error('使用者綁定通知發送失敗:', err);
            });
            
            sendLineMessage(adminBindingMessage).catch(err => {
                console.error('管理員綁定通知發送失敗:', err);
            });

            res.json({ 
                success: true, 
                message: '講師身份綁定成功',
                teacherName: teacherName,
                teacherId: teacherId,
                richMenuResult: richMenuResult
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: '使用者不存在' 
            });
        }
        
    } catch (error) {
        console.error('綁定講師身份錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '綁定講師身份失敗' 
        });
    }
});

// API路由：解除講師綁定
app.post('/api/unbind-teacher', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要參數' 
            });
        }

        // 解除Rich Menu綁定
        const richMenuResult = await unbindRichMenu(userId);
        console.log('Rich Menu 解除綁定結果:', richMenuResult);
        
        // 解除資料庫綁定
        const success = await db.unbindTeacher(userId);
        
        if (success) {
            // 發送解除綁定通知
            const userUnbindMessage = `🔄 講師身份解除綁定成功！\n\n` +
                `⏰ 解除時間：${new Date().toLocaleString('zh-TW')}\n\n` +
                `✅ 您已解除講師身份綁定，下次使用時需要重新選擇講師身份！\n` +
                `📱 已為您移除內部員工專用選單！`;

            const adminUnbindMessage = `📢 講師身份解除綁定通知\n\n` +
                `👤 使用者ID：${userId}\n` +
                `⏰ 解除時間：${new Date().toLocaleString('zh-TW')}\n` +
                `📱 Rich Menu解除：${richMenuResult.success ? '成功' : '失敗'}\n\n` +
                `✅ 使用者已解除講師身份綁定！`;

            sendLineMessage(userUnbindMessage, userId).catch(err => {
                console.error('使用者解除綁定通知發送失敗:', err);
            });
            
            sendLineMessage(adminUnbindMessage).catch(err => {
                console.error('管理員解除綁定通知發送失敗:', err);
            });

            res.json({ 
                success: true, 
                message: '講師身份解除綁定成功',
                richMenuResult: richMenuResult
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: '解除綁定失敗' 
            });
        }
    } catch (error) {
        console.error('解除講師綁定錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '解除綁定失敗' 
        });
    }
});

// API路由：取得使用者綁定記錄
app.post('/api/get-teacher-bindings', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要參數' 
            });
        }

        const bindings = await db.getTeacherBindings(userId);
        
        res.json({ 
            success: true, 
            bindings: bindings
        });
    } catch (error) {
        console.error('取得講師綁定記錄錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '取得綁定記錄失敗' 
        });
    }
});

// API路由：查詢所有講師綁定記錄
app.get('/api/teacher-bindings', async (req, res) => {
    try {
        const stmt = db.db.prepare(`
            SELECT 
                tb.*,
                u.displayName,
                u.userName
            FROM teacher_bindings tb
            LEFT JOIN users u ON tb.userId = u.userId
            WHERE tb.isActive = 1
            ORDER BY tb.boundAt DESC
        `);
        const bindings = stmt.all();
        
        res.json({ 
            success: true, 
            bindings: bindings,
            count: bindings.length
        });
    } catch (error) {
        console.error('查詢講師綁定記錄錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '查詢綁定記錄失敗' 
        });
    }
});

// API路由：查詢特定使用者的綁定記錄
app.get('/api/teacher-bindings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const stmt = db.db.prepare(`
            SELECT 
                tb.*,
                u.displayName,
                u.userName
            FROM teacher_bindings tb
            LEFT JOIN users u ON tb.userId = u.userId
            WHERE tb.userId = ? AND tb.isActive = 1
            ORDER BY tb.boundAt DESC
        `);
        const bindings = stmt.all(userId);
        
        res.json({ 
            success: true, 
            bindings: bindings,
            count: bindings.length
        });
    } catch (error) {
        console.error('查詢使用者綁定記錄錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '查詢綁定記錄失敗' 
        });
    }
});

// 啟動伺服器
async function startServer() {
    try {
        // 初始化資料庫
        await db.init();
        console.log('資料庫初始化完成');

        // 啟動伺服器
        app.listen(PORT, async () => {
            console.log(`伺服器運行在 http://localhost:${PORT}`);
            console.log('FLB講師簽到系統已啟動！');
            console.log('🎉 系統完全啟動完成！');
        });
    } catch (error) {
        console.error('伺服器啟動失敗:', error);
        process.exit(1);
    }
}

// 優雅關閉
process.on('SIGINT', () => {
    console.log('\n正在關閉伺服器...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在關閉伺服器...');
    db.close();
    process.exit(0);
});

startServer();
