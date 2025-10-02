# 學生資料過濾更新說明

## 📋 更新日期
2025-10-02

## 🎯 更新目的
當系統模糊比對學生姓名時，如果發現同一個學生有多筆資料（例如：舊期別和新期別），系統將自動只顯示 `remaining > 0` 的學生資料，忽略 `remaining <= 0` 的舊期別學生。

## 📝 更新範圍

### 影響的 Webhook 關鍵字功能：

1. **#本期課程規劃**
   - 檔案位置：`server.js` 第 4205-4215 行
   - 過濾邏輯：只顯示 `remaining > 0` 的學生課程規劃

2. **#出缺勤**
   - 檔案位置：`server.js` 第 4271-4281 行
   - 過濾邏輯：只顯示 `remaining > 0` 的學生出缺勤記錄

3. **#剩餘堂數**
   - 檔案位置：`server.js` 第 4271-4281 行
   - 過濾邏輯：只顯示 `remaining > 0` 的學生剩餘堂數（近 5 堂課）

4. **#剩餘堂數完整**
   - 檔案位置：`server.js` 第 4271-4281 行
   - 過濾邏輯：只顯示 `remaining > 0` 的學生剩餘堂數（完整歷史）

5. **#完整出缺勤**
   - 檔案位置：`server.js` 第 4271-4281 行
   - 過濾邏輯：只顯示 `remaining > 0` 的學生完整出缺勤記錄

## 🔍 過濾邏輯詳解

### 範例情境
假設系統中有以下兩筆學生資料：
- **學生 A**：姓名 "菲飛"，`remaining: 0`（舊期別）
- **學生 B**：姓名 "菲飛10401"，`remaining: 6`（新期別）

### 過濾前
系統會顯示兩位學生的資料

### 過濾後
系統只會顯示「菲飛10401」（`remaining: 6`）的資料，自動忽略「菲飛」（`remaining: 0`）

## 💻 技術實現

### 過濾條件
```javascript
const matchingStudents = studentsData.filter(student => {
    const isUserMatch = student.userId === userId;
    const isActiveStudent = !student.hasOwnProperty('remaining') || (student.remaining && student.remaining > 0);
    
    if (isUserMatch && !isActiveStudent) {
        console.log(`⏭️ 跳過舊期學生: ${student.name} (remaining: ${student.remaining})`);
    }
    
    return isUserMatch && isActiveStudent;
});
```

### 邏輯說明
1. **`isUserMatch`**：檢查學生的 `userId` 是否與查詢者的 `userId` 匹配
2. **`isActiveStudent`**：檢查學生是否為當期學生
   - 如果沒有 `remaining` 屬性，則視為有效學生（向後兼容）
   - 如果有 `remaining` 屬性，則必須 `> 0` 才視為有效學生
3. **日誌記錄**：當跳過舊期學生時，會記錄到 console log 中

## 📊 實際效果

### 使用者體驗
- ✅ 家長/學生只會看到最新期別的課程資料
- ✅ 避免混淆，不會同時顯示多個期別的資料
- ✅ 查詢更準確，只顯示當前有效的課程資訊

### 系統行為
- ✅ 自動過濾舊期別學生
- ✅ 保留完整的日誌記錄（console log）
- ✅ 不影響其他功能（講師簽到、報表查詢等）

## 🔧 維護注意事項

### 資料結構要求
- 學生資料必須包含 `userId` 欄位
- 學生資料必須包含 `remaining` 欄位（表示剩餘堂數）
- `remaining` 應該為數字類型

### 向後兼容性
- 如果學生資料沒有 `remaining` 欄位，系統會將其視為有效學生（不過濾）
- 確保舊資料不會因為新邏輯而無法顯示

### 日誌監控
系統會記錄以下日誌：
- `🔍 查詢到的學生數據`: 過濾後的學生資料
- `📊 找到 X 個學生的資料`: 過濾後的學生數量
- `⏭️ 跳過舊期學生`: 被過濾掉的學生資訊

## 📌 相關文件
- `WEBHOOK_FUNCTIONS.md` - Webhook 功能清單
- `ATTENDANCE_QUERY_README.md` - 出缺勤查詢功能說明
- `ATTENDANCE_QUERY_GUIDE.md` - 出缺勤查詢使用指南

## ✅ 測試建議

### 測試案例 1：單一學生（新期別）
- 輸入：`#剩餘堂數`
- 預期：顯示學生的當期課程資料

### 測試案例 2：單一學生（舊期別）
- 輸入：`#剩餘堂數`
- 資料：學生 `remaining: 0`
- 預期：顯示「找不到您的出缺勤記錄」訊息

### 測試案例 3：多期別學生
- 輸入：`#本期課程規劃`
- 資料：
  - 學生 A：`remaining: 0`（舊期）
  - 學生 B：`remaining: 6`（新期）
- 預期：只顯示學生 B 的課程規劃

### 測試案例 4：多個當期課程
- 輸入：`#出缺勤`
- 資料：
  - 課程 A：`remaining: 5`
  - 課程 B：`remaining: 8`
- 預期：顯示兩個課程的出缺勤記錄（Carousel 格式）

## 🚀 部署檢查清單

- [x] 修改 `server.js` 中的過濾邏輯
- [x] 確認沒有 linter 錯誤
- [x] 測試 `#本期課程規劃` 功能
- [x] 測試 `#出缺勤` 功能
- [x] 測試 `#剩餘堂數` 功能
- [x] 測試 `#剩餘堂數完整` 功能
- [x] 測試 `#完整出缺勤` 功能
- [ ] 監控 console log 確認過濾正常運作
- [ ] 收集使用者反饋

---

**更新人員**：AI Assistant  
**版本**：v1.0  
**狀態**：✅ 已完成

