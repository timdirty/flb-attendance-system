const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('./src/config');
dayjs.extend(utc);
dayjs.extend(timezone);
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
} = require('./src/teacher_mapping');

// 引入 Notion 記帳模組
const {
    recordIncomeToNotion,
    testNotionConnection,
    getNotionConfigStatus
} = require('./src/notion-accounting');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// ====== 新增：掛載訊息中心 API 路由 ======
try {
  const messageApi = require('./src/message-api');
  app.use('/api/message', messageApi);
  console.log('✅ 訊息中心 API 已掛載於 /api/message');
} catch (e) {
  console.log('⚠️ 無法掛載訊息中心 API：', e.message);
}

// ====== 新增：掛載關鍵字管理 API 路由 ======
try {
  const keywordApi = require('./src/keyword-api');
  app.use('/api/keywords', keywordApi);
  console.log('✅ 關鍵字管理 API 已掛載於 /api/keywords');
} catch (e) {
  console.log('⚠️ 無法掛載關鍵字管理 API：', e.message);
}

// ====== 新增：掛載內建功能管理 API 路由 ======
try {
  const featuresApi = require('./src/features-api');
  app.use('/api/features', featuresApi);
  console.log('✅ 內建功能管理 API 已掛載於 /api/features');
} catch (e) {
  console.log('⚠️ 無法掛載內建功能管理 API：', e.message);
}

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
const FLB_API_URL = process.env.FLB_API_URL || 'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec';


// Link Calendar API URL (用於抓取 link_calender 資料庫)
const LINK_CALENDAR_API_URL = 'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec';

// 報表查詢 API URL
const REPORT_API_URL = 'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec';

// Google Sheets「報表連結」工作表 API（讀取講師清單及報表讀取 API）
const GOOGLE_SHEETS_REPORT_LINK_API_URL = "https://sheets.googleapis.com/v4/spreadsheets/1A2dPb0iyvaqVGTOKqGcsq7aC6UHNttVcJ82r-G0xevk/values/'報表連結'!A:Z?key=AIzaSyDfYBGUCp1ixevg06acZCvWimwdqLKxh9Y";

// LINE Messaging API 配置
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
const LINE_USER_ID = process.env.LINE_USER_ID || 'YOUR_USER_ID_HERE';
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message/push';
const LINE_RICH_MENU_API = 'https://api.line.me/v2/bot/user/{userId}/richmenu';
const RICH_MENU_ID = '6636245039f343a37a8b7edc830c8cfa';

// 第二個Bot配置
const LINE_CHANNEL_ACCESS_TOKEN_2 = process.env.LINE_CHANNEL_ACCESS_TOKEN_2 || '';
const LINE_USER_ID_2 = process.env.LINE_USER_ID_2 || '';
const LINE_CHANNEL_ACCESS_TOKEN_3 = process.env.LINE_CHANNEL_ACCESS_TOKEN_3 || '';
const LINE_USER_ID_3 = process.env.LINE_USER_ID_3 || '';
const ENABLE_DUAL_BOT = false;
const ENABLE_TRIPLE_BOT = process.env.ENABLE_TRIPLE_BOT === 'true';

// 系統配置（已改用 config.server.systemUrl，此變數保留向後相容）
const SYSTEM_URL = config.server.systemUrl;

// Remittance records file (for internal confirmation & audit)
const REMITTANCE_RECORD_FILE = path.join(__dirname, 'src', 'data', 'remittance-records.json');
const REMITTANCE_INTENT_LOG_FILE = path.join(__dirname, 'src', 'data', 'remittance-intent-log.json');
const AMOUNT_CORRECTION_STATE_FILE = path.join(__dirname, 'src', 'data', 'amount-correction-state.json');

// Google Sheets API 配置
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbycZtdm2SGy07Sy06i2wM8oGNnERvEyyShUdTmHowlUmQz2kjS3I5VWdI1TszT1s2DCQA/exec';
const GOOGLE_SHEETS_COOKIE = 'NID=525=IPIqwCVm1Z3C00Y2MFXoevvCftm-rj9UdMlgYFhlRAHY0MKSCbEO7I8EBlGrz-nwjYxoXSFUrDHBqGrYNUotcoSE3v2npcVn-j3QZsc6SAKkZcMLR6y1MkF5dZlXnbBIqWgw9cJLT3SvAvmpXUZa6RADuBXFDZpvSM85zYAoym0yXcBn3C4ayGgOookqVJaH';

// 資料庫實例 - 使用Google Sheets資料庫
const GoogleSheetsDatabaseWithLocal = require('./src/googleSheetsDatabaseWithLocal');
const db = new GoogleSheetsDatabaseWithLocal();

// 設定 API 路由
const setupSettingsRoutes = require('./src/settings-api');

// Webhook 轉發器
const WebhookForwarder = require('./src/webhook-forwarder');
const webhookForwarder = new WebhookForwarder({
    targets: process.env.WEBHOOK_FORWARD_TARGETS ? 
        JSON.parse(process.env.WEBHOOK_FORWARD_TARGETS) : [],
    timeout: 5000,
    logEnabled: process.env.WEBHOOK_FORWARD_LOG !== 'false'
});

// 新的資料庫會自動處理初始化同步

// ==================== 學生請假功能 ====================

// 暫存等待理由的請假申請
const pendingLeaves = new Map();

// ==================== 匯款通知與確認 ====================
// 簡易檔案型儲存，避免資料遺失
function ensureRemittanceFile() {
    if (!fs.existsSync(REMITTANCE_RECORD_FILE)) {
        fs.writeFileSync(REMITTANCE_RECORD_FILE, '[]', 'utf8');
    }
}

function ensureRemittanceIntentLogFile() {
    if (!fs.existsSync(REMITTANCE_INTENT_LOG_FILE)) {
        fs.writeFileSync(REMITTANCE_INTENT_LOG_FILE, '[]', 'utf8');
    }
}

function loadRemittanceRecords() {
    try {
        ensureRemittanceFile();
        return JSON.parse(fs.readFileSync(REMITTANCE_RECORD_FILE, 'utf8'));
    } catch (e) {
        console.error('❌ 讀取匯款紀錄失敗:', e.message);
        return [];
    }
}

