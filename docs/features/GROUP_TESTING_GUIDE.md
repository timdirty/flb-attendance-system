# 🧪 群組功能測試指南

## 📋 測試前準備

### 1. 完成 Google Sheets 設定
✅ 確認已按照 [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md) 完成設定

### 2. 部署最新版本
```bash
ssh ctctim14@YOUR_NAS_IP
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
sudo ./deploy-on-nas.sh
```

## 🧪 測試步驟

### 測試 1：在群組中發送訊息

**步驟：**
1. 將 Bot 加入一個 LINE 群組
2. 在群組中發送任何訊息（例如：「測試」）
3. 查看系統日誌

**預期日誌輸出：**
```bash
sudo docker logs -f flb-line-bot | grep "群組"
```

應該看到類似的輸出：
```
收到訊息: 測試
用戶 ID: U1234...
來源類型: group
📱 獲取群組資訊: [群組名稱] (C1234...)
群組已註冊/更新並同步到Google Sheets: [群組名稱] (C1234...)
📤 上傳 1 個群組到Google Sheets
記錄群組活動: [使用者名稱] (U1234...) 在群組 C1234...
✅ 群組活動已記錄: [使用者名稱] 在 [群組名稱]
📤 上傳 1 個群組到Google Sheets
```

**驗證：**
- ✅ 日誌顯示「來源類型: group」
- ✅ 日誌顯示「群組已註冊/更新並同步到Google Sheets」
- ✅ 日誌顯示「📤 上傳 1 個群組到Google Sheets」

---

### 測試 2：檢查本地資料

**步驟：**
```bash
# 查看 groups.json 檔案
sudo docker exec flb-line-bot cat /app/data/groups.json
```

**預期輸出：**
```json
[
  {
    "groupId": "C1234567890abcdef1234567890abcdef",
    "groupName": "測試群組",
    "type": "group",
    "firstSeenAt": "2025-10-20T10:00:00.000Z",
    "lastActivityAt": "2025-10-20T10:05:00.000Z",
    "memberCount": 0,
    "description": ""
  }
]
```

**驗證：**
- ✅ 檔案存在且包含群組資料
- ✅ `groupId` 正確
- ✅ `groupName` 正確

---

### 測試 3：檢查 Google Sheets

**步驟：**
1. 開啟您的 Google Sheets
2. 找到「群組資料表 (groups)」工作表
3. 檢查資料

**預期結果：**
| groupId | groupName | type | firstSeenAt | lastActivityAt | memberCount | description |
|---------|-----------|------|-------------|----------------|-------------|-------------|
| C1234... | 測試群組 | group | 2025-10-20T10:00:00.000Z | 2025-10-20T10:05:00.000Z | 0 | |

**驗證：**
- ✅ 工作表存在
- ✅ 資料已寫入
- ✅ 欄位正確

---

### 測試 4：API 查詢群組

**步驟：**
```bash
# 查詢所有群組
curl http://localhost:3010/api/groups | jq

# 查詢群組統計
curl http://localhost:3010/api/group-stats | jq
```

**預期輸出（所有群組）：**
```json
{
  "success": true,
  "groups": [
    {
      "groupId": "C1234567890abcdef1234567890abcdef",
      "groupName": "測試群組",
      "type": "group",
      "firstSeenAt": "2025-10-20T10:00:00.000Z",
      "lastActivityAt": "2025-10-20T10:05:00.000Z",
      "memberCount": 0,
      "description": ""
    }
  ],
  "total": 1
}
```

**預期輸出（群組統計）：**
```json
{
  "success": true,
  "stats": {
    "totalGroups": 1,
    "activeGroups": 1,
    "inactiveGroups": 0,
    "groupTypes": {
      "group": 1,
      "room": 0
    }
  }
}
```

**驗證：**
- ✅ API 回傳成功
- ✅ 資料正確
- ✅ 統計數字正確

---

### 測試 5：更新群組名稱

**步驟：**
```bash
# 替換 GROUP_ID 為實際的群組 ID
curl -X PATCH http://localhost:3010/api/groups/C1234567890abcdef1234567890abcdef \
  -H "Content-Type: application/json" \
  -d '{"groupName": "新的群組名稱"}'
```

**預期輸出：**
```json
{
  "success": true,
  "message": "群組名稱已更新"
}
```

