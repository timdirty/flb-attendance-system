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
const RICH_MENU_ID = 'c172d1efe655f3134b5f1afafc879dc4';

// 資料庫實例
const db = new DatabaseManager();

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

        const url = LINE_RICH_MENU_API.replace('{userId}', userId);
        
        const response = await axios.post(url, {
            richMenuId: RICH_MENU_ID
        }, {
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

        const url = LINE_RICH_MENU_API.replace('{userId}', userId);
        
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

// 路由：首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 路由：管理後台
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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

        const userData = await db.checkUser(userId);
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
        const existingUser = await db.checkUser(userId);
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
        
        const notificationMessage = `📊 講師報表簽到通知\n\n` +
            `👨‍🏫 講師：${teacherName}\n` +
            `📖 課程：${courseName}\n` +
            `⏰ 時間：${courseTime}\n` +
            `📅 日期：${date}\n` +
            `👥 人數：${assistantCount}\n` +
            `📝 內容：${courseContent || '無'}\n\n` +
            `⏰ 簽到時間：${new Date().toLocaleString('zh-TW')}`;
        
        sendLineMessage(notificationMessage).catch(err => {
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
        
        const attendanceStatus = present ? '出席' : '缺席';
        const notificationMessage = `🔄 補簽到通知\n\n` +
            `👨‍🏫 講師：${teacherName || '未知'}\n` +
            `👨‍🎓 學生：${name}\n` +
            `📅 日期：${date}\n` +
            `📖 課程：${courseName || '未知'}\n` +
            `✅ 狀態：${attendanceStatus}\n\n` +
            `⏰ 補簽時間：${new Date().toLocaleString('zh-TW')}`;
        
        sendLineMessage(notificationMessage).catch(err => {
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
app.post('/webhook', (req, res) => {
    console.log('收到 LINE Webhook 請求:', req.body);
    
    res.status(200).send('OK');
    
    const events = req.body.events;
    if (events && events.length > 0) {
        events.forEach(event => {
            if (event.type === 'message' && event.message.type === 'text') {
                console.log('收到訊息:', event.message.text);
                console.log('用戶 ID:', event.source?.userId || '未知');
                
                if (event.source?.userId) {
                    console.log('請將此 User ID 設定到環境變數:');
                    console.log('LINE_USER_ID =', event.source.userId);
                }
            }
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

        const success = await db.bindTeacher(userId, teacherName, teacherId);
        
        if (success) {
            // 新增講師綁定記錄到資料庫
            await db.addTeacherBinding(userId, teacherName, teacherId);
            
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
        app.listen(PORT, () => {
            console.log(`伺服器運行在 http://localhost:${PORT}`);
            console.log(`FLB講師簽到系統已啟動！`);
            console.log(`資料庫檔案位置: ${db.dbPath}`);
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
