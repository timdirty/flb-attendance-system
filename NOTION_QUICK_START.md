# 🚀 Notion 記帳整合 - 快速開始

## ⚡ 5 分鐘設定完成

### 1️⃣ 建立 Notion Integration (2 分鐘)

1. 前往 https://www.notion.so/my-integrations
2. 點擊「+ New integration」
3. 命名為「FLB 簽到系統」
4. 選擇工作區
5. 點擊「Submit」
6. **複製 Token**（`ntn_xxx...`）

### 2️⃣ 取得資料庫 ID (1 分鐘)

從你的 Notion 記帳資料庫 URL 中提取：

```
https://www.notion.so/funlearnbar/FLB-1a10a4c0ed8480979cf6cd46c312f31f
                                     ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                     這就是 Database ID
```

### 3️⃣ 連接 Integration (30 秒)

在 Notion 資料庫頁面：
1. 右上角「⋯」→「+ Add connections」
2. 選擇「FLB 簽到系統」
3. 點擊「Confirm」

### 4️⃣ 設定環境變數 (1 分鐘)

編輯 `.env` 檔案，加入：

```bash
NOTION_API_TOKEN=ntn_d27641071409PhwFZRlnGTC7rxZSZodNIA2wfABU3Mt79a
NOTION_INCOME_DATABASE_ID=1a10a4c0ed8480979cf6cd46c312f31f
```

### 5️⃣ 重啟伺服器 (30 秒)

```bash
sudo docker-compose down && sudo docker-compose up -d --build
```

---

## ✅ 測試驗證

### 方法 1：API 測試

```bash
curl http://localhost:3000/api/notion/test
```

**預期回應**：
```json
{
  "success": true,
  "message": "✅ Notion 連線成功",
  "databaseTitle": "記帳系統",
  "databaseId": "1a10a4c0ed84..."
}
```

### 方法 2：實際測試

1. 在 LINE 發送匯款截圖
2. 點擊「✅ 確認收款」
3. 查看 Notion 資料庫是否新增記錄

---

## 📊 必要的資料庫欄位

你的 Notion 資料庫必須包含：

| 欄位名稱 | 類型 | 必填 |
|---------|------|------|
| 收入 | Title | ✅ |
| 日期 | Date | ✅ |
| 金額 | Number | ✅ |

---

## ⚙️ 選填欄位（進階）

如果你想要更詳細的記錄，可以在 `.env` 加入：

```bash
# 自動分類為「課程收款」
NOTION_INCOME_CATEGORY_ID=abc123def456

# 自動標記為「公司帳戶」
NOTION_INCOME_ACCOUNT_ID=def456abc123

# 自動設定為「公司」
NOTION_INCOME_TYPE=公司

# 啟用備註欄位（記錄付款人姓名）
NOTION_INCOME_HAS_MEMO_FIELD=true
```

---

## 🐛 常見問題

### Q: 找不到資料庫？
A: 確認你已完成「步驟 3：連接 Integration」

### Q: Token 無效？
A: 確認 Token 以 `ntn_` 開頭，沒有多餘空格

### Q: 欄位名稱錯誤？
A: 確認資料庫有「收入」（Title）、「日期」（Date）、「金額」（Number）欄位

---

## 📖 完整文檔

詳細設定請參考：[docs/integration/NOTION_ACCOUNTING_SETUP.md](docs/integration/NOTION_ACCOUNTING_SETUP.md)

---

**🎉 設定完成！現在每次確認收款都會自動記錄到 Notion！**
