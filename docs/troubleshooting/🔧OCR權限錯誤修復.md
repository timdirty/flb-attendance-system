# 🔧 OCR 權限錯誤修復（403 PERMISSION_DENIED）

## 📋 問題現象

發送圖片後，日誌顯示：

```
❌ OCR 處理失敗: {
  error: {
    code: 403,
    status: 'PERMISSION_DENIED',
    details: [ [Object], [Object], [Object] ]
  }
}
⚠️ OCR 未偵測到文字，暫不處理匯款通知
```

**狀態**：OCR 功能已啟用，但 Google Vision API 拒絕請求。

---

## 🔍 問題原因

**403 PERMISSION_DENIED** 錯誤通常由以下原因引起：

### 1. Cloud Vision API 未啟用
- Google Cloud 專案中未啟用 Cloud Vision API
- 或 API 啟用後尚未生效（需等待幾分鐘）

### 2. API 金鑰權限設定不正確
- API 金鑰有 API 限制，但未包含 Cloud Vision API
- API 金鑰已禁用或過期
- API 金鑰屬於不同的 Google Cloud 專案

### 3. API 金鑰有限制設定
- 設定了 IP 白名單，但 NAS 的 IP 不在白名單中
- 設定了 HTTP 參照網址限制
- 設定了應用程式限制（Android/iOS）

---

## ✅ 解決方案

### Step 1：確認 Cloud Vision API 已啟用

1. **前往 API 程式庫**：
   ```
   https://console.cloud.google.com/apis/library/vision.googleapis.com?project=flb-system
   ```

2. **檢查狀態**：
   - ✅ 如果顯示「API 已啟用」→ 進行 Step 2
   - ❌ 如果顯示「啟用」按鈕 → 點擊啟用，等待 5-10 分鐘

3. **驗證啟用狀態**：
   ```
   https://console.cloud.google.com/apis/dashboard?project=flb-system
   ```
   在「已啟用的 API 和服務」中應該看到「Cloud Vision API」

---

### Step 2：檢查並修正 API 金鑰限制

1. **前往憑證頁面**：
   ```
   https://console.cloud.google.com/apis/credentials?project=flb-system
   ```

2. **找到你的 API 金鑰**（開頭為 `AIzaSyDfYBGU...`）

3. **點擊編輯**（鉛筆圖示）

4. **檢查「API 限制」**：

   #### 選項 A：不限制金鑰（推薦用於測試）
   
   - 選擇「**不限制金鑰**」
   - 點擊「儲存」
   - ⚠️ 此選項安全性較低，僅建議測試使用

   #### 選項 B：限制金鑰（推薦用於正式環境）
   
   - 選擇「**限制金鑰**」
   - 點擊「選取 API」
   - 勾選「**Cloud Vision API**」
   - 取消勾選其他不需要的 API
   - 點擊「儲存」

5. **檢查「應用程式限制」**：

   #### 選項 A：無（最寬鬆）
   
   - 選擇「**無**」
   - 點擊「儲存」

   #### 選項 B：IP 位址（如需限制來源）
   
   - 選擇「**IP 位址（網頁伺服器、cron 工作等）**」
   - 加入你的 NAS IP 位址
   - 點擊「儲存」

6. **等待設定生效**（約 5-10 分鐘）

---

### Step 3：測試 API 金鑰

在 NAS 上執行測試腳本：

```bash
cd ~/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）
./test-google-vision.sh
```

**預期結果（成功）**：
```
✅ API 測試成功！
📝 Google Vision API 可以正常使用
🖼️ OCR 功能已準備就緒
```

**如果失敗**：
- 檢查錯誤訊息
- 確認 API 已啟用並等待生效
- 驗證 API 金鑰設定正確
- 確認 .env 中的 API 金鑰無誤

---

### Step 4：重新測試 LINE 匯款偵測

1. **重啟容器**（如果修改了 API 金鑰）：
   ```bash
   sudo docker-compose down
   sudo docker-compose up -d
   ```

2. **在 LINE 中發送匯款截圖**

3. **查看日誌**：
   ```bash
   sudo docker logs flb-line-bot --tail 50
   ```

4. **預期日誌**：
   ```
   📝 OCR 辨識文字: 交易結果 轉帳成功 交易時間 2025-11-22 15:54:07 轉出帳號 1935***3957 轉入銀行 012 台北富邦 轉入帳號 8211***0220178 轉帳金額 2,250
   🔍 檢查匯款關鍵字: { ... hitKeywords: true ... }
   🎯 準備發送匯款提醒到群組...
   ```