function saveRemittanceRecords(list) {
    try {
        fs.writeFileSync(REMITTANCE_RECORD_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
        console.error('❌ 寫入匯款紀錄失敗:', e.message);
    }
}

function addRemittanceRecord(record) {
    const list = loadRemittanceRecords();
    list.push(record);
    saveRemittanceRecords(list);
}

function updateRemittanceRecord(id, patch) {
    const list = loadRemittanceRecords();
    const idx = list.findIndex(r => r.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    saveRemittanceRecords(list);
    return list[idx];
}

function findRemittanceRecord(id) {
    return loadRemittanceRecords().find(r => r.id === id);
}

function appendRemittanceIntentLog(entry) {
    try {
        ensureRemittanceIntentLogFile();
        const list = JSON.parse(fs.readFileSync(REMITTANCE_INTENT_LOG_FILE, 'utf8'));
        list.push(entry);
        fs.writeFileSync(REMITTANCE_INTENT_LOG_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ 寫入匯款語意紀錄失敗:', error.message);
    }
}

// ==================== 金額修正狀態管理 ====================
function ensureAmountCorrectionStateFile() {
    if (!fs.existsSync(AMOUNT_CORRECTION_STATE_FILE)) {
        fs.writeFileSync(AMOUNT_CORRECTION_STATE_FILE, '{}', 'utf8');
    }
}

function setAmountCorrectionState(userId, recordId) {
    try {
        ensureAmountCorrectionStateFile();
        const states = JSON.parse(fs.readFileSync(AMOUNT_CORRECTION_STATE_FILE, 'utf8'));
        states[userId] = {
            recordId,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(AMOUNT_CORRECTION_STATE_FILE, JSON.stringify(states, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ 設定金額修正狀態失敗:', error.message);
    }
}

function getAmountCorrectionState(userId) {
    try {
        ensureAmountCorrectionStateFile();
        const states = JSON.parse(fs.readFileSync(AMOUNT_CORRECTION_STATE_FILE, 'utf8'));
        return states[userId] || null;
    } catch (error) {
        console.error('❌ 讀取金額修正狀態失敗:', error.message);
        return null;
    }
}

function clearAmountCorrectionState(userId) {
    try {
        ensureAmountCorrectionStateFile();
        const states = JSON.parse(fs.readFileSync(AMOUNT_CORRECTION_STATE_FILE, 'utf8'));
        delete states[userId];
        fs.writeFileSync(AMOUNT_CORRECTION_STATE_FILE, JSON.stringify(states, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ 清除金額修正狀態失敗:', error.message);
    }
}

/**
 * 解析 postback data
 */
function parsePostbackData(dataString) {
    try {
        return JSON.parse(dataString);
    } catch (e) {
        console.error('❌ 無法解析 postback data:', dataString);
        return {};
    }
}

/**
 * 發送請假理由選項
 */
async function sendLeaveReasonOptions(userId, postbackData, replyToken = null) {
    const message = {
        type: 'text',
        text: `🏥 ${postbackData.studentName} - ${postbackData.courseName}\n${postbackData.courseDate}\n\n請選擇請假理由：`,
        quickReply: {
            items: [
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '🤒 生病',
                        data: JSON.stringify({
                            action: 'leave_reason',
                            reason: '生病',
                            studentName: postbackData.studentName,
                            courseName: postbackData.courseName,
                            courseDate: postbackData.courseDate,
                            courseTime: postbackData.courseTime,
                            location: postbackData.location,
                            weekday: postbackData.weekday
                        }),
                        displayText: '🤒 生病'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '👨‍👩‍👧 家庭因素',
                        data: JSON.stringify({
                            action: 'leave_reason',
                            reason: '家庭因素',
                            studentName: postbackData.studentName,
                            courseName: postbackData.courseName,
                            courseDate: postbackData.courseDate,
                            courseTime: postbackData.courseTime,
                            location: postbackData.location,
                            weekday: postbackData.weekday
                        }),
                        displayText: '👨‍👩‍👧 家庭因素'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '⚠️ 臨時有事',
                        data: JSON.stringify({
                            action: 'leave_reason',
                            reason: '臨時有事',
                            studentName: postbackData.studentName,
                            courseName: postbackData.courseName,
                            courseDate: postbackData.courseDate,
                            courseTime: postbackData.courseTime,
                            location: postbackData.location,
                            weekday: postbackData.weekday
                        }),
                        displayText: '⚠️ 臨時有事'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '📝 其他',
                        data: JSON.stringify({
                            action: 'leave_reason',
                            reason: '其他',
                            studentName: postbackData.studentName,
                            courseName: postbackData.courseName,
                            courseDate: postbackData.courseDate,
                            courseTime: postbackData.courseTime,
                            location: postbackData.location,
                            weekday: postbackData.weekday
                        }),
                        displayText: '📝 其他'
                    }
                }
            ]
        }
    };
    
    try {
        // 如果有 replyToken，使用 reply；否則使用 push
        if (replyToken) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: replyToken,
                messages: [message]
            }, {
                headers: {
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ 已發送請假理由選項 (reply)');
        } else {
            await axios.post(LINE_MESSAGING_API, {
                to: userId,
                messages: [message]
            }, {
                headers: {
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ 已發送請假理由選項 (push)');
        }
    } catch (error) {
        console.error('❌ 發送請假理由選項失敗:', error.response?.data || error.message);
        throw error;
    }
}

// ========== Google Sheets 報表工具 ==========
async function fetchTeacherListFromSheets() {
    console.log('正在呼叫 Google Sheets API:', GOOGLE_SHEETS_REPORT_LINK_API_URL);
    const response = await axios.get(GOOGLE_SHEETS_REPORT_LINK_API_URL, {
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        throw new Error('GOOGLE_SHEETS_HTML_ERROR');
    }

    const values = response.data.values || [];
    if (values.length === 0) {
        return [];
    }

    const teacherNameIndex = 0;
    const linkIndex = 1;
    const webApiIndex = 2;
    const reportApiIndex = 3;
    const userIdIndex = 4;
    const googleSheetReadApiIndex = 5;

    const teachers = [];
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row[teacherNameIndex]) continue;
        teachers.push({
            name: row[teacherNameIndex] || '',
            link: row[linkIndex] || '',
            webApi: row[webApiIndex] || '',
            reportApi: row[reportApiIndex] || '',
            userId: row[userIdIndex] || '',
            googleSheetReadApi: row[googleSheetReadApiIndex] || ''
        });
    }

    console.log(`成功解析 ${teachers.length} 位講師`);
    return teachers;
}

function mapSheetValuesToRecords(values) {
    if (!Array.isArray(values) || values.length <= 1) {
        return [];
    }

    const headerUsage = {};
    const headers = values[0].map((header, idx) => {
        const clean = String(header || '').trim() || `column_${idx}`;
        headerUsage[clean] = (headerUsage[clean] || 0) + 1;
        if (headerUsage[clean] > 1) {
            return `${clean}_${headerUsage[clean] - 1}`;
        }
        return clean;
    });

    return values.slice(1).map(row => {
        const record = {};
        headers.forEach((header, idx) => {
            record[header] = row[idx] !== undefined ? row[idx] : '';
        });
        return record;
    });
}

async function fetchReportRowsFromGoogleSheet(readApiUrl) {
    console.log('🔎 透過 Google Sheet API 讀取講師報表:', readApiUrl);
    const response = await axios.get(readApiUrl, {
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        throw new Error('GOOGLE_SHEET_REPORT_HTML_ERROR');
    }

    const values = response.data.values || response.data.valueRanges?.[0]?.values || [];
    return mapSheetValuesToRecords(values);
}

function normalizeDateString(dateStr) {
    if (!dateStr) return '';
    const normalized = String(dateStr)
        .trim()
        .replace(/[年月]/g, '-')
        .replace(/日/g, '')
        .replace(/\./g, '-')
        .replace(/\//g, '-');
    const parts = normalized.split('-').filter(Boolean);
    if (parts.length === 3) {
        const [year, month, day] = parts;
        const normalizedYear = year.length === 2 ? `20${year}` : year.padStart(4, '0');
        return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return normalized;
}

function parseDateValue(dateStr) {
    const normalized = normalizeDateString(dateStr);
    if (!normalized) return null;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getFieldValue(record, keys) {
    if (!record) return '';
    for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
            return String(record[key]).trim();
        }
    }
    return '';
}

function filterReportRowsByQuery(rows, queryParams = {}) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const COURSE_NAME_FIELDS = ['課程名稱', '課程', '課程類別', 'course', '科目', '標題'];
    const TOPIC_FIELDS = ['課程內容', '內容', '課程主題', '主題', '說明'];
    const DATE_FIELDS = ['日期', '課程日期', 'date', '上課日期'];
    const TIME_FIELDS = ['上課時間', '時間', 'time'];

    let filtered = [...rows];

    if (queryParams.name_contains) {
        const keyword = String(queryParams.name_contains).toLowerCase();
        filtered = filtered.filter(item => 
            getFieldValue(item, COURSE_NAME_FIELDS).toLowerCase().includes(keyword)
        );
    }

    if (queryParams.topic_contains) {
        const keyword = String(queryParams.topic_contains).toLowerCase();
        filtered = filtered.filter(item => 
            getFieldValue(item, TOPIC_FIELDS).toLowerCase().includes(keyword)
        );
    }

    const dateFrom = queryParams.date_from ? parseDateValue(queryParams.date_from) : null;
    const dateTo = queryParams.date_to ? parseDateValue(queryParams.date_to) : null;
    const specificDate = queryParams.date ? normalizeDateString(queryParams.date) : '';

    if (dateFrom || dateTo || specificDate) {
        filtered = filtered.filter(item => {
            const dateText = getFieldValue(item, DATE_FIELDS);
            if (!dateText) return false;
            const normalizedDate = normalizeDateString(dateText);
            if (specificDate && normalizedDate !== specificDate) {
                return false;
            }
            if (!dateFrom && !dateTo) {
                return true;
            }
            const dateValue = parseDateValue(normalizedDate);
            if (!dateValue) return false;
            if (dateFrom && dateValue < dateFrom) return false;
            if (dateTo && dateValue > dateTo) return false;
            return true;
        });
    }

    const courseTime = queryParams['上課時間'] || queryParams.course_time || queryParams.time;
    if (courseTime) {
        const normalizedTarget = String(courseTime).trim();
        filtered = filtered.filter(item => {
            const value = getFieldValue(item, TIME_FIELDS);
            return value === normalizedTarget;
        });
    }

    if (queryParams.limit || queryParams.offset) {
        const offset = Number(queryParams.offset) || 0;
        const limit = Number(queryParams.limit) || 0;
        if (offset > 0) {
            filtered = filtered.slice(offset);
        }
        if (limit > 0) {
            filtered = filtered.slice(0, limit);
        }
    }

    filtered.sort((a, b) => {
        const dateA = parseDateValue(getFieldValue(a, DATE_FIELDS));
        const dateB = parseDateValue(getFieldValue(b, DATE_FIELDS));
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
    });

    return filtered;
}

/**
 * 建立出席確認 Flex Message（精簡版）
 */
function createAttendanceConfirmationFlexMessage(data) {
    const { studentName, courseName, courseDate, courseTime, location, weekday, responseType, leaveReason } = data;
    
    // 根據回應類型設定顏色和文字
    const config = {
        attend: {
            icon: '✅',
            statusText: '會出席',
            color: '#10b981',
            emoji: '😊'
        },
        pending: {
            icon: '⏳',
            statusText: '待確認',
            color: '#f59e0b',
            emoji: '🤔'
        },
        leave: {
            icon: '🏥',
            statusText: '請假',
            color: '#ef4444',
            emoji: '😷'
        }
    };
    
    const { icon, statusText, color, emoji } = config[responseType] || config.attend;
    
    // 建立課程資訊列表（只顯示有值的欄位）
    const courseInfoItems = [];
    
    // 課程名稱（如果有）
    if (courseName) {
        courseInfoItems.push({
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'text',
                    text: '📚',
                    size: 'sm',
                    flex: 0,
                    margin: 'sm'
                },
                {
                    type: 'text',
                    text: courseName,
                    size: 'sm',
                    color: '#333333',
                    weight: 'bold',
                    wrap: true,
                    margin: 'sm'
                }
            ]
        });
    }
    
    // 日期時間（必顯示）
    const dateTimeText = weekday ? 
        `${courseDate} ${weekday}${courseTime ? ` ${courseTime}` : ''}` : 
        `${courseDate}${courseTime ? ` ${courseTime}` : ''}`;
    
    courseInfoItems.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
            {
                type: 'text',
                text: '📅',
                size: 'sm',
                flex: 0,
                margin: 'sm'
            },
            {
                type: 'text',
                text: dateTimeText,
                size: 'sm',
                color: '#333333',
                wrap: true,
                margin: 'sm'
            }
        ]
    });
    
    // 地點（如果有）
    if (location) {
        courseInfoItems.push({
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'text',
                    text: '📍',
                    size: 'sm',
                    flex: 0,
                    margin: 'sm'
                },
                {
                    type: 'text',
                    text: location,
                    size: 'sm',
                    color: '#333333',
                    wrap: true,
                    margin: 'sm'
                }
            ]
        });
    }
    
    const contents = [
        // 標題區塊（含 Logo）
        {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${icon} 已記錄`,
                            weight: 'bold',
                            size: 'md',
                            color: '#FFFFFF'
                        }
                    ],
                    flex: 1
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'image',
                            url: 'https://calendar.funlearnbar.synology.me/logo.jpg',
                            size: 'xxs',
                            aspectMode: 'cover',
                            aspectRatio: '1:1'
                        }
                    ],
                    width: '40px',
                    height: '40px',
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            ],
            backgroundColor: color,
            paddingAll: '12px',
            spacing: 'sm'
        },
        // 狀態與學生
        {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'text',
                    text: emoji,
                    size: 'xl',
                    flex: 0
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: statusText,
                            weight: 'bold',
                            size: 'md',
                            color: color
                        },
                        {
                            type: 'text',
                            text: studentName,
                            size: 'xs',
                            color: '#666666',
                            margin: 'xs'
                        }
                    ],
                    margin: 'sm'
                }
            ],
            paddingAll: '12px',
            backgroundColor: '#F8F9FA'
        },
        // 課程資訊
        {
            type: 'box',
            layout: 'vertical',
            contents: courseInfoItems,
            paddingAll: '12px',
            spacing: 'xs'
        }
    ];
    
    // 如果是請假，添加理由區塊
    if (responseType === 'leave' && leaveReason) {
        contents.push({
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '📝 ' + leaveReason,
                    size: 'xs',
                    color: '#666666',
                    wrap: true
                }
            ],
            paddingAll: '12px',
            backgroundColor: '#FEF2F2'
        });
    }
    
    // 底部感謝語
    contents.push({
        type: 'box',
        layout: 'vertical',
        contents: [
            {
                type: 'text',
                text: responseType === 'leave' ? 
                    '感謝配合！' : 
                    '期待孩子的出席 🎉',
                size: 'xxs',
                color: '#999999',
                align: 'center'
            }
        ],
        paddingAll: '8px'
    });
    
    return {
        type: 'bubble',
        size: 'micro',  // ✅ 精簡尺寸（比 nano 稍大）
        body: {
            type: 'box',
            layout: 'vertical',
            contents: contents,
            paddingAll: '0px',
            spacing: 'none'
        }
    };
}

/**
 * 儲存請假記錄到 FLB 系統
 */
async function saveLeaveToFLB(leaveData) {
    try {
        const FLB_API_BASE = 'https://calendar.funlearnbar.synology.me';
        
        const response = await axios.post(
            `${FLB_API_BASE}/api/student-responses`,
            {
                studentName: leaveData.studentName,
                courseName: leaveData.courseName,
                courseDate: leaveData.courseDate,
                courseTime: leaveData.courseTime,
                location: leaveData.location,
                weekday: leaveData.weekday,
                responseType: 'leave',
                leaveReason: leaveData.leaveReason,
                userId: leaveData.userId,
                timestamp: leaveData.timestamp
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ 請假記錄已儲存到 FLB 系統');
        return response.data;
    } catch (error) {
        console.error('❌ 儲存請假記錄失敗:', error.message);
        // 如果 API 不存在，僅記錄警告但不中斷流程
        console.warn('⚠️ 請假記錄 API 可能尚未實作，但請假流程已完成');
        return { success: false, error: error.message };
    }
}

/**
 * 儲存一般出席回應到 FLB 系統
 */
async function saveResponseToFLB(responseData) {
    try {
        const FLB_API_BASE = 'https://calendar.funlearnbar.synology.me';
        
        const response = await axios.post(
            `${FLB_API_BASE}/api/student-responses`,
            responseData,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ 學生回應已儲存到 FLB 系統');
        return response.data;
    } catch (error) {
        console.error('❌ 儲存學生回應失敗:', error.message);
        console.warn('⚠️ 學生回應 API 可能尚未實作，但回應流程已完成');
        return { success: false, error: error.message };
    }
}

/**
 * 發送確認訊息給學生
 */
async function sendLeaveConfirmation(userId, leaveInfo, reason, replyToken = null) {
    // ✅ 建立 Flex Message
    const flexMessage = createAttendanceConfirmationFlexMessage({
        studentName: leaveInfo.studentName,
        courseName: leaveInfo.courseName || '',
        courseDate: leaveInfo.courseDate,
        courseTime: leaveInfo.courseTime || '',
        location: leaveInfo.location || '',
        weekday: leaveInfo.weekday || '',
        responseType: 'leave',
        leaveReason: reason
    });
    
    try {
        if (replyToken) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: replyToken,
                messages: [{
                    type: 'flex',
                    altText: `✅ 已記錄您的請假申請 - ${leaveInfo.studentName}`,
                    contents: flexMessage
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ 已發送請假確認 Flex Message (reply)');
        } else {
            await axios.post(LINE_MESSAGING_API, {
                to: userId,
                messages: [{
                    type: 'flex',
                    altText: `✅ 已記錄您的請假申請 - ${leaveInfo.studentName}`,
                    contents: flexMessage
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ 已發送請假確認 Flex Message (push)');
        }
    } catch (error) {
        console.error('❌ 發送確認訊息失敗:', error.response?.data || error.message);
    }
}

/**
 * 通知管理員
 */
async function notifyAdminAboutLeave(leaveInfo, reason) {
    const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;
    
    if (!ADMIN_GROUP_ID) {
        console.warn('⚠️ 未設定管理員群組 ID (ADMIN_GROUP_ID)，跳過通知');
        return;
    }
    
    const messageText = `🏥 學生請假通知\n\n👤 學生：${leaveInfo.studentName}\n📖 課程：${leaveInfo.courseName}\n📅 日期：${leaveInfo.courseDate} ${leaveInfo.weekday || ''}\n⏰ 時間：${leaveInfo.courseTime || ''}\n📍 地點：${leaveInfo.location || ''}\n🏥 理由：${reason}\n⏱️ 回覆時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;
    
    try {
        await axios.post(LINE_MESSAGING_API, {
            to: ADMIN_GROUP_ID,
            messages: [{
                type: 'text',
                text: messageText
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        console.log('✅ 已通知管理員');
    } catch (error) {
        console.error('❌ 通知管理員失敗:', error.response?.data || error.message);
    }
}

/**
 * 處理 postback 事件（請假功能）
 */
async function handlePostback(event) {
    const rawPostbackData = parsePostbackData(event.postback.data);
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    
    // ✅ 標準化 postbackData 欄位（支援新舊四種格式）
    // 格式 1: 完整欄位 (studentName, courseDate, courseTime, courseName, location, weekday)
    // 格式 2: 簡化欄位 (n, d, t) - 舊版（2025-10-27）
    // 格式 3: 簡化欄位 (n, d, t, c) - 新版（2025-10-27 更新，添加 courseName）
    const postbackData = {
        ...rawPostbackData,
        studentName: rawPostbackData.studentName || rawPostbackData.n || '',
        courseDate: rawPostbackData.courseDate || rawPostbackData.d || '',
        courseTime: rawPostbackData.courseTime || rawPostbackData.t || '',
        courseName: rawPostbackData.courseName || rawPostbackData.c || '',  // ✅ 添加 c 縮寫支援
        location: rawPostbackData.location || '',
        weekday: rawPostbackData.weekday || ''
    };
    
    console.log('📥 收到 postback 事件 (已標準化):', JSON.stringify(postbackData, null, 2));

    // ------------------------------------
    // 0️⃣ 匯款確認（內部人員按下）
    // ------------------------------------
    if (postbackData.action === config.remittance.confirmAction && postbackData.recordId) {
        const recordId = postbackData.recordId;
        const record = findRemittanceRecord(recordId);
        if (!record) {
            const notFound = {
                type: 'text',
                text: '⚠️ 找不到對應的匯款紀錄，可能已過期或被移除'
            };
            if (replyToken) {
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken,
                    messages: [notFound]
                }, {
                    headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
                });
            }
            return;
        }

        // 更新狀態
        const updated = updateRemittanceRecord(recordId, {
            status: 'confirmed',
            confirmedBy: userId,
            confirmedAt: new Date().toISOString()
        });

        // 回覆按鈕操作者
        if (replyToken) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken,
                messages: [{ type: 'text', text: `✅ 已回覆客戶，金額 NT$${updated.amount || '—'}` }]
            }, {
                headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
            });
        }

        // 推播專業的 Flex Message 給原客戶
        try {
            const confirmationFlex = createPaymentConfirmationFlexMessage(updated);
            const flexMessage = {
                type: 'flex',
                altText: '✅ 付款已確認',
                contents: confirmationFlex
            };
            await sendLineFlexMessage(flexMessage, record.userId);
            console.log('✅ 已發送付款確認 Flex Message 給客戶:', record.userId);
        } catch (e) {
            console.error('❌ 回覆客戶匯款確認失敗:', e.message);
            // 降級為文字訊息
            try {
                await sendLineMessageWithBot(`✅ 已確認收到您的匯款${updated.amount ? `：NT$${updated.amount}` : ''}\n感謝！`, record.userId, null, false);
            } catch (fallbackError) {
                console.error('❌ 降級文字訊息也失敗:', fallbackError.message);
            }
        }

        // 🧾 記錄收入到 Notion（非阻塞式）
        recordIncomeToNotion(updated).then(result => {
            if (result.success) {
                console.log('✅ 已記錄收入到 Notion:', {
                    amount: result.amount,
                    date: result.date,
                    notionPageUrl: result.notionPageUrl
                });
            } else if (result.reason === 'disabled') {
                // Notion 未啟用，不記錄日誌（避免干擾）
            } else {
                console.log('⚠️ Notion 記帳失敗:', result.reason || result.error);
            }
        }).catch(err => {
            console.error('❌ Notion 記帳異常:', err.message);
        });

        return;
    }

    // ------------------------------------
    // 🔧 金額辨識有誤（管理員按下）
    // ------------------------------------
    if (postbackData.action === 'remittance_correct_amount' && postbackData.recordId) {
        const recordId = postbackData.recordId;
        const record = findRemittanceRecord(recordId);
        
        if (!record) {
            const notFound = {
                type: 'text',
                text: '⚠️ 找不到對應的匯款紀錄，可能已過期或被移除'
            };
            if (replyToken) {
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken,
                    messages: [notFound]
                }, {
                    headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
                });
            }
            return;
        }

        // 設定等待輸入金額的狀態
        setAmountCorrectionState(userId, recordId);

        // 提示管理員輸入正確金額
        const promptMessage = {
            type: 'text',
            text: `💰 請直接回覆正確的金額（只需輸入數字）\n\n📝 當前記錄：\n• 來自：${record.displayName || '未知'}\n• 辨識金額：${record.amount ? `NT$ ${record.amount}` : '無'}\n• 時間：${dayjs(record.createdAt).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm')}`
        };

        if (replyToken) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken,
                messages: [promptMessage]
            }, {
                headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
            });
        } else {
            await sendLineMessageWithBot(promptMessage.text, userId, null, false);
        }

        return;
    }
    
    // ------------------------------------
    // 1️⃣ 學生點擊「🏥 請假」
    // ------------------------------------
    if (postbackData.action === 'attendance_reply' && postbackData.response === 'leave') {
        console.log('🏥 收到請假申請:', postbackData.studentName);
        
        // 暫存請假申請
        const leaveKey = `${userId}_${postbackData.courseDate}`;
        pendingLeaves.set(leaveKey, {
            userId,
            studentName: postbackData.studentName,
            courseName: postbackData.courseName,
            courseDate: postbackData.courseDate,
            courseTime: postbackData.courseTime,
            location: postbackData.location,
            weekday: postbackData.weekday,
            timestamp: new Date().toISOString()
        });
        
        // 發送請假理由選項
        await sendLeaveReasonOptions(userId, postbackData, replyToken);
        
        // 清理過期的暫存（1小時後）
        setTimeout(() => {
            if (pendingLeaves.has(leaveKey)) {
                pendingLeaves.delete(leaveKey);
                console.log(`🧹 清理過期的請假申請: ${leaveKey}`);
            }
        }, 3600000);
    }
    
    // ------------------------------------
    // 2️⃣ 學生選擇請假理由
    // ------------------------------------
    else if (postbackData.action === 'leave_reason') {
        console.log('📝 收到請假理由:', postbackData.reason);
        
        // 嘗試兩種 key 格式：
        // 1. 單一學生請假：userId_courseDate
        // 2. 多學生選擇請假：userId_courseDate_studentName
        const leaveKey1 = `${userId}_${postbackData.courseDate}`;
        const leaveKey2 = `${userId}_${postbackData.courseDate}_${postbackData.studentName}`;
        
        let leaveInfo = pendingLeaves.get(leaveKey1);
        let leaveKey = leaveKey1;
        
        // 如果第一種格式找不到，嘗試第二種格式
        if (!leaveInfo && postbackData.studentName) {
            leaveInfo = pendingLeaves.get(leaveKey2);
            leaveKey = leaveKey2;
        }
        
        if (leaveInfo) {
            console.log(`✅ 找到請假申請 (key: ${leaveKey}):`, leaveInfo.studentName);
            
            // 記錄到 FLB 系統
            await saveLeaveToFLB({
                ...leaveInfo,
                leaveReason: postbackData.reason
            });
            
            // 發送確認訊息給學生
            await sendLeaveConfirmation(userId, leaveInfo, postbackData.reason, replyToken);
            
            // 通知管理員
            await notifyAdminAboutLeave(leaveInfo, postbackData.reason);
            
            // 清理暫存
            pendingLeaves.delete(leaveKey);
            console.log(`🧹 已清理請假暫存: ${leaveKey}`);
        } else {
            // 找不到對應的請假申請
            console.warn('⚠️ 找不到對應的請假申請。嘗試的 keys:', {
                key1: leaveKey1,
                key2: leaveKey2,
                availableKeys: Array.from(pendingLeaves.keys())
            });
            try {
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [{
                        type: 'text',
                        text: '抱歉，找不到對應的請假申請，可能已過期或已處理。請重新操作。'
                    }]
                }, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
            } catch (error) {
                console.error('❌ 發送錯誤訊息失敗:', error.message);
            }
        }
    }
    
    // ------------------------------------
    // 3️⃣ 其他出席回應（會出席、待確認）
    // ------------------------------------
    else if (postbackData.action === 'attendance_reply') {
        console.log(`📋 收到出席回應: ${postbackData.response}`, postbackData.studentName);
        
        // 直接記錄到 FLB 系統
        await saveResponseToFLB({
            userId,
            studentName: postbackData.studentName,
            courseName: postbackData.courseName || '',
            courseDate: postbackData.courseDate,
            courseTime: postbackData.courseTime || '',
            location: postbackData.location || '',
            weekday: postbackData.weekday || '',
            responseType: postbackData.response, // 'attend' or 'pending'
            timestamp: new Date().toISOString()
        });
        
        // ✅ 發送 Flex Message 確認訊息
        const flexMessage = createAttendanceConfirmationFlexMessage({
            studentName: postbackData.studentName,
            courseName: postbackData.courseName || '',
            courseDate: postbackData.courseDate,
            courseTime: postbackData.courseTime || '',
            location: postbackData.location || '',
            weekday: postbackData.weekday || '',
            responseType: postbackData.response
        });
        
        const responseText = postbackData.response === 'attend' ? '會出席' : '待確認';
        
        try {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: replyToken,
                messages: [{
                    type: 'flex',
                    altText: `✅ 已記錄您的回覆：${responseText} - ${postbackData.studentName}`,
                    contents: flexMessage
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log(`✅ 已發送 Flex 確認訊息: ${responseText}`);
        } catch (error) {
            console.error('❌ 發送確認訊息失敗:', error.message);
        }
    }
    
    // ------------------------------------
    // 4️⃣ 多學生出席回應
    // ------------------------------------
    else if (postbackData.action === 'multi_student_attendance_reply') {
        console.log(`👨‍👩‍👧‍👦 收到多學生出席回應: ${postbackData.response}`);
        console.log('📦 完整的 postbackData:', JSON.stringify(postbackData, null, 2));
        
        let { response, count, studentCount, students, names, date } = postbackData;
        
        // ✅ 處理 fallback 格式：只有 names 和 date（極簡格式，用於避免超過 300 字元限制）
        if (!students && names && names.length > 0) {
            console.log('⚠️ 收到極簡格式（只有學生姓名陣列），重建 students 陣列');
            students = names.map(name => ({
                n: name,           // 保持簡化格式
                d: date || '',
                t: '',
                c: ''              // courseName 空值，稍後由行事曆系統補充
            }));
        }
        
        // 使用 count 或 studentCount，優先使用 count
        const actualCount = count || studentCount || students?.length || names?.length || 0;
        
        if (!students || students.length === 0) {
            console.error('❌ 多學生回應缺少 students 資料');
            console.error('📦 收到的 postbackData:', JSON.stringify(postbackData, null, 2));
            
            // 發送錯誤提示給用戶
            try {
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [{
                        type: 'text',
                        text: '❌ 系統錯誤：無法取得學生課程資料\n\n請分別為每位孩子回覆出席狀態，或聯繫客服協助。'
                    }]
                }, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
            } catch (error) {
                console.error('❌ 發送錯誤訊息失敗:', error.message);
            }
            return;
        }
        
        // ✅ 相容性處理：支援四種格式
        // 格式 1: 完整格式（studentName, courseName, courseDate, courseTime）
        // 格式 2: 縮寫格式（name, course, date, time）
        // 格式 3: 極簡格式（n, d, t）- 舊版（2025-10-27）
        // 格式 4: 極簡格式（n, d, t, c）- 新版（2025-10-27 更新，添加 courseName）
        students = students.map(student => ({
            studentName: student.studentName || student.name || student.n || '',
            courseName: student.courseName || student.course || student.c || '',  // ✅ 添加 c 縮寫支援
            courseDate: student.courseDate || student.date || student.d || '',
            courseTime: student.courseTime || student.time || student.t || '',
            location: student.location || '',
            weekday: student.weekday || ''
        }));
        console.log('✅ 已標準化 students 資料:', JSON.stringify(students, null, 2));
        
        // ------------------------------------
        // A) 全部會出席
        // ------------------------------------
        if (response === 'attend_all') {
            console.log(`✅ 處理全部出席: ${actualCount} 位孩子`);
            
            // 批次更新所有孩子的出席狀態
            const updatePromises = students.map(student => 
                saveResponseToFLB({
                    userId,
                    studentName: student.studentName,
                    courseName: student.courseName,
                    courseDate: student.courseDate,
                    courseTime: student.courseTime || '',
                    location: student.location || '',
                    weekday: student.weekday || '',
                    responseType: 'attend',
                    timestamp: new Date().toISOString()
                })
            );
            
            try {
                await Promise.all(updatePromises);
                console.log(`✅ 已更新 ${actualCount} 位孩子的出席狀態`);
                
                // ✅ 使用 Flex Message (單個或 Carousel)
                if (students.length === 1) {
                    // 單個學生
                    const flexMessage = createAttendanceConfirmationFlexMessage({
                        studentName: students[0].studentName,
                        courseName: students[0].courseName || '',
                        courseDate: students[0].courseDate,
                        courseTime: students[0].courseTime || '',
                        location: students[0].location || '',
                        weekday: students[0].weekday || '',
                        responseType: 'attend'
                    });
                    
                    await axios.post('https://api.line.me/v2/bot/message/reply', {
                        replyToken: replyToken,
                        messages: [{
                            type: 'flex',
                            altText: `✅ 已確認 ${students[0].studentName} 會出席`,
                            contents: flexMessage
                        }]
                    }, {
                        headers: {
                            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                } else {
                    // 多個學生：使用 Carousel
                    const bubbles = students.map(student => 
                        createAttendanceConfirmationFlexMessage({
                            studentName: student.studentName,
                            courseName: student.courseName || '',
                            courseDate: student.courseDate,
                            courseTime: student.courseTime || '',
                            location: student.location || '',
                            weekday: student.weekday || '',
                            responseType: 'attend'
                        })
                    );
                    
                    await axios.post('https://api.line.me/v2/bot/message/reply', {
                        replyToken: replyToken,
                        messages: [{
                            type: 'flex',
                            altText: `✅ 已確認 ${actualCount} 位孩子全部會出席`,
                            contents: {
                                type: 'carousel',
                                contents: bubbles.slice(0, 10)  // LINE 限制最多 10 個 bubble
                            }
                        }]
                    }, {
                        headers: {
                            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                }
                
            } catch (error) {
                console.error('❌ 批次更新出席狀態失敗:', error.message);
            }
        }
        
        // ------------------------------------
        // B) 部分需要請假
        // ------------------------------------
        else if (response === 'leave_some') {
            console.log(`🏥 需要請假: 準備詢問具體是哪位孩子`);
            
            // 暫存多學生請假資訊
            const leaveKey = `multi_${userId}_${students[0].courseDate}`;
            pendingLeaves.set(leaveKey, {
                userId,
                students: students,
                courseDate: students[0].courseDate,
                timestamp: new Date().toISOString()
            });
            
            // 發送選擇孩子的訊息（Quick Reply）
            // ✅ 先添加「全部都請假」選項
            const quickReplyItems = [
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '🏥 全部都請假',
                        data: JSON.stringify({
                            action: 'leave_all_students',
                            courseDate: students[0].courseDate,  // 只傳遞日期，從 pendingLeaves 獲取完整資料
                            count: actualCount
                        }),
                        displayText: '🏥 全部都請假'
                    }
                },
                // 然後添加個別學生選項
                ...students.map(student => {
                    // 確保 label 不超過 20 字元
                    const courseName = student.courseName || '';
                    const shortCourseName = courseName.length > 10 ? courseName.substring(0, 10) + '...' : courseName;
                    const label = `${student.studentName} - ${shortCourseName}`;
                    
                    const postbackData = {
                        action: 'select_leave_student',
                        studentName: student.studentName,
                        courseName: student.courseName,
                        courseDate: student.courseDate,
                        courseTime: student.courseTime || '',
                        location: student.location || '',
                        weekday: student.weekday || ''
                    };
                    
                    const dataString = JSON.stringify(postbackData);
                    console.log(`📏 Quick Reply data 長度: ${dataString.length} 字元`);
                    
                    if (dataString.length > 300) {
                        console.warn(`⚠️ postback data 超過 300 字元 (${dataString.length})，進行簡化`);
                        // 簡化版本
                        return {
                            type: 'action',
                            action: {
                                type: 'postback',
                                label: label.substring(0, 20),
                                data: JSON.stringify({
                                    action: 'select_leave_student',
                                    studentName: student.studentName,
                                    courseName: student.courseName,
                                    courseDate: student.courseDate,
                                    courseTime: student.courseTime || ''
                                }),
                                displayText: `${student.studentName} 需要請假`
                            }
                        };
                    }
                    
                    return {
                        type: 'action',
                        action: {
                            type: 'postback',
                            label: label.substring(0, 20),
                            data: dataString,
                            displayText: `${student.studentName} 需要請假`
                        }
                    };
                })
            ];
            
            const message = {
                type: 'text',
                text: `🏥 請選擇需要請假的孩子：`,
                quickReply: {
                    items: quickReplyItems
                }
            };
            
            console.log('📤 準備發送 Quick Reply:', JSON.stringify(message, null, 2));
            
            try {
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [message]
                }, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                console.log('✅ 已發送選擇請假孩子的訊息');
                
                // 清理過期的暫存（1小時後）
                setTimeout(() => {
                    if (pendingLeaves.has(leaveKey)) {
                        pendingLeaves.delete(leaveKey);
                        console.log(`🧹 清理過期的多學生請假申請: ${leaveKey}`);
                    }
                }, 3600000);
                
            } catch (error) {
                console.error('❌ 發送選擇請假孩子訊息失敗:', error.message);
                if (error.response) {
                    console.error('📦 錯誤回應狀態:', error.response.status);
                    console.error('📦 錯誤回應資料:', JSON.stringify(error.response.data, null, 2));
                }
                
                // 發送錯誤提示給用戶
                try {
                    await axios.post('https://api.line.me/v2/bot/message/push', {
                        to: userId,
                        messages: [{
                            type: 'text',
                            text: '❌ 系統處理請假申請時發生錯誤\n\n請稍後再試，或分別為每位孩子回覆出席狀態。'
                        }]
                    }, {
                        headers: {
                            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                } catch (pushError) {
                    console.error('❌ 發送錯誤提示也失敗:', pushError.message);
                }
            }
        }
        
        // ------------------------------------
        // C) 稍後確認
        // ------------------------------------
        else if (response === 'pending') {
            console.log(`⏳ 稍後確認: ${actualCount} 位孩子`);
            
            // 批次更新所有孩子的狀態為待確認
            const updatePromises = students.map(student => 
                saveResponseToFLB({
                    userId,
                    studentName: student.studentName,
                    courseName: student.courseName,
                    courseDate: student.courseDate,
                    courseTime: student.courseTime || '',
                    location: student.location || '',
                    weekday: student.weekday || '',
                    responseType: 'pending',
                    timestamp: new Date().toISOString()
                })
            );
            
            try {
                await Promise.all(updatePromises);
                console.log(`✅ 已更新 ${actualCount} 位孩子為待確認狀態`);
                
                // 發送確認訊息
                const studentList = students.map(s => `  • ${s.studentName} - ${s.courseName}`).join('\n');
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [{
                        type: 'text',
                        text: `⏳ 已記錄，請稍後確認 ${actualCount} 位孩子的出缺席\n\n${studentList}\n\n📅 日期：${students[0].courseDate}\n\n請在上課前回覆確認狀態 😊`
                    }]
                }, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
            } catch (error) {
                console.error('❌ 批次更新待確認狀態失敗:', error.message);
            }
        }
    }
    
    // ------------------------------------
    // 5️⃣ 選擇請假的學生（從多學生中選擇）
    // ------------------------------------
    else if (postbackData.action === 'select_leave_student') {
        console.log('🏥 家長選擇了請假的孩子:', postbackData.studentName);
        
        // 發送請假理由選項
        await sendLeaveReasonOptions(userId, postbackData, replyToken);
        
        // 暫存單一學生的請假申請
        const leaveKey = `${userId}_${postbackData.courseDate}_${postbackData.studentName}`;
        pendingLeaves.set(leaveKey, {
            userId,
            studentName: postbackData.studentName,
            courseName: postbackData.courseName,
            courseDate: postbackData.courseDate,
            courseTime: postbackData.courseTime,
            location: postbackData.location,
            weekday: postbackData.weekday,
            timestamp: new Date().toISOString()
        });
        
        // 清理過期的暫存（1小時後）
        setTimeout(() => {
            if (pendingLeaves.has(leaveKey)) {
                pendingLeaves.delete(leaveKey);
                console.log(`🧹 清理過期的請假申請: ${leaveKey}`);
            }
        }, 3600000);
    }
    
    // ------------------------------------
    // 6️⃣ 全部都請假（多學生統一請假）
    // ------------------------------------
    else if (postbackData.action === 'leave_all_students') {
        console.log('🏥 家長選擇全部都請假，學生數量:', postbackData.count);
        
        // 從 pendingLeaves 中獲取學生資料
        const leaveKey = `multi_${userId}_${postbackData.courseDate}`;
        const pendingInfo = pendingLeaves.get(leaveKey);
        
        if (!pendingInfo || !pendingInfo.students) {
            console.error('❌ 找不到暫存的學生資料');
            try {
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [{
                        type: 'text',
                        text: '❌ 系統錯誤：找不到課程資料\n\n請重新操作或聯繫客服。'
                    }]
                }, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
            } catch (error) {
                console.error('❌ 發送錯誤訊息失敗:', error.message);
            }
            return;
        }
        
        const normalizedStudents = pendingInfo.students;
        
        // 暫存所有學生的請假資訊
        const allLeaveKey = `multi_all_${userId}_${normalizedStudents[0].courseDate}`;
        pendingLeaves.set(allLeaveKey, {
            userId,
            students: normalizedStudents,
            courseDate: normalizedStudents[0].courseDate,
            isMultiLeave: true,  // 標記為多學生請假
            timestamp: new Date().toISOString()
        });
        
        // 發送請假理由選項（統一原因）
        const studentList = normalizedStudents.map(s => `• ${s.studentName} - ${s.courseName}`).join('\n');
        
        const message = {
            type: 'text',
            text: `🏥 全部都請假\n\n${studentList}\n\n請選擇統一的請假理由：`,
            quickReply: {
                items: [
                    {
                        type: 'action',
                        action: {
                            type: 'postback',
                            label: '🤒 生病',
                            data: JSON.stringify({
                                action: 'leave_all_reason',
                                reason: '生病',
                                courseDate: normalizedStudents[0].courseDate
                            }),
                            displayText: '🤒 生病'
                        }
                    },
                    {
                        type: 'action',
                        action: {
                            type: 'postback',
                            label: '👨‍👩‍👧 家庭因素',
                            data: JSON.stringify({
                                action: 'leave_all_reason',
                                reason: '家庭因素',
                                courseDate: normalizedStudents[0].courseDate
                            }),
                            displayText: '👨‍👩‍👧 家庭因素'
                        }
                    },
                    {
                        type: 'action',
                        action: {
                            type: 'postback',
                            label: '⚠️ 臨時有事',
                            data: JSON.stringify({
                                action: 'leave_all_reason',
                                reason: '臨時有事',
                                courseDate: normalizedStudents[0].courseDate
                            }),
                            displayText: '⚠️ 臨時有事'
                        }
                    },
                    {
                        type: 'action',
                        action: {
                            type: 'postback',
                            label: '📝 其他',
                            data: JSON.stringify({
                                action: 'leave_all_reason',
                                reason: '其他',
                                courseDate: normalizedStudents[0].courseDate
                            }),
                            displayText: '📝 其他'
                        }
                    }
                ]
            }
        };
        
        try {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: replyToken,
                messages: [message]
            }, {
                headers: {
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ 已發送統一請假理由選項');
            
            // 清理過期的暫存（1小時後）
            setTimeout(() => {
                if (pendingLeaves.has(allLeaveKey)) {
                    pendingLeaves.delete(allLeaveKey);
                    console.log(`🧹 清理過期的多學生統一請假申請: ${allLeaveKey}`);
                }
            }, 3600000);
            
        } catch (error) {
            console.error('❌ 發送統一請假理由選項失敗:', error.message);
        }
    }
    
    // ------------------------------------
    // 7️⃣ 處理全部都請假的原因
    // ------------------------------------
    else if (postbackData.action === 'leave_all_reason') {
        console.log('📝 收到全部請假的統一理由:', postbackData.reason);
        
        const leaveKey = `multi_all_${userId}_${postbackData.courseDate}`;
        const leaveInfo = pendingLeaves.get(leaveKey);
        
        if (leaveInfo && leaveInfo.students) {
            console.log(`✅ 找到多學生請假申請，共 ${leaveInfo.students.length} 位學生`);
            
            // 為每位學生調用 FLB API（與單個學生請假方式相同）
            const savePromises = leaveInfo.students.map(student => 
                saveLeaveToFLB({
                    userId: leaveInfo.userId,
                    studentName: student.studentName,
                    courseName: student.courseName,
                    courseDate: student.courseDate,
                    courseTime: student.courseTime,
                    location: student.location,
                    weekday: student.weekday,
                    leaveReason: postbackData.reason,
                    timestamp: new Date().toISOString()
                })
            );
            
            try {
                await Promise.all(savePromises);
                console.log(`✅ 已為 ${leaveInfo.students.length} 位學生儲存請假記錄`);
                
                // 發送確認訊息
                const studentList = leaveInfo.students.map(s => `  • ${s.studentName} - ${s.courseName}`).join('\n');
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [{
                        type: 'text',
                        text: `✅ 已記錄全部請假申請\n\n${studentList}\n\n📅 日期：${postbackData.courseDate}\n🏥 理由：${postbackData.reason}\n\n已通知系統記錄，感謝配合！`
                    }]
                }, {
                    headers: {
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                // 通知管理員
                if (process.env.ADMIN_GROUP_ID) {
                    for (const student of leaveInfo.students) {
                        await notifyAdminAboutLeave(student, postbackData.reason);
                    }
                }
                
                // 清除暫存
                pendingLeaves.delete(leaveKey);
                console.log(`🧹 已清理多學生請假暫存: ${leaveKey}`);
                
            } catch (error) {
                console.error('❌ 批次儲存請假記錄失敗:', error.message);
            }
        } else {
            console.warn('⚠️ 找不到對應的多學生請假申請');
        }
    }
}

// ==================== 多 Bot 支援函數 ====================

/**
 * 獲取可用的 Bot 列表
 */
function getAvailableBots() {
    const bots = [];
    
    if (config.line.bots.primary.enabled && config.line.bots.primary.channelAccessToken) {
        bots.push({
            id: 'primary',
            name: config.line.bots.primary.name,
            token: config.line.bots.primary.channelAccessToken,
            secret: config.line.bots.primary.channelSecret
        });
    }
    
    if (config.line.bots.secondary.enabled && config.line.bots.secondary.channelAccessToken) {
        bots.push({
            id: 'secondary',
            name: config.line.bots.secondary.name,
            token: config.line.bots.secondary.channelAccessToken,
            secret: config.line.bots.secondary.channelSecret
        });
    }
    
    return bots;
}

/**
 * 選擇要使用的 Bot
 */
function selectBot(strategy = 'round_robin') {
    const availableBots = getAvailableBots();
    
    if (availableBots.length === 0) {
        return null;
    }
    
    if (availableBots.length === 1) {
        return availableBots[0];
    }
    
    switch (strategy) {
        case 'round_robin':
            // 簡單的輪詢策略（可以改進為更複雜的實現）
            const index = Math.floor(Math.random() * availableBots.length);
            return availableBots[index];
            
        case 'random':
            const randomIndex = Math.floor(Math.random() * availableBots.length);
            return availableBots[randomIndex];
            
        case 'primary_first':
            // 優先使用 primary bot
            return availableBots.find(bot => bot.id === 'primary') || availableBots[0];
            
        default:
            return availableBots[0];
    }
}

/**
 * 使用指定 Bot 發送訊息
 */
async function sendLineMessageWithBot(message, targetUserId, botId = null, notifyAdmin = true) {
    try {
        // 準備Bot列表
        const bots = [];
        
        // 第一個Bot（主要Bot）
        if (LINE_CHANNEL_ACCESS_TOKEN && LINE_CHANNEL_ACCESS_TOKEN !== 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            bots.push({
                id: 'primary',
                name: '主要Bot',
                token: LINE_CHANNEL_ACCESS_TOKEN,
                userId: LINE_USER_ID
            });
        }
        
        // 第二個Bot（如果啟用且配置了）
        if (ENABLE_DUAL_BOT && LINE_CHANNEL_ACCESS_TOKEN_2 && LINE_CHANNEL_ACCESS_TOKEN_2 !== '') {
            bots.push({
                id: 'secondary',
                name: '第二個Bot',
                token: LINE_CHANNEL_ACCESS_TOKEN_2,
                userId: LINE_USER_ID_2
            });
        }
        
        if (ENABLE_TRIPLE_BOT && LINE_CHANNEL_ACCESS_TOKEN_3 && LINE_CHANNEL_ACCESS_TOKEN_3 !== '') {
            bots.push({
                id: 'tertiary',
                name: '第三個Bot',
                token: LINE_CHANNEL_ACCESS_TOKEN_3,
                userId: LINE_USER_ID_3
            });
        }
        
        if (bots.length === 0) {
            console.log('沒有可用的Bot，跳過發送訊息');
            return { success: false, message: '沒有可用的Bot' };
        }

        // 準備發送目標列表
        const targetUsers = [];
        
        // 根據 notifyAdmin 參數決定是否發送給管理員
        if (notifyAdmin && LINE_USER_ID && LINE_USER_ID !== 'YOUR_USER_ID_HERE') {
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

        const allResults = [];
        
        // 對每個Bot發送訊息
        for (const bot of bots) {
            console.log(`🤖 使用 ${bot.name} (${bot.id}) 發送訊息`);
            
            const botResults = [];
            
            for (const userId of targetUsers) {
                try {
                    console.log(`正在發送LINE訊息給 ${userId} (透過 ${bot.name})...`);

        const response = await axios.post(LINE_MESSAGING_API, {
                        to: userId,
            messages: [{
                type: 'text',
                text: message
            }]
        }, {
                        headers: {
                            'Authorization': `Bearer ${bot.token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    console.log(`✅ ${bot.name} 訊息發送成功給 ${userId}:`, response.data);
                    botResults.push({ 
                        success: true, 
                        userId, 
                        botId: bot.id,
                        botName: bot.name,
                        data: response.data 
                    });
                    
                    // 添加小延遲避免API限制
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                } catch (error) {
                    console.error(`❌ ${bot.name} 訊息發送失敗給 ${userId}:`, error.response?.data || error.message);
                    botResults.push({ 
                        success: false, 
                        userId, 
                        botId: bot.id,
                        botName: bot.name,
                        error: error.response?.data || error.message,
                        statusCode: error.response?.status
                    });
                }
            }
            
            allResults.push({
                botId: bot.id,
                botName: bot.name,
                results: botResults
            });
        }
        
        const totalSuccessCount = allResults.reduce((sum, bot) => 
            sum + bot.results.filter(r => r.success).length, 0
        );
        const totalAttempts = allResults.reduce((sum, bot) => 
            sum + bot.results.length, 0
        );
        
        console.log(`📊 總發送結果: ${totalSuccessCount}/${totalAttempts} 成功 (${bots.length} 個Bot)`);
        
        return { 
            success: totalSuccessCount > 0, 
            message: `成功發送給 ${totalSuccessCount}/${totalAttempts} 個使用者 (${bots.length} 個Bot)`,
            botResults: allResults,
            totalSuccess: totalSuccessCount,
            totalAttempts: totalAttempts
        };
    } catch (error) {
        console.error('LINE 訊息發送失敗:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 使用指定 Bot 發送 Flex Message
 */
async function sendLineFlexMessageWithBot(flexMessage, targetUserId, botId = null) {
    try {
        let selectedBot;
        
        if (botId) {
            selectedBot = getAvailableBots().find(bot => bot.id === botId);
            if (!selectedBot) {
                throw new Error(`指定的 Bot ID "${botId}" 不存在或未啟用`);
            }
        } else {
            const strategy = config.line.messaging.loadBalancing.strategy;
            selectedBot = selectBot(strategy);
            if (!selectedBot) {
                throw new Error('沒有可用的 Bot');
            }
        }
        
        console.log(`🤖 使用 ${selectedBot.name} (${selectedBot.id}) 發送 Flex Message`);
        
        const response = await axios.post(config.line.messagingApi, {
            to: targetUserId,
            messages: [flexMessage]
        }, {
            headers: {
                'Authorization': `Bearer ${selectedBot.token}`,
                'Content-Type': 'application/json'
            },
            timeout: config.server.timeout.line
        });

        console.log(`✅ Flex Message 發送成功給 ${targetUserId}`);
        return { 
            success: true, 
            data: response.data,
            botUsed: selectedBot
        };

    } catch (error) {
        console.error(`❌ Flex Message 發送失敗:`, error.message);
        return { success: false, error: error.message };
    }
}

// ==================== Flex Message 支援函數 ====================


function extractCoursePlanMedia(coursePlanField) {
    if (!coursePlanField) {
        return {
            imageUrl: null,
            linkUrl: null,
            altText: null
        };
    }

    let content = coursePlanField;
    if (typeof content !== 'string') {
        try {
            content = String(content);
        } catch (error) {
            console.error('❌ 解析課程規劃內容失敗:', error);
            content = '';
        }
    }

    const imageMatch = content.match(/src=["']([^"']+)["']/i);
    const linkMatch = content.match(/href=["']([^"']+)["']/i);
    const altMatch = content.match(/alt=["']([^"']+)["']/i);

    let imageUrl = imageMatch ? imageMatch[1] : null;
    let linkUrl = linkMatch ? linkMatch[1] : null;
    const altText = altMatch ? altMatch[1] : null;

    const urlRegex = /https?:\/\/[^\s"']+/i;

    if (!imageUrl && urlRegex.test(content)) {
        const directUrlMatch = content.match(urlRegex);
        if (directUrlMatch) {
            imageUrl = directUrlMatch[0];
        }
    }

    if (!linkUrl && imageUrl) {
        linkUrl = imageUrl;
    }

    return {
        imageUrl,
        linkUrl,
        altText
    };
}

/**
 * 標準化時間格式
 * 將各種時間格式統一轉換（0930-1030 -> 9:30-10:30）
 */
function normalizeTimeFormat(period) {
    if (!period) return period;
    
    // 匹配時間格式：0930-1030 或 09:30-10:30 等
    const timePattern = /(\d{1,2}):?(\d{2})\s*[-~到至]\s*(\d{1,2}):?(\d{2})/;
    const match = period.match(timePattern);
    
    if (match) {
        const [, h1, m1, h2, m2] = match;
        // 轉換為帶冒號的格式，並去除前導零
        const normalizedTime = `${parseInt(h1)}:${m1}-${parseInt(h2)}:${m2}`;
        const result = period.replace(timePattern, normalizedTime);
        console.log(`🔄 時間格式轉換: ${period} → ${result}`);
        return result;
    }
    
    return period;
}

/**
 * 調用外部 API 查詢課程規劃連結
 * @param {string} course - 課程類型（如：ESM, SPIKE, SPM, BOOST, EV3）
 * @param {string} period - 時段資訊（必須包含星期，如：六 0930-1030 到府）
 * @returns {Promise<object>} API 回應結果
 */
async function fetchCoursePlanUrl(course, period) {
    try {
        // 標準化時間格式
        const normalizedPeriod = normalizeTimeFormat(period);
        
        const apiUrl = 'https://course-viewer.funlearnbar.synology.me/api/find-course';
        const params = new URLSearchParams({
            course: course,
            period: normalizedPeriod,
            format: 'json'
        });
        
        console.log(`📡 調用課程規劃 API: ${apiUrl}?${params.toString()}`);
        console.log(`   原始時段: ${period}`);
        console.log(`   標準化時段: ${normalizedPeriod}`);
        
        const response = await axios.get(`${apiUrl}?${params.toString()}`, {
            timeout: 10000
        });
        
        console.log(`✅ API 回應:`, JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ 調用課程規劃 API 失敗:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 創建課程規劃 Bubble（使用新的外部 API）
 */
function createCoursePlanBubble(student, apiResult = null, index = null, total = null) {
    const { name = '未知學生', course = '未設定課程', period = '未設定時段' } = student || {};
    const colors = {
        primary: '#0F0F0F',
        gold: '#B8860B',
        text: '#1C1C1C',
        textSecondary: '#5A5A5A',
        border: '#D3D3D3',
        background: '#FFFFFF',
        success: '#28a745',
        error: '#dc3545'
    };

    const headerLines = [];
    headerLines.push({
        type: 'text',
        text: index && total ? `${name} (${index}/${total})` : name,
        weight: 'bold',
        size: 'lg',
        color: colors.primary
    });

    headerLines.push({
        type: 'text',
        text: course,
        size: 'sm',
        color: colors.textSecondary,
        margin: 'sm'
    });

    headerLines.push({
        type: 'text',
        text: period,
        size: 'xs',
        color: colors.textSecondary
    });

    const bodyContents = [
        {
            type: 'box',
            layout: 'vertical',
            contents: headerLines
        }
    ];

    // 顯示 API 查詢狀態（只顯示成功狀態，失敗狀態留給後面處理）
    if (apiResult && apiResult.success) {
        bodyContents.push({
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '✅ 已找到課程規劃',
                    size: 'sm',
                    color: colors.success,
                    weight: 'bold'
                }
            ],
            backgroundColor: '#d4edda',
            paddingAll: '12px',
            margin: 'lg',
            cornerRadius: '6px',
            borderColor: '#c3e6cb',
            borderWidth: '1px'
        });
    }

    const bubble = {
        type: 'bubble',
        size: 'mega',
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            paddingAll: '16px',
            backgroundColor: colors.background,
            contents: bodyContents
        }
    };

    // 處理 API 查詢結果
    if (apiResult && apiResult.success) {
        const courseViewerUrl = 'https://course-viewer.funlearnbar.synology.me';
        let fullUrl = null;
        
        // 處理單一結果
        if (apiResult.url) {
            fullUrl = `${courseViewerUrl}${apiResult.url}`;
        } 
        // 處理多個結果（智能選擇最匹配的）
        else if (apiResult.courses && apiResult.courses.length > 0) {
            let selectedCourse = null;
            
            // 檢查學生時段是否有位置標記
            const hasLocationInPeriod = period && (period.includes('到府') || period.includes('外'));
            
            if (hasLocationInPeriod) {
                // 有位置標記：優先選擇完全匹配的
                selectedCourse = apiResult.courses.find(c => {
                    if (period.includes('到府')) return c.displayName.includes('到府');
                    if (period.includes('外')) return c.displayName.includes('外');
                    return false;
                }) || apiResult.courses[0];
            } else {
                // 沒有位置標記：優先選擇沒有「到府」或「外」標記的課程
                selectedCourse = apiResult.courses.find(c => 
                    !c.displayName.includes('到府') && !c.displayName.includes('外')
                ) || apiResult.courses[0];
            }
            
            fullUrl = `${courseViewerUrl}${selectedCourse.url}`;
            console.log(`📚 找到 ${apiResult.courses.length} 個課程`);
            console.log(`   學生時段: ${period}`);
            console.log(`   選擇課程: ${selectedCourse.displayName}`);
        }
        
        console.log(`🔗 課程規劃 URL:`, fullUrl);
        
        if (fullUrl) {
            // 使用純 URL，LINE 會根據平台自動決定在內建瀏覽器開啟
            // 注意：桌面版 LINE 可能仍會在外部瀏覽器開啟
            bubble.footer = {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: colors.gold,
                        action: {
                            type: 'uri',
                            label: '📘 開啟課程規劃',
                            uri: fullUrl
                        }
                    }
                ]
            };
        } else {
            console.warn(`⚠️ API 成功但 URL 為空`);
            bubble.footer = {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'secondary',
                        color: '#999999',
                        action: {
                            type: 'message',
                            label: '⚠️ 資料異常',
                            text: '課程規劃資料異常，請聯繫客服'
                        }
                    }
                ]
            };
        }
    } else {
        // API 查詢失敗，顯示簡潔錯誤訊息
        const searched = apiResult?.searched || {};
        const courseName = searched.course_type || course;
        const timePeriod = searched.period || period;
        
        console.error(`❌ API 查詢失敗:`, JSON.stringify(apiResult));
        
        // 簡潔的錯誤訊息（和成功訊息對稱）
        bodyContents.push({
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '📋 暫無課程規劃',
                    size: 'sm',
                    color: '#999999',
                    wrap: true
                }
            ],
            backgroundColor: '#f5f5f5',
            paddingAll: '12px',
            margin: 'lg',
            cornerRadius: '8px'
        });
        
        // 簡潔的按鈕
        bubble.footer = {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'secondary',
                    color: '#999999',
                    action: {
                        type: 'message',
                        label: '💬 詢問課程規劃',
                        text: `想了解 ${courseName} ${timePeriod} 的課程規劃`
                    }
                }
            ]
        };
    }

    return bubble;
}

/**
 * 創建課程規劃 Flex Message（單一學生，使用新 API）
 */
async function createCoursePlanFlexMessage(student) {
    const apiResult = await fetchCoursePlanUrl(student.course, student.period);
    
    return {
        type: 'flex',
        altText: `${student?.name || '學生'} 的本期課程規劃`,
        contents: createCoursePlanBubble(student, apiResult)
    };
}

/**
 * 創建課程規劃 Flex Carousel（多位學生，使用新 API）
 */
async function createCoursePlanFlexCarousel(students) {
    // 並行調用所有學生的 API
    const apiResults = await Promise.all(
        students.map(student => fetchCoursePlanUrl(student.course, student.period))
    );
    
    return {
        type: 'flex',
        altText: `本期課程規劃 (${students.length} 位學生)`,
        contents: {
            type: 'carousel',
            contents: students.map((student, index) =>
                createCoursePlanBubble(student, apiResults[index], index + 1, students.length)
            )
        }
    };
}

/**
 * 創建出缺勤 Flex Message（高質感黑金風格）
 */
function createAttendanceFlexMessage(studentData, mode = 'compact', displayType = 'remaining') {
    console.log('📊 創建Flex Message，學生數據:', JSON.stringify(studentData, null, 2));
    console.log('📊 顯示模式:', mode, '顯示類型:', displayType);
    
    const { name, course, period, remaining, attendance = [] } = studentData;
    
    console.log('📊 解析後的數據:', {
        name,
        course,
        period,
        remaining,
        attendanceLength: attendance.length,
        attendance: attendance
    });
    
    // 高質感黑金風格顏色配置
    const colors = {
        primary: '#0F0F0F',      // 深黑
        gold: '#B8860B',         // 深金色
        goldLight: '#DAA520',    // 亮金色
        goldAccent: '#FFD700',   // 金色點綴
        success: '#2E8B57',      // 深綠色
        warning: '#DAA520',      // 金色警告
        danger: '#B22222',       // 深紅色
        text: '#1C1C1C',         // 深灰文字
        textSecondary: '#5A5A5A', // 次要文字
        textLight: '#8A8A8A',    // 淺色文字
        background: '#FEFEFE',    // 純白背景
        cardBackground: '#F8F9FA', // 卡片背景
        border: '#D3D3D3',       // 邊框色
        shadow: '#E8E8E8'        // 陰影色
    };
    
    // 確保 attendance 是陣列
    const attendanceArray = Array.isArray(attendance) ? attendance : [];
    
    // 計算出席統計
    const totalRecords = attendanceArray.length;
    const presentCount = attendanceArray.filter(r => r.present === true).length;
    const leaveCount = attendanceArray.filter(r => r.present === 'leave').length;
    const absentCount = attendanceArray.filter(r => r.present === false).length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    
    // 根據模式決定顯示記錄數量
    const attendanceLimit = mode === 'compact' ? 5 : attendanceArray.length;
    const recentAttendance = attendanceArray.slice(-attendanceLimit);
    
    // 格式化出席記錄 - 高質感版本
    const attendanceBoxes = recentAttendance.map((record, index) => {
        let statusIcon = '';
        let statusColor = '';
        let statusBg = '';
        
        if (record.present === true) {
            statusIcon = '✓';
            statusColor = '#2E8B57';  // 深綠色
            statusBg = '#E8F5E8';     // 淺綠色背景
        } else if (record.present === 'leave') {
            statusIcon = '📝';
            statusColor = '#DAA520';  // 金色
            statusBg = '#FFF8DC';     // 淺金色背景
        } else {
            statusIcon = '✗';
            statusColor = '#B22222';  // 深紅色
            statusBg = '#FFE4E1';     // 淺紅色背景
        }
        
        // 格式化日期顯示
        const dateStr = record.date;
        console.log('📅 處理日期:', dateStr);
        
        let displayDate = '??/??';
        try {
            if (dateStr && typeof dateStr === 'string') {
                // 先嘗試直接解析 YYYY-MM-DD 格式
                if (dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length >= 3) {
                        const month = parts[1].padStart(2, '0');
                        const day = parts[2].padStart(2, '0');
                        displayDate = `${month}/${day}`;
                        console.log('📅 直接解析成功:', displayDate);
                    }
                } else {
                    // 嘗試使用 Date 物件解析
                    const dateObj = new Date(dateStr);
                    if (!isNaN(dateObj.getTime())) {
                        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                        const day = dateObj.getDate().toString().padStart(2, '0');
                        displayDate = `${month}/${day}`;
                        console.log('📅 Date物件解析成功:', displayDate);
                    }
                }
            }
        } catch (error) {
            console.error('❌ 日期解析錯誤:', error, '原始日期:', dateStr);
            displayDate = '??/??';
        }
        
        console.log('📅 顯示日期:', displayDate);
        
        return {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: displayDate,
                    size: 'xxs',
                    color: colors.textSecondary,
                    align: 'center'
                },
                {
                    type: 'text',
                    text: statusIcon,
                    size: 'xxs',
                    color: statusColor,
                    align: 'center'
                }
            ],
            paddingAll: '6px',
            cornerRadius: '4px',
            backgroundColor: statusBg,
            borderColor: statusColor,
            borderWidth: '0.5px',
            margin: '1px',
            width: '48px'
        };
    });

    // 決定剩餘堂數顏色和圖示
    let remainingColor = colors.success;
    let remainingIcon = '●';
    if (remaining <= 0) {
        remainingColor = colors.danger;
        remainingIcon = '●';
    } else if (remaining <= 5) {
        remainingColor = colors.warning;
        remainingIcon = '●';
    }

    // 根據 displayType 決定標題
    const headerTitle = displayType === 'attendance' ? '完整出缺勤記錄' : '剩餘堂數查詢';
    const headerSubtitle = displayType === 'attendance' 
        ? (mode === 'compact' ? '近5堂課' : '所有記錄')
        : (mode === 'compact' ? '近5堂課' : '完整記錄');
    
    return {
        type: 'flex',
        altText: `${name} 的${headerTitle}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'FunLearnBar 智慧課程管理系統',
                        size: 'xs',
                        color: colors.goldLight,
                        weight: 'bold',
                        align: 'center',
                        margin: 'none'
                    },
                    {
                        type: 'text',
                        text: headerTitle,
                        size: 'lg',
                        color: colors.goldAccent,
                        weight: 'bold',
                        align: 'center',
                        margin: 'xs'
                    },
                    {
                        type: 'text',
                        text: headerSubtitle,
                        size: 'xs',
                        color: colors.goldLight,
                        align: 'center',
                        margin: 'xs'
                    }
                ],
                backgroundColor: colors.primary,
                paddingAll: '12px'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    // 學生資訊 - 優先顯示
                    {
                        type: 'text',
                        text: '學生資訊',
                        weight: 'bold',
                        size: 'xs',
                        color: colors.primary,
                        margin: 'none'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: name,
                                size: 'sm',
                                weight: 'bold',
                                color: colors.text,
                                margin: 'none',
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: `${course} • ${period}`,
                                size: 'xs',
                                color: colors.textSecondary,
                                margin: 'xs',
                                wrap: true
                            }
                        ],
                        margin: 'xs',
                        paddingAll: '8px',
                        backgroundColor: colors.cardBackground,
                        cornerRadius: '6px',
                        borderColor: colors.border,
                        borderWidth: '0.5px'
                    },
                    
                    // 剩餘堂數 - 只在 displayType === 'remaining' 時顯示
                    ...(displayType === 'remaining' ? [
                        {
                            type: 'text',
                            text: '🎯 剩餘堂數',
                            weight: 'bold',
                            size: 'xs',
                            color: colors.primary,
                            margin: 'sm'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `${remaining}`,
                                    size: 'xl',
                                    weight: 'bold',
                                    color: colors.primary,
                                    align: 'center',
                                    margin: 'none'
                                },
                                {
                                    type: 'text',
                                    text: '剩餘堂數',
                                    size: 'xxs',
                                    color: colors.textSecondary,
                                    align: 'center',
                                    margin: 'xs'
                                }
                            ],
                            margin: 'xs',
                            paddingAll: '16px',
                            backgroundColor: colors.cardBackground,
                            cornerRadius: '12px',
                            borderColor: colors.gold,
                            borderWidth: '2px'
                        }
                    ] : []),
                    
                    // 統計資訊 - 精緻版
                    {
                        type: 'text',
                        text: '統計資訊',
                        weight: 'bold',
                        size: 'xs',
                        color: colors.primary,
                        margin: 'sm'
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: `${attendanceRate}%`,
                                        size: 'xxs',
                                        color: colors.primary,
                                        align: 'center'
                                    },
                                    {
                                        type: 'text',
                                        text: '出席率',
                                        size: 'xxs',
                                        color: colors.textLight,
                                        align: 'center'
                                    }
                                ],
                                flex: 1,
                                paddingAll: '3px',
                                backgroundColor: colors.cardBackground,
                                cornerRadius: '4px',
                                margin: '1px',
                                borderColor: colors.border,
                                borderWidth: '0.5px'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: `${presentCount}`,
                                        size: 'xxs',
                                        color: colors.success,
                                        align: 'center'
                                    },
                                    {
                                        type: 'text',
                                        text: '出席',
                                        size: 'xxs',
                                        color: colors.textLight,
                                        align: 'center'
                                    }
                                ],
                                flex: 1,
                                paddingAll: '3px',
                                backgroundColor: colors.cardBackground,
                                cornerRadius: '4px',
                                margin: '1px',
                                borderColor: colors.border,
                                borderWidth: '0.5px'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: `${absentCount}`,
                                        size: 'xxs',
                                        color: colors.danger,
                                        align: 'center'
                                    },
                                    {
                                        type: 'text',
                                        text: '缺席',
                                        size: 'xxs',
                                        color: colors.textLight,
                                        align: 'center'
                                    }
                                ],
                                flex: 1,
                                paddingAll: '3px',
                                backgroundColor: colors.cardBackground,
                                cornerRadius: '4px',
                                margin: '1px',
                                borderColor: colors.border,
                                borderWidth: '0.5px'
                            }
                        ],
                        margin: 'xs'
                    },
                    
                    // 出席記錄
                    {
                        type: 'text',
                        text: mode === 'compact' ? '近5堂課' : '完整記錄',
                        weight: 'bold',
                        size: 'xs',
                        color: colors.primary,
                        margin: 'sm'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: attendanceArray.length > 0 ? [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: attendanceBoxes,
                                margin: 'xs'
                            },
                            {
                                type: 'text',
                                text: '✓出席 📝請假 ✗缺席',
                                size: 'xxs',
                                color: colors.textLight,
                                align: 'center',
                                margin: 'xs'
                            }
                        ] : [
                            {
                                type: 'text',
                                text: '暫無出席記錄',
                                size: 'xs',
                                color: colors.textLight,
                                align: 'center',
                                margin: 'xs'
                            }
                        ],
                        margin: 'xs',
                        paddingAll: '8px',
                        backgroundColor: colors.cardBackground,
                        cornerRadius: '6px',
                        borderColor: colors.border,
                        borderWidth: '0.5px'
                    },
                    
                    // 底部
                    {
                        type: 'text',
                        text: 'FunLearnBar',
                        size: 'xs',
                        color: colors.gold,
                        weight: 'bold',
                        align: 'center',
                        margin: 'sm'
                    }
                ],
                paddingAll: '12px'
            }
        }
    };
}

