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

// 資料庫實例
const db = new DatabaseManager();

// LINE Messaging API 通知函數
async function sendLineMessage(message) {
    try {
        if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            console.log('LINE Channel Access Token 未設定，跳過通知');
            return { success: false, message: 'LINE Channel Access Token 未設定' };
        }

        if (!LINE_USER_ID || LINE_USER_ID === 'YOUR_USER_ID_HERE') {
            console.log('LINE User ID 未設定，使用測試模式');
            return { success: false, message: 'LINE User ID 未設定，請設定您的 User ID' };
        }

        const response = await axios.post(LINE_MESSAGING_API, {
            to: LINE_USER_ID,
            messages: [{
                type: 'text',
                text: message
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('LINE 訊息發送成功:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('LINE 訊息發送失敗:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// 路由：首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
        const notificationMessage = `🎉 新使用者註冊通知\n\n` +
            `👤 使用者名稱：${userName}\n` +
            `📱 LINE顯示名稱：${displayName || '無'}\n` +
            `🆔 使用者ID：${userId}\n` +
            `📧 電子郵件：${email || '未提供'}\n` +
            `⏰ 註冊時間：${new Date().toLocaleString('zh-TW')}\n\n` +
            `✅ 使用者已成功註冊到FLB簽到系統！`;

        // 非同步發送通知，不等待結果
        sendLineMessage(notificationMessage).catch(err => {
            console.error('註冊通知發送失敗:', err);
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
