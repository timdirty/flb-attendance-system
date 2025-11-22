# 🧾 Notion 記帳整合設定指南

## 📋 功能說明

當你在 LINE Bot 中確認收款時，系統會**自動記錄收入到 Notion 資料庫**，無需手動記帳。

### 自動記錄內容
- ✅ 收入標題：課程收款
- ✅ 日期：確認收款的日期
- ✅ 金額：OCR 辨識或手動輸入的金額
- ✅ 備註：包含付款人姓名和記錄 ID

---

## 🚀 快速設定（3 步驟）

### 步驟 1：建立 Notion Integration

1. 前往 [Notion Integrations](https://www.notion.so/my-integrations)
2. 點擊「+ New integration」
3. 填寫資訊：
   - **Name**：FLB 簽到系統
   - **Associated workspace**：選擇你的工作區
   - **Type**：Internal integration
4. 點擊「Submit」
5. **複製 Internal Integration Token**（格式：`ntn_xxx...`）

### 步驟 2：取得收入資料庫 ID

#### 方法 A：從資料庫 URL 取得（推薦）

1. 在 Notion 中開啟你的「收入」或「記帳」資料庫
2. 複製資料庫的 URL，例如：
   ```
   https://www.notion.so/funlearnbar/FLB-1a10a4c0ed8480979cf6cd46c312f31f
   ```
3. Database ID 就是 URL 中最後那段（去掉問號後面的參數）：
   ```
   1a10a4c0ed8480979cf6cd46c312f31f
   ```

#### 方法 B：從分享連結取得

1. 在資料庫頁面右上角點擊「Share」
2. 點擊「Copy link」
3. 從連結中提取 Database ID（格式同上）

### 步驟 3：連接 Integration 到資料庫

1. 在 Notion 資料庫頁面右上角點擊「⋯」（三個點）
2. 選擇「+ Add connections」
3. 找到並選擇「FLB 簽到系統」
4. 點擊「Confirm」

### 步驟 4：設定環境變數

在你的 `.env` 檔案中加入：

```bash
# Notion 記帳整合
NOTION_API_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxx
NOTION_INCOME_DATABASE_ID=1a10a4c0ed8480979cf6cd46c312f31f
```

### 步驟 5：重啟伺服器

```bash
# Docker 部署
sudo docker-compose down
sudo docker-compose up -d --build

# 或本機部署
npm restart
```

---

## 🔍 驗證設定

### 方法 1：使用測試 API

```bash
# 測試 Notion 連線
curl http://localhost:3000/api/notion/test

# 檢查配置狀態
curl http://localhost:3000/api/notion/config
```

### 方法 2：實際測試

1. 在 LINE 中發送匯款截圖
2. 點擊「✅ 確認收款」
3. 查看伺服器日誌：
   ```bash
   sudo docker logs flb-line-bot --tail 50 | grep Notion
   ```
4. 檢查 Notion 資料庫是否新增了一筆收入記錄

---

## 📊 Notion 資料庫結構

### 必要欄位

你的 Notion 收入資料庫**必須**包含以下欄位：

| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| 收入 | Title | 標題欄位（必須命名為「收入」） |
| 日期 | Date | 收款日期 |
| 金額 | Number | 收入金額 |

### 選填欄位

如果你的資料庫有以下欄位，可以設定環境變數來自動填入：

| 欄位名稱 | 類型 | 環境變數 | 說明 |
|---------|------|----------|------|
| 類別 | Relation | `NOTION_INCOME_CATEGORY_ID` | 關聯到「類別」資料庫 |
| 帳戶 | Relation | `NOTION_INCOME_ACCOUNT_ID` | 關聯到「帳戶」資料庫 |
| 個人/公司 | Select | `NOTION_INCOME_TYPE` | 選項值（如「公司」） |
| 備註 | Text | `NOTION_INCOME_HAS_MEMO_FIELD=true` | 付款人資訊 |

---

## ⚙️ 進階設定

### 設定類別（例如「課程收款」）

1. 在 Notion 中建立「類別」資料庫（如果還沒有）
2. 在類別資料庫中建立一個頁面「課程收款」
3. 複製該頁面的 ID（從 URL 中取得）：
   ```
   https://www.notion.so/課程收款-abc123def456
   頁面 ID：abc123def456
   ```
4. 在收入資料庫中確保有「類別」欄位，並設定為 Relation 類型
5. 在 `.env` 中加入：
   ```bash
   NOTION_INCOME_CATEGORY_ID=abc123def456
   ```

### 設定帳戶（例如「公司帳戶」）

同上，但使用 `NOTION_INCOME_ACCOUNT_ID` 環境變數。

### 設定個人/公司選項

```bash
# 如果你的資料庫有「個人/公司」欄位（Select 類型）
NOTION_INCOME_TYPE=公司
```

### 啟用備註欄位

```bash
# 如果你的資料庫有「備註」欄位（Text 類型）
NOTION_INCOME_HAS_MEMO_FIELD=true
```

---

## 🐛 故障排除

### 問題 1：API Token 無效

**錯誤訊息**：
```
❌ 記錄收入到 Notion 失敗: Unauthorized
```

**解決方案**：
1. 確認 `NOTION_API_TOKEN` 格式正確（以 `ntn_` 開頭）
2. 確認 Token 沒有過期
3. 重新建立 Integration 並更新 Token

### 問題 2：找不到資料庫

**錯誤訊息**：
```
❌ 記錄收入到 Notion 失敗: Could not find database
```

**解決方案**：
1. 確認 Database ID 正確
2. **重要**：確認已將 Integration 連接到資料庫（步驟 3）
3. 確認資料庫沒有被刪除或移動

### 問題 3：欄位名稱不符

**錯誤訊息**：
```
❌ 記錄收入到 Notion 失敗: body failed validation
```

**解決方案**：
1. 確認資料庫有「收入」、「日期」、「金額」三個必要欄位
2. 欄位名稱必須**完全一致**（包含中文字）
3. 欄位類型必須正確：
   - 收入：Title
   - 日期：Date
   - 金額：Number

### 問題 4：關聯欄位錯誤

**錯誤訊息**：
```
❌ 記錄收入到 Notion 失敗: Relation ... does not point to a valid page
```

**解決方案**：
1. 確認 `NOTION_INCOME_CATEGORY_ID` 或 `NOTION_INCOME_ACCOUNT_ID` 正確
2. 確認關聯的頁面存在且可訪問
3. 如果不需要這些欄位，請移除環境變數

---

## 📝 完整環境變數範例

```bash
# ===== 必要設定 =====
NOTION_API_TOKEN=ntn_d27641071409PhwFZRlnGTC7rxZSZodNIA2wfABU3Mt79a
NOTION_INCOME_DATABASE_ID=1a10a4c0ed8480979cf6cd46c312f31f

# ===== 選填設定 =====
# 類別關聯（例如「課程收款」頁面 ID）
NOTION_INCOME_CATEGORY_ID=abc123def456

# 帳戶關聯（例如「公司帳戶」頁面 ID）
NOTION_INCOME_ACCOUNT_ID=def456abc123

# 個人/公司選項
NOTION_INCOME_TYPE=公司

# 啟用備註欄位
NOTION_INCOME_HAS_MEMO_FIELD=true
```

---

## 🔐 安全注意事項

1. ⚠️ **絕對不要**將 `NOTION_API_TOKEN` 提交到 Git
2. ⚠️ 確保 `.env` 已加入 `.gitignore`
3. ⚠️ Token 具有完整資料庫權限，請妥善保管
4. ⚠️ 定期輪換 Token（建議 3-6 個月）

---

## 📖 相關文件

- [Notion API 官方文檔](https://developers.notion.com/)
- [Notion Integration 指南](https://www.notion.so/help/create-integrations-with-the-notion-api)
- [本專案 API 文檔](../api/API_DOCUMENTATION.md)

---

## 💡 使用建議

### 最佳實踐

1. **定期檢查同步狀態**
   ```bash
   curl http://localhost:3000/api/notion/config
   ```

2. **監控日誌**
   ```bash
   sudo docker logs flb-line-bot -f | grep Notion
   ```

3. **備份資料**
   - Notion 會自動保存歷史記錄
   - 建議定期匯出資料庫備份

### 效率提升

- 設定好類別和帳戶關聯後，每筆收入都會自動分類
- 使用 Notion 的 Filter 和 View 功能分析收入趨勢
- 結合 Notion 的 Formula 功能自動計算總收入

---

**建立時間**：2025-11-22  
**最後更新**：2025-11-22  
**維護者**：Claude Code (AGENTS.md 規範)
