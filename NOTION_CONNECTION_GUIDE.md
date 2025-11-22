# 🔗 Notion Integration 連接指南

## ⚠️ 當前問題

測試顯示：**Integration 尚未連接到資料庫**

錯誤訊息：
```
Could not find database with ID: 1a10a4c0-ed84-8097-9cf6-cd46c312f31f
Make sure the relevant pages and databases are shared with your integration.
```

---

## ✅ 解決方案（5 分鐘完成）

### 步驟 1：開啟 Notion 資料庫

點擊以下連結開啟你的記帳資料庫：

```
https://www.notion.so/funlearnbar/FLB-1a10a4c0ed8480979cf6cd46c312f31f
```

### 步驟 2：找到連接按鈕

在資料庫頁面的右上角，你會看到：

```
┌─────────────────────────────────────┐
│  [分享]  [⋯ 更多選項]  [×]          │
└─────────────────────────────────────┘
```

點擊「**⋯**」（三個點）按鈕

### 步驟 3：選擇「Add connections」

在下拉選單中找到並點擊：

```
┌──────────────────────────────┐
│  ⚙️  Properties               │
│  🔗  Add connections          │  ← 點這裡
│  📤  Export                   │
│  ...                         │
└──────────────────────────────┘
```

**注意**：如果你的 Notion 是中文介面，選項可能是「**連結**」或「**新增連結**」

### 步驟 4：搜尋並選擇 Integration

在彈出的視窗中：

1. 你會看到一個搜尋框和 Integration 列表
2. 找到「**FLB 簽到系統**」
3. 點擊選擇它

```
┌─────────────────────────────────────┐
│  Search integrations...              │
├─────────────────────────────────────┤
│  ✓ FLB 簽到系統                      │  ← 點這裡
│    Internal integration              │
├─────────────────────────────────────┤
│  [ Cancel ]           [ Confirm ]    │
└─────────────────────────────────────┘
```

**如果找不到「FLB 簽到系統」**：
- 確認你已建立 Integration（在 https://www.notion.so/my-integrations）
- 確認 Integration 名稱是「FLB 簽到系統」

### 步驟 5：確認連接

點擊「**Confirm**」或「**確認**」按鈕

你應該會看到「FLB 簽到系統」出現在已連接的清單中：

```
Connections
├─ 🔗 FLB 簽到系統  [Remove]
└─ ...
```

---

## 🧪 驗證連接

完成連接後，執行以下命令驗證：

```bash
# 方法 1：快速檢查
./check-notion-connection.sh

# 方法 2：完整測試
node verify-notion.js
```

**預期成功輸出**：
```
🔗 測試 Notion API 連線...
✅ 連線成功！Integration 已正確連接到資料庫
```

---

## 🎯 成功後的下一步

連接成功後，你可以：

### 1. 在 NAS 上部署

```bash
# SSH 登入 NAS
ssh ctctim14@FLB_NAS

# 進入專案目錄
cd ~/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）

# 執行部署
./deploy-notion.sh
```

### 2. 實際測試

1. 在 LINE 中發送匯款截圖
2. 等待 OCR 辨識
3. 點擊「✅ 確認收款」
4. 檢查 Notion 資料庫是否新增記錄

---

## ❓ 常見問題

### Q1: 找不到「Add connections」選項？

**A**: 不同版本的 Notion 介面可能不同，嘗試：
- 點擊右上角的「分享」按鈕
- 或點擊「⋯」→「設定」→「連結」
- 或在資料庫設定中找到「Connections」

### Q2: 找不到「FLB 簽到系統」Integration？

**A**: 請確認：
1. 你已建立 Integration：https://www.notion.so/my-integrations
2. Integration 名稱正確
3. Integration 屬於同一個工作區

如果沒有，請重新建立：
1. 前往 https://www.notion.so/my-integrations
2. 點擊「+ New integration」
3. 名稱：FLB 簽到系統
4. 工作區：選擇你的工作區
5. 提交後複製 Token

### Q3: 連接後仍然失敗？

**A**: 嘗試：
1. 重新整理 Notion 頁面
2. 等待 30 秒後再測試
3. 確認 Token 和 Database ID 正確

---

## 📊 測試檢查清單

在繼續之前，請確認：

- [ ] 已在 https://www.notion.so/my-integrations 建立 Integration
- [ ] Integration 名稱為「FLB 簽到系統」
- [ ] 已複製 Integration Token（`ntn_xxx...`）
- [ ] Token 已加入 `.env` 檔案
- [ ] 已在 Notion 資料庫中連接 Integration
- [ ] 執行 `./check-notion-connection.sh` 顯示成功

---

## 🆘 需要協助？

如果按照步驟操作後仍然失敗，請提供：

1. `./check-notion-connection.sh` 的完整輸出
2. Notion 資料庫的截圖（顯示已連接的 Integrations）
3. 錯誤訊息的完整內容

---

**建立時間**：2025-11-22  
**狀態**：等待用戶連接 Integration
