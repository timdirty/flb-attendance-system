# 📊 Google Sheets 群組資料表設定指南

## 目的

這份文件說明如何在 Google Sheets 中設定群組資料表，讓系統能夠自動同步群組資訊。

## 📋 設定步驟

### 1. 在 Google Sheets 中建立新工作表

1. 開啟您的 Google Sheets 文件
2. 建立一個新的工作表，命名為：`群組資料表 (groups)`

### 2. 設定欄位標題（第一行）

在第一行設定以下欄位標題：

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| groupId | groupName | type | firstSeenAt | lastActivityAt | memberCount | description |

### 3. 欄位說明

| 欄位名稱 | 說明 | 資料類型 | 範例 |
|---------|------|---------|------|
| `groupId` | LINE 群組 ID（唯一鍵） | 文字 | C1234567890abcdef1234567890abcdef |
| `groupName` | 群組名稱 | 文字 | 樂程坊教師群組 |
| `type` | 群組類型 | 文字 | group 或 room |
| `firstSeenAt` | 首次見到時間 | ISO 8601 | 2025-10-20T10:00:00.000Z |
| `lastActivityAt` | 最後活動時間 | ISO 8601 | 2025-10-20T12:30:00.000Z |
| `memberCount` | 成員數量 | 數字 | 15 |
| `description` | 群組描述 | 文字 | 內部溝通群組 |

## 🔧 Google Apps Script 設定

### 1. 開啟 Apps Script 編輯器

1. 在 Google Sheets 中，點選「擴充功能」→「Apps Script」
2. 找到您現有的 Apps Script 程式碼

### 2. 新增群組處理函數

在現有的程式碼中加入以下函數：

```javascript
// ==================== 群組資料處理 ====================

/**
 * 新增或更新群組到 Google Sheets
 */
function upsertGroups(e) {
  const params = getParams(e);
  const action = params.action;
  const sheetName = params.sheetName || "群組資料表 (groups)";
  const list = params.list || [];
  
  console.log('開始處理群組資料，action:', action);
  console.log('群組數量:', list.length);
  
  if (action === "upsertGroups") {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    // 如果工作表不存在，自動建立
    if (!sheet) {
      console.log('工作表不存在，建立新工作表:', sheetName);
      sheet = spreadsheet.insertSheet(sheetName);
      
      // 設定標題列
      const headers = ['groupId', 'groupName', 'type', 'firstSeenAt', 'lastActivityAt', 'memberCount', 'description'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    // 取得現有資料
    const lastRow = sheet.getLastRow();
    const existingData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 7).getValues() : [];
    const existingMap = new Map();
    
    existingData.forEach((row, index) => {
      if (row[0]) { // 如果 groupId 存在
        existingMap.set(row[0], index + 2); // +2 因為從第2行開始，且陣列從0開始
      }
    });
    
    console.log('現有群組數量:', existingMap.size);
    
    // 處理每個群組
    list.forEach(group => {
      const groupId = group.groupId;
      const rowData = [
        groupId,
        group.groupName || '未知群組',
        group.type || 'group',
        group.firstSeenAt || new Date().toISOString(),
        group.lastActivityAt || new Date().toISOString(),
        group.memberCount || 0,
        group.description || ''
      ];
      
      if (existingMap.has(groupId)) {
        // 更新現有群組
        const rowNum = existingMap.get(groupId);
        sheet.getRange(rowNum, 1, 1, 7).setValues([rowData]);
        console.log('更新群組:', groupId, group.groupName);
      } else {
        // 新增群組
        sheet.appendRow(rowData);
        console.log('新增群組:', groupId, group.groupName);
      }
    });
    
    return {
      success: true,
      message: `成功處理 ${list.length} 個群組`,
      processedCount: list.length
    };
  }
  
  return {
    success: false,
    error: 'Unknown action'
  };
}

/**
 * 讀取群組列表
 */
function listGroups(e) {
  const params = getParams(e);
  const sheetName = "群組資料表 (groups)";
  const limit = parseInt(params.limit) || 500;
  const offset = parseInt(params.offset) || 0;
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    return {
      success: true,
      data: [],
      message: '群組資料表尚未建立'
    };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      success: true,
      data: [],
      message: '目前沒有群組資料'
    };
  }
  
  // 讀取所有資料
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  
  // 轉換為物件陣列
  const groups = data
    .filter(row => row[0]) // 過濾空行
    .map(row => ({
      groupId: row[0],
      groupName: row[1],
      type: row[2],
      firstSeenAt: row[3],
      lastActivityAt: row[4],
      memberCount: row[5],
      description: row[6]
    }))
    .slice(offset, offset + limit);
  
  return {
    success: true,
    data: groups,
    total: data.length,
    limit: limit,
    offset: offset
  };
}
```

### 3. 修改主要的 doPost 函數