// 創建多學生 Flex Message
function createMultiStudentFlexMessage(students, mode = 'compact', displayType = 'remaining') {
    console.log('📊 創建多學生Flex Message，學生數量:', students.length);
    console.log('📊 顯示模式:', mode, '顯示類型:', displayType);
    
    const colors = {
        primary: '#0F0F0F',
        gold: '#B8860B',
        goldLight: '#DAA520',
        goldAccent: '#FFD700',
        text: '#333333',
        textSecondary: '#666666',
        textLight: '#999999',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        cardBackground: '#F8F9FA',
        border: '#E9ECEF'
    };
    
    // 創建學生選項按鈕
    const studentButtons = students.map((student, index) => {
        const remaining = student.remaining || 0;
        const remainingColor = remaining > 5 ? colors.success : remaining > 2 ? colors.warning : colors.danger;
        
        return {
            type: 'button',
            action: {
                type: 'postback',
                label: `${student.name}`,
                data: `student_${index}`,
                displayText: `查看 ${student.name} 的詳細記錄`
            },
            style: 'primary',
            color: remainingColor,
            height: 'sm'
        };
    });
    
    // 創建學生資訊摘要
    const studentSummary = students.map((student, index) => {
        const remaining = student.remaining || 0;
        const attendance = student.attendance || [];
        const presentCount = attendance.filter(record => record.present === true).length;
        const absentCount = attendance.filter(record => record.present === false).length;
        const leaveCount = attendance.filter(record => record.present === 'leave').length;
        
        // 根據 displayType 決定要顯示的統計資訊
        const statsContents = displayType === 'remaining' ? [
            {
                type: 'text',
                text: `剩餘: ${remaining}堂`,
                size: 'xs',
                color: remaining > 5 ? colors.success : remaining > 2 ? colors.warning : colors.danger,
                weight: 'bold'
            },
            {
                type: 'text',
                text: `出席: ${presentCount}`,
                size: 'xs',
                color: colors.textSecondary
            },
            {
                type: 'text',
                text: `缺席: ${absentCount}`,
                size: 'xs',
                color: colors.textSecondary
            }
        ] : [
            {
                type: 'text',
                text: `出席: ${presentCount}`,
                size: 'xs',
                color: colors.success,
                weight: 'bold'
            },
            {
                type: 'text',
                text: `請假: ${leaveCount}`,
                size: 'xs',
                color: colors.warning
            },
            {
                type: 'text',
                text: `缺席: ${absentCount}`,
                size: 'xs',
                color: colors.danger
            }
        ];
        
        return {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: student.name,
                    size: 'sm',
                    weight: 'bold',
                    color: colors.text,
                    margin: 'none'
                },
                {
                    type: 'text',
                    text: `${student.course} • ${student.period}`,
                    size: 'xs',
                    color: colors.textSecondary,
                    margin: 'xs'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: statsContents,
                    margin: 'xs',
                    spacing: 'sm'
                }
            ],
            paddingAll: '8px',
            backgroundColor: colors.cardBackground,
            cornerRadius: '6px',
            borderColor: colors.border,
            borderWidth: '0.5px',
            margin: 'xs'
        };
    });
    
    // 根據 displayType 決定標題
    const altText = displayType === 'attendance' 
        ? `完整出缺勤記錄 (${students.length}個學生)` 
        : `多學生出缺勤記錄 (${students.length}個學生)`;
    
    return {
        type: 'flex',
        altText: altText,
        contents: {
            type: 'carousel',
            contents: students.map((student, index) => {
                const remaining = student.remaining || 0;
                const attendance = student.attendance || [];
                const attendanceArray = Array.isArray(attendance) ? attendance : [];
                const recentAttendance = attendanceArray.slice(-5);
                
                // 創建出席記錄方塊
                const attendanceBoxes = recentAttendance.map((record) => {
                    let statusIcon = '';
                    let statusColor = '';
                    let statusBg = '';
                    
                    if (record.present === true) {
                        statusIcon = '✓';
                        statusColor = '#2E8B57';
                        statusBg = '#E8F5E8';
                    } else if (record.present === 'leave') {
                        statusIcon = '📝';
                        statusColor = '#DAA520';
                        statusBg = '#FFF8DC';
                    } else {
                        statusIcon = '✗';
                        statusColor = '#B22222';
                        statusBg = '#FFE4E1';
                    }
                    
                    // 格式化日期
                    const dateStr = record.date;
                    let displayDate = '??/??';
                    if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
                        const parts = dateStr.split('-');
                        if (parts.length >= 3) {
                            const month = parts[1].padStart(2, '0');
                            const day = parts[2].padStart(2, '0');
                            displayDate = `${month}/${day}`;
                        }
                    }
                    
                    return {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: displayDate,
                                size: 'xxs',
                                color: colors.textSecondary,
                                align: 'center'
                            },
                            {
                                type: 'text',
                                text: statusIcon,
                                size: 'xxs',
                                color: statusColor,
                                align: 'center'
                            }
                        ],
                        paddingAll: '6px',
                        cornerRadius: '4px',
                        backgroundColor: statusBg,
                        borderColor: statusColor,
                        borderWidth: '0.5px',
                        margin: '1px',
                        width: '48px'
                    };
                });
                
                return {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: 'FunLearnBar 智慧課程管理系統',
                                size: 'xs',
                                color: colors.goldLight,
                                weight: 'bold',
                                align: 'center',
                                margin: 'none'
                            },
                            {
                                type: 'text',
                                text: '剩餘堂數查詢',
                                size: 'lg',
                                color: colors.goldAccent,
                                weight: 'bold',
                                align: 'center',
                                margin: 'xs'
                            },
                            {
                                type: 'text',
                                text: `${student.name} (${index + 1}/${students.length})`,
                                size: 'xs',
                                color: colors.goldLight,
                                align: 'center',
                                margin: 'xs'
                            }
                        ],
                        backgroundColor: colors.primary,
                        paddingAll: '12px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            // 學生資訊
                            {
                                type: 'text',
                                text: '學生資訊',
                                weight: 'bold',
                                size: 'xs',
                                color: colors.primary,
                                margin: 'none'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: student.name,
                                        size: 'sm',
                                        weight: 'bold',
                                        color: colors.text,
                                        margin: 'none',
                                        wrap: true
                                    },
                                    {
                                        type: 'text',
                                        text: `${student.course} • ${student.period}`,
                                        size: 'xs',
                                        color: colors.textSecondary,
                                        margin: 'xs',
                                        wrap: true
                                    }
                                ],
                                margin: 'xs',
                                paddingAll: '8px',
                                backgroundColor: colors.cardBackground,
                                cornerRadius: '6px',
                                borderColor: colors.border,
                                borderWidth: '0.5px'
                            },
                            
                            // 剩餘堂數
                            {
                                type: 'text',
                                text: '🎯 剩餘堂數',
                                weight: 'bold',
                                size: 'xs',
                                color: colors.primary,
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: `${remaining}`,
                                        size: 'xl',
                                        weight: 'bold',
                                        color: colors.primary,
                                        align: 'center',
                                        margin: 'none'
                                    },
                                    {
                                        type: 'text',
                                        text: '剩餘堂數',
                                        size: 'xxs',
                                        color: colors.textSecondary,
                                        align: 'center',
                                        margin: 'xs'
                                    }
                                ],
                                margin: 'xs',
                                paddingAll: '16px',
                                backgroundColor: colors.cardBackground,
                                cornerRadius: '12px',
                                borderColor: colors.gold,
                                borderWidth: '2px'
                            },
                            
                            // 近5堂課
                            {
                                type: 'text',
                                text: mode === 'compact' ? '近5堂課' : '完整記錄',
                                weight: 'bold',
                                size: 'xs',
                                color: colors.primary,
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: attendanceArray.length > 0 ? [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: attendanceBoxes,
                                        margin: 'xs'
                                    },
                                    {
                                        type: 'text',
                                        text: '✓出席 📝請假 ✗缺席',
                                        size: 'xxs',
                                        color: colors.textLight,
                                        align: 'center',
                                        margin: 'xs'
                                    }
                                ] : [
                                    {
                                        type: 'text',
                                        text: '暫無出席記錄',
                                        size: 'xs',
                                        color: colors.textLight,
                                        align: 'center',
                                        margin: 'xs'
                                    }
                                ],
                                margin: 'xs',
                                paddingAll: '8px',
                                backgroundColor: colors.cardBackground,
                                cornerRadius: '6px',
                                borderColor: colors.border,
                                borderWidth: '0.5px'
                            },
                            
                            // 底部
                            {
                                type: 'text',
                                text: 'FunLearnBar',
                                size: 'xs',
                                color: colors.gold,
                                weight: 'bold',
                                align: 'center',
                                margin: 'sm'
                            }
                        ],
                        paddingAll: '12px'
                    }
                };
            })
        }
    };
}

