# API 遷移指南

## 問題描述

其他平台目前使用錯誤的 API 端點，導致 404 錯誤：

**❌ 錯誤的端點：**
```
https://flb-calendar-liff-new-production.up.railway.app/api/attendance/course-students
```

**✅ 正確的端點：**
```
https://liff-sttendence-0908-production.up.railway.app/api/course-students
```

## 解決方案

### 方案 1：更新其他平台的程式碼（推薦）

**步驟 1：更新基礎 URL**
```javascript
// 舊的配置
const API_BASE_URL = 'https://flb-calendar-liff-new-production.up.railway.app';

// 新的配置
const API_BASE_URL = 'https://liff-sttendence-0908-production.up.railway.app';
```

**步驟 2：更新端點路徑**
```javascript
// 舊的端點
const endpoint = '/api/attendance/course-students';

// 新的端點
const endpoint = '/api/course-students';
```

**步驟 3：更新 SDK 配置**
```javascript
// 使用新的 SDK
const sdk = new FLBAttendanceSDK({
    baseURL: 'https://liff-sttendence-0908-production.up.railway.app'
});
```

### 方案 2：使用重定向（臨時解決方案）

目前系統已支援重定向，舊的端點會自動重定向到新的端點：

```javascript
// 這些調用現在會自動重定向
fetch('https://liff-sttendence-0908-production.up.railway.app/api/attendance/course-students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

## 完整的端點對照表

| 功能 | 舊端點 | 新端點 |
|------|--------|--------|
| 獲取講師列表 | `/api/attendance/teachers` | `/api/teachers` |
| 獲取講師課程 | `/api/attendance/courses` | `/api/courses` |
| 獲取課程學生 | `/api/attendance/course-students` | `/api/course-students` |
| 學生簽到 | `/api/attendance/student-attendance` | `/api/student-attendance` |
| 講師簽到 | `/api/attendance/teacher-report` | `/api/teacher-report` |

## 測試重定向

您可以使用以下命令測試重定向是否正常工作：

```bash
# 測試重定向
curl -X POST "https://liff-sttendence-0908-production.up.railway.app/api/attendance/course-students" \
  -H "Content-Type: application/json" \
  -d '{"course":"test","time":"test"}' \
  -v
```

預期結果：
- HTTP 307 重定向
- Location 標頭指向 `/api/course-students`

## 更新建議

### 立即行動
1. **更新基礎 URL**：將所有 API 調用更新為使用正確的基礎 URL
2. **移除 `/attendance` 前綴**：直接使用 `/api/` 開頭的端點
3. **測試功能**：確保所有功能正常運作

### 長期規劃
1. **統一 API 端點**：所有平台使用相同的 API 端點
2. **版本控制**：考慮實施 API 版本控制
3. **監控和日誌**：添加 API 使用監控

## 聯絡資訊

如有任何問題，請聯絡開發團隊：
- 查看完整 API 文檔：`API_DOCUMENTATION.md`
- 查看端點對照表：`API_ENDPOINTS_REFERENCE.md`
- 查看整合範例：`INTEGRATION_EXAMPLES.md`

## 常見問題

### Q: 為什麼會出現 404 錯誤？
A: 因為使用了錯誤的基礎 URL 和端點路徑。

### Q: 重定向是否會影響效能？
A: 重定向會增加一次額外的 HTTP 請求，建議直接使用正確的端點。

### Q: 如何確認更新是否成功？
A: 檢查瀏覽器開發者工具的網路標籤，確認請求使用正確的 URL。

### Q: 舊的端點什麼時候會停止支援？
A: 目前沒有停止支援的計劃，但建議盡快更新到新的端點。
