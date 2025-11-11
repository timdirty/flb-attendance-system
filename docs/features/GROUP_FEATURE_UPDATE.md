# 🎉 群組資訊記錄功能更新

## 📅 更新日期
2025-10-20

## 📋 更新記錄

### 版本 2.0（最新）- 2025-10-20
✅ **新增 Google Sheets 雙向同步功能**
- 群組資料自動上傳到 Google Sheets
- 支援從 Google Sheets 讀取群組資料
- 啟動時自動同步群組資料
- 所有群組操作都會同步到 Google Sheets

### 版本 1.0 - 2025-10-20
✅ **基礎群組記錄功能**
- 本地記錄群組資訊
- 追蹤使用者在群組的活動
- 提供 REST API 查詢

## ✨ 功能特點

系統現在可以自動記錄來自 LINE 群組的訊息，並**雙向同步到 Google Sheets**，包括群組 ID、群組名稱、以及使用者在群組中的活動。

## 🔍 功能摘要

### 自動記錄內容
1. **群組基本資訊**
   - 群組 ID
   - 群組名稱（自動從 LINE API 獲取）
   - 群組類型（group 或 room）
   - 首次見到時間
   - 最後活動時間

2. **使用者與群組關聯**
   - 記錄使用者在哪些群組中活動
   - 追蹤群組成員活動

3. **統計分析**
   - 總群組數量
   - 活躍群組數量（最近7天有活動）
   - 群組類型分布

## 📂 檔案變更

### 新增檔案
- `data/groups.json` - 群組資料儲存檔案
- `docs/GROUP_TRACKING.md` - 群組功能完整說明文件
- `docs/GOOGLE_SHEETS_GROUP_SETUP.md` - ⭐ Google Sheets 設定指南

### 修改檔案
- `src/googleSheetsDatabaseWithLocal.js` - ⭐ 新增群組管理功能及 Google Sheets 雙向同步
- `server.js` - 新增 webhook 群組資訊記錄和 API 端點
- `QUICK_COMMANDS.md` - 新增群組管理命令

## 🔌 新增 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/groups` | GET | 獲取所有群組 |
| `/api/groups/:groupId` | GET | 獲取單一群組 |
| `/api/groups/search/:query` | GET | 搜尋群組 |
| `/api/groups/:groupId` | PATCH | 更新群組名稱 |
| `/api/group-stats` | GET | 獲取群組統計 |

## 💡 使用方式

### 自動記錄
將 Bot 加入任何 LINE 群組後，當有訊息發送時，系統會自動：
1. 偵測來源為群組訊息
2. 向 LINE API 查詢群組資訊
3. 記錄群組資訊到 `data/groups.json`
4. 關聯使用者與群組

### 查詢群組資訊

```bash
# 查看所有群組
curl http://localhost:3010/api/groups | jq

# 查看群組統計
curl http://localhost:3010/api/group-stats | jq

# 搜尋群組
curl http://localhost:3010/api/groups/search/測試 | jq
```

## 📊 資料結構範例

### groups.json
```json
[
  {
    "groupId": "C1234567890abcdef1234567890abcdef",
    "groupName": "樂程坊教師群組",
    "type": "group",
    "firstSeenAt": "2025-10-20T10:00:00.000Z",
    "lastActivityAt": "2025-10-20T12:30:00.000Z",
    "memberCount": 0,
    "description": ""
  }
]
```

### users.json（新增 groups 欄位）
```json
{
  "userId": "U1234567890abcdef1234567890abcdef",
  "displayName": "測試老師",
  "groups": [
    "C1234567890abcdef1234567890abcdef"
  ]
}
```

## 🎯 測試步驟

### 1. 測試自動記錄
```bash
# 1. 將 Bot 加入一個 LINE 群組
# 2. 在群組中發送任何訊息
# 3. 查看日誌
sudo docker logs -f flb-line-bot | grep "群組"

# 4. 確認資料已記錄
curl http://localhost:3010/api/groups | jq
```

### 2. 測試 API 功能
```bash
# 查看群組統計
curl http://localhost:3010/api/group-stats | jq

# 搜尋群組
curl http://localhost:3010/api/groups/search/教師 | jq
```

## 📝 日誌輸出範例

```
收到訊息: 測試訊息
用戶 ID: U1234567890abcdef1234567890abcdef
來源類型: group
📱 獲取群組資訊: 樂程坊教師群組 (C1234567890abcdef1234567890abcdef)
群組已註冊/更新: 樂程坊教師群組 (C1234567890abcdef1234567890abcdef)
記錄群組活動: 測試老師 (U1234567890abcdef1234567890abcdef) 在群組 C1234567890abcdef1234567890abcdef
✅ 群組活動已記錄: 測試老師 在 樂程坊教師群組
```

## ⚠️ 注意事項