function chunkArray(array, size) {
    const result = [];
    if (!Array.isArray(array) || size <= 0) {
        return result;
    }
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

function buildAttendanceStatusBox(record, colors) {
    let statusIcon = '';
    let statusColor = '';
    let statusBg = '';
    let statusLabel = '';

    if (record.present === true) {
        statusIcon = '✓';
        statusColor = '#2E8B57';
        statusBg = '#E8F5E8';
        statusLabel = '出席';
    } else if (record.present === 'leave') {
        statusIcon = '📝';
        statusColor = '#DAA520';
        statusBg = '#FFF8DC';
        statusLabel = '請假';
    } else {
        statusIcon = '✗';
        statusColor = '#B22222';
        statusBg = '#FFE4E1';
        statusLabel = '缺席';
    }

    let displayDate = '??/??';
    const dateStr = record.date;
    try {
        if (dateStr && typeof dateStr === 'string') {
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length >= 3) {
                    const month = parts[1].padStart(2, '0');
                    const day = parts[2].padStart(2, '0');
                    displayDate = `${month}/${day}`;
                }
            } else {
                const dateObj = new Date(dateStr);
                if (!isNaN(dateObj.getTime())) {
                    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    const day = dateObj.getDate().toString().padStart(2, '0');
                    displayDate = `${month}/${day}`;
                }
            }
        }
    } catch (error) {
        console.error('❌ 日期解析錯誤:', error, '原始日期:', dateStr);
    }

    return {
        type: 'box',
        layout: 'vertical',
        contents: [
            {
                type: 'text',
                text: displayDate,
                size: 'xxs',
                color: colors.textSecondary,
                align: 'center'
            },
            {
                type: 'text',
                text: statusIcon,
                size: 'xxs',
                color: statusColor,
                align: 'center'
            },
            {
                type: 'text',
                text: statusLabel,
                size: 'xxs',
                color: statusColor,
                align: 'center',
                margin: 'xs'
            }
        ],
        paddingAll: '6px',
        cornerRadius: '4px',
        backgroundColor: statusBg,
        borderColor: statusColor,
        borderWidth: '0.5px',
        margin: '1px',
        width: '53px'
    };
}

