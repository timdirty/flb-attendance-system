# 🔍 OCR 未啟用診斷與修復

## 📋 問題現象

從 Docker 日誌中可以看到：

```
flb-line-bot  | 收到訊息: [非文字訊息]
flb-line-bot  | 用戶 ID: Ud7e08c6260d3135c508e5ff2ba3a786f
flb-line-bot  | 來源類型: user
flb-line-bot  | 🖼️ OCR 未啟用，跳過圖片辨識
flb-line-bot  | ⚠️ OCR 未偵測到文字，暫不處理匯款通知
flb-line-bot  | 🔍 檢查匯款關鍵字: {
flb-line-bot  |   isText: false,
flb-line-bot  |   isImage: true,
flb-line-bot  |   targetTextPreview: '',
flb-line-bot  |   ...
flb-line-bot  | }
flb-line-bot  | ⚠️ 收到圖片但未偵測到匯款關鍵字，暫不處理匯款通知
```

**問題**：用戶發送匯款截圖（包含「轉帳成功」、「轉帳金額 2,250」等明顯文字），但系統未進行 OCR 辨識。

---

## 🔎 問題根因

### 原因 1：環境變數未設定

檢查 `src/config.js` 中的 OCR 配置邏輯：

```javascript
// ==================== OCR 配置 ====================
ocr: {
    provider: process.env.OCR_PROVIDER || 'none',
    googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || process.env.GCLOUD_VISION_API_KEY || '',
    googleVisionEndpoint: process.env.GOOGLE_VISION_ENDPOINT || 'https://vision.googleapis.com/v1/images:annotate',
    enabled: (() => {
        const provider = process.env.OCR_PROVIDER || 'none';
        if (provider === 'google_vision') {
            return Boolean(process.env.GOOGLE_VISION_API_KEY || process.env.GCLOUD_VISION_API_KEY);
        }
        return false;
    })()
},
```

**OCR 啟用條件**：
1. `OCR_PROVIDER` 環境變數必須設為 `'google_vision'`
2. 必須有 `GOOGLE_VISION_API_KEY` 或 `GCLOUD_VISION_API_KEY` 環境變數

### 原因 2：.env 檔案缺少設定

從 `env.example` 可見，OCR 設定是選填的，且預設被註解：

```bash
# OCR 設定（圖片匯款偵測，選填）
# OCR_PROVIDER=google_vision
# GOOGLE_VISION_API_KEY=your_google_cloud_vision_api_key
# GOOGLE_VISION_ENDPOINT=https://vision.googleapis.com/v1/images:annotate
```

如果 `.env` 檔案沒有這些設定，`OCR_PROVIDER` 會預設為 `'none'`，`config.ocr.enabled` 會是 `false`。

---

## ✅ 解決方案

### 方法 1：快速修復（直接修改 .env）

1. **編輯 .env 檔案**：
   ```bash
   nano /volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）/.env
   ```

2. **加入 OCR 設定**（在檔案末尾添加）：
   ```bash
   # ==================== OCR 設定 ====================
   # OCR 服務提供者
   OCR_PROVIDER=google_vision
   
   # Google Vision API 金鑰
   GOOGLE_VISION_API_KEY=你的實際API金鑰
   
   # Google Vision API 端點（選填，可使用預設值）
   # GOOGLE_VISION_ENDPOINT=https://vision.googleapis.com/v1/images:annotate
   ```

3. **重啟 Docker 容器**：
   ```bash
   cd /volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）
   docker-compose restart
   ```

4. **查看啟動日誌**：
   ```bash
   docker logs flb-line-bot --tail 100
   ```
   
   應該會看到：
   ```
   📋 系統配置摘要:
   ==================================================
   🖼️ OCR: ✅ google_vision
   ==================================================
   ```

### 方法 2：透過 Docker Compose 設定環境變數

編輯 `docker-compose.yml`，在 `environment` 區塊加入：

```yaml
environment:
  # ... 其他設定 ...
  
  # OCR 設定
  - OCR_PROVIDER=google_vision
  - GOOGLE_VISION_API_KEY=你的實際API金鑰
```

然後重啟容器：
```bash
docker-compose down
docker-compose up -d
```

---

## 🔧 取得 Google Vision API 金鑰

如果還沒有 API 金鑰，請參考以下步驟：

### Step 1：前往 Google Cloud Console

1. 前往：https://console.cloud.google.com/apis/credentials
2. 確認專案：`flb-system`
3. 確認 Cloud Vision API 已啟用

### Step 2：建立 API 金鑰

1. 點擊「+ 建立憑證」
2. 選擇「API 金鑰」
3. 複製生成的金鑰（格式類似：`AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q`）

### Step 3：（選填）限制 API 金鑰

1. 點擊「限制金鑰」
2. 選擇「API 限制」→「Cloud Vision API」
3. 點擊「儲存」