確保您的 `doPost` 函數包含群組處理：

```javascript
function doPost(e) {
  try {
    const params = getParams(e);
    const action = params.action;
    
    console.log('收到請求，action:', action);
    
    // 處理群組相關請求
    if (action === "upsertGroups") {
      return createResponse(upsertGroups(e));
    }
    
    // 其他現有的 action 處理...
    // ...
    
    return createResponse({
      success: false,
      error: 'Unknown action: ' + action
    });
    
  } catch (error) {
    console.error('doPost 錯誤:', error);
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}
```

### 4. 修改 doGet 函數

確保您的 `doGet` 函數包含群組讀取：

```javascript
function doGet(e) {
  try {
    const params = getParams(e);
    const action = params.action;
    
    console.log('收到GET請求，action:', action);
    
    // 處理群組列表請求
    if (action === "listGroups") {
      return createResponse(listGroups(e));
    }
    
    // 其他現有的 action 處理...
    // ...
    
    return createResponse({
      success: false,
      error: 'Unknown action: ' + action
    });
    
  } catch (error) {
    console.error('doGet 錯誤:', error);
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}
```

## 🧪 測試設定

### 1. 部署 Apps Script

1. 點選「部署」→「新增部署」
2. 選擇「網頁應用程式」
3. 設定：
   - 執行身分：我
   - 存取權：任何人
4. 點選「部署」
5. 複製網頁應用程式的 URL

### 2. 測試群組寫入

使用以下命令測試（替換 YOUR_WEBAPP_URL）：

```bash
curl -X POST "YOUR_WEBAPP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsertGroups",
    "sheetName": "群組資料表 (groups)",
    "list": [
      {
        "groupId": "C1234567890abcdef1234567890abcdef",
        "groupName": "測試群組",
        "type": "group",
        "firstSeenAt": "2025-10-20T10:00:00.000Z",
        "lastActivityAt": "2025-10-20T10:00:00.000Z",
        "memberCount": 5,
        "description": "測試用群組"
      }
    ]
  }'
```

### 3. 測試群組讀取

```bash
curl "YOUR_WEBAPP_URL?action=listGroups&limit=10&offset=0"
```

## ✅ 驗證步驟

1. **檢查工作表**
   - 確認「群組資料表 (groups)」工作表已建立
   - 確認標題列正確

2. **測試寫入**
   - 執行測試寫入命令
   - 在 Google Sheets 中確認資料已寫入

3. **測試讀取**
   - 執行測試讀取命令
   - 確認回傳的資料正確

4. **測試系統整合**
   - 將 Bot 加入一個 LINE 群組
   - 在群組中發送訊息
   - 檢查 Google Sheets 是否自動更新

## 📊 資料格式範例

成功設定後，您的 Google Sheets 應該看起來像這樣：

| groupId | groupName | type | firstSeenAt | lastActivityAt | memberCount | description |
|---------|-----------|------|-------------|----------------|-------------|-------------|
| C1234... | 樂程坊教師群組 | group | 2025-10-20T10:00:00.000Z | 2025-10-20T12:30:00.000Z | 8 | 教師內部溝通 |
| C5678... | 課程討論群 | group | 2025-10-20T11:00:00.000Z | 2025-10-20T11:15:00.000Z | 15 | 課程規劃討論 |

## 🔄 同步機制

系統會在以下情況自動同步群組資料到 Google Sheets：

1. **首次偵測群組** - 當使用者在群組中發送訊息時
2. **更新群組名稱** - 透過 API 更新群組名稱時
3. **記錄活動** - 每次群組有新訊息時更新 `lastActivityAt`

## 🐛 常見問題

### Q: 系統無法寫入 Google Sheets
**A:** 檢查：
1. Apps Script 是否已部署
2. 權限是否設定為「任何人」
3. URL 是否正確設定在 `googleSheetsDatabaseWithLocal.js` 中

### Q: 資料沒有自動同步
**A:** 檢查：
1. Bot 是否在群組中
2. 查看系統日誌確認是否有錯誤
3. 確認 Google Apps Script 日誌

### Q: 工作表欄位順序錯誤
**A:** 確保標題列的欄位順序與文件一致：
```
groupId | groupName | type | firstSeenAt | lastActivityAt | memberCount | description
```

## 📚 相關文件

- [群組追蹤功能](../GROUP_TRACKING.md)
- [群組功能更新](../GROUP_FEATURE_UPDATE.md)
- [Google Sheets 資料庫](../src/googleSheetsDatabaseWithLocal.js)

## ✨ 完成後

設定完成後，您的系統將能夠：
- ✅ 自動記錄所有群組資訊
- ✅ 雙向同步本地和 Google Sheets 資料
- ✅ 追蹤群組活動時間
- ✅ 記錄使用者在群組中的活動

---

**需要協助？** 請查看系統日誌或聯繫技術支援。