function createFullAttendanceBubble(studentData, index = null, total = null) {
    const colors = {
        primary: '#0F0F0F',
        gold: '#B8860B',
        goldLight: '#DAA520',
        goldAccent: '#FFD700',
        text: '#1C1C1C',
        textSecondary: '#5A5A5A',
        textLight: '#8A8A8A',
        cardBackground: '#F8F9FA',
        border: '#D3D3D3'
    };

    const { name, course, period, attendance = [], remaining = 0 } = studentData;
    const attendanceArray = Array.isArray(attendance) ? attendance : [];

    const totalRecords = attendanceArray.length;
    const presentCount = attendanceArray.filter(r => r.present === true).length;
    const leaveCount = attendanceArray.filter(r => r.present === 'leave').length;
    const absentCount = attendanceArray.filter(r => r.present === false).length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    const attendanceRows = chunkArray(attendanceArray, 5).map(row => ({
        type: 'box',
        layout: 'horizontal',
        contents: row.map(record => buildAttendanceStatusBox(record, colors)),
        spacing: 'sm',
        margin: 'xs'
    }));

    const attendanceSection = attendanceRows.length > 0 ? attendanceRows : [
        {
            type: 'text',
            text: '暫無出缺勤記錄',
            size: 'xs',
            color: colors.textLight,
            align: 'center',
            margin: 'sm'
        }
    ];

    const headerTitle = '完整出缺勤記錄';
    const headerSubtitle = totalRecords > 0 ? `共 ${totalRecords} 筆記錄` : '尚無記錄';
    const indexLabel = index && total ? `(${index}/${total})` : '';

    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: 'FunLearnBar 智慧課程管理系統',
                    size: 'xs',
                    color: colors.goldLight,
                    weight: 'bold',
                    align: 'center'
                },
                {
                    type: 'text',
                    text: `${headerTitle}${indexLabel}`,
                    size: 'lg',
                    color: colors.goldAccent,
                    weight: 'bold',
                    align: 'center',
                    margin: 'xs'
                },
                {
                    type: 'text',
                    text: headerSubtitle,
                    size: 'xs',
                    color: colors.goldLight,
                    align: 'center',
                    margin: 'xs'
                }
            ],
            backgroundColor: colors.primary,
            paddingAll: '12px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '學生資訊',
                    weight: 'bold',
                    size: 'xs',
                    color: colors.primary,
                    margin: 'none'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: name,
                            size: 'sm',
                            weight: 'bold',
                            color: colors.text,
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: `${course} • ${period}`,
                            size: 'xs',
                            color: colors.textSecondary,
                            margin: 'xs',
                            wrap: true
                        }
                    ],
                    margin: 'xs',
                    paddingAll: '8px',
                    backgroundColor: colors.cardBackground,
                    cornerRadius: '6px',
                    borderColor: colors.border,
                    borderWidth: '0.5px'
                },
                {
                    type: 'text',
                    text: '統計資訊',
                    weight: 'bold',
                    size: 'xs',
                    color: colors.primary,
                    margin: 'sm'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `${attendanceRate}%`,
                                    size: 'xxs',
                                    color: colors.primary,
                                    align: 'center'
                                },
                                {
                                    type: 'text',
                                    text: '出席率',
                                    size: 'xxs',
                                    color: colors.textLight,
                                    align: 'center'
                                }
                            ],
                            flex: 1,
                            paddingAll: '3px',
                            backgroundColor: colors.cardBackground,
                            cornerRadius: '4px',
                            margin: '1px',
                            borderColor: colors.border,
                            borderWidth: '0.5px'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `${presentCount}`,
                                    size: 'xxs',
                                    color: '#2E8B57',
                                    align: 'center'
                                },
                                {
                                    type: 'text',
                                    text: '出席',
                                    size: 'xxs',
                                    color: colors.textLight,
                                    align: 'center'
                                }
                            ],
                            flex: 1,
                            paddingAll: '3px',
                            backgroundColor: colors.cardBackground,
                            cornerRadius: '4px',
                            margin: '1px',
                            borderColor: colors.border,
                            borderWidth: '0.5px'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `${leaveCount}`,
                                    size: 'xxs',
                                    color: '#DAA520',
                                    align: 'center'
                                },
                                {
                                    type: 'text',
                                    text: '請假',
                                    size: 'xxs',
                                    color: colors.textLight,
                                    align: 'center'
                                }
                            ],
                            flex: 1,
                            paddingAll: '3px',
                            backgroundColor: colors.cardBackground,
                            cornerRadius: '4px',
                            margin: '1px',
                            borderColor: colors.border,
                            borderWidth: '0.5px'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `${absentCount}`,
                                    size: 'xxs',
                                    color: '#B22222',
                                    align: 'center'
                                },
                                {
                                    type: 'text',
                                    text: '缺席',
                                    size: 'xxs',
                                    color: colors.textLight,
                                    align: 'center'
                                }
                            ],
                            flex: 1,
                            paddingAll: '3px',
                            backgroundColor: colors.cardBackground,
                            cornerRadius: '4px',
                            margin: '1px',
                            borderColor: colors.border,
                            borderWidth: '0.5px'
                        }
                    ]
                },
                {
                    type: 'text',
                    text: '完整出缺勤紀錄',
                    weight: 'bold',
                    size: 'xs',
                    color: colors.primary,
                    margin: 'sm'
                },
                ...attendanceSection,
                {
                    type: 'text',
                    text: '✓出席 | 📝請假 | ✗缺席',
                    size: 'xxs',
                    color: colors.textLight,
                    align: 'center',
                    margin: 'sm'
                },
                {
                    type: 'text',
                    text: `剩餘堂數：${remaining}`,
                    size: 'xxs',
                    color: colors.textSecondary,
                    align: 'center'
                }
            ],
            paddingAll: '12px'
        }
    };
}

function createFullAttendanceFlexMessage(studentData) {
    return {
        type: 'flex',
        altText: `${studentData.name} 的出缺勤完整記錄`,
        contents: createFullAttendanceBubble(studentData)
    };
}

function createFullAttendanceCarousel(students) {
    return {
        type: 'flex',
        altText: `出缺勤完整記錄 (${students.length} 位學生)`,
        contents: {
            type: 'carousel',
            contents: students.map((student, index) => createFullAttendanceBubble(student, index + 1, students.length))
        }
    };
}

// ==================== 原有函數（向後相容） ====================

