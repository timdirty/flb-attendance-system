# 🚀 立即部署 Notion 記帳整合

## ⚡ 一鍵部署（推薦）

```bash
# SSH 登入 NAS
ssh ctctim14@FLB_NAS

# 進入專案目錄
cd ~/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）

# 執行部署腳本
./deploy-notion.sh
```

**預期輸出**：
```
🚀 開始部署 Notion 記帳整合...
📥 步驟 1/5：拉取最新程式碼...
✅ Notion 環境變數已設定
🛑 步驟 3/5：停止 Docker 容器...
🔨 步驟 4/5：重新建置並啟動容器...
⏳ 步驟 5/5：等待容器啟動...
🧪 測試 Notion 連線...
✅ 部署完成！
```

---

## 🔧 手動部署（如果自動腳本失敗）

### 步驟 1：確認 .env 設定

```bash
cd ~/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）

# 檢查環境變數
grep "NOTION" .env
```

**預期輸出**：
```
NOTION_API_TOKEN=ntn_d27641071409PhwFZRlnGTC7rxZSZodNIA2wfABU3Mt79a
NOTION_INCOME_DATABASE_ID=1a10a4c0ed8480979cf6cd46c312f31f
```

如果沒有，請手動加入：
```bash
cat >> .env << 'EOF'

# ==================== Notion 記帳整合 ====================
NOTION_API_TOKEN=ntn_d27641071409PhwFZRlnGTC7rxZSZodNIA2wfABU3Mt79a
NOTION_INCOME_DATABASE_ID=1a10a4c0ed8480979cf6cd46c312f31f
EOF
```

### 步驟 2：拉取最新程式碼

```bash
git pull origin main
```

### 步驟 3：重啟 Docker 容器

```bash
sudo docker-compose down
sudo docker-compose up -d --build
```

### 步驟 4：等待啟動

```bash
# 等待 15 秒
sleep 15

# 檢查容器狀態
sudo docker ps --filter "name=flb-line-bot"
```

### 步驟 5：測試 Notion 連線

```bash
curl http://localhost:3000/api/notion/test | python3 -m json.tool
```

**預期成功輸出**：
```json
{
  "success": true,
  "message": "✅ Notion 連線成功",
  "databaseTitle": "FLB 記帳",
  "databaseId": "1a10a4c0ed84..."
}
```

**如果失敗**：
```json
{
  "success": false,
  "message": "❌ Notion 連線失敗",
  "error": "..."
}
```

---

## 🧪 驗證功能

### 方法 1：檢查配置狀態

```bash
curl http://localhost:3000/api/notion/config | python3 -m json.tool
```

**預期輸出**：
```json
{
  "success": true,
  "enabled": true,
  "hasToken": true,
  "hasDatabaseId": true,
  "optionalFields": {
    "categoryId": false,
    "accountId": false,
    "incomeType": false,
    "hasMemoField": false
  }
}
```

### 方法 2：查看日誌

```bash
# 查看 Notion 相關日誌
sudo docker logs flb-line-bot --tail 50 | grep Notion

# 持續監控日誌
sudo docker logs flb-line-bot -f | grep Notion
```

### 方法 3：實際測試

1. 在 LINE 中發送匯款截圖
2. 等待 OCR 辨識完成
3. 點擊「**✅ 確認收款**」
4. 查看日誌：
   ```bash
   sudo docker logs flb-line-bot --tail 20 | grep "記錄收入"
   ```
5. 檢查 Notion 資料庫是否新增記錄

---

## ❌ 故障排除

### 問題 1：找不到資料庫

**錯誤訊息**：
```
Could not find database with ID: 1a10a4c0...
```

**解決方案**：
1. 確認已在 Notion 中將 Integration 連接到資料庫：
   - 開啟 Notion 資料庫
   - 點擊右上角「⋯」
   - 選擇「+ Add connections」
   - 選擇「FLB 簽到系統」
   - 點擊「Confirm」

2. 重啟容器：
   ```bash
   sudo docker-compose restart
   ```

### 問題 2：Token 無效

**錯誤訊息**：
```
Unauthorized
```

**解決方案**：
1. 確認 Token 正確（以 `ntn_` 開頭）
2. 檢查 `.env` 中沒有多餘空格
3. 重新建立 Integration 並更新 Token

### 問題 3：欄位名稱不符

**錯誤訊息**：
```
body failed validation
```

**解決方案**：
確認 Notion 資料庫有以下欄位：
- 「**收入**」（Title 類型）
- 「**日期**」（Date 類型）
- 「**金額**」（Number 類型）

欄位名稱必須**完全一致**（包含中文字）。

---

## 📝 查看記錄範例

成功後，Notion 會自動新增：

```
收入：課程收款
日期：2025-11-22
金額：2250
```

如果有設定備註欄位：
```
備註：來自: 張庭豪 TimDirty
      記錄ID: remit_1763801153499_2bdn56y
```

---

## 🎯 下一步（選填）

### 設定類別自動分類

1. 在 Notion 中建立「類別」資料庫
2. 新增一個頁面「課程收款」
3. 複製頁面 ID（從 URL）
4. 在 `.env` 中加入：
   ```bash
   NOTION_INCOME_CATEGORY_ID=頁面ID
   ```
5. 重啟容器

### 設定帳戶自動標記

同上，使用 `NOTION_INCOME_ACCOUNT_ID`

### 啟用備註欄位

在 `.env` 中加入：
```bash
NOTION_INCOME_HAS_MEMO_FIELD=true
```

---

**建立時間**：2025-11-22 18:23  
**Token**：已設定 ✅  
**Database ID**：已設定 ✅  
**狀態**：準備部署 🚀
