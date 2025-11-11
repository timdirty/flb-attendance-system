# 📚 Webhook 對接文檔總結

## ✅ 已完成的工作

### 1. 功能實現
- ✅ 單個學生 Quick Reply（會出席/請假/待確認）
- ✅ 多個學生 Quick Reply（全部出席/需要請假/稍後確認）
- ✅ Carousel 支援多個學生展示
- ✅ Quick Reply data 大小優化（<300 字元）
- ✅ 前端測試功能（單個/多個學生）

### 2. 文檔產出
- ✅ **WEBHOOK_INTEGRATION_GUIDE.md** - 完整對接指南（含程式碼範例）
- ✅ **QUICK_REPLY_FORMAT_REFERENCE.md** - 快速參考表（含格式說明）
- ✅ **CAROUSEL_QUICK_REPLY_FIX.md** - 技術實現報告
- ✅ **MULTI_STUDENT_TEST_FEATURE.md** - 測試功能說明
- ✅ **MULTI_STUDENT_TEST_TROUBLESHOOTING.md** - 故障排除指南

---

## 📋 Quick Reply 格式總覽

### 單個學生（action: `attendance_reply`）

```json
{
  "action": "attendance_reply",
  "response": "attend",  // 或 "leave" 或 "pending"
  "studentName": "小明",
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "location": "站前教室",
  "weekday": "星期三"
}
```

### 多個學生（action: `multi_student_attendance_reply`）

```json
{
  "action": "multi_student_attendance_reply",
  "response": "attend_all",  // 或 "leave_some" 或 "pending"
  "count": 2
}
```

### 請假原因（action: `leave_reason`）

```json
{
  "action": "leave_reason",
  "studentName": "小明",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "reason": "生病"  // 或 "家庭因素" 或 "臨時有事" 或 "其他"
}
```

---

## 🔧 系統架構說明

### ⚠️ 重要變更：Postback 處理由轉發系統負責

**架構概述：**

```
LINE Bot ➜ Webhook ➜ 轉發系統 (處理 postback) ➜ FLB API (儲存資料)
                         ↓
                    不轉發 postback
                    (避免重複處理)
```

### 1. FLB API 需要提供的端點

**端點：** `POST /api/student-responses`

**功能：** 接收學生出席回應資料並儲存

