# FLB 簽到系統 API 端點對照表

## 正確的 API 端點

**基礎 URL：** `https://liff-sttendence-0908-production.up.railway.app`

### 主要端點

| 功能 | 方法 | 正確端點 | 舊端點（已重定向） |
|------|------|----------|-------------------|
| 獲取講師列表 | GET | `/api/teachers` | `/api/attendance/teachers` |
| 獲取講師課程 | POST | `/api/courses` | `/api/attendance/courses` |
| 獲取課程學生 | POST | `/api/course-students` | `/api/attendance/course-students` |
| 學生簽到 | POST | `/api/student-attendance` | `/api/attendance/student-attendance` |
| 講師簽到 | POST | `/api/teacher-report` | `/api/attendance/teacher-report` |
| 直接跳轉 | POST | `/api/direct-step3` | - |
| 直接頁面 | GET | `/step3` | - |

## 常見錯誤

### ❌ 錯誤的端點
```
https://flb-calendar-liff-new-production.up.railway.app/api/attendance/course-students
```

### ✅ 正確的端點
```
https://liff-sttendence-0908-production.up.railway.app/api/course-students
```

## 重定向支援

為了向後兼容，系統現在支援舊的 API 端點重定向：

- `/api/attendance/*` → `/api/*`
- 使用 HTTP 307 重定向（保持原始請求方法）
- 自動記錄重定向日誌

## 使用範例

### JavaScript SDK
```javascript
const sdk = new FLBAttendanceSDK({
    baseURL: 'https://liff-sttendence-0908-production.up.railway.app'
});

// 正確的調用方式
const students = await sdk.getStudents('SPM 南京復興教室', '日 1330-1500 松山');
```

### 直接 API 調用
```javascript
// 正確的端點
const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/course-students', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山',
        date: '2024-01-15'
    })
});
```

## 錯誤排查

### 404 錯誤
如果遇到 404 錯誤，請檢查：
1. 是否使用了正確的基礎 URL
2. 是否使用了正確的端點路徑
3. 是否使用了正確的 HTTP 方法

### 重定向日誌
系統會記錄所有重定向請求：
```
🔄 重定向舊 API 端點 /api/attendance/course-students 到 /api/course-students
```

## 更新建議

建議其他平台更新為使用正確的 API 端點：

1. **更新基礎 URL**：`https://liff-sttendence-0908-production.up.railway.app`
2. **移除 `/attendance` 前綴**：直接使用 `/api/` 開頭的端點
3. **使用最新的 SDK**：下載最新版本的 SDK 文件

## 聯絡資訊

如有任何問題，請聯絡開發團隊或查看完整的 API 文檔。
