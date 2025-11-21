# 🔑 Google Vision API 金鑰設定指南

**當前狀態**：✅ Cloud Vision API 已啟用  
**專案**：flb-system  
**下一步**：建立 API 金鑰

---

## 📋 當前狀態確認

根據你的截圖，已完成：
- ✅ Cloud Vision API 已啟用
- ✅ 服務名稱：vision.googleapis.com
- ✅ 服務帳戶已建立

還需要完成：
- ⏳ 建立 API 金鑰（用於 OCR 測試）

---

## 🔧 Step 1：建立 API 金鑰

### 方式 1：使用 Google Cloud Console（推薦）

1. **前往憑證頁面**
   - 在當前頁面，點擊左側選單「憑證」
   - 或直接前往：https://console.cloud.google.com/apis/credentials

2. **建立 API 金鑰**
   - 點擊上方「+ 建立憑證」
   - 選擇「API 金鑰」
   - 系統會自動生成金鑰並顯示

3. **複製 API 金鑰**
   - 在彈出視窗中，複製 API 金鑰
   - 格式類似：`AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q`

4. **（選填）限制 API 金鑰**
   - 點擊「限制金鑰」
   - 選擇「限制金鑰」→「API 限制」
   - 選擇「Cloud Vision API」
   - 點擊「儲存」

---

## 📝 Step 2：設定環境變數

### 編輯 .env 檔案

```bash
# 開啟 .env 檔案
nano .env

# 或使用其他編輯器
code .env
```

### 加入以下設定

```bash
# ==================== OCR 設定 ====================
# OCR 服務提供者（google_vision 或 none）
OCR_PROVIDER=google_vision

# Google Vision API 金鑰（請替換為你的實際金鑰）
GOOGLE_VISION_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q

# Google Vision API 端點（通常不需要修改）
GOOGLE_VISION_ENDPOINT=https://vision.googleapis.com/v1/images:annotate
```

**⚠️ 重要**：
- 請將 `AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q` 替換為你實際的 API 金鑰
- 不要將 API 金鑰提交到 Git（.env 已在 .gitignore 中）

---

## 🔄 Step 3：重啟服務

### Docker 環境

```bash
# 重啟容器以載入新設定
docker-compose restart

# 查看啟動日誌
docker logs flb-attendance-system --tail 50
```

### 本機環境

```bash
# 停止當前服務（Ctrl+C）
# 重新啟動
npm run dev
```

---

## ✅ Step 4：驗證設定

### 方式 1：使用環境檢查腳本

```bash
./check-remittance-env.sh
```

**預期看到**：
```
📸 檢查 OCR 設定...
✅ OCR 已啟用 (Google Vision)
   📌 Provider: google_vision
```

### 方式 2：查看啟動日誌

```bash
# Docker
docker logs flb-attendance-system | grep -i "OCR"

# 應看到類似訊息：
# ✅ OCR 功能已啟用: Google Vision
```

---

## 🧪 Step 5：快速測試

### 準備測試圖片

**方式 1**：使用文字編輯器製作

1. 打開文字編輯器（TextEdit、記事本等）
2. 輸入：「我已經匯款 1500 元」
3. 放大字體（24pt 以上）
4. 截圖（macOS: Cmd+Shift+4，Windows: Win+Shift+S）
5. 儲存圖片

**方式 2**：使用簡報軟體

1. 打開 PowerPoint 或 Keynote
2. 新增文字方塊：「已轉帳 NT$2000」
3. 截圖並儲存

### 執行測試

1. **打開 LINE App**
2. **找到測試用的 Bot**
3. **發送測試圖片**
4. **觀察結果**

**預期行為**：
- ✅ Bot 回覆：「📄 已收到您的匯款資訊，將盡快為您確認。」
- ✅ 管理員收到通知（Flex Message）
- ✅ 日誌顯示：「📝 OCR 辨識文字：我已經匯款 1500 元」

---

## 📊 查看測試結果

### 查看日誌

```bash
# 即時監控
docker logs flb-attendance-system -f | grep -E "OCR|辨識"

# 查看最近記錄
docker logs flb-attendance-system --tail 100 | grep "OCR"
```

### 查看匯款記錄

```bash
# 查看 JSON 記錄
cat src/data/remittance-records.json

# 格式化顯示（如有 jq）
cat src/data/remittance-records.json | jq '.[-1]'
```

**預期記錄內容**：
```json
{
  "id": "remit_1732194000000_abc123",
  "userId": "U...",
  "displayName": "測試用戶",
  "messageText": "我已經匯款 1500 元",  // OCR 辨識的文字
  "amount": "1500",
  "status": "pending",
  "createdAt": "2025-11-21T12:00:00.000Z"
}
```

---

## 🐛 常見問題排除

### Q1：OCR 處理失敗

**日誌顯示**：
```
❌ OCR 處理失敗: API key not valid
```

**解決方式**：
1. 檢查 API 金鑰是否正確複製
2. 確認 API 金鑰沒有多餘空格
3. 驗證 API 金鑰是否已啟用 Cloud Vision API

```bash
# 檢查設定
grep "GOOGLE_VISION_API_KEY" .env

# 重新設定後重啟
docker-compose restart
```

---

### Q2：OCR 未啟用

**日誌顯示**：
```
🖼️ OCR 未啟用，跳過圖片辨識
```

**解決方式**：
```bash
# 確認 .env 設定
grep "OCR_PROVIDER" .env
# 應顯示：OCR_PROVIDER=google_vision

# 如果沒有，加入設定並重啟
```

---

### Q3：配額用完

**錯誤訊息**：
```
❌ OCR 處理失敗: Quota exceeded
```

**解決方式**：
1. 前往 Google Cloud Console
2. 查看配額使用情況
3. 等待配額重置（每月 1 日）
4. 或啟用計費以獲得更多配額

**免費配額**：每月 1,000 次請求

---

## 📚 下一步

完成 API 金鑰設定後：

1. ✅ **執行環境檢查**
   ```bash
   ./check-remittance-env.sh
   ```

2. ✅ **快速測試（10 分鐘）**
   - 參考：`docs/testing/OCR_TEST_GUIDE.md`
   - 發送測試圖片驗證功能

3. ✅ **完整測試（30-45 分鐘）**
   - 參考：`docs/testing/OCR_TEST_CASES.md`
   - 執行全部 22 個測試案例

4. ✅ **記錄測試結果**
   - 使用：`docs/testing/ACTUAL_TEST_CHECKLIST.md`

---

## 🔐 安全提醒

### API 金鑰安全最佳實踐

- ✅ **使用環境變數**：不在代碼中硬編碼
- ✅ **設定 .gitignore**：.env 不提交到 Git
- ✅ **限制 API 金鑰**：只允許使用 Cloud Vision API
- ✅ **定期輪換**：定期更換 API 金鑰
- ✅ **監控使用量**：留意異常使用

### 如果 API 金鑰洩漏

1. 立即在 Google Cloud Console 刪除該金鑰
2. 建立新的 API 金鑰
3. 更新 .env 檔案
4. 重啟服務

---

**建立日期**：2025-11-21  
**最後更新**：2025-11-21
