# 📊 群組資料 Google Sheets 同步 - 完成摘要

## ✅ 已完成的工作

### 1. 程式碼修改
- ✅ 新增 Google Sheets API URLs（`GROUPS_UPSERT_URL`, `GROUPS_READ_URL`）
- ✅ 實作 `upsertGroupsToGoogleSheets()` - 上傳群組到 Google Sheets
- ✅ 實作 `getAllGroupsFromGoogleSheets()` - 從 Google Sheets 讀取群組
- ✅ 修改 `syncFromGoogleSheets()` - 包含群組資料同步
- ✅ 修改 `registerGroup()` - 雙向同步到 Google Sheets
- ✅ 修改 `updateGroupName()` - 雙向同步到 Google Sheets
- ✅ 修改 `updateGroupActivity()` - 雙向同步到 Google Sheets

### 2. 文件建立
- ✅ **GOOGLE_SHEETS_GROUP_SETUP.md** - Google Sheets 設定完整指南
- ✅ **GROUP_TESTING_GUIDE.md** - 測試步驟指南
- ✅ 更新 **GROUP_FEATURE_UPDATE.md** - 包含 Google Sheets 同步說明

## 🔄 同步機制

### 資料流向
```
LINE 群組 → Webhook → 本地 JSON → Google Sheets
                ↑                        ↓
                └────── 啟動時同步 ←───────┘
```

### 同步時機
1. **新增群組** - 首次偵測到群組訊息時
2. **更新活動** - 每次群組有新訊息時
3. **更新名稱** - 透過 API 更新群組名稱時
4. **系統啟動** - 從 Google Sheets 讀取現有資料

## 📋 下一步：設定 Google Sheets

### 重要！必須完成以下設定

1. **在 Google Sheets 中建立新工作表**
   - 工作表名稱：`群組資料表 (groups)`
   - 欄位：`groupId | groupName | type | firstSeenAt | lastActivityAt | memberCount | description`

2. **在 Apps Script 中添加函數**
   - 複製 [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md) 中的程式碼
   - 主要函數：`upsertGroups()` 和 `listGroups()`
   - 修改 `doPost()` 和 `doGet()` 函數

3. **重新部署 Apps Script**
   - 部署為網頁應用程式
   - 權限設定為「任何人」

### 詳細步驟請參考
📖 [Google Sheets 群組設定指南](./docs/GOOGLE_SHEETS_GROUP_SETUP.md)

## 🧪 測試流程

完成 Google Sheets 設定後，按照以下步驟測試：

### 快速測試（5 分鐘）
1. 重新部署系統：`sudo ./deploy-on-nas.sh`
2. 將 Bot 加入一個 LINE 群組
3. 在群組中發送訊息
4. 查看日誌：`sudo docker logs -f flb-line-bot | grep "群組"`
5. 檢查 Google Sheets 是否有資料

### 完整測試
📖 [群組功能測試指南](./GROUP_TESTING_GUIDE.md)

## 📊 Google Sheets 資料表結構

```
群組資料表 (groups)
┌──────────────┬──────────────┬───────┬──────────────┬──────────────┬─────────────┬──────────────┐
│ groupId      │ groupName    │ type  │ firstSeenAt  │lastActivityAt│ memberCount │ description  │
├──────────────┼──────────────┼───────┼──────────────┼──────────────┼─────────────┼──────────────┤
│ C1234...     │ 樂程坊教師群組 │ group │ 2025-10-20...│ 2025-10-20...│ 8           │              │
│ C5678...     │ 課程討論群    │ group │ 2025-10-20...│ 2025-10-20...│ 15          │              │
└──────────────┴──────────────┴───────┴──────────────┴──────────────┴─────────────┴──────────────┘
```

## 🎯 預期的日誌輸出

### 成功的群組記錄
```
收到訊息: 測試
用戶 ID: U1234...
來源類型: group  ← 確認是群組訊息
📱 獲取群組資訊: 樂程坊教師群組 (C1234...)
群組已註冊/更新並同步到Google Sheets: 樂程坊教師群組 (C1234...)
📤 上傳 1 個群組到Google Sheets  ← 確認已上傳
記錄群組活動: 張三 (U1234...) 在群組 C1234...
✅ 群組活動已記錄: 張三 在 樂程坊教師群組
📤 上傳 1 個群組到Google Sheets  ← 確認活動已更新
```

### 系統啟動時的同步
```
🔄 首次啟動，從Google Sheets同步資料...
🔄 開始從Google Sheets同步資料...
📥 從Google Sheets獲取到 1 個使用者
📥 從Google Sheets獲取到 12 個綁定記錄
📥 從Google Sheets獲取到 5 個群組  ← 確認群組已同步
💾 本地資料已保存
```

## 🔍 如何確認功能正常

### 1. 檢查本地資料
```bash
sudo docker exec flb-line-bot cat /app/data/groups.json
```
應該看到群組資料的 JSON

### 2. 檢查 API
```bash
curl http://localhost:3010/api/groups | jq
curl http://localhost:3010/api/group-stats | jq
```
應該回傳群組列表和統計

### 3. 檢查 Google Sheets
直接開啟 Google Sheets，確認「群組資料表 (groups)」中有資料

## ⚠️ 注意事項

### 目前的限制
1. **個人訊息不會觸發群組記錄**
   - 日誌會顯示 `來源類型: user`
   - 只有在群組中發送的訊息才會顯示 `來源類型: group`

2. **需要先設定 Google Sheets**
   - 如果沒有完成設定，上傳會失敗
   - 但不會影響本地記錄功能

3. **群組名稱可能無法獲取**
   - 某些情況下 LINE API 可能無法回傳群組名稱
   - 系統會使用「未知群組」作為預設值
   - 可以稍後透過 API 手動更新

## 📚 相關文件

| 文件 | 用途 |
|------|------|
| [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md) | 🌟 Google Sheets 設定指南（必讀）|
| [GROUP_TESTING_GUIDE.md](./GROUP_TESTING_GUIDE.md) | 測試步驟指南 |
| [GROUP_FEATURE_UPDATE.md](./GROUP_FEATURE_UPDATE.md) | 功能更新說明 |
| [GROUP_TRACKING.md](./docs/GROUP_TRACKING.md) | 群組功能完整文檔 |
| [QUICK_COMMANDS.md](./QUICK_COMMANDS.md) | 快速命令參考 |

## 🎉 完成後的效果

✅ 群組訊息自動記錄到本地  
✅ 自動同步到 Google Sheets  
✅ 團隊成員可在 Google Sheets 查看群組資訊  
✅ 支援資料分析和報表  
✅ 多人協作編輯群組資訊  
✅ 資料備份和持久化  

---

**現在就開始設定 Google Sheets 吧！** 📊

請按照 [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md) 完成設定。