---

## 🧪 進階診斷

### 使用 curl 直接測試 API

```bash
# 從 .env 讀取 API 金鑰
API_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env | cut -d '=' -f2)

# 測試 API
curl -X POST \
  "https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "image": {
          "source": {
            "imageUri": "https://cloud.google.com/vision/docs/images/bicycle_example.png"
          }
        },
        "features": [
          {
            "type": "TEXT_DETECTION"
          }
        ]
      }
    ]
  }'
```

**成功回應**（包含 `textAnnotations`）：
```json
{
  "responses": [
    {
      "textAnnotations": [
        {
          "description": "...",
          "boundingPoly": {...}
        }
      ]
    }
  ]
}
```

**失敗回應**（403 錯誤）：
```json
{
  "error": {
    "code": 403,
    "message": "Cloud Vision API has not been used in project ...",
    "status": "PERMISSION_DENIED"
  }
}
```

---

## 📊 常見錯誤對照表

| 錯誤代碼 | 錯誤狀態 | 原因 | 解決方式 |
|---------|---------|------|---------|
| 400 | INVALID_ARGUMENT | API 請求格式錯誤 | 檢查請求內容格式 |
| 403 | PERMISSION_DENIED | API 未啟用或權限不足 | 啟用 Cloud Vision API，檢查金鑰限制 |
| 429 | RESOURCE_EXHAUSTED | API 配額已用盡 | 檢查配額使用情況，升級方案 |
| 401 | UNAUTHENTICATED | API 金鑰無效 | 確認 API 金鑰正確 |

---

## 🔑 建立新的 API 金鑰（如需要）

如果當前 API 金鑰無法修復，可以建立新的：

1. **前往憑證頁面**：
   ```
   https://console.cloud.google.com/apis/credentials?project=flb-system
   ```

2. **點擊「+ 建立憑證」→「API 金鑰」**

3. **複製新金鑰**（格式：`AIzaSy...`）

4. **設定金鑰限制**：
   - 點擊「限制金鑰」
   - API 限制：選擇「Cloud Vision API」
   - 應用程式限制：選擇「無」（或設定 IP 白名單）
   - 儲存

5. **更新 .env 檔案**：
   ```bash
   nano .env
   # 修改 GOOGLE_VISION_API_KEY 為新金鑰
   ```

6. **重啟容器**：
   ```bash
   sudo docker-compose restart
   ```

---

## 📝 檢查清單

完成以下檢查以確保 OCR 功能正常：

- [ ] Cloud Vision API 已在專案中啟用
- [ ] API 金鑰的「API 限制」包含 Cloud Vision API（或選擇不限制）
- [ ] API 金鑰的「應用程式限制」為「無」（或 IP 白名單包含 NAS IP）
- [ ] API 金鑰已複製到 .env 檔案（無空格、無引號）
- [ ] 容器已重啟以載入新設定
- [ ] 測試腳本執行成功（`./test-google-vision.sh`）
- [ ] LINE 發送圖片測試，日誌顯示「OCR 辨識文字」

---

## 📚 相關資源

- **Google Cloud Vision API 文件**：https://cloud.google.com/vision/docs
- **API 金鑰最佳實務**：https://cloud.google.com/docs/authentication/api-keys
- **配額與限制**：https://cloud.google.com/vision/quotas
- **本專案 OCR 設定指南**：`GOOGLE_VISION_SETUP.md`
- **快速修復指南**：`QUICK_FIX_OCR.md`

---

## 🆘 仍無法解決？

### 1. 檢查詳細錯誤訊息

```bash
sudo docker logs flb-line-bot --tail 200 | grep -A 5 "OCR"
```

### 2. 執行完整診斷

```bash
./test-google-vision.sh > api-test-result.txt 2>&1
cat api-test-result.txt
```

### 3. 檢查 Google Cloud 專案狀態

前往 Google Cloud Console Dashboard：
```
https://console.cloud.google.com/home/dashboard?project=flb-system
```

確認：
- 專案狀態正常
- 計費帳戶已啟用（Vision API 需要啟用計費，但有免費配額）
- 沒有其他警告或錯誤

---

**建立時間**：2025-11-22 16:11  
**問題狀態**：✅ 已診斷，待執行修復步驟  
**維護者**：Claude Code (AGENTS.md 規範)
