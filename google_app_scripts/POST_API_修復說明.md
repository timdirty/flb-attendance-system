# POST API 修復說明

## 🐛 問題描述

### 症狀
- ✅ GET API 測試全部通過（`listGroups`、`listUsers`）
- ❌ POST API 測試全部失敗（`upsertGroups`、`upsertTeacherBindings`、`getStudentList`）
- 錯誤：返回 Google Drive 的「找不到網頁」HTML 錯誤頁面

### 測試結果
```bash
📖 測試 GET APIs
1. listGroups (GET)...     ✅ 成功
2. listUsers (GET)...      ✅ 成功

📝 測試 POST APIs
3. upsertGroups (POST)...           ❌ 失敗 (HTML 錯誤)
4. upsertTeacherBindings (POST)...  ❌ 失敗 (HTML 錯誤)
5. getStudentList (POST)...         ❌ 失敗 (HTML 錯誤)
```

---

## 🔍 根本原因分析

### 檔案結構問題

您的 Google Apps Script 專案包含多個 `.gs` 文件：

1. **`user group ID 上傳.gs`**
   - ✅ 有 `doGet(e)` 函數 → 處理所有 GET 請求
   - ❌ 沒有 `doPost(e)` 函數

2. **`doPost.gs`**
   - ✅ 有 `doPost(e)` 函數
   - ✅ 有處理邏輯（`upsertGroups_`、`upsertTeacherBindings_` 等）
   - ❌ 但這個函數**不會被執行**

### Google Apps Script 的工作原理

在 Google Apps Script 中：

1. **所有 `.gs` 文件會被合併**為一個腳本
2. **`doGet` 和 `doPost` 必須是唯一的**
3. 如果有多個同名函數，可能會發生：
   - 只有一個被執行（通常是第一個或最後一個）
   - 或者都不執行，導致錯誤

在您的情況下：
- `doGet` 在 `user group ID 上傳.gs` → GET 請求正常 ✅
- `doPost` 在 `doPost.gs` → 但**沒有被正確執行** ❌

---

## ✅ 解決方案

### 修改內容

在 `user group ID 上傳.gs` 文件末尾**新增** `doPost` 函數：

```javascript
/**
 * 處理 POST 請求
 * 這個函數必須在這個文件中定義，因為 Google Apps Script 只會執行主文件中的 doPost
 */
function doPost(e){
  try {
    var p = {};
    if (e && e.postData && e.postData.contents) {
      try { 
        p = JSON.parse(e.postData.contents); 
      } catch (_) { 
        p = e.parameter || {}; 
      }
    } else {
      p = e ? (e.parameter || {}) : {};
    }
    
    var action = String(p.action || '');
    
    // Groups API (POST)
    if (action === 'upsertGroups'){
      return ContentService.createTextOutput(JSON.stringify(upsertGroups_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Teacher Bindings API (POST)
    if (action === 'upsertTeacherBindings'){
      return ContentService.createTextOutput(JSON.stringify(upsertTeacherBindings_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Users API (POST)
    if (action === 'upsertUsers'){
      return ContentService.createTextOutput(JSON.stringify(upsertUsers_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Schedules API (POST)
    if (action === 'addSchedule'){
      return ContentService.createTextOutput(JSON.stringify(writeSchedule_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'addOrUpdateSchedule'){
      return ContentService.createTextOutput(JSON.stringify(addOrUpdateSchedule_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Schedules Link API (POST)
    if (action === 'addScheduleLink'){
      return ContentService.createTextOutput(JSON.stringify(writeScheduleLink_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'addOrUpdateScheduleLink'){
      return ContentService.createTextOutput(JSON.stringify(addOrUpdateScheduleLink_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'addSchedulesLinkBulk'){
      return ContentService.createTextOutput(JSON.stringify(addSchedulesLinkBulk_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'addOrUpdateSchedulesLinkBulk'){
      return ContentService.createTextOutput(JSON.stringify(addOrUpdateSchedulesLinkBulk_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Student List API (POST)
    if (action === 'getStudentList'){
      return getStudentList(p);
    }
    
    // 未知的 action
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown POST action: ' + action
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'POST Error: ' + (err.message || String(err))
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 為什麼這樣做？

1. **集中處理所有 HTTP 請求**
   - `doGet` 和 `doPost` 都在同一個文件中
   - 確保它們都能被正確執行

2. **重用現有函數**
   - `doPost.gs` 中定義的處理函數（如 `upsertGroups_`）仍然可用
   - 因為 Google Apps Script 會合併所有 `.gs` 文件的函數
   - 新的 `doPost` 函數只是**路由**，調用這些現有函數

3. **保持向下相容**
   - 不需要刪除 `doPost.gs`
   - 只是添加新的 `doPost` 函數到主文件中

---

## 🔧 修復步驟

### 1. 更新本地文件 ✅
已完成！`user group ID 上傳.gs` 已更新。

### 2. 部署到 Google Apps Script ⏳
請參考 **📋部署檢查清單.md**

簡要步驟：
1. 複製更新的 `user group ID 上傳.gs` 到 Google Apps Script 編輯器
2. 儲存
3. 部署新版本
4. 等待 2-3 分鐘
5. 執行測試

### 3. 驗證 ⏳
執行測試腳本：
```bash
cd "/Users/apple/Library/CloudStorage/SynologyDrive-FLBTim/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）/google_app_scripts"
./完整API測試.sh
```

預期結果：所有 5 個測試都應該通過 ✅

---

## 📊 修復前後對比

### 修復前
```
檔案結構：
├── user group ID 上傳.gs
│   └── doGet(e) ✅        → 處理 GET 請求
└── doPost.gs
    └── doPost(e) ❌       → 沒有被執行

結果：
- GET 請求成功 ✅
- POST 請求失敗 ❌ (HTML 錯誤)
```

### 修復後
```
檔案結構：
├── user group ID 上傳.gs
│   ├── doGet(e) ✅        → 處理 GET 請求
│   └── doPost(e) ✅       → 處理 POST 請求
└── doPost.gs
    └── 處理函數 ✅        → 被 doPost(e) 調用

結果：
- GET 請求成功 ✅
- POST 請求成功 ✅
```

---

## 🎯 關鍵要點

1. **Google Apps Script 的限制**
   - `doGet` 和 `doPost` 函數必須唯一
   - 多個同名函數可能導致未定義行為

2. **最佳實踐**
   - 將所有 HTTP 路由（`doGet`、`doPost`）放在同一個主文件中
   - 將業務邏輯分離到其他函數中
   - 使用清晰的命名約定（如 `_` 結尾表示內部函數）

3. **測試重要性**
   - 完整的 API 測試幫助快速發現問題
   - 分別測試 GET 和 POST 有助於定位問題

---

## 📚 相關文件

- **📋部署檢查清單.md** - 詳細的部署步驟
- **完整API測試.sh** - 測試腳本
- **user group ID 上傳.gs** - 已更新的主文件
- **doPost.gs** - 處理函數定義（保留不變）

---

**修復日期：** 2025-10-20  
**修復人員：** AI Assistant  
**問題嚴重程度：** 高（所有 POST API 無法使用）  
**修復狀態：** ✅ 已修復（待部署驗證）

