const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// const DatabaseManager = require('./database'); // 已改用 Google Sheets 資料庫

// 引入講師ID對應表模組
const {
    teacherIdMapping,
    findTeacherLineId,
    findTeacherNameByLineId,
    getAllTeacherNames,
    getAllLineIds,
    isTeacherExists,
    isLineIdExists,
    getTeacherCount
} = require('./teacher_mapping');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 重定向舊的 API 端點到新的端點（向後兼容）
app.all('/api/attendance/course-students', (req, res) => {
    console.log('🔄 重定向舊 API 端點 /api/attendance/course-students 到 /api/course-students');
    res.redirect(307, '/api/course-students');
});

app.all('/api/attendance/student-attendance', (req, res) => {
    console.log('🔄 重定向舊 API 端點 /api/attendance/student-attendance 到 /api/student-attendance');
    res.redirect(307, '/api/student-attendance');
});

app.all('/api/attendance/teacher-report', (req, res) => {
    console.log('🔄 重定向舊 API 端點 /api/attendance/teacher-report 到 /api/teacher-report');
    res.redirect(307, '/api/teacher-report');
});

app.all('/api/attendance/teachers', (req, res) => {
    console.log('🔄 重定向舊 API 端點 /api/attendance/teachers 到 /api/teachers');
    res.redirect(307, '/api/teachers');
});

app.all('/api/attendance/courses', (req, res) => {
    console.log('🔄 重定向舊 API 端點 /api/attendance/courses 到 /api/courses');
    res.redirect(307, '/api/courses');
});

// FLB API 基礎URL
const FLB_API_URL = 'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec';


// Link Calendar API URL (用於抓取 link_calender 資料庫)
const LINK_CALENDAR_API_URL = 'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec';

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