// LINE Loading Animation 函數
async function showLoadingAnimation(userId, loadingSeconds = 5) {
    try {
        const bots = [
            { token: process.env.LINE_CHANNEL_ACCESS_TOKEN, name: '主要Bot' },
            { token: process.env.LINE_CHANNEL_ACCESS_TOKEN_2, name: '第二個Bot' },
            { token: process.env.LINE_CHANNEL_ACCESS_TOKEN_3, name: '第三個Bot' }
        ];
        
        for (const bot of bots) {
            if (!bot.token) continue;
            
            try {
                const response = await axios.post('https://api.line.me/v2/bot/chat/loading/start', {
                    chatId: userId,
                    loadingSeconds: loadingSeconds
                }, {
                    headers: {
                        'Authorization': `Bearer ${bot.token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log(`✅ ${bot.name} Loading Animation 發送成功給: ${userId}`);
                return { success: true, bot: bot.name };
            } catch (error) {
                console.log(`❌ ${bot.name} Loading Animation 發送失敗給: ${userId}:`, error.response?.data || error.message);
                continue;
            }
        }
        
        console.log('❌ 所有 Bot Loading Animation 發送失敗');
        return { success: false };
    } catch (error) {
        console.error('❌ Loading Animation 發送錯誤:', error);
        return { success: false, error: error.message };
    }
}

// LINE Messaging API 通知函數（向後相容，使用多 Bot 支援）
async function sendLineMessage(message, targetUserId = null, notifyAdmin = true) {
    // 使用新的多 Bot 支援函數
    return await sendLineMessageWithBot(message, targetUserId, null, notifyAdmin);
}

// LINE Flex Message 發送函數（向後相容，使用多 Bot 支援）
async function sendLineFlexMessage(flexMessage, targetUserId) {
    // 使用雙Bot支援發送Flex Message
    try {
        // 準備Bot列表
        const bots = [];
        
        // 第一個Bot（主要Bot）
        if (LINE_CHANNEL_ACCESS_TOKEN && LINE_CHANNEL_ACCESS_TOKEN !== 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
            bots.push({
                id: 'primary',
                name: '主要Bot',
                token: LINE_CHANNEL_ACCESS_TOKEN
            });
        }
        
        // 第二個Bot（如果啟用且配置了）
        if (ENABLE_DUAL_BOT && LINE_CHANNEL_ACCESS_TOKEN_2 && LINE_CHANNEL_ACCESS_TOKEN_2 !== '') {
            bots.push({
                id: 'secondary',
                name: '第二個Bot',
                token: LINE_CHANNEL_ACCESS_TOKEN_2
            });
        }
        
        if (bots.length === 0) {
            console.log('沒有可用的Bot，跳過發送 Flex Message');
            return { success: false, message: '沒有可用的Bot' };
        }

        // 嘗試使用每個Bot發送
        for (const bot of bots) {
            try {
                console.log(`🤖 使用 ${bot.name} (${bot.id}) 發送 Flex Message`);

                const response = await axios.post(LINE_MESSAGING_API, {
                    to: targetUserId,
                    messages: [flexMessage]
                }, {
                    headers: {
                        'Authorization': `Bearer ${bot.token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                console.log(`✅ ${bot.name} Flex Message 發送成功給 ${targetUserId}:`, response.data);
                return { success: true, data: response.data, botUsed: bot };

            } catch (error) {
                console.error(`❌ ${bot.name} Flex Message 發送失敗給 ${targetUserId}:`, error.response?.data || error.message);
                // 繼續嘗試下一個Bot
            }
        }
        
        return { success: false, error: '所有Bot都無法發送Flex Message' };

    } catch (error) {
        console.error('Flex Message 發送失敗:', error.message);
        return { success: false, error: error.message };
    }
}

// ==================== 匯款 Flex 組裝與通知 ====================

function includesAnyKeyword(text, keywords = []) {
    if (!text || !Array.isArray(keywords)) return false;
    const normalized = text.toLowerCase();
    return keywords.some(keyword => {
        if (!keyword) return false;
        return normalized.includes(keyword.toLowerCase());
    });
}

function analyzeRemittanceIntentText(text) {
    const raw = text || '';
    const collapsed = raw.replace(/\s+/g, '');
    const filters = config.remittance.intentFilters || {};
    const postponeWords = filters.postponeKeywords || [];
    const negativeWords = filters.negativeKeywords || [];
    const inquiryWords = filters.inquiryKeywords || [];
    const instructionWords = filters.instructionKeywords || [];
    const questionIndicators = filters.questionIndicators || [];
    const announcementWords = filters.announcementKeywords || [];

    const hasPostpone = includesAnyKeyword(collapsed, postponeWords);
    const hasNegative = includesAnyKeyword(collapsed, negativeWords);
    const hasInquiry = includesAnyKeyword(collapsed, inquiryWords);
    const hasInstruction = includesAnyKeyword(collapsed, instructionWords);
    const hasQuestion = questionIndicators.some(ind => ind && raw.includes(ind));
    // 🆕 檢測公告/通知類訊息（如「@All 薪資部分...會匯款入帳」）
    const hasAnnouncement = includesAnyKeyword(raw, announcementWords);

    // 🆕 公告類訊息直接跳過，不觸發任何匯款相關回覆
    const shouldSkip = hasAnnouncement;
    const shouldDefer = !shouldSkip && (hasPostpone || hasNegative || hasInquiry || hasInstruction || hasQuestion);
    
    let reason = null;
    if (shouldSkip) reason = 'announcement';
    else if (hasPostpone) reason = 'postpone';
    else if (hasNegative) reason = 'negative';
    else if (hasInquiry) reason = 'inquiry';
    else if (hasInstruction) reason = 'instruction';
    else if (hasQuestion) reason = 'question';

    return {
        shouldDefer,
        shouldSkip,
        reason,
        flags: { hasPostpone, hasNegative, hasInquiry, hasInstruction, hasQuestion, hasAnnouncement }
    };
}

async function sendRemittanceDeferredReply(userId, replyToken) {
    const message = config.remittance.intentFilters?.deferReplyMessage 
        || '👀 已收到您的訊息，完成匯款後請再通知我們，我們會立即為您處理 🙏';

    try {
        if (replyToken) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken,
                messages: [{ type: 'text', text: message }]
            }, {
                headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                timeout: config.server.timeout.line
            });
        } else if (userId) {
            await sendLineMessage(message, userId, false);
        }
    } catch (error) {
        console.error('❌ 匯款語意回覆失敗:', error.response?.data || error.message);
    }
}

function parseAmountFromText(text) {
    if (!text) return null;
    
    // 策略 1：優先匹配有明確金額關鍵字的數字
    const keywordPatterns = [
        // 支援 "轉帳金額 TWD1,000.00" 格式（保留逗號和小數點）
        /(?:金額|轉帳金額|匯款金額|付款金額|繳費金額|應繳金額|轉出金額|轉入金額|交易金額)[\s:：]*(?:TWD|NTD|NT\$|USD|\$)?[\s]*(\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
        // 支援 "NT$ 1000" 格式
        /(?:NT\$|NT|USD|TWD|NTD|台幣)[\s]*(\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
        // 支援 "1000元" 格式
        /(\d{3,})\s*(?:元|塊)/i
    ];
    
    for (const pattern of keywordPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            // 移除逗號和小數點後的部分，只保留整數
            let amount = match[1].replace(/,/g, '').split('.')[0];
            
            // 排除日期數字（只排除 2000-2099 之間的 4 位數年份）
            const numAmount = parseInt(amount);
            if (amount.length === 4 && numAmount >= 2000 && numAmount <= 2099) {
                // 確定是年份，跳過
                continue;
            }
            return amount;
        }
    }
    
    // 移除逗號用於策略 2 和 3
    const cleanText = text.replace(/,/g, '');

    // 先移除常見的「銀行代碼 + 長帳號」格式，避免把 812 這類銀行代碼誤判為金額
    // 例如："(812)0028881014624669"、"812-0028881014624669"、"8120028881014624669"
    let sanitizedText = cleanText
        // 格式一：(812)0028881014624669
        .replace(/\(\d{3}\)\d{5,}/g, ' ')
        // 格式二：812-0028881014624669
        .replace(/\b\d{3}-\d{5,}\b/g, ' ')
        // 格式三：8120028881014624669（3 碼開頭後接 7 碼以上）
        .replace(/\b\d{3}\d{7,}\b/g, ' ')
        // 🆕 格式四：排除「末五碼XXXXX」「後五碼XXXXX」「末X碼XXXXX」等帳號尾碼（支援中文數字）
        .replace(/(?:末|後|尾|最後).{0,5}碼[\s]*\d{3,}/gi, ' ')
        // 🆕 格式五：排除「帳號XXXXX」「帳號尾數XXXXX」
        .replace(/帳號(?:尾數|後[\s]*\d+[\s]*碼)?[\s]*\d{3,}/gi, ' ');
    
    // 策略 2：匹配獨立的數字（避免日期格式）
    // 排除 YYYY-MM-DD 或 YYYY/MM/DD 格式中的數字
    const amounts = sanitizedText.match(/(?<![\d-\/])\d{3,}(?![\d-\/])/g);
    if (amounts && amounts.length > 0) {
        // 過濾掉可能是年份的數字（2000-2099）
        const validAmounts = amounts.filter(num => {
            const n = parseInt(num);
            return !(n >= 2000 && n <= 2099);
        });
        
        if (validAmounts.length > 0) {
            // 返回第一個有效金額
            return validAmounts[0];
        }
    }
    
    // 策略 3：回退到原始匹配（但排除年份）
    const fallbackMatch = sanitizedText.match(/\d{3,}/g);
    if (fallbackMatch && fallbackMatch.length > 0) {
        // 找第一個不是年份的數字
        for (const num of fallbackMatch) {
            const n = parseInt(num);
            if (n < 2000 || n > 2099) {
                return num;
            }
        }
    }
    
    return null;
}

function buildOfficialChatUrl(userId, messageId) {
    const bizId = config.line?.officialAccount?.bizId || '';
    const template = config.line?.officialAccount?.chatBaseUrl || '';
    const botUserId = config.line?.officialAccount?.botUserId || '';
    const managerId = config.line?.officialAccount?.managerId || '';
    const chatId = userId ? (userId.startsWith('U') ? `2${userId}` : userId) : '';
    // 1) 優先使用官方 chat.line.biz 的聊天介面（/chat），由管理員自行依客戶名稱查詢對話
    if (managerId) {
        return `https://chat.line.biz/${managerId}/chat`;
    }

    // 2) 若有自訂 template，則帶入變數
    if (template) {
        let url = template
            .replace('{BIZ_ID}', bizId)
            .replace('{CHAT_ID}', chatId)
            .replace('{USER_ID}', userId || '')
            .replace('{BOT_USER_ID}', botUserId || '')
            .replace('{MESSAGE_ID}', messageId || '');
        if (messageId && !url.includes('messageId')) {
            url += (url.includes('?') ? '&' : '?') + `messageId=${messageId}`;
        }
        return url;
    }
    
    // 3) 再退回以 botUserId 打開官方帳號對話
    if (botUserId) {
        let url = `https://line.me/R/oaMessage/${botUserId}`;
        if (messageId) {
            url += (url.includes('?') ? '&' : '?') + `messageId=${messageId}`;
        }
        return url;
    }
    return `https://line.me/R/oaMessage/_/${userId || ''}`;
}

async function summarizeMessageText(rawText) {
    const normalized = (rawText || '').trim();
    const lines = normalized ? normalized.split(/\n+/).map(line => line.trim()).filter(Boolean) : [];
    const fallbackSummary = lines.length > 0
        ? lines.slice(0, 5).join(' │ ')
        : '（無文字可摘要）';

    if (!normalized) return fallbackSummary;

    console.log('🧪 Gemini 摘要輸入預覽:', {
        length: normalized.length,
        preview: normalized.slice(0, 120)
    });

    if (config.ai?.provider === 'gemini') {
        const { apiKey, model } = config.ai.gemini || {};
        if (apiKey) {
            const candidateModels = Array.from(new Set([
                model,
                'gemini-2.5-flash',
                'gemini-2.0-flash'
            ].filter(Boolean)));

            console.log('🧪 Gemini 可用模型清單:', candidateModels);

            const prompt = [
                '你是一名財務助理，需將以下匯款憑證重點整理給管理員。',
                '請僅使用原文資訊，以繁體中文輸出 2-3 行，每行 40 字內，格式建議如下：',
                '第 1 行：金額｜交易日期｜轉出帳戶 → 轉入帳戶（無資訊填「未知」）',
                '第 2 行：備註 / 留言 / 其他關鍵字（若無可省略）',
                '規則：不得自行猜測、不得加入客套語或說明文字，數字與專有名詞需照原文保留。',
                '',
                '原始文字：',
                normalized
            ].join('\n');

            for (const candidateModel of candidateModels) {
                try {
                    const summary = await requestGeminiSummary(candidateModel, prompt, apiKey);
                    console.log('🧪 Gemini 回傳摘要預覽:', {
                        model: candidateModel,
                        length: summary ? summary.length : 0,
                        preview: summary ? summary.slice(0, 120) : '(empty)'
                    });
                    if (summary) return summary;
                } catch (error) {
                    const statusCode = error.response?.status;
                    const apiStatus = error.response?.data?.error?.status;
                    const isModelMissing = statusCode === 404 || apiStatus === 'NOT_FOUND';
                    console.error(`❌ Gemini 摘要失敗 (model=${candidateModel}):`, error.response?.data || error.message);
                    if (isModelMissing) {
                        console.warn(`⚠️ 模型 ${candidateModel} 無法使用，嘗試下一個可用模型`);
                        continue;
                    }
                    break;
                }
            }
        }
    }

    return fallbackSummary;
}

async function requestGeminiSummary(modelName, prompt, apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ]
    };

    const response = await axios.post(endpoint, body, {
        timeout: config.server.timeout.api || 15000
    });

    const parts = response.data?.candidates?.[0]?.content?.parts || [];
    return parts.map(part => part.text || '').join('\n').trim();
}

function createRemittanceFlexBubble(record) {
    const amountDisplay = record.amount ? `NT$ ${Number(record.amount).toLocaleString('en-US')}` : '金額待確認';
    const timeString = dayjs(record.createdAt).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm');
    const rawMessageText = (record.messageText || '').trim();
    const messageLines = rawMessageText
        ? rawMessageText.split(/\n+/).map(line => line.trim()).filter(Boolean)
        : ['（圖片／非文字訊息）'];
    const fallbackSnippet = messageLines.slice(0, 2).join(' │ ').slice(0, 80);
    const userLabel = record.displayName || record.userId;
    const userChatUrl = buildOfficialChatUrl(record.userId, record.messageId);
    const summaryText = (record.summaryText || '').trim();
    const summaryLines = (summaryText ? summaryText.split(/\n+/) : [fallbackSnippet])
        .map(line => line.trim())
        .filter(Boolean);
    const summarySnippet = summaryLines.slice(0, 2).join(' │ ').slice(0, 80) || fallbackSnippet;
    const rawPreviewLines = messageLines.slice(0, Math.min(5, messageLines.length));
    
    // Logo URL：如果 systemUrl 是 localhost，使用預設外部圖片
    let logoUrl;
    if (config.server.systemUrl.includes('localhost') || config.server.systemUrl.includes('127.0.0.1')) {
        // 使用公開的預設圖片（LINE 官方範例圖）
        logoUrl = 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png';
    } else {
        logoUrl = `${config.server.systemUrl}/flb-logo.jpg`;
        if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
            logoUrl = `https://${logoUrl}`;
        }
    }
    
    const postbackData = {
        action: config.remittance.confirmAction,
        recordId: record.id
    };

    console.log('🧪 匯款 Flex 顯示內容預覽:', {
        userId: record.userId,
        messageId: record.messageId,
        displayName: userLabel,
        amountDisplay,
        summarySnippet,
        userChatUrl,
        rawPreview: rawPreviewLines.join(' │ ').slice(0, 80)
    });

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: '匯款待確認',
                            weight: 'bold',
                            size: 'lg',
                            color: '#111111',
                            flex: 0
                        },
                        {
                            type: 'filler'
                        },
                        {
                            type: 'image',
                            url: logoUrl,
                            size: 'xxs',
                            aspectMode: 'cover',
                            aspectRatio: '1:1',
                            flex: 0,
                            margin: 'none'
                        }
                    ]
                }
            ],
            paddingAll: '20px',
            paddingBottom: '16px',
            backgroundColor: '#FFFFFF'
        },
        hero: {
            type: 'box',
            layout: 'vertical',
            height: '88px',
            backgroundColor: config.remittance.themeColor,
            contents: [
                {
                    type: 'text',
                    text: '匯款金額',
                    color: '#ffffff',
                    size: 'sm',
                    margin: 'md'
                },
                {
                    type: 'text',
                    text: amountDisplay,
                    color: '#ffffff',
                    weight: 'bold',
                    size: 'xxl',
                    margin: 'sm'
                }
            ],
            paddingAll: '16px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: '來自', weight: 'bold', color: '#555555', flex: 2 },
                        { type: 'text', text: userLabel, color: '#111111', flex: 6, wrap: true }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        { type: 'text', text: '快速動作', weight: 'bold', color: '#555555', flex: 2 },
                        {
                            type: 'button',
                            style: 'link',
                            flex: 6,
                            action: {
                                type: 'uri',
                                label: '➡️ 快速打開官方 LINE',
                                uri: userChatUrl
                            }
                        }
                    ]
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: '摘要', weight: 'bold', color: '#555555', flex: 2 },
                        { type: 'text', text: summarySnippet || fallbackSnippet, color: '#111111', flex: 6, wrap: true }
                    ]
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: '時間', weight: 'bold', color: '#555555', flex: 2 },
                        { type: 'text', text: timeString, color: '#111111', flex: 6 }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            paddingAll: '16px',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: config.remittance.themeColor,
                    height: 'sm',
                    action: {
                        type: 'postback',
                        label: '✅ 已確認收款',
                        data: JSON.stringify(postbackData),
                        displayText: '已確認收款'
                    }
                },
                {
                    type: 'button',
                    style: 'link',
                    height: 'sm',
                    action: {
                        type: 'postback',
                        label: '⚠️ 金額辨識有誤',
                        data: JSON.stringify({
                            action: 'remittance_correct_amount',
                            recordId: record.id
                        }),
                        displayText: '金額辨識有誤，需要修正'
                    }
                }
            ]
        }
    };
}

/**
 * 創建給客戶的匯款確認 Flex Message（LINE Pay 風格）
 * @param {Object} record - 匯款記錄
 * @returns {Object} Flex Message 物件
 */
function createPaymentConfirmationFlexMessage(record) {
    const amountDisplay = record.amount ? Number(record.amount).toLocaleString('en-US') : '—';
    const timeString = dayjs(record.confirmedAt || new Date()).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss');
    
    // Logo URL：如果 systemUrl 是 localhost，使用預設外部圖片
    let logoUrl;
    if (config.server.systemUrl.includes('localhost') || config.server.systemUrl.includes('127.0.0.1')) {
        logoUrl = 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png';
    } else {
        logoUrl = `${config.server.systemUrl}/flb-logo.jpg`;
        if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
            logoUrl = `https://${logoUrl}`;
        }
    }

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: '付款確認',
                            weight: 'bold',
                            size: 'xl',
                            color: '#00C300',
                            flex: 0
                        },
                        {
                            type: 'filler'
                        },
                        {
                            type: 'image',
                            url: logoUrl,
                            size: 'xxs',
                            aspectMode: 'cover',
                            aspectRatio: '1:1',
                            flex: 0,
                            margin: 'none'
                        }
                    ]
                }
            ],
            paddingAll: '20px',
            paddingBottom: '16px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                // 成功圖示與狀態
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '✓',
                            size: '5xl',
                            color: '#00C300',
                            weight: 'bold',
                            align: 'center'
                        },
                        {
                            type: 'text',
                            text: '付款已確認',
                            size: 'lg',
                            color: '#00C300',
                            weight: 'bold',
                            align: 'center',
                            margin: 'md'
                        }
                    ],
                    paddingAll: '20px',
                    backgroundColor: '#F0F9F4',
                    cornerRadius: '12px',
                    margin: 'none'
                },
                // 分隔線
                {
                    type: 'separator',
                    margin: 'xl',
                    color: '#E5E5E5'
                },
                // 金額資訊
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '付款金額',
                            size: 'sm',
                            color: '#999999',
                            margin: 'none'
                        },
                        {
                            type: 'text',
                            text: `NT$ ${amountDisplay}`,
                            size: 'xxl',
                            weight: 'bold',
                            color: '#111111',
                            margin: 'sm'
                        }
                    ],
                    margin: 'xl'
                },
                // 付款人資訊
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: '付款人',
                                    size: 'sm',
                                    color: '#999999',
                                    flex: 0,
                                    margin: 'none'
                                },
                                {
                                    type: 'text',
                                    text: record.displayName || '您',
                                    size: 'sm',
                                    color: '#111111',
                                    align: 'end',
                                    margin: 'none'
                                }
                            ],
                            spacing: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: '確認時間',
                                    size: 'sm',
                                    color: '#999999',
                                    flex: 0,
                                    margin: 'none'
                                },
                                {
                                    type: 'text',
                                    text: timeString,
                                    size: 'sm',
                                    color: '#111111',
                                    align: 'end',
                                    margin: 'none'
                                }
                            ],
                            spacing: 'lg',
                            margin: 'md'
                        }
                    ],
                    margin: 'xl',
                    paddingAll: '16px',
                    backgroundColor: '#F7F7F7',
                    cornerRadius: '8px'
                },
                // 感謝訊息
                {
                    type: 'text',
                    text: '感謝您的付款！我們已收到您的款項。',
                    size: 'sm',
                    color: '#666666',
                    align: 'center',
                    wrap: true,
                    margin: 'xl'
                }
            ],
            paddingAll: '20px'
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'separator',
                    color: '#E5E5E5'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: '樂程坊 Fun Learn Bar',
                            size: 'xs',
                            color: '#999999',
                            flex: 0
                        }
                    ],
                    paddingAll: '16px'
                }
            ],
            spacing: 'none',
            margin: 'none'
        },
        styles: {
            header: {
                backgroundColor: '#FFFFFF'
            },
            body: {
                backgroundColor: '#FFFFFF'
            },
            footer: {
                backgroundColor: '#FFFFFF'
            }
        }
    };
}

async function downloadLineMessageContent(messageId) {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        throw new Error('LINE Channel Access Token 未設定，無法下載圖片內容');
    }

    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
        responseType: 'arraybuffer',
        timeout: config.server.timeout.line
    });

    return Buffer.from(response.data);
}

async function extractTextWithGoogleVision(imageBuffer) {
    if (!config.ocr.googleVisionApiKey) {
        throw new Error('Google Vision API Key 未設定');
    }

    const endpoint = `${config.ocr.googleVisionEndpoint}?key=${config.ocr.googleVisionApiKey}`;
    const base64Image = imageBuffer.toString('base64');
    const requestBody = {
        requests: [
            {
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION' }]
            }
        ]
    };

    const response = await axios.post(endpoint, requestBody, {
        timeout: config.server.timeout.api
    });

    const annotations = response.data?.responses?.[0];
    if (!annotations) return '';

    const text = annotations.fullTextAnnotation?.text 
        || annotations.textAnnotations?.[0]?.description 
        || '';

    return text.trim();
}

async function extractTextFromImage(messageId) {
    if (!config.ocr.enabled) {
        console.log('🖼️ OCR 未啟用，跳過圖片辨識');
        return '';
    }

    try {
        const imageBuffer = await downloadLineMessageContent(messageId);
        if (!imageBuffer || imageBuffer.length === 0) {
            console.log('⚠️ 無法取得圖片內容，OCR 取消');
            return '';
        }

        switch (config.ocr.provider) {
            case 'google_vision':
                return await extractTextWithGoogleVision(imageBuffer);
            default:
                console.log(`⚠️ 未支援的 OCR Provider: ${config.ocr.provider}`);
                return '';
        }
    } catch (error) {
        console.error('❌ OCR 處理失敗:', error.response?.data || error.message);
        return '';
    }
}