**⚠️ 安全提示**：
- API 金鑰應該保密，不要提交到 Git
- `.env` 檔案已在 `.gitignore` 中，確保不會被提交
- 建議設定 API 限制，只允許 Cloud Vision API 使用

---

## 🧪 驗證 OCR 功能

### 1. 檢查配置日誌

重啟後，在啟動日誌中應該看到：

```
📋 系統配置摘要:
==================================================
🖼️ OCR: ✅ google_vision
==================================================
```

### 2. 發送測試圖片

在 LINE 中發送一張包含文字的匯款截圖，日誌應該顯示：

```
flb-line-bot  | 收到訊息: [非文字訊息]
flb-line-bot  | 用戶 ID: Ud7e08c6260d3135c508e5ff2ba3a786f
flb-line-bot  | 來源類型: user
flb-line-bot  | 📝 OCR 辨識文字: 交易結果 轉帳成功 交易時間 2025-11-22 15:54:07 轉出帳號 1935***3957 轉入銀行 012 台北富邦 轉入帳號 8211***0220178 轉帳金額 2,250
flb-line-bot  | 🔍 檢查匯款關鍵字: {
flb-line-bot  |   isText: false,
flb-line-bot  |   isImage: true,
flb-line-bot  |   targetTextPreview: '交易結果 轉帳成功 ...',
flb-line-bot  |   hasExplicitPhrase: true,
flb-line-bot  |   hasBaseKeyword: true,
flb-line-bot  |   hitKeywords: true,
flb-line-bot  |   ...
flb-line-bot  | }
flb-line-bot  | 🎯 準備發送匯款提醒到群組...
```

### 3. 預期結果

- ✅ OCR 成功辨識圖片文字
- ✅ 檢測到匯款關鍵字（「轉帳」、「成功」、「金額」）
- ✅ 發送匯款提醒到指定群組（如果有設定 `REMITTANCE_GROUP_ID`）

---

## 📊 快速檢查清單

| 項目 | 檢查方法 | 預期結果 |
|------|---------|---------|
| `.env` 有 `OCR_PROVIDER` | `grep OCR_PROVIDER .env` | `OCR_PROVIDER=google_vision` |
| `.env` 有 API 金鑰 | `grep GOOGLE_VISION_API_KEY .env` | `GOOGLE_VISION_API_KEY=AIza...` |
| Docker 環境變數 | `docker exec flb-line-bot printenv \| grep OCR` | 顯示環境變數 |
| 啟動日誌 | `docker logs flb-line-bot \| grep OCR` | `🖼️ OCR: ✅ google_vision` |
| 發送圖片測試 | 在 LINE 發送匯款截圖 | 日誌顯示「📝 OCR 辨識文字」 |

---

## 🚨 常見問題

### Q1：API 金鑰設定後還是未啟用

**檢查**：
1. 確認 `.env` 中的設定格式正確（無引號、無空格）
2. 確認 Docker 容器已重啟
3. 檢查 Docker 環境變數：
   ```bash
   docker exec flb-line-bot printenv | grep OCR
   docker exec flb-line-bot printenv | grep GOOGLE_VISION
   ```

### Q2：OCR 辨識失敗

**可能原因**：
- API 金鑰無效或過期
- Google Cloud Vision API 未啟用
- API 配額已用盡
- 圖片品質過低或文字模糊

**解決方式**：
1. 在 Google Cloud Console 檢查 API 金鑰狀態
2. 確認 Cloud Vision API 已啟用
3. 檢查 API 使用配額
4. 測試使用清晰的圖片

### Q3：想暫時停用 OCR

**方法 1：設定為 none**
```bash
OCR_PROVIDER=none
```

**方法 2：移除環境變數**
```bash
# 在 .env 中註解掉
# OCR_PROVIDER=google_vision
# GOOGLE_VISION_API_KEY=...
```

---

## 📚 相關文件

- **OCR 設定詳細指南**：`GOOGLE_VISION_SETUP.md`
- **OCR 測試指南**：`docs/testing/OCR_TEST_GUIDE.md`
- **匯款通知功能說明**：`docs/features/REMITTANCE_NOTIFICATION.md`
- **環境變數範例**：`env.example`

---

## 📝 問題記錄

**時間**：2025-11-22 15:59  
**問題**：用戶發送匯款截圖，系統顯示「OCR 未啟用」  
**原因**：`.env` 檔案缺少 `OCR_PROVIDER` 和 `GOOGLE_VISION_API_KEY` 設定  
**解決**：在 `.env` 中加入 OCR 設定並重啟 Docker 容器  
**狀態**：✅ 已建立診斷文件，待用戶執行修復步驟

---

**更新時間**：2025-11-22 15:59  
**文件維護**：Claude Code (AGENTS.md 規範)