1. **LINE API 權限**
   - Bot 必須被加入群組才能獲取群組資訊
   - 如果無法獲取群組名稱，將使用「未知群組」

2. **資料持久化**
   - 群組資料儲存在本地 `data/groups.json`
   - 支援多次重啟保留資料

3. **效能考量**
   - 群組資訊查詢有 10 秒超時限制
   - 失敗時不會影響主要訊息處理流程

## 🚀 部署更新

### 📋 重要！Google Sheets 設定

在部署之前，**必須先完成 Google Sheets 設定**：

1. **在 Google Sheets 中建立「群組資料表 (groups)」工作表**
2. **設定欄位標題**：`groupId | groupName | type | firstSeenAt | lastActivityAt | memberCount | description`
3. **在 Apps Script 中添加群組處理函數**（詳見 [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md)）
4. **重新部署 Apps Script**

> ⚠️ 如果沒有完成 Google Sheets 設定，群組資料將只儲存在本地，無法同步到 Google Sheets。

詳細設定步驟請參考：[Google Sheets 群組設定指南](./docs/GOOGLE_SHEETS_GROUP_SETUP.md)

### 本機開發環境
```bash
# 直接啟動即可，會自動載入新功能
npm start
```

### NAS Docker 環境
```bash
# 1. Synology Drive 會自動同步檔案
# 2. SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 3. 重新部署
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
sudo ./deploy-on-nas.sh

# 4. 確認更新
sudo docker logs --tail 50 flb-line-bot | grep "群組"
```

## 🔄 Google Sheets 同步機制

### 自動同步時機

群組資料會在以下情況自動同步到 Google Sheets：

1. **首次記錄群組** - 當偵測到新群組時
   ```
   📱 獲取群組資訊: 樂程坊教師群組 (C1234...)
   群組已註冊/更新並同步到Google Sheets: 樂程坊教師群組 (C1234...)
   📤 上傳 1 個群組到Google Sheets
   ```

2. **更新群組名稱** - 透過 API 更新時
   ```
   群組名稱已更新並同步到Google Sheets: C1234... -> 新名稱
   📤 上傳 1 個群組到Google Sheets
   ```

3. **更新活動時間** - 每次群組有新訊息時
   ```
   ✅ 群組活動已記錄: 使用者名稱 在 群組名稱
   📤 上傳 1 個群組到Google Sheets
   ```

4. **系統啟動時同步** - 從 Google Sheets 讀取現有資料
   ```
   🔄 開始從Google Sheets同步資料...
   📥 從Google Sheets獲取到 5 個群組
   ```

### 資料流向

```
LINE 群組訊息
    ↓
Webhook 接收
    ↓
記錄到本地 (data/groups.json)
    ↓
同步到 Google Sheets (群組資料表)
    ↓
雙向同步完成
```

### 好處

✅ **資料備份** - 所有群組資料都備份在 Google Sheets  
✅ **多人協作** - 團隊成員可以在 Google Sheets 中查看群組資訊  
✅ **資料分析** - 可以使用 Google Sheets 的分析功能  
✅ **手動編輯** - 可以在 Google Sheets 中手動編輯群組資訊  
✅ **資料持久化** - 即使本地資料遺失，也能從 Google Sheets 恢復

## 📚 相關文件

- [GROUP_TRACKING.md](./docs/GROUP_TRACKING.md) - 群組功能完整文檔
- [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md) - ⭐ Google Sheets 設定指南（必讀）
- [QUICK_COMMANDS.md](./QUICK_COMMANDS.md) - 快速命令參考
- [API_DOCUMENTATION.md](./docs/api/API_DOCUMENTATION.md) - API 文檔

## 🔄 回滾方式

如果需要回滾到之前的版本：

```bash
# 1. 停止服務
sudo docker stop flb-line-bot

# 2. 移除 groups.json（可選）
rm data/groups.json

# 3. 使用 git 回滾
git checkout HEAD~1

# 4. 重新部署
sudo ./deploy-on-nas.sh
```

## ✅ 完成清單

- [x] 修改 `googleSheetsDatabaseWithLocal.js` 添加群組管理功能
- [x] 修改 `server.js` webhook 處理來記錄群組資訊
- [x] 創建 `groups.json` 資料檔案
- [x] 添加群組管理 API 端點
- [x] 編寫完整文檔（GROUP_TRACKING.md）
- [x] 更新快速命令文檔（QUICK_COMMANDS.md）
- [x] 測試功能無語法錯誤

## 💬 反饋與問題

如有任何問題或建議，請查看：
- [GROUP_TRACKING.md](./docs/GROUP_TRACKING.md) 中的詳細說明
- 系統日誌：`sudo docker logs -f flb-line-bot`
- API 測試：`curl http://localhost:3010/api/group-stats | jq`

---

**更新完成！** 🎊 系統現在可以完整記錄群組資訊了！