**驗證：**
1. ✅ API 回傳成功
2. ✅ 檢查 Google Sheets 中的名稱已更新
3. ✅ 檢查本地 `groups.json` 已更新

**查看日誌：**
```bash
sudo docker logs --tail 20 flb-line-bot | grep "群組名稱"
```

應該看到：
```
群組名稱已更新並同步到Google Sheets: C1234... -> 新的群組名稱
📤 上傳 1 個群組到Google Sheets
```

---

### 測試 6：搜尋群組

**步驟：**
```bash
# 搜尋包含「測試」的群組
curl http://localhost:3010/api/groups/search/測試 | jq
```

**預期輸出：**
```json
{
  "success": true,
  "groups": [
    {
      "groupId": "C1234567890abcdef1234567890abcdef",
      "groupName": "測試群組",
      "type": "group",
      ...
    }
  ],
  "total": 1
}
```

**驗證：**
- ✅ 搜尋功能正常
- ✅ 能找到包含關鍵字的群組

---

## ✅ 測試清單

### 基礎功能
- [ ] 群組訊息自動記錄
- [ ] 日誌輸出正確
- [ ] 本地 `groups.json` 已建立並包含資料
- [ ] Google Sheets 工作表已建立
- [ ] Google Sheets 資料已寫入

### API 功能
- [ ] 查詢所有群組（`GET /api/groups`）
- [ ] 查詢群組統計（`GET /api/group-stats`）
- [ ] 查詢單一群組（`GET /api/groups/:groupId`）
- [ ] 搜尋群組（`GET /api/groups/search/:query`）
- [ ] 更新群組名稱（`PATCH /api/groups/:groupId`）

### 同步功能
- [ ] 新群組自動上傳到 Google Sheets
- [ ] 更新群組後同步到 Google Sheets
- [ ] 系統啟動時從 Google Sheets 讀取資料

---

## 🐛 常見問題排除

### 問題 1：日誌沒有顯示群組相關訊息

**原因：** 您發送的是個人訊息，不是群組訊息

**解決：**
1. 確認 Bot 已加入群組
2. 在群組中發送訊息（不是私聊）
3. 檢查日誌中的「來源類型」是否為 `group`

---

### 問題 2：Google Sheets 沒有資料

**原因：** Apps Script 未正確設定或部署

**解決：**
1. 檢查 Apps Script 是否包含 `upsertGroups` 函數
2. 確認 Apps Script 已重新部署
3. 查看 Apps Script 日誌是否有錯誤
4. 檢查系統日誌是否顯示「上傳群組到Google Sheets失敗」

```bash
sudo docker logs -f flb-line-bot | grep -i "google sheets"
```

---

### 問題 3：API 回傳空陣列

**原因：** 尚未有群組訊息記錄

**解決：**
1. 在群組中發送訊息觸發記錄
2. 等待幾秒後再查詢 API
3. 檢查 `data/groups.json` 是否有資料

---

### 問題 4：無法獲取群組名稱

**日誌顯示：** `⚠️ 無法獲取群組詳細資訊，使用預設名稱`

**原因：** LINE API 權限問題或群組設定

**解決：**
1. 這不影響功能，系統會使用「未知群組」作為名稱
2. 可以稍後透過 API 手動更新群組名稱
3. 確認 Bot 有正確的權限

---

## 📊 測試報告模板

```
測試日期：2025-10-20
測試環境：NAS Docker

✅ 基礎功能測試
  ✅ 群組訊息記錄
  ✅ 本地資料儲存
  ✅ Google Sheets 同步

✅ API 功能測試
  ✅ 查詢群組
  ✅ 查詢統計
  ✅ 搜尋功能
  ✅ 更新名稱

❌ 發現問題
  - 無

備註：所有功能正常運作
```

---

## 📞 需要協助

如果測試過程中遇到問題：

1. 查看完整日誌
   ```bash
   sudo docker logs --tail 100 flb-line-bot
   ```

2. 查看 Apps Script 日誌
   - 在 Apps Script 編輯器中查看「執行記錄」

3. 參考文件
   - [GROUP_TRACKING.md](./docs/GROUP_TRACKING.md)
   - [GOOGLE_SHEETS_GROUP_SETUP.md](./docs/GOOGLE_SHEETS_GROUP_SETUP.md)
   - [GROUP_FEATURE_UPDATE.md](./GROUP_FEATURE_UPDATE.md)

---

**測試完成！** 🎉