// 內部人員 Rich Menu 綁定函數 (使用 bulk link API)
async function bindInternalRichMenu(userId) {
    try {
        if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            console.log('LINE Channel Access Token 未設定，跳過內部人員Rich Menu綁定');
            return { success: false, message: 'LINE Channel Access Token 未設定' };
        }

        const url = 'https://api.line.me/v2/bot/richmenu/bulk/link';
        const payload = {
            richMenuId: 'richmenu-ea240e912adac3d741bacab213f0bbb9',
            userIds: [userId]
        };
        
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`✅ 內部人員Rich Menu 綁定成功給 ${userId}:`, response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ 內部人員Rich Menu 綁定失敗給 ${userId}:`, error.response?.data || error.message);
        return { 
            success: false, 
            error: error.response?.data || error.message,
            statusCode: error.response?.status
        };
    }
}

// 測試模式：解綁5分鐘後自動重新綁定
const testModeUsers = new Map(); // 儲存測試模式的使用者

async function startTestMode(userId) {
    console.log(`🧪 開始測試模式：${userId}`);
    
    // 先解綁
    const unbindResult = await unbindRichMenu(userId);
    if (!unbindResult.success) {
        console.log(`❌ 測試模式解綁失敗：${userId}`);
        return;
    }
    
    // 記錄測試模式使用者
    testModeUsers.set(userId, {
        startTime: Date.now(),
        originalRichMenu: RICH_MENU_ID
    });
    
    // 5分鐘後自動重新綁定
    setTimeout(async () => {
        console.log(`🔄 測試模式結束，重新綁定：${userId}`);
        
        // 重新綁定內部人員Rich Menu
        const rebindResult = await bindInternalRichMenu(userId);
        if (rebindResult.success) {
            console.log(`✅ 測試模式重新綁定成功：${userId}`);
        } else {
            console.log(`❌ 測試模式重新綁定失敗：${userId}`);
        }
        
        // 從測試模式記錄中移除
        testModeUsers.delete(userId);
    }, 5 * 60 * 1000); // 5分鐘
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

// 路由：首頁 (直接抓資料庫"上課時間")
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 路由：Link Calendar 版本 (抓資料庫"上課時間（link_calender）")
app.get('/link_calender', (req, res) => {
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

// API路由：獲取講師的課程 (直接抓資料庫"上課時間")
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

// API路由：獲取講師的課程 (抓資料庫"上課時間（link_calender）")
app.post('/api/teacher-courses-link', async (req, res) => {
    try {
        const { teacher } = req.body;
        const response = await axios.post(LINK_CALENDAR_API_URL, {
            action: 'getCoursesByTeacher',
            teacher: teacher,
            source: 'link'
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('獲取講師課程錯誤 (Link Calendar):', error);
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

// API路由：直接返回步驟三頁面
app.get('/step3', async (req, res) => {
    try {
        const { teacher, course, time } = req.query;
        
        // 驗證必要參數
        if (!teacher || !course || !time) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>參數錯誤</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>❌ 缺少必要參數</h2>
                        <p>請提供 teacher、course 和 time 參數</p>
                        <p>範例：/step3?teacher=Tim&course=數學課&time=09:00-10:00</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        console.log(`🎯 直接返回步驟三頁面請求:`, { teacher, course, time });
        
        // 驗證講師是否存在
        const teachersResponse = await axios.post(FLB_API_URL, {
            action: 'getTeacherList'
        });
        
        if (!teachersResponse.data.success || !teachersResponse.data.teachers) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>講師列表錯誤</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>❌ 無法獲取講師列表</h2>
                        <p>請稍後再試</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        // 高級模糊匹配函數
        const fuzzyMatch = (input, target, options = {}) => {
            const {
                caseSensitive = false,
                ignoreSpaces = true,
                minSimilarity = 0.6,
                exactMatch = true,
                partialMatch = true
            } = options;
            
            let normalizedInput = input;
            let normalizedTarget = target;
            
            if (!caseSensitive) {
                normalizedInput = normalizedInput.toLowerCase();
                normalizedTarget = normalizedTarget.toLowerCase();
            }
            
            if (ignoreSpaces) {
                normalizedInput = normalizedInput.replace(/\s+/g, ' ').trim();
                normalizedTarget = normalizedTarget.replace(/\s+/g, ' ').trim();
            }
            
            // 完全匹配
            if (exactMatch && normalizedInput === normalizedTarget) {
                return { match: true, similarity: 1.0, type: 'exact' };
            }
            
            // 包含匹配
            if (partialMatch) {
                if (normalizedTarget.includes(normalizedInput)) {
                    return { match: true, similarity: 0.9, type: 'target_includes_input' };
                }
                if (normalizedInput.includes(normalizedTarget)) {
                    return { match: true, similarity: 0.8, type: 'input_includes_target' };
                }
            }
            
            // 計算相似度（簡化版 Levenshtein 距離）
            const similarity = calculateSimilarity(normalizedInput, normalizedTarget);
            
            return {
                match: similarity >= minSimilarity,
                similarity: similarity,
                type: similarity >= minSimilarity ? 'fuzzy' : 'no_match'
            };
        };
        
        // 計算字符串相似度
        const calculateSimilarity = (str1, str2) => {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            
            if (longer.length === 0) return 1.0;
            
            const distance = levenshteinDistance(longer, shorter);
            return (longer.length - distance) / longer.length;
        };
        
        // Levenshtein 距離算法
        const levenshteinDistance = (str1, str2) => {
            const matrix = [];
            
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[str2.length][str1.length];
        };
        
        // 模糊匹配講師名稱
        console.log(`🔍 開始模糊匹配講師: "${teacher}"`);
        
        let bestTeacherMatch = null;
        let bestTeacherSimilarity = 0;
        
        for (const t of teachersResponse.data.teachers) {
            const match = fuzzyMatch(teacher, t.name, {
                caseSensitive: false,
                ignoreSpaces: true,
                minSimilarity: 0.5
            });
            
            console.log(`  - 比對 "${t.name}": 相似度 ${match.similarity.toFixed(3)}, 類型: ${match.type}`);
            
            if (match.match && match.similarity > bestTeacherSimilarity) {
                bestTeacherMatch = t;
                bestTeacherSimilarity = match.similarity;
            }
        }
        
        if (!bestTeacherMatch) {
            const availableTeachers = teachersResponse.data.teachers.map(t => t.name).join(', ');
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>講師不存在</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
                        .suggestions { background: #e9ecef; padding: 15px; margin: 10px 0; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>❌ 找不到講師 "${teacher}"</h2>
                        <p>請檢查講師名稱是否正確</p>
                        <div class="suggestions">
                            <h4>可用的講師：</h4>
                            <p>${availableTeachers}</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
        }
        
        const actualTeacherName = bestTeacherMatch.name;
        console.log(`✅ 找到最佳匹配講師: "${actualTeacherName}" (相似度: ${bestTeacherSimilarity.toFixed(3)})`);
        
        // 驗證課程是否存在
        const coursesResponse = await axios.post(FLB_API_URL, {
            action: 'getCoursesByTeacher',
            teacher: actualTeacherName
        });
        
        if (!coursesResponse.data.success || !coursesResponse.data.courseTimes) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>課程列表錯誤</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>❌ 無法獲取課程列表</h2>
                        <p>請稍後再試</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        // 精確匹配課程和時間
        console.log(`🔍 開始精確匹配課程: "${course}" 時間: "${time}"`);
        
        const courseExists = coursesResponse.data.courseTimes.some(c => 
            c.course === course && c.time === time
        );
        
        if (!courseExists) {
            const availableCourses = coursesResponse.data.courseTimes.map(c => `${c.course} (${c.time})`).join(', ');
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>課程不存在</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
                        .suggestions { background: #e9ecef; padding: 15px; margin: 10px 0; border-radius: 5px; }
                        .input-info { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>❌ 課程 "${course}" 在時間 "${time}" 不存在</h2>
                        <div class="input-info">
                            <p><strong>您輸入的：</strong></p>
                            <p>講師：${actualTeacherName}</p>
                            <p>課程：${course}</p>
                            <p>時間：${time}</p>
                        </div>
                        <div class="suggestions">
                            <h4>可用的課程：</h4>
                            <p>${availableCourses}</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
        }
        
        const actualCourse = course;
        const actualTime = time;
        console.log(`✅ 找到精確匹配課程: "${actualCourse}" 時間: "${actualTime}"`);
        
        // 獲取學生列表
        console.log(`📤 調用 getRosterAttendance API:`, {
            course: actualCourse,
            time: actualTime,
            action: 'getRosterAttendance'
        });
        
        const studentsResponse = await axios.post('https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec', {
            action: 'getRosterAttendance',
            course: actualCourse,
            period: actualTime
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'NID=525=nsWVvbAon67C2qpyiEHQA3SUio_GqBd7RqUFU6BwB97_4LHggZxLpDgSheJ7WN4w3Z4dCQBiFPG9YKAqZgAokFYCuuQw04dkm-FX9-XHAIBIqJf1645n3RZrg86GcUVJOf3gN-5eTHXFIaovTmgRC6cXllv82SnQuKsGMq7CHH60XDSwyC99s9P2gmyXLppI'
            }
        });
        
        console.log(`📥 getRosterAttendance API 回應:`, {
            success: studentsResponse.data.success,
            course: studentsResponse.data.course,
            period: studentsResponse.data.period,
            count: studentsResponse.data.count,
            studentsCount: studentsResponse.data.students ? studentsResponse.data.students.length : 0
        });
        
        let students = [];
        if (studentsResponse.data.success && studentsResponse.data.students) {
            // 處理學生簽到狀態
            const checkDate = new Date().toISOString().split('T')[0];
            
            students = studentsResponse.data.students.map(student => {
                let hasAttendanceToday = null;
                let todayAttendanceRecord = null;
                
                if (student.attendance && Array.isArray(student.attendance)) {
                    todayAttendanceRecord = student.attendance.find(record => record.date === checkDate);
                    
                    if (todayAttendanceRecord) {
                        if (todayAttendanceRecord.present === true) {
                            hasAttendanceToday = true;
                        } else if (todayAttendanceRecord.present === false) {
                            hasAttendanceToday = false;
                        } else if (todayAttendanceRecord.present === "leave") {
                            hasAttendanceToday = "leave";
                        } else {
                            hasAttendanceToday = null;
                        }
                    } else {
                        hasAttendanceToday = null;
                    }
                } else {
                    hasAttendanceToday = null;
                }
                
                return {
                    name: student.name,
                    foundInCourseSheet: student.foundInCourseSheet,
                    remaining: student.remaining,
                    hasAttendanceToday: hasAttendanceToday,
                    attendanceRecords: student.attendance || [],
                    todayAttendanceRecord: todayAttendanceRecord
                };
            });
        }
        
        // 生成步驟三頁面 HTML
        const step3HTML = generateStep3Page(actualTeacherName, actualCourse, actualTime, students);
        res.send(step3HTML);
        
    } catch (error) {
        console.error('直接返回步驟三頁面錯誤:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>伺服器錯誤</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="error">
                    <h2>❌ 伺服器內部錯誤</h2>
                    <p>請稍後再試</p>
                </div>
            </body>
            </html>
        `);
    }
});