async function handleRemittanceCandidate({ event, messageText, userId, sourceType, groupId, roomId, messageId }) {
    // 取得所有管理員 ID
    const adminIds = config.getAllAdminUserIds();
    
    // 檢查是否有管理員或群組可以發送
    if (!config.remittance.alertGroupId && adminIds.length === 0) {
        console.log('⚠️ 未設定管理員群組或管理員 User ID，跳過匯款提醒');
        return;
    }

    // 取得使用者名稱
    let displayName = '';
    try {
        const profile = await axios.get(`${config.line.profileApi}/${userId}`, {
            headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
            timeout: config.server.timeout.line
        });
        displayName = profile.data.displayName || '';
    } catch (e) {
        displayName = userId || '';
    }

    // 先立即回覆用戶已收到匯款資訊（不等待 Gemini 摘要與管理員通知完成）
    try {
        const ack = { type: 'text', text: '📄 已收到您的匯款資訊，將盡快為您確認🙏🏻' };
        if (event.replyToken) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: event.replyToken,
                messages: [ack]
            }, {
                headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                timeout: config.server.timeout.line
            });
        } else {
            await sendLineMessageWithBot(ack.text, userId, null, false);
        }
    } catch (e) {
        console.error('❌ 回覆用戶匯款收件失敗:', e.message);
    }

    const amount = parseAmountFromText(messageText || '');
    let summaryText = '';
    if (messageText && messageText.trim()) {
        try {
            summaryText = await summarizeMessageText(messageText);
        } catch (err) {
            console.error('⚠️ Gemini 摘要流程失敗（main）:', err.message);
        }
    }

    console.log('🧪 匯款記錄摘要狀態:', {
        hasMessageText: Boolean(messageText && messageText.trim()),
        summaryLength: summaryText ? summaryText.length : 0,
        summaryPreview: summaryText ? summaryText.slice(0, 120) : '(empty)'
    });
    
    // 🐛 調試日誌：追蹤金額提取
    console.log('💰 金額提取調試:', {
        messageTextLength: (messageText || '').length,
        messageTextPreview: (messageText || '').slice(0, 100),
        extractedAmount: amount,
        amountType: typeof amount
    });
    
    const recordId = `remit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = {
        id: recordId,
        userId,
        displayName,
        messageText,
        amount,
        summaryText,
        sourceType,
        groupId,
        roomId,
        messageId,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    addRemittanceRecord(record);

    const bubble = createRemittanceFlexBubble(record);
    const flexMessage = { type: 'flex', altText: '匯款待確認', contents: bubble };

    // 發送到管理員群組（如果有設定）
    if (config.remittance.alertGroupId) {
        try {
            await sendLineFlexMessage(flexMessage, config.remittance.alertGroupId);
            console.log('✅ 已發送匯款通知到管理員群組');
        } catch (e) {
            console.error('❌ 發送匯款通知到群組失敗:', e.message);
        }
    }

    // 發送給所有管理員（個別推播）
    if (adminIds.length > 0) {
        console.log(`📤 發送匯款通知給 ${adminIds.length} 位管理員...`);
        for (const adminId of adminIds) {
            try {
                await sendLineFlexMessage(flexMessage, adminId);
                console.log(`✅ 已發送匯款通知給管理員: ${adminId}`);
            } catch (e) {
                console.error(`❌ 發送匯款通知給管理員 ${adminId} 失敗:`, e.message);
            }
        }
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
            richMenuId: 'richmenu-54c7c6af88146d270c56496118f2b145',
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
            timeout: 30000  // 增加到 30 秒以避免 Google Sheets API 超時
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

// 路由：系統設定
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// 註冊設定 API 路由
setupSettingsRoutes(app);

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

// ==================== 群組管理 API ====================

// API路由：獲取所有群組
app.get('/api/groups', async (req, res) => {
    try {
        const groups = await db.getAllGroups();
        res.json({ 
            success: true, 
            groups: groups,
            total: groups.length
        });
    } catch (error) {
        console.error('獲取群組列表錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取群組列表失敗' 
        });
    }
});

// API路由：獲取單一群組
app.get('/api/groups/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await db.getGroup(groupId);
        
        if (group) {
            res.json({ 
                success: true, 
                group: group
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: '找不到該群組' 
            });
        }
    } catch (error) {
        console.error('獲取群組資訊錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取群組資訊失敗' 
        });
    }
});

// API路由：搜尋群組
app.get('/api/groups/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const groups = await db.searchGroups(query);
        res.json({ 
            success: true, 
            groups: groups,
            total: groups.length
        });
    } catch (error) {
        console.error('搜尋群組錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '搜尋群組失敗' 
        });
    }
});

// API路由：更新群組名稱
app.patch('/api/groups/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { groupName } = req.body;
        
        if (!groupName) {
            return res.status(400).json({
                success: false,
                error: '請提供群組名稱'
            });
        }
        
        const success = await db.updateGroupName(groupId, groupName);
        
        if (success) {
            res.json({ 
                success: true, 
                message: '群組名稱已更新'
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: '找不到該群組' 
            });
        }
    } catch (error) {
        console.error('更新群組名稱錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '更新群組名稱失敗' 
        });
    }
});

// API路由：獲取群組統計
app.get('/api/group-stats', async (req, res) => {
    try {
        const groupCount = await db.getGroupCount();
        const groups = await db.getAllGroups();
        
        // 統計活躍群組（最近7天有活動）
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const activeGroups = groups.filter(g => {
            const lastActivity = new Date(g.lastActivityAt);
            return lastActivity > sevenDaysAgo;
        });
        
        res.json({ 
            success: true, 
            stats: {
                totalGroups: groupCount,
                activeGroups: activeGroups.length,
                inactiveGroups: groupCount - activeGroups.length,
                groupTypes: {
                    group: groups.filter(g => g.type === 'group').length,
                    room: groups.filter(g => g.type === 'room').length
                }
            }
        });
    } catch (error) {
        console.error('獲取群組統計錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取群組統計失敗' 
        });
    }
});

// ==================== 學生回應 API ====================

/**
 * 載入學生回應資料
 */
function loadStudentResponses() {
    const responsesPath = path.join(__dirname, 'data', 'student-responses.json');
    try {
        if (fs.existsSync(responsesPath)) {
            const data = fs.readFileSync(responsesPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ 載入學生回應失敗:', error.message);
    }
    return { responses: [] };
}

/**
 * 儲存學生回應資料
 */
function saveStudentResponses(data) {
    const responsesPath = path.join(__dirname, 'data', 'student-responses.json');
    try {
        // 確保目錄存在
        const dir = path.dirname(responsesPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(responsesPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ 儲存學生回應失敗:', error.message);
        return false;
    }
}

// API路由：新增/更新學生回應
app.post('/api/student-responses', async (req, res) => {
    try {
        const { 
            studentName, 
            courseName, 
            courseDate, 
            courseTime,
            location,
            weekday,
            responseType, 
            leaveReason, 
            userId,
            timestamp 
        } = req.body;
        
        // 驗證必填欄位
        if (!studentName || !courseName || !courseDate || !responseType) {
            return res.status(400).json({
                success: false,
                message: '缺少必填欄位',
                required: ['studentName', 'courseName', 'courseDate', 'responseType']
            });
        }
        
        // 驗證回應類型
        const validTypes = ['attend', 'leave', 'pending'];
        if (!validTypes.includes(responseType)) {
            return res.status(400).json({
                success: false,
                message: '無效的回應類型。有效值: attend, leave, pending'
            });
        }
        
        // 如果是請假，必須提供理由
        if (responseType === 'leave' && !leaveReason) {
            return res.status(400).json({
                success: false,
                message: '請假回應必須提供理由'
            });
        }
        
        // 載入現有資料
        const data = loadStudentResponses();
        
        // 檢查是否已存在相同的回應（相同學生 + 課程 + 日期）
        const existingIndex = data.responses.findIndex(r => 
            r.studentName === studentName && 
            r.courseName === courseName && 
            r.courseDate === courseDate
        );
        
        // 建立回應物件
        const response = {
            id: existingIndex >= 0 ? data.responses[existingIndex].id : `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            studentName,
            courseName,
            courseDate,
            courseTime: courseTime || '',
            location: location || '',
            weekday: weekday || '',
            responseType,
            leaveReason: responseType === 'leave' ? leaveReason : '',
            timestamp: timestamp || new Date().toISOString(),
            userId: userId || ''
        };
        
        // 更新或新增
        if (existingIndex >= 0) {
            data.responses[existingIndex] = response;
            console.log(`📝 更新學生回應: ${studentName} - ${courseName} (${courseDate}) - ${responseType}`);
        } else {
            data.responses.push(response);
            console.log(`➕ 新增學生回應: ${studentName} - ${courseName} (${courseDate}) - ${responseType}`);
        }
        
        // 儲存到檔案
        const saved = saveStudentResponses(data);
        
        if (!saved) {
            return res.status(500).json({
                success: false,
                message: '儲存學生回應失敗'
            });
        }
        
        res.json({
            success: true,
            message: existingIndex >= 0 ? '學生回應已更新' : '學生回應已記錄',
            data: response
        });
        
    } catch (error) {
        console.error('❌ 處理學生回應失敗:', error);
        res.status(500).json({
            success: false,
            message: '儲存學生回應失敗',
            error: error.message
        });
    }
});

// API路由：查詢所有學生回應
app.get('/api/student-responses', async (req, res) => {
    try {
        const data = loadStudentResponses();
        
        // 可選的查詢參數
        const { studentName, courseDate, responseType } = req.query;
        
        let filteredResponses = data.responses;
        
        // 根據查詢參數過濾
        if (studentName) {
            filteredResponses = filteredResponses.filter(r => 
                r.studentName.includes(studentName)
            );
        }
        
        if (courseDate) {
            filteredResponses = filteredResponses.filter(r => 
                r.courseDate === courseDate
            );
        }
        
        if (responseType) {
            filteredResponses = filteredResponses.filter(r => 
                r.responseType === responseType
            );
        }
        
        // 按時間戳排序（最新的在前）
        filteredResponses.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        res.json({
            success: true,
            data: filteredResponses,
            total: filteredResponses.length
        });
        
    } catch (error) {
        console.error('❌ 查詢學生回應失敗:', error);
        res.status(500).json({
            success: false,
            message: '查詢學生回應失敗',
            error: error.message
        });
    }
});

// API路由：刪除學生回應
app.delete('/api/student-responses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = loadStudentResponses();
        
        const index = data.responses.findIndex(r => r.id === id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: '找不到該學生回應'
            });
        }
        
        const deleted = data.responses.splice(index, 1)[0];
        const saved = saveStudentResponses(data);
        
        if (!saved) {
            return res.status(500).json({
                success: false,
                message: '刪除學生回應失敗'
            });
        }
        
        console.log(`🗑️ 刪除學生回應: ${deleted.studentName} - ${deleted.courseName}`);
        
        res.json({
            success: true,
            message: '學生回應已刪除',
            data: deleted
        });
        
    } catch (error) {
        console.error('❌ 刪除學生回應失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除學生回應失敗',
            error: error.message
        });
    }
});