**請求格式：**
```json
{
  "studentName": "小明",
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "location": "站前教室",
  "weekday": "星期三",
  "responseType": "attend",  // 或 "leave" 或 "pending"
  "leaveReason": "生病",     // 僅當 responseType 為 "leave" 時需要
  "userId": "Uxxxxx",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

**回應格式：**
```json
{
  "success": true,
  "message": "記錄成功",
  "data": {
    "id": "response_123",
    "studentName": "小明",
    "responseType": "attend",
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

---

## 📊 資料庫需求

### attendance 表（出席記錄）

```sql
CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  course_date DATE NOT NULL,
  course_time VARCHAR(20) NOT NULL,
  status ENUM('pending', 'attend', 'leave', 'leave_pending') DEFAULT 'pending',
  leave_reason VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),  -- LINE User ID
  INDEX idx_student_date (student_name, course_date)
);
```

### parent_students 表（家長學生關聯）

```sql
CREATE TABLE parent_students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_line_user_id VARCHAR(100) NOT NULL,
  parent_name VARCHAR(50),
  student_id INT NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  relationship VARCHAR(20),
  INDEX idx_parent (parent_line_user_id)
);
```

---

## 🔄 處理流程

### 流程 1：單個學生回覆「會出席」

```
1. 家長點擊「✅ 會出席」
   ↓
2. LINE Webhook ➜ 轉發系統接收 postback 事件
   action: attendance_reply
   response: attend
   ↓
3. 轉發系統處理
   - 調用 FLB API: POST /api/student-responses
   - 傳送資料：{ studentName, courseName, responseType: 'attend', ... }
   ↓
4. 轉發系統回覆確認訊息給家長
   "✅ 已記錄您的回覆：會出席
    📚 課程：SPM 六 9:30-11:00
    📅 日期：2025年10月23日"
   ↓
5. FLB API 儲存資料
   - status = 'attend'
```

### 流程 2：單個學生回覆「請假」

```
1. 家長點擊「🏥 請假」
   ↓
2. LINE Webhook ➜ 轉發系統接收 postback 事件
   action: attendance_reply
   response: leave
   ↓
3. 轉發系統處理
   - 暫存請假申請到 pendingLeaves
   - 發送請假原因選項（Quick Reply）
   ↓
4. 家長選擇原因（例如「生病」）
   ↓
5. LINE Webhook ➜ 轉發系統接收 postback 事件
   action: leave_reason
   reason: 生病
   ↓
6. 轉發系統處理
   - 調用 FLB API: POST /api/student-responses
   - 傳送資料：{ studentName, courseName, responseType: 'leave', leaveReason: '生病', ... }
   - 回覆確認訊息給家長
   - 清除 pendingLeaves 暫存
   ↓
7. FLB API 儲存資料
   - status = 'leave'
   - leave_reason = '生病'
```

### 流程 3：多個學生回覆「全部會出席」

```
1. 家長點擊「✅ 全部會出席」
   ↓
2. LINE Webhook ➜ 轉發系統接收 postback 事件
   action: multi_student_attendance_reply
   response: attend_all
   students: [...]
   ↓
3. 轉發系統處理
   - 循環處理每位學生
   - 為每位學生調用 FLB API: POST /api/student-responses
   - 傳送資料：{ studentName, courseName, responseType: 'attend', ... }
   ↓
4. 轉發系統回覆確認訊息
   "✅ 已確認全部會出席
    📊 共 2 位孩子的課程
    • 小明 - SPM 六 9:30-11:00
    • 小華 - ESM 日 9:30-10:30"
   ↓
5. FLB API 儲存所有學生的出席記錄
```

### 流程 4：多個學生回覆「需要請假」

```
1. 家長點擊「🏥 需要請假」
   ↓
2. LINE Webhook ➜ 轉發系統接收 postback 事件
   action: multi_student_attendance_reply
   response: leave_some
   students: [...]
   ↓
3. 轉發系統處理
   - 暫存多學生資訊到 pendingLeaves
   - 發送學生選擇列表（Quick Reply）
     「小明 請假」「小華 請假」
   ↓
4. 家長選擇「小明 請假」
   ↓
5. LINE Webhook ➜ 轉發系統接收 postback 事件
   action: select_leave_student
   studentName: 小明
   ↓
6. 後續流程同「流程 2」（單個學生請假）
   - 發送請假原因選項
   - 接收原因後調用 FLB API
```

---

## 📖 文檔使用指南

### 快速開始

1. **閱讀總覽：** 本文檔（WEBHOOK_DOCS_SUMMARY.md）
2. **查看格式：** QUICK_REPLY_FORMAT_REFERENCE.md
3. **實作代碼：** WEBHOOK_INTEGRATION_GUIDE.md

### 詳細文檔

| 文檔 | 用途 | 適合對象 |
|-----|-----|---------|
| **WEBHOOK_DOCS_SUMMARY.md** | 快速總覽 | 所有人 |
| **QUICK_REPLY_FORMAT_REFERENCE.md** | 格式參考 | 開發人員 |
| **WEBHOOK_INTEGRATION_GUIDE.md** | 實作範例 | 後端開發 |
| **CAROUSEL_QUICK_REPLY_FIX.md** | 技術細節 | 維護人員 |
| **MULTI_STUDENT_TEST_FEATURE.md** | 測試說明 | 測試人員 |

---

## 🧪 測試方式

### 在行事曆系統測試

1. 前往「課程提醒管理」頁面
2. 點擊「Flex 訊息範本」
3. 選擇「學生提醒範本」
4. 點擊「測試發送（單個）」→ 測試單個學生功能
5. 點擊「測試發送（多個學生）」→ 測試 Carousel + 多學生功能

### 測試檢查項目

**單個學生：**
- [ ] 收到 Flex Message
- [ ] 有 3 個 Quick Reply 按鈕
- [ ] 點擊「會出席」→ FLB API 正確接收
- [ ] 點擊「請假」→ 收到請假原因選項
- [ ] 選擇原因 → FLB API 正確接收

**多個學生：**
- [ ] 收到 Carousel（可左右滑動）
- [ ] 有 3 個統一 Quick Reply 按鈕
- [ ] 點擊「全部會出席」→ FLB API 正確接收
- [ ] 點擊「需要請假」→ 收到學生選擇列表
- [ ] 選擇學生 → 進入請假流程

---

## ⚠️ 注意事項

### 1. Data 大小限制

**LINE API 限制：** postback data 最多 **300 字元**

**解決方案：**
- 單個學生：只包含必要資訊（~250 字元）
- 多個學生：只記錄 count，詳細資訊從資料庫查詢（~90 字元）

### 2. 多個學生查詢

**關鍵：** 根據 `userId` 查詢課程

```javascript
// 查詢該家長今日的所有孩子課程
const courses = await db.query(`
  SELECT s.student_name, c.course_name, c.course_date, c.course_time
  FROM parent_students ps
  JOIN courses c ON ps.student_id = c.student_id
  WHERE ps.parent_line_user_id = ?
    AND c.course_date = CURDATE()
`, [userId]);
```

### 3. 並發處理

**問題：** 家長快速點擊多次

**解決：** 使用資料庫交易 + 狀態檢查

```javascript
await db.transaction(async (trx) => {
  const record = await trx('attendance')
    .where({ student_name, course_date, course_time })
    .first();
  
  // 如果已處理，不重複更新
  if (record.status === 'attend' || record.status === 'leave') {
    return;
  }
  
  await trx('attendance')
    .where({ student_name, course_date, course_time })
    .update({ status, leave_reason });
});
```

---

## 🎯 API 對接檢查清單

### 轉發系統端（已完成 ✅）

- [x] **Webhook 接收端點**（POST /webhook）
- [x] **解析 postback.data**（JSON 格式）
- [x] **處理所有 action 類型**
  - [x] attendance_reply（單個學生出席回覆）
  - [x] multi_student_attendance_reply（多個學生出席回覆）
  - [x] leave_reason（請假原因）
  - [x] select_leave_student（選擇請假學生）
- [x] **調用 FLB API**
  - [x] POST /api/student-responses 儲存出席記錄
  - [x] 正確傳遞所有必要欄位
  - [x] 錯誤處理與重試機制
- [x] **LINE 訊息回覆**
  - [x] 確認訊息
  - [x] Quick Reply（詢問原因/選擇學生）
  - [x] 避免重複訊息
- [x] **暫存管理**
  - [x] pendingLeaves 暫存請假申請
  - [x] 處理後清除暫存
- [x] **不轉發 postback 事件**
  - [x] 避免重複處理

### FLB API 端需要實現

- [ ] **學生回應接收端點**（POST /api/student-responses）
- [ ] **接收欄位驗證**
  - [ ] studentName（必填）
  - [ ] courseName（必填）
  - [ ] courseDate（必填）
  - [ ] responseType（必填：attend/leave/pending）
  - [ ] leaveReason（當 responseType='leave' 時必填）
  - [ ] userId（選填）
  - [ ] timestamp（選填）
- [ ] **資料庫操作**
  - [ ] 儲存出席記錄
  - [ ] 更新已存在的記錄（防重複）
  - [ ] 記錄請假原因
- [ ] **回應格式**
  - [ ] success: true/false
  - [ ] message: 處理結果訊息
  - [ ] data: 儲存的記錄資料
- [ ] **錯誤處理**
  - [ ] 缺少必填欄位
  - [ ] 無效的 responseType
  - [ ] 資料庫錯誤
- [ ] **日誌記錄**
  - [ ] 記錄所有 API 請求
  - [ ] 處理結果

### 資料庫準備

- [ ] 建立 `attendance` 表
- [ ] 建立 `parent_students` 表
- [ ] 建立索引（parent_line_user_id, course_date）
- [ ] 準備測試資料

### 測試驗證

- [ ] 單個學生 - 會出席
- [ ] 單個學生 - 請假（含原因）
- [ ] 單個學生 - 待確認
- [ ] 多個學生 - 全部出席
- [ ] 多個學生 - 需要請假
- [ ] 多個學生 - 稍後確認
- [ ] 錯誤處理測試

---

## 📞 聯絡與支援

### 問題排查

1. **LINE Webhook 沒收到事件**
   - 檢查 Webhook URL 是否正確設定
   - 檢查 SSL 憑證是否有效
   - 查看 LINE Developer Console 的錯誤日誌

2. **資料格式錯誤**
   - 參考 `QUICK_REPLY_FORMAT_REFERENCE.md`
   - 檢查 JSON 格式是否正確
   - 確認所有必要欄位都存在

3. **資料庫查詢失敗**
   - 檢查 `parent_line_user_id` 是否正確
   - 確認資料表結構正確
   - 查看資料庫日誌

### 參考資源

- [LINE Messaging API 官方文檔](https://developers.line.biz/en/docs/messaging-api/)
- [Quick Reply 規格](https://developers.line.biz/en/docs/messaging-api/using-quick-reply/)
- [Postback 事件](https://developers.line.biz/en/docs/messaging-api/receiving-messages/#postback-event)

---

## 📅 版本歷史

| 版本 | 日期 | 更新內容 |
|-----|-----|---------|
| v1.0 | 2025-10-23 | 初始版本，完整功能實現 |

---

**狀態：** ✅ 功能完整，文檔齊全，可供 FLB API 對接使用

**下一步：** FLB API 團隊根據本文檔實現 Webhook 處理邏輯