// 生成步驟三頁面的 HTML
function generateStep3Page(teacher, course, time, students) {
    const studentsHTML = students.map(student => {
        let statusText, statusClass;
        
        if (student.hasAttendanceToday === true) {
            statusText = '✅ 已簽到且出席';
            statusClass = 'status-signed-in-present';
        } else if (student.hasAttendanceToday === false) {
            statusText = '❌ 已簽到但缺席';
            statusClass = 'status-signed-in-absent';
        } else if (student.hasAttendanceToday === "leave") {
            statusText = '🏠 請假';
            statusClass = 'status-leave';
        } else {
            statusText = '⚠️ 未簽到';
            statusClass = 'status-not-signed-in';
        }
        
        return `
            <div class="student-item">
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="attendance-status ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                <div class="attendance-buttons">
                    <button class="btn-attendance btn-present" onclick="markAttendance('${student.name}', true, this)">
                        <i class="fas fa-check"></i> 出席
                    </button>
                    <button class="btn-attendance btn-absent" onclick="markAttendance('${student.name}', false, this)">
                        <i class="fas fa-times"></i> 缺席
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>學生簽到 - ${course}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                
                .header h1 {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                
                .course-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .course-info h2 {
                    color: #495057;
                    margin-bottom: 10px;
                }
                
                .course-details {
                    display: flex;
                    gap: 30px;
                    flex-wrap: wrap;
                }
                
                .course-detail {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #6c757d;
                }
                
                .course-detail i {
                    color: #667eea;
                }
                
                .teacher-checkin-section {
                    padding: 30px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .teacher-checkin-section h2 {
                    color: #495057;
                    margin-bottom: 20px;
                }
                
                .teacher-checkin-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    max-width: 600px;
                }
                
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .form-group label {
                    font-weight: 600;
                    color: #495057;
                }
                
                .form-group textarea,
                .form-group input {
                    padding: 12px;
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.3s ease;
                }
                
                .form-group textarea:focus,
                .form-group input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .btn-teacher-checkin {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    align-self: flex-start;
                }
                
                .btn-teacher-checkin:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
                }
                
                .btn-teacher-checkin:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .student-section {
                    padding: 30px;
                }
                
                .student-list {
                    display: grid;
                    gap: 15px;
                }
                
                .student-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    background: white;
                    transition: all 0.3s ease;
                }
                
                .student-item:hover {
                    border-color: #667eea;
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
                }
                
                .student-info {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .student-name {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #495057;
                }
                
                .attendance-status {
                    font-size: 0.9rem;
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-weight: 500;
                }
                
                .status-signed-in-present {
                    background: #d4edda;
                    color: #155724;
                }
                
                .status-signed-in-absent {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .status-leave {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .status-not-signed-in {
                    background: #f8f9fa;
                    color: #6c757d;
                }
                
                .attendance-buttons {
                    display: flex;
                    gap: 10px;
                }
                
                .btn-attendance {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .btn-present {
                    background: #28a745;
                    color: white;
                }
                
                .btn-present:hover {
                    background: #218838;
                    transform: translateY(-2px);
                }
                
                .btn-absent {
                    background: #dc3545;
                    color: white;
                }
                
                .btn-absent:hover {
                    background: #c82333;
                    transform: translateY(-2px);
                }
                
                .no-students {
                    text-align: center;
                    padding: 50px;
                    color: #6c757d;
                    font-size: 1.1rem;
                }
                
                .back-button {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: rgba(255,255,255,0.9);
                    border: none;
                    padding: 15px 20px;
                    border-radius: 50px;
                    cursor: pointer;
                    font-weight: 600;
                    color: #495057;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                }
                
                .back-button:hover {
                    background: white;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                
                @media (max-width: 768px) {
                    .student-item {
                        flex-direction: column;
                        gap: 15px;
                        text-align: center;
                    }
                    
                    .attendance-buttons {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .course-details {
                        flex-direction: column;
                        gap: 15px;
                    }
                }
            </style>
        </head>
        <body>
            <a href="/" class="back-button">
                <i class="fas fa-arrow-left"></i>
                返回首頁
            </a>
            
            <div class="container">
                <div class="header">
                    <h1><i class="fas fa-users"></i> 學生簽到</h1>
                </div>
                
                <div class="course-info">
                    <h2><i class="fas fa-book"></i> 課程資訊</h2>
                    <div class="course-details">
                        <div class="course-detail">
                            <i class="fas fa-user-tie"></i>
                            <span>講師：${teacher}</span>
                        </div>
                        <div class="course-detail">
                            <i class="fas fa-book"></i>
                            <span>課程：${course}</span>
                        </div>
                        <div class="course-detail">
                            <i class="fas fa-clock"></i>
                            <span>時間：${time}</span>
                        </div>
                    </div>
                </div>
                
                <div class="teacher-checkin-section">
                    <h2><i class="fas fa-user-tie"></i> 講師簽到</h2>
                    <div class="teacher-checkin-form">
                        <div class="form-group">
                            <label for="course-content">課程內容：</label>
                            <textarea id="course-content" placeholder="請輸入課程內容..." rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="student-count">學生人數：</label>
                            <input type="number" id="student-count" value="0" min="0" max="99">
                        </div>
                        <button class="btn-teacher-checkin" onclick="submitTeacherCheckin()">
                            <i class="fas fa-check-circle"></i> 講師簽到
                        </button>
                    </div>
                </div>
                
                <div class="student-section">
                    <h2><i class="fas fa-list"></i> 學生名單 (${students.length} 人)</h2>
                    <div class="student-list">
                        ${students.length > 0 ? studentsHTML : '<div class="no-students">沒有學生資料</div>'}
                    </div>
                </div>
            </div>
            
            <script>
                // 講師簽到
                async function submitTeacherCheckin() {
                    const courseContent = document.getElementById('course-content').value.trim();
                    const studentCount = parseInt(document.getElementById('student-count').value) || 0;
                    
                    if (!courseContent) {
                        alert('請填寫課程內容');
                        return;
                    }
                    
                    const button = document.querySelector('.btn-teacher-checkin');
                    const originalContent = button.innerHTML;
                    
                    // 顯示載入狀態
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
                    button.disabled = true;
                    
                    try {
                        const today = new Date();
                        const formattedDate = today.getFullYear() + '/' + 
                            String(today.getMonth() + 1).padStart(2, '0') + '/' + 
                            String(today.getDate()).padStart(2, '0');
                        
                        const response = await fetch('/api/teacher-report', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                teacherName: '${teacher}',
                                courseName: '${course}',
                                courseTime: '${time}',
                                date: formattedDate,
                                studentCount: studentCount,
                                courseContent: courseContent,
                                webApi: '' // 使用預設 API
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            alert('講師簽到成功！');
                            // 禁用表單
                            document.getElementById('course-content').disabled = true;
                            document.getElementById('student-count').disabled = true;
                            button.innerHTML = '<i class="fas fa-check"></i> 已簽到';
                        } else {
                            alert('講師簽到失敗：' + (data.error || '未知錯誤'));
                            // 恢復按鈕狀態
                            button.innerHTML = originalContent;
                            button.disabled = false;
                        }
                    } catch (error) {
                        console.error('講師簽到錯誤:', error);
                        alert('講師簽到失敗，請檢查網路連線');
                        // 恢復按鈕狀態
                        button.innerHTML = originalContent;
                        button.disabled = false;
                    }
                }
                
                // 標記學生出勤
                async function markAttendance(studentName, present, buttonElement) {
                    try {
                        const response = await fetch('/api/student-attendance', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                studentName: studentName,
                                date: new Date().toISOString().split('T')[0],
                                present: present,
                                teacherName: '${teacher}',
                                courseName: '${course}'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // 更新狀態顯示
                            const studentItem = buttonElement.closest('.student-item');
                            const statusElement = studentItem.querySelector('.attendance-status');
                            
                            if (present) {
                                statusElement.textContent = '✅ 已簽到且出席';
                                statusElement.className = 'attendance-status status-signed-in-present';
                            } else {
                                statusElement.textContent = '❌ 已簽到但缺席';
                                statusElement.className = 'attendance-status status-signed-in-absent';
                            }
                            
                            // 禁用按鈕
                            const buttons = studentItem.querySelectorAll('.btn-attendance');
                            buttons.forEach(btn => btn.disabled = true);
                            
                            alert('簽到成功！');
                        } else {
                            alert('簽到失敗：' + (data.error || '未知錯誤'));
                        }
                    } catch (error) {
                        console.error('簽到錯誤:', error);
                        alert('簽到失敗，請檢查網路連線');
                    }
                }
            </script>
        </body>
        </html>
    `;
}

// API路由：直接跳轉到第三步驟
app.post('/api/direct-step3', async (req, res) => {
    try {
        const { teacher, course, time } = req.body;
        
        // 驗證必要參數
        if (!teacher || !course || !time) {
            return res.status(400).json({
                success: false,
                error: '缺少必要參數：teacher, course, time'
            });
        }
        
        console.log(`🎯 直接跳轉到第三步驟請求:`, { teacher, course, time });
        
        // 驗證講師是否存在
        const teachersResponse = await axios.post(FLB_API_URL, {
            action: 'getTeacherList'
        });
        
        if (!teachersResponse.data.success || !teachersResponse.data.teachers) {
            return res.status(400).json({
                success: false,
                error: '無法獲取講師列表'
            });
        }
        
        // 模糊匹配講師名稱（去除空格和特殊字符）
        const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');
        const normalizedTeacher = normalizeName(teacher);
        
        const teacherExists = teachersResponse.data.teachers.some(t => {
            const normalizedTeacherName = normalizeName(t.name);
            return normalizedTeacherName === normalizedTeacher || 
                   normalizedTeacherName.includes(normalizedTeacher) ||
                   normalizedTeacher.includes(normalizedTeacherName);
        });
        
        if (!teacherExists) {
            // 提供可用的講師名稱建議
            const availableTeachers = teachersResponse.data.teachers.map(t => t.name).join(', ');
            return res.status(400).json({
                success: false,
                error: `講師 "${teacher}" 不存在。可用的講師：${availableTeachers}`
            });
        }
        
        // 找到匹配的講師對象
        const matchedTeacher = teachersResponse.data.teachers.find(t => {
            const normalizedTeacherName = normalizeName(t.name);
            return normalizedTeacherName === normalizedTeacher || 
                   normalizedTeacherName.includes(normalizedTeacher) ||
                   normalizedTeacher.includes(normalizedTeacherName);
        });
        
        const actualTeacherName = matchedTeacher.name;
        
        // 驗證課程是否存在
        const coursesResponse = await axios.post(FLB_API_URL, {
            action: 'getCoursesByTeacher',
            teacher: actualTeacherName
        });
        
        if (!coursesResponse.data.success || !coursesResponse.data.courseTimes) {
            return res.status(400).json({
                success: false,
                error: '無法獲取課程列表'
            });
        }
        
        const courseExists = coursesResponse.data.courseTimes.some(c => 
            c.course === course && c.time === time
        );
        
        if (!courseExists) {
            return res.status(400).json({
                success: false,
                error: `課程 "${course}" 在時間 "${time}" 不存在`
            });
        }
        
        // 獲取學生列表
        const studentsResponse = await axios.post(FLB_API_URL, {
            action: 'getRosterAttendance',
            course: course,
            time: time
        });
        
        let students = [];
        if (studentsResponse.data.success && studentsResponse.data.students) {
            // 處理學生簽到狀態（與 course-students API 相同的邏輯）
            const checkDate = new Date().toISOString().split('T')[0];
            
            students = studentsResponse.data.students.map(student => {
                let hasAttendanceToday = null;
                let todayAttendanceRecord = null;
                
                if (student.attendance && Array.isArray(student.attendance)) {
                    todayAttendanceRecord = student.attendance.find(record => record.date === checkDate);
                    
                    if (todayAttendanceRecord) {
                        if (todayAttendanceRecord.present === true) {
                            hasAttendanceToday = true;
                        } else if (todayAttendanceRecord.present === false) {
                            hasAttendanceToday = false;
                        } else if (todayAttendanceRecord.present === "leave") {
                            hasAttendanceToday = "leave";
                        } else {
                            hasAttendanceToday = null;
                        }
                    } else {
                        hasAttendanceToday = null;
                    }
                } else {
                    hasAttendanceToday = null;
                }
                
                return {
                    name: student.name,
                    foundInCourseSheet: student.foundInCourseSheet,
                    remaining: student.remaining,
                    hasAttendanceToday: hasAttendanceToday,
                    attendanceRecords: student.attendance || [],
                    todayAttendanceRecord: todayAttendanceRecord
                };
            });
        }
        
        // 返回跳轉所需的資料
        res.json({
            success: true,
            message: '成功獲取跳轉資料',
            data: {
                teacher: actualTeacherName, // 使用實際的講師名稱
                course: course,
                time: time,
                students: students,
                redirectUrl: `/?step=3&teacher=${encodeURIComponent(actualTeacherName)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`
            }
        });
        
    } catch (error) {
        console.error('直接跳轉到第三步驟錯誤:', error);
        res.status(500).json({
            success: false,
            error: '伺服器內部錯誤'
        });
    }
});

// API路由：獲取特定課程的學生（使用新的出缺席狀態 API）
app.post('/api/course-students', async (req, res) => {
    try {
        const { course, time, date } = req.body;
        
        // 使用新的 API 來獲取學生名單和出缺席狀態
        console.log(`📤 調用 getRosterAttendance API:`, {
            course: course,
            time: time,
            date: date,
            action: 'getRosterAttendance'
        });
        
        const response = await axios.post('https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec', {
            action: 'getRosterAttendance',
            course: course,
            period: time
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'NID=525=nsWVvbAon67C2qpyiEHQA3SUio_GqBd7RqUFU6BwB97_4LHggZxLpDgSheJ7WN4w3Z4dCQBiFPG9YKAqZgAokFYCuuQw04dkm-FX9-XHAIBIqJf1645n3RZrg86GcUVJOf3gN-5eTHXFIaovTmgRC6cXllv82SnQuKsGMq7CHH60XDSwyC99s9P2gmyXLppI'
            }
        });
        
        console.log(`📥 getRosterAttendance API 回應:`, {
            success: response.data.success,
            course: response.data.course,
            period: response.data.period,
            count: response.data.count,
            studentsCount: response.data.students ? response.data.students.length : 0
        });
        
        // 詳細記錄每個學生的簽到記錄
        if (response.data.students) {
            response.data.students.forEach(student => {
                console.log(`📋 學生 ${student.name} 的簽到記錄:`, student.attendance);
            });
        }
        
        // 轉換 API 回應格式以符合前端需求
        if (response.data.success && response.data.students) {
            // 使用傳入的日期，如果沒有則使用今天的日期
            const checkDate = date || new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD
            console.log(`🔍 檢查學生簽到狀態，檢查日期: ${checkDate}`);
            
            const students = response.data.students.map(student => {
                // 檢查學生是否有指定日期的簽到紀錄
                let hasAttendanceToday = null; // null: 未簽到, true: 已簽到且出席, false: 已簽到但缺席
                let todayAttendanceRecord = null;
                
                if (student.attendance && Array.isArray(student.attendance)) {
                    todayAttendanceRecord = student.attendance.find(record => record.date === checkDate);
                    
                    // 判斷簽到狀態：未簽到、已簽到且出席、已簽到但缺席、請假
                    if (todayAttendanceRecord) {
                        if (todayAttendanceRecord.present === true) {
                            hasAttendanceToday = true; // 已簽到且出席
                        } else if (todayAttendanceRecord.present === false) {
                            hasAttendanceToday = false; // 已簽到但缺席
                        } else if (todayAttendanceRecord.present === "leave") {
                            hasAttendanceToday = "leave"; // 請假
                        } else {
                            hasAttendanceToday = null; // 其他情況視為未簽到
                        }
                    } else {
                        hasAttendanceToday = null; // null 表示未簽到
                    }
                    
                    console.log(`👤 學生 ${student.name}:`, {
                        attendanceRecords: student.attendance,
                        todayRecord: todayAttendanceRecord,
                        hasAttendanceToday: hasAttendanceToday,
                        checkDate: checkDate,
                        status: todayAttendanceRecord ? 
                            (todayAttendanceRecord.present === true ? '已簽到且出席' : 
                             todayAttendanceRecord.present === false ? '已簽到但缺席' :
                             todayAttendanceRecord.present === "leave" ? '請假' : '未知狀態') : 
                            '未簽到'
                    });
                } else {
                    console.log(`👤 學生 ${student.name}: 沒有簽到記錄或格式不正確`, student.attendance);
                    hasAttendanceToday = null; // null 表示未簽到
                }
                
                return {
                    name: student.name,
                    foundInCourseSheet: student.foundInCourseSheet,
                    remaining: student.remaining,
                    hasAttendanceToday: hasAttendanceToday,
                    attendanceRecords: student.attendance || [],
                    todayAttendanceRecord: todayAttendanceRecord
                };
            });
            
            res.json({
                success: true,
                students: students,
                course: response.data.course,
                period: response.data.period,
                count: response.data.count
            });
        } else {
            res.json({
                success: false,
                error: '無法獲取學生名單',
                students: []
            });
        }
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
                const messageText = event.message.text;
                const userId = event.source?.userId;
                
                console.log('收到訊息:', messageText);
                console.log('用戶 ID:', userId || '未知');
                
                if (userId) {
                    // 檢查關鍵字
                    if (messageText === '#內部人員') {
                        console.log(`🔑 檢測到關鍵字「#內部人員」來自 ${userId}`);
                        
                        try {
                            // 綁定內部人員 Rich Menu
                            const bindResult = await bindInternalRichMenu(userId);
                            
                            if (bindResult.success) {
                                // 發送成功回覆
                                const successMessage = '切換為內部人員模式,FunLearnBar歡迎您！';
                                await sendLineMessage(successMessage, userId);
                                console.log(`✅ 內部人員模式綁定成功: ${userId}`);
                            } else {
                                // 發送失敗回覆
                                const failMessage = '❌ 內部人員模式綁定失敗，請稍後再試';
                                await sendLineMessage(failMessage, userId);
                                console.log(`❌ 內部人員模式綁定失敗: ${userId}`);
                            }
                        } catch (error) {
                            console.error('❌ 處理內部人員綁定失敗:', error);
                            const errorMessage = '❌ 系統錯誤，請稍後再試';
                            await sendLineMessage(errorMessage, userId);
                        }
                        
                        return; // 處理完關鍵字後直接返回
                    }
                    
                    if (messageText === '#解綁') {
                        console.log(`🔑 檢測到關鍵字「#解綁」來自 ${userId}`);
                        
                        try {
                            // 解除 Rich Menu 綁定
                            const unbindResult = await unbindRichMenu(userId);
                            
                            if (unbindResult.success) {
                                // 發送成功回覆
                                const successMessage = '✅ Rich Menu 已成功解除綁定！';
                                await sendLineMessage(successMessage, userId);
                                console.log(`✅ Rich Menu 解綁成功: ${userId}`);
                            } else {
                                // 發送失敗回覆
                                const failMessage = '❌ Rich Menu 解綁失敗，請稍後再試';
                                await sendLineMessage(failMessage, userId);
                                console.log(`❌ Rich Menu 解綁失敗: ${userId}`);
                            }
                        } catch (error) {
                            console.error('❌ 處理解綁失敗:', error);
                            const errorMessage = '❌ 系統錯誤，請稍後再試';
                            await sendLineMessage(errorMessage, userId);
                        }
                        
                        return; // 處理完關鍵字後直接返回
                    }
                    
                    if (messageText === '#測試') {
                        console.log(`🔑 檢測到關鍵字「#測試」來自 ${userId}`);
                        
                        try {
                            // 開始測試模式
                            await startTestMode(userId);
                            
                            // 發送測試模式開始通知
                            const testMessage = '🧪 測試模式已啟動！\n\n⏰ 將在5分鐘後自動重新綁定內部人員模式\n\n📝 測試記錄：\n• 使用者ID：' + userId + '\n• 開始時間：' + new Date().toLocaleString('zh-TW');
                            await sendLineMessage(testMessage, userId);
                            console.log(`✅ 測試模式已啟動: ${userId}`);
                        } catch (error) {
                            console.error('❌ 處理測試模式失敗:', error);
                            const errorMessage = '❌ 測試模式啟動失敗，請稍後再試';
                            await sendLineMessage(errorMessage, userId);
                        }
                        
                        return; // 處理完關鍵字後直接返回
                    }
                    
                    // 原有的使用者註冊和上傳邏輯
                    console.log('請將此 User ID 設定到環境變數:');
                    console.log('LINE_USER_ID =', userId);
                    
                    // 獲取使用者資訊並上傳到Google Sheets
                    try {
                        // 從LINE API獲取使用者資訊
                        const profileResponse = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
                            headers: {
                                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                            },
                            timeout: 10000
                        });
                        
                        const displayName = profileResponse.data.displayName;
                        console.log(`獲取到使用者資訊: ${displayName} (${userId})`);
                        
                        // 上傳到Google Sheets
                        const uploadResult = await uploadUserToGoogleSheets(userId, displayName);
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
                                isTeacher = teachers.some(teacher => teacher.userId === userId);
                                console.log(`使用者 ${displayName} 是否為講師: ${isTeacher}`);
                            }
                        } catch (teacherError) {
                            console.log('❌ 檢查講師身份失敗:', teacherError.message);
                        }
                        
                        // 同時儲存到本地資料庫
                        try {
                            await db.registerUser({
                                userId: userId,
                                displayName: displayName,
                                userName: displayName,
                                pictureUrl: profileResponse.data.pictureUrl,
                                registeredAt: new Date().toISOString(),
                                lastLogin: new Date().toISOString()
                            });
                            console.log('✅ 使用者資訊已儲存到本地資料庫');
                            
                            // 只有講師才發送綁定通知
                            if (isTeacher) {
                                const bindingMessage = `🎉 歡迎使用FLB講師簽到系統！\n\n👤 您的資訊：\n• 姓名：${displayName}\n• User ID：${userId}\n\n📱 請點擊以下連結開始使用：\n${SYSTEM_URL}\n\n💡 首次使用時，系統會要求您選擇講師身份進行綁定。`;
                                
                                try {
                                    await sendLineMessage(bindingMessage, userId);
                                    console.log('✅ 講師綁定通知已發送');
                                } catch (notifyError) {
                                    console.log('❌ 發送講師綁定通知失敗:', notifyError.message);
                                }
                                
                                // 發送管理員通知（講師註冊）
                                const adminMessage = `🔔 講師註冊通知\n\n👤 講師資訊：\n• 姓名：${displayName}\n• User ID：${userId}\n• 註冊時間：${new Date().toLocaleString('zh-TW')}\n\n📊 系統狀態：\n• 總使用者數：${await db.getUserCount()}\n• 活躍綁定數：${await db.getActiveBindingCount()}`;
                                
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
                            const uploadResult = await uploadUserToGoogleSheets(userId, '未知使用者');
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

// API路由：獲取講師對應表資訊
app.get('/api/teacher-mapping', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                teacherCount: getTeacherCount(),
                teacherNames: getAllTeacherNames(),
                lineIds: getAllLineIds(),
                mapping: teacherIdMapping
            }
        });
    } catch (error) {
        console.error('獲取講師對應表錯誤:', error);
        res.status(500).json({
            success: false,
            error: '獲取講師對應表失敗'
        });
    }
});