// API路由：獲取講師列表
app.get('/api/teachers', async (req, res) => {
    try {
        const teachers = await fetchTeacherListFromSheets();
        res.json({
            success: true,
            teachers
        });
    } catch (error) {
        console.error('獲取講師列表錯誤:', error);
        
        if (error.message === 'GOOGLE_SHEETS_HTML_ERROR') {
            return res.status(500).json({
                success: false,
                error: 'Google Sheets API 發生錯誤，請檢查 API 連結是否正確'
            });
        }
        
        if (error.code === 'ECONNREFUSED') {
            res.status(500).json({ 
                success: false,
                error: '無法連接到 Google Sheets API，請檢查網路連線' 
            });
        } else if (error.code === 'ENOTFOUND') {
            res.status(500).json({ 
                success: false,
                error: 'Google Sheets API 網址無法解析，請檢查 API 連結' 
            });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            res.status(500).json({ 
                success: false,
                error: 'Google Sheets API 連線超時，請稍後再試或檢查網路連線' 
            });
        } else if (error.response) {
            res.status(error.response.status).json({ 
                success: false,
                error: `Google Sheets API 錯誤: ${error.response.status} - ${error.response.statusText}`,
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

        const teachers = await fetchTeacherListFromSheets();
        const teacher = teachers.find(t => t.name === teacherName);
        if (!teacher) {
            console.log('找不到講師:', teacherName);
            return res.status(404).json({ 
                success: false,
                error: '找不到指定的講師' 
            });
        }

        const safeQueryParams = queryParams || {};

        if (teacher.googleSheetReadApi) {
            try {
                const sheetRows = await fetchReportRowsFromGoogleSheet(teacher.googleSheetReadApi);
                const filteredRows = filterReportRowsByQuery(sheetRows, safeQueryParams);
                console.log(`✅ 透過 Google Sheet 讀取報表成功，共 ${filteredRows.length} 筆`);
                return res.json({
                    success: true,
                    data: filteredRows,
                    count: filteredRows.length,
                    source: 'googleSheets'
                });
            } catch (sheetError) {
                console.error('⚠️ Google Sheet 報表讀取失敗，將改用 reportApi:', sheetError.message);
            }
        }

        console.log('使用 reportApi 查詢報表:', teacher.reportApi);

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
            ...safeQueryParams
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
        
        if (error.message === 'GOOGLE_SHEETS_HTML_ERROR') {
            return res.status(500).json({
                success: false,
                error: 'Google Sheets API 發生錯誤，請檢查 API 連結是否正確'
            });
        }
        
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
    
    // 立即回應 LINE 伺服器
    res.status(200).send('OK');
    
    // 檢查是否包含 postback 事件
    const events = req.body.events || [];
    const hasPostback = events.some(event => event.type === 'postback');
    
    // 只轉發非 postback 事件（避免重複處理）
    if (!hasPostback) {
        // 非同步轉發 webhook（不阻塞主流程）
        webhookForwarder.forward(req.body).catch(error => {
            console.error('Webhook 轉發失敗:', error);
        });
    } else {
        console.log('⚠️ 包含 postback 事件，跳過轉發（避免重複處理）');
    }
    
    if (events.length > 0) {
        for (const event of events) {
            // ====================================
            // 處理 postback 事件（請假功能）
            // ====================================
            if (event.type === 'postback') {
                console.log('📥 收到 postback 事件');
                await handlePostback(event);
                
                // ⚠️ 不轉發 postback 到其他系統
                // 直接在這裡處理完成
                continue;
            }
            
            // ====================================
            // 處理訊息事件（文字 + 圖片）
            // ====================================
            if (event.type === 'message' && (event.message.type === 'text' || event.message.type === 'image')) {
                let messageText = event.message.type === 'text' ? (event.message.text || '') : '';
                const userId = event.source?.userId;
                const sourceType = event.source?.type; // 'user', 'group', 'room'
                const groupId = event.source?.groupId;
                const roomId = event.source?.roomId;
                
                console.log('收到訊息:', messageText || '[非文字訊息]');
                console.log('用戶 ID:', userId || '未知');
                console.log('來源類型:', sourceType || '未知');

                // ====================================
                // 🔧 檢查是否為金額修正流程
                // ====================================
                if (event.message.type === 'text' && userId) {
                    const correctionState = getAmountCorrectionState(userId);
                    if (correctionState) {
                        const inputAmount = messageText.trim().replace(/[,\s]/g, '');
                        
                        // 驗證是否為有效數字
                        if (/^\d+$/.test(inputAmount)) {
                            const recordId = correctionState.recordId;
                            const record = findRemittanceRecord(recordId);
                            
                            if (record) {
                                // 更新金額並確認
                                const updated = updateRemittanceRecord(recordId, {
                                    amount: inputAmount,
                                    amountCorrectedBy: userId,
                                    amountCorrectedAt: new Date().toISOString(),
                                    status: 'confirmed',
                                    confirmedBy: userId,
                                    confirmedAt: new Date().toISOString()
                                });

                                // 回覆管理員
                                const confirmMsg = `✅ 已更新金額為 NT$ ${Number(inputAmount).toLocaleString('en-US')}\n並已通知客戶`;
                                if (event.replyToken) {
                                    await axios.post('https://api.line.me/v2/bot/message/reply', {
                                        replyToken: event.replyToken,
                                        messages: [{ type: 'text', text: confirmMsg }]
                                    }, {
                                        headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
                                    });
                                }

                                // 發送確認訊息給客戶（使用正確金額）
                                try {
                                    const confirmationFlex = createPaymentConfirmationFlexMessage(updated);
                                    const flexMessage = {
                                        type: 'flex',
                                        altText: '✅ 付款已確認',
                                        contents: confirmationFlex
                                    };
                                    await sendLineFlexMessage(flexMessage, record.userId);
                                    console.log('✅ 已發送付款確認 Flex Message 給客戶（修正後金額）:', record.userId);
                                } catch (e) {
                                    console.error('❌ 回覆客戶匯款確認失敗:', e.message);
                                    try {
                                        await sendLineMessageWithBot(`✅ 已確認收到您的匯款：NT$${Number(inputAmount).toLocaleString('en-US')}\n感謝！`, record.userId, null, false);
                                    } catch (fallbackError) {
                                        console.error('❌ 降級文字訊息也失敗:', fallbackError.message);
                                    }
                                }

                                // 🧾 記錄收入到 Notion（使用正確金額）
                                recordIncomeToNotion(updated).then(result => {
                                    if (result.success) {
                                        console.log('✅ 已記錄收入到 Notion（修正後金額）:', {
                                            amount: result.amount,
                                            date: result.date,
                                            notionPageUrl: result.notionPageUrl
                                        });
                                    } else if (result.reason === 'disabled') {
                                        // Notion 未啟用，不記錄日誌
                                    } else {
                                        console.log('⚠️ Notion 記帳失敗:', result.reason || result.error);
                                    }
                                }).catch(err => {
                                    console.error('❌ Notion 記帳異常:', err.message);
                                });

                                // 清除狀態
                                clearAmountCorrectionState(userId);
                            } else {
                                await sendLineMessageWithBot('⚠️ 找不到對應的匯款紀錄', userId, null, false);
                                clearAmountCorrectionState(userId);
                            }
                        } else {
                            // 輸入無效，提示重新輸入
                            await sendLineMessageWithBot('❌ 請輸入有效的數字金額（例如：1000）', userId, null, false);
                        }
                        
                        // 處理完畢，跳過後續處理
                        continue;
                    }
                }
                
                // 記錄群組資訊
                if ((groupId || roomId) && userId) {
                    try {
                        const targetGroupId = groupId || roomId;
                        const targetType = groupId ? 'group' : 'room';
                        
                        // 嘗試從LINE API獲取群組資訊
                        let groupName = '未知群組';
                        try {
                            const groupSummaryUrl = targetType === 'group' 
                                ? `https://api.line.me/v2/bot/group/${targetGroupId}/summary`
                                : `https://api.line.me/v2/bot/room/${targetGroupId}/summary`;
                            
                            const groupSummaryResponse = await axios.get(groupSummaryUrl, {
                                headers: {
                                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                                },
                                timeout: 10000
                            });
                            
                            groupName = groupSummaryResponse.data.groupName || '未知群組';
                            console.log(`📱 獲取群組資訊: ${groupName} (${targetGroupId})`);
                        } catch (groupError) {
                            console.log(`⚠️ 無法獲取群組詳細資訊，使用預設名稱`);
                        }
                        
                        // 記錄群組資訊
                        await db.registerGroup({
                            groupId: targetGroupId,
                            groupName: groupName,
                            type: targetType
                        });
                        
                        // 獲取使用者資訊並記錄群組活動
                        try {
                            const profileResponse = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
                                headers: {
                                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                                },
                                timeout: 10000
                            });
                            
                            const displayName = profileResponse.data.displayName;
                            await db.recordGroupUserActivity(targetGroupId, userId, displayName);
                            
                            console.log(`✅ 群組活動已記錄: ${displayName} 在 ${groupName}`);
                        } catch (profileError) {
                            console.log(`⚠️ 無法獲取使用者資訊: ${userId}`);
                            await db.recordGroupUserActivity(targetGroupId, userId, '未知使用者');
                        }
                        
                    } catch (error) {
                        console.error('❌ 記錄群組資訊失敗:', error);
                    }
                }
                
                if (userId) {
                    // 關鍵字規則：reply_text / reply_flex / alias_to / http_forward
                    try {
                        const kw = require('./src/keyword-service');
                        const rule = kw.findFirstMatch(messageText, { sourceType });
                        if (rule) {
                            console.log('🧩 觸發關鍵字規則:', rule);
                            if (rule.action === 'reply_text' && rule.params?.text) {
                                await sendLineMessage(rule.params.text, userId, false);
                                if (rule.stop !== false) continue; // 已處理
                            }
                            if (rule.action === 'reply_flex' && rule.params?.presetId) {
                                try {
                                    const presets = require('./src/message-service').listFlexPresets();
                                    const p = presets.find(x=>x.id===rule.params.presetId);
                                    if (p) {
                                        await sendLineFlexMessage({ type:'flex', altText:p.altText||'通知', contents:p.contents }, userId);
                                        if (rule.stop !== false) continue;
                                    }
                                } catch(e) { console.log('reply_flex 失敗', e.message); }
                            }
                            if (rule.action === 'alias_to' && rule.params?.target) {
                                messageText = rule.params.target;
                                console.log('🔁 alias_to →', messageText);
                            }
                            if (rule.action === 'http_forward' && rule.params?.url) {
                                try {
                                    await axios.post(rule.params.url, { event, rule }, { timeout: 8000 });
                                    if (rule.stop !== false) continue;
                                } catch(e) { console.log('http_forward 失敗', e.response?.data || e.message); }
                            }
                        }
                    } catch (e) {
                        console.log('關鍵字規則處理錯誤:', e.message);
                    }

                    // 匯款相關通知 → 僅在符合關鍵字時推播
                    try {
                        const isText = event.message.type === 'text';
                        const isImage = event.message.type === 'image';
                        let remittanceSearchText = messageText || '';

                        if (isImage) {
                            const ocrText = await extractTextFromImage(event.message.id);
                            if (ocrText) {
                                remittanceSearchText = `${remittanceSearchText}\n${ocrText}`.trim();
                                console.log('📝 OCR 辨識文字（截斷顯示）:', ocrText.slice(0, 120));
                            } else {
                                console.log('⚠️ OCR 未偵測到文字，暫不處理匯款通知');
                            }
                        }

                        const normalizedTargetText = (remittanceSearchText || '').trim();
                        
                        // 🔍 雙重檢測：提高匯款關鍵字準確度
                        // 策略 1（優先級最高）：包含明確完成短語（如「已匯款」、「轉帳完成」）
                        const hasExplicitPhrase = config.remittance.explicitPhrases 
                            && config.remittance.explicitPhrases.some(phrase => normalizedTargetText.includes(phrase));
                        
                        // 策略 2：同時包含「基礎關鍵字」+ 「完成詞」
                        const hasBaseKeyword = config.remittance.keywords.some(k => normalizedTargetText.includes(k));
                        const hasCompletionWord = config.remittance.completionWords 
                            && config.remittance.completionWords.some(word => normalizedTargetText.includes(word));
                        const hasBothKeywordAndCompletion = hasBaseKeyword && hasCompletionWord;
                        
                        // 最終判斷：符合任一策略即觸發
                        const hitKeywords = normalizedTargetText.length > 0 
                            && (hasExplicitPhrase || hasBothKeywordAndCompletion);
                        
                        const intentAnalysis = analyzeRemittanceIntentText(normalizedTargetText);

                        console.log('🔍 檢查匯款關鍵字:', {
                            isText,
                            isImage,
                            targetTextPreview: normalizedTargetText.slice(0, 60),
                            hasExplicitPhrase,
                            hasBaseKeyword,
                            hasCompletionWord,
                            hasBothKeywordAndCompletion,
                            messageType: event.message.type,
                            hitKeywords,
                            intentAnalysis
                        });

                        if (!hitKeywords) {
                            if (isImage) {
                                console.log('⚠️ 收到圖片但未偵測到匯款關鍵字，暫不處理匯款通知');
                            }
                        } else if (intentAnalysis.shouldSkip) {
                            // 🆕 公告/通知類訊息，完全跳過匯款處理（不回覆任何訊息）
                            console.log('⏭️ 偵測到公告/通知類訊息，跳過匯款處理:', intentAnalysis);
                        } else if (intentAnalysis.shouldDefer) {
                            console.log('⚠️ 匯款語意判斷為延後/詢問，暫不觸發通知:', intentAnalysis);
                            appendRemittanceIntentLog({
                                id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                                userId,
                                messageType: event.message.type,
                                sourceType,
                                reason: intentAnalysis.reason,
                                flags: intentAnalysis.flags,
                                messageText: normalizedTargetText,
                                rawOriginalText: messageText,
                                createdAt: new Date().toISOString()
                            });
                            await sendRemittanceDeferredReply(userId, event.replyToken);
                        } else {
                            console.log('✅ 觸發匯款通知處理（背景任務）...');
                            handleRemittanceCandidate({
                                event,
                                messageText: normalizedTargetText,
                                userId,
                                sourceType,
                                groupId,
                                roomId,
                                messageId: event.message.id
                            }).catch(err => {
                                console.error('❌ 匯款通知背景處理失敗:', err.message);
                                if (err.stack) {
                                    console.error('❌ 錯誤堆疊（背景匯款）:', err.stack);
                                }
                            });
                            // 不 await，讓 Webhook 能儘快結束請求，匯款流程在背景繼續執行
                        }
                    } catch (e) {
                        console.error('❌ 匯款提醒處理失敗:', e.message);
                        console.error('❌ 錯誤堆疊:', e.stack);
                    }

                    // 檢查關鍵字
                    if (messageText === '#本期課程規劃' || messageText === '#完整課程規劃') {
                        console.log(`🔑 檢測到關鍵字「${messageText}」來自 ${userId}`);

                        try {
                            // 啟動 Loading Animation（60秒，會在發送訊息前停止）
                            await showLoadingAnimation(userId, 60);

                            const requestHeaders = {
                                'Content-Type': 'application/json'
                            };

                            if (config.googleSheets && config.googleSheets.cookie) {
                                requestHeaders.Cookie = config.googleSheets.cookie;
                            }

                            const coursePlanResponse = await axios.post(
                                config.api.studentAttendance,
                                { action: 'getStudentList' },
                                {
                                    headers: requestHeaders,
                                    timeout: config.server.timeout.api
                                }
                            );

                            const rawData = coursePlanResponse.data || {};
                            let studentsData = [];

                            if (Array.isArray(rawData.students)) {
                                studentsData = rawData.students;
                            } else if (rawData.data && Array.isArray(rawData.data.students)) {
                                studentsData = rawData.data.students;
                            } else if (rawData.result && Array.isArray(rawData.result.students)) {
                                studentsData = rawData.result.students;
                            }

                            console.log('🔍 課程規劃原始資料:', JSON.stringify(studentsData, null, 2));

                            // 過濾 userId 匹配的學生，並且只保留 remaining > 0 的學生（當期課程）
                            const matchingStudents = studentsData.filter(student => {
                                const isUserMatch = student.userId === userId;
                                const isActiveStudent = !student.hasOwnProperty('remaining') || (student.remaining && student.remaining > 0);
                                
                                if (isUserMatch && !isActiveStudent) {
                                    console.log(`⏭️ 跳過舊期學生: ${student.name} (remaining: ${student.remaining})`);
                                }
                                
                                return isUserMatch && isActiveStudent;
                            });

                            if (matchingStudents.length === 0) {
                                await sendLineMessage('❌ 找不到您的課程規劃資料，請確認是否完成綁定或稍後再試。', userId, false);
                                console.log(`⚠️ 未找到課程規劃資料: ${userId}`);
                                return;
                            }

                            // 過濾出有課程和時段資訊的學生（使用新的外部 API）
                            const studentsWithCourseInfo = matchingStudents.filter(student =>
                                student && student.course && student.period && 
                                String(student.course).trim() !== '' && 
                                String(student.period).trim() !== ''
                            );

                            if (studentsWithCourseInfo.length === 0) {
                                await sendLineMessage('❌ 目前尚未為您設定課程資訊（課程類型和時段），請聯繫客服。', userId, false);
                                console.log(`⚠️ 無課程資訊: ${userId}`);
                                return;
                            }

                            console.log(`📚 準備查詢 ${studentsWithCourseInfo.length} 位學生的課程規劃`);

                            if (studentsWithCourseInfo.length === 1) {
                                const flexMessage = await createCoursePlanFlexMessage(studentsWithCourseInfo[0]);
                                await sendLineFlexMessage(flexMessage, userId);
                            } else {
                                const carouselMessage = await createCoursePlanFlexCarousel(studentsWithCourseInfo);
                                await sendLineFlexMessage(carouselMessage, userId);
                            }

                            await sendLineMessage(`📘 已顯示 ${studentsWithCourseInfo.length} 位學生的本期課程規劃`, userId, false);
                            console.log(`✅ 課程規劃已發送給: ${userId} (共 ${studentsWithCourseInfo.length} 位學生)`);

                        } catch (error) {
                            console.error('❌ 查詢課程規劃失敗:', error);
                            const errorMessage = '❌ 查詢課程規劃失敗，請稍後再試\n\n可能原因：\n1. 網路連線問題\n2. 系統暫時無法使用\n3. 課程規劃 API 無回應\n\n如有疑問，請聯繫客服人員。';
                            await sendLineMessage(errorMessage, userId, false);
                        }

                        return; // 處理完關鍵字後直接返回
                    }

                    if (messageText === '#剩餘堂數' 
                        || messageText === '#剩餘堂數完整' 
                        || messageText === '#完整出缺勤'
                        || messageText === '#出缺勤') {
                        console.log(`🔑 檢測到關鍵字「${messageText}」來自 ${userId}`);
                        
                        try {
                            // 發送 Loading Animation
                            await showLoadingAnimation(userId, 5);
                            
                            // 調用學生資料 API
                            const response = await axios.get('https://calendar.funlearnbar.synology.me/api/student-data', {
                                timeout: 30000
                            });
                            
                            if (response.data && response.data.success && response.data.data.students) {
                                const students = response.data.data.students;
                                
                                // 過濾 userId 匹配的學生，並且只保留 remaining > 0 的學生（當期課程）
                                const matchingStudents = students.filter(student => {
                                    const isUserMatch = student.userId === userId;
                                    const isActiveStudent = !student.hasOwnProperty('remaining') || (student.remaining && student.remaining > 0);
                                    
                                    if (isUserMatch && !isActiveStudent) {
                                        console.log(`⏭️ 跳過舊期學生: ${student.name} (remaining: ${student.remaining})`);
                                    }
                                    
                                    return isUserMatch && isActiveStudent;
                                });
                                
                                console.log('🔍 查詢到的學生數據:', JSON.stringify(matchingStudents, null, 2));
                                console.log(`📊 找到 ${matchingStudents.length} 個學生的資料`);
                                
                                if (matchingStudents.length > 0) {
                                    // 根據關鍵字決定模式和顯示類型
                                    let mode = 'compact';
                                    let displayType = 'remaining'; // 'remaining' 或 'attendance'

                                    if (messageText === '#出缺勤') {
                                        if (matchingStudents.length === 1) {
                                            const studentData = matchingStudents[0];
                                            const flexMessage = createFullAttendanceFlexMessage(studentData);
                                            await sendLineFlexMessage(flexMessage, userId);
                                            console.log(`✅ 出缺勤完整記錄已發送給: ${userId} (學生: ${studentData.name})`);
                                        } else {
                                            const multiFlexMessage = createFullAttendanceCarousel(matchingStudents);
                                            await sendLineFlexMessage(multiFlexMessage, userId);
                                            console.log(`✅ 多學生出缺勤完整記錄已發送給: ${userId} (共 ${matchingStudents.length} 個學生)`);
                                        }
                                        await sendLineMessage(`📚 已顯示 ${matchingStudents.length} 位學生的完整出缺勤紀錄`, userId, false);
                                    } else {
                                        if (messageText === '#剩餘堂數完整') {
                                            mode = 'full';
                                            displayType = 'remaining';
                                        } else if (messageText === '#完整出缺勤') {
                                            mode = 'full';
                                            displayType = 'attendance';
                                        } else {
                                            mode = 'compact';
                                            displayType = 'remaining';
                                        }
                                        
                                        if (matchingStudents.length === 1) {
                                            const studentData = matchingStudents[0];
                                            const flexMessage = createAttendanceFlexMessage(studentData, mode, displayType);
                                            await sendLineFlexMessage(flexMessage, userId);
                                            console.log(`✅ 出缺勤記錄已發送給: ${userId} (學生: ${studentData.name}, 模式: ${mode}, 顯示類型: ${displayType})`);
                                        } else {
                                            const multiStudentFlexMessage = createMultiStudentFlexMessage(matchingStudents, mode, displayType);
                                            await sendLineFlexMessage(multiStudentFlexMessage, userId);
                                            console.log(`✅ 多學生出缺勤記錄已發送給: ${userId} (共 ${matchingStudents.length} 個學生, 模式: ${mode}, 顯示類型: ${displayType})`);
                                        }
                                        await sendLineMessage(`📚 已顯示 ${matchingStudents.length} 位學生的出缺勤紀錄`, userId, false);
                                    }
                                } else {
                                    await sendLineMessage('❌ 找不到您的出缺勤記錄\n\n可能原因：\n1. 您尚未綁定學生身份\n2. 系統中沒有您的課程資料\n\n如有疑問，請聯繫客服人員。', userId, false);
                                }
                            } else {
                                console.log('❌ API 回應格式錯誤:', JSON.stringify(response.data, null, 2));
                                throw new Error('API 回應格式錯誤');
                            }
                            
                        } catch (error) {
                            console.error('❌ 查詢出缺勤失敗:', error);
                            const errorMessage = '❌ 查詢出缺勤記錄失敗，請稍後再試\n\n可能原因：\n1. 網路連線問題\n2. 系統暫時無法使用\n\n如有疑問，請聯繫客服人員。';
                            await sendLineMessage(errorMessage, userId, false);
                        }
                        
                        return; // 處理完關鍵字後直接返回
                    }
                    
                    if (messageText === '#內部人員') {
                        console.log(`🔑 檢測到關鍵字「#內部人員」來自 ${userId}`);
                        
                        try {
                            // 綁定內部人員 Rich Menu
                            const bindResult = await bindInternalRichMenu(userId);
                            
                            if (bindResult.success) {
                                // 發送成功回覆
                                const successMessage = '切換為內部人員模式,FunLearnBar歡迎您！';
                                await sendLineMessage(successMessage, userId, false);
                                console.log(`✅ 內部人員模式綁定成功: ${userId}`);
                            } else {
                                // 發送失敗回覆
                                const failMessage = '❌ 內部人員模式綁定失敗，請稍後再試';
                                await sendLineMessage(failMessage, userId, false);
                                console.log(`❌ 內部人員模式綁定失敗: ${userId}`);
                            }
                        } catch (error) {
                            console.error('❌ 處理內部人員綁定失敗:', error);
                            const errorMessage = '❌ 系統錯誤，請稍後再試';
                            await sendLineMessage(errorMessage, userId, false);
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
                                await sendLineMessage(successMessage, userId, false);
                                console.log(`✅ Rich Menu 解綁成功: ${userId}`);
                            } else {
                                // 發送失敗回覆
                                const failMessage = '❌ Rich Menu 解綁失敗，請稍後再試';
                                await sendLineMessage(failMessage, userId, false);
                                console.log(`❌ Rich Menu 解綁失敗: ${userId}`);
                            }
                        } catch (error) {
                            console.error('❌ 處理解綁失敗:', error);
                            const errorMessage = '❌ 系統錯誤，請稍後再試';
                            await sendLineMessage(errorMessage, userId, false);
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
                            await sendLineMessage(testMessage, userId, false);
                            console.log(`✅ 測試模式已啟動: ${userId}`);
                        } catch (error) {
                            console.error('❌ 處理測試模式失敗:', error);
                            const errorMessage = '❌ 測試模式啟動失敗，請稍後再試';
                            await sendLineMessage(errorMessage, userId, false);
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
                            timeout: 30000  // 增加到 30 秒以避免超時
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

// API路由：測試雙Bot功能
app.post('/api/test-dual-bot', async (req, res) => {
    try {
        const { message, targetUserId } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: '請提供訊息內容'
            });
        }
        
        console.log('🧪 測試雙Bot功能:', { message, targetUserId });
        
        const result = await sendLineMessageWithBot(message, targetUserId);
        
        res.json({
            success: result.success,
            message: result.message,
            botResults: result.botResults,
            totalSuccess: result.totalSuccess,
            totalAttempts: result.totalAttempts
        });
        
    } catch (error) {
        console.error('測試雙Bot功能錯誤:', error);
        res.status(500).json({
            success: false,
            error: '測試雙Bot功能失敗'
        });
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

// ==================== Webhook 轉發管理 API ====================

// 查看轉發狀態
app.get('/api/webhook-forward/status', (req, res) => {
    try {
        const status = webhookForwarder.getStatus();
        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 取得/設定全域過濾器
app.get('/api/webhook-forward/filters', (req, res) => {
    try {
        res.json({ success: true, filters: webhookForwarder.filters || {} });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.patch('/api/webhook-forward/filters', (req, res) => {
    try {
        const { eventTypes, messageTypes, keywords } = req.body || {};
        webhookForwarder.filters = {
            ...(webhookForwarder.filters || {}),
            eventTypes: Array.isArray(eventTypes) ? eventTypes : webhookForwarder.filters?.eventTypes,
            messageTypes: Array.isArray(messageTypes) ? messageTypes : webhookForwarder.filters?.messageTypes,
            keywords: Array.isArray(keywords) ? keywords : webhookForwarder.filters?.keywords,
        };
        res.json({ success: true, filters: webhookForwarder.filters });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// 新增轉發目標
app.post('/api/webhook-forward/targets', (req, res) => {
    try {
        const target = req.body;
        webhookForwarder.addTarget(target);
        res.json({
            success: true,
            message: '轉發目標已新增',
            status: webhookForwarder.getStatus()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// 啟用/停用目標
app.patch('/api/webhook-forward/targets/:nameOrUrl', (req, res) => {
    try {
        const { nameOrUrl } = req.params;
        const { enabled } = req.body;
        
        const success = webhookForwarder.toggleTarget(decodeURIComponent(nameOrUrl), enabled);
        
        if (success) {
            res.json({
                success: true,
                message: `目標已${enabled ? '啟用' : '停用'}`,
                status: webhookForwarder.getStatus()
            });
        } else {
            res.status(404).json({
                success: false,
                error: '找不到指定的目標'
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// 移除轉發目標
app.delete('/api/webhook-forward/targets/:nameOrUrl', (req, res) => {
    try {
        const { nameOrUrl } = req.params;
        const success = webhookForwarder.removeTarget(decodeURIComponent(nameOrUrl));
        
        if (success) {
            res.json({
                success: true,
                message: '轉發目標已移除',
                status: webhookForwarder.getStatus()
            });
        } else {
            res.status(404).json({
                success: false,
                error: '找不到指定的目標'
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== 健康檢查端點 ====================
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        service: 'FLB LINE Bot',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        version: '1.0.0'
    });
});

// ==================== Notion 整合端點 ====================

// 🧪 測試 Notion 連線
app.get('/api/notion/test', async (req, res) => {
    try {
        const result = await testNotionConnection();
        res.status(result.success ? 200 : 503).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '❌ 測試 Notion 連線時發生錯誤',
            error: error.message
        });
    }
});

// 🔍 檢查 Notion 配置狀態
app.get('/api/notion/config', (req, res) => {
    try {
        const status = getNotionConfigStatus();
        res.status(200).json({
            success: true,
            ...status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 根路徑（歡迎訊息）
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>FLB LINE Bot</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 50px auto;
                        padding: 20px;
                        text-align: center;
                    }
                    h1 { color: #00B900; }
                    .status { 
                        background: #d4edda; 
                        padding: 15px; 
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <h1>🎓 FLB 樂程坊簽到系統</h1>
                <div class="status">
                    <p>✅ 系統運行中</p>
                    <p>運行時間：${Math.floor(process.uptime())} 秒</p>
                </div>
                <p>這是一個 LINE Bot 服務，請從 LINE 使用。</p>
            </body>
        </html>
    `);
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