// API路由：檢查講師是否存在
app.post('/api/check-teacher', (req, res) => {
    try {
        const { teacherName, lineId } = req.body;
        
        if (teacherName) {
            const exists = isTeacherExists(teacherName);
            const mappedLineId = findTeacherLineId(teacherName);
            res.json({
                success: true,
                teacherName: teacherName,
                exists: exists,
                lineId: mappedLineId
            });
        } else if (lineId) {
            const exists = isLineIdExists(lineId);
            const mappedTeacherName = findTeacherNameByLineId(lineId);
            res.json({
                success: true,
                lineId: lineId,
                exists: exists,
                teacherName: mappedTeacherName
            });
        } else {
            res.status(400).json({
                success: false,
                error: '請提供講師名稱或LINE ID'
            });
        }
    } catch (error) {
        console.error('檢查講師錯誤:', error);
        res.status(500).json({
            success: false,
            error: '檢查講師失敗'
        });
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

        // 首先嘗試直接比對講師ID
        const teacherName = findTeacherNameByLineId(userId);
        if (teacherName) {
            console.log(`🎯 直接比對找到講師: ${teacherName} (${userId})`);
            return res.json({ 
                success: true, 
                isBound: true,
                teacherName: teacherName,
                teacherId: userId,
                source: 'direct_mapping'
            });
        }

        // 如果直接比對失敗，使用資料庫查詢
        const bindingInfo = await db.isTeacherBound(userId);
        
        res.json({ 
            success: true, 
            isBound: bindingInfo.isBound,
            teacherName: bindingInfo.teacherName,
            teacherId: bindingInfo.teacherId,
            source: 'database'
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
