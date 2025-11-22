# ⚡ OCR 快速修復指南

## 問題

發送匯款截圖後，系統顯示：
```
🖼️ OCR 未啟用，跳過圖片辨識
⚠️ 收到圖片但未偵測到匯款關鍵字，暫不處理匯款通知
```

## 原因

`.env` 檔案缺少 OCR 設定，導致 OCR 功能未啟用。

---

## 🚀 快速修復（3 步驟）

### Step 1：編輯 .env 檔案

```bash
nano .env
```

### Step 2：加入以下設定（在檔案末尾）

```bash
# ==================== OCR 設定 ====================
OCR_PROVIDER=google_vision
GOOGLE_VISION_API_KEY=你的實際API金鑰
```

**⚠️ 重要**：請將 `你的實際API金鑰` 替換為從 Google Cloud Console 取得的實際金鑰。

### Step 3：重啟 Docker 容器

```bash
docker-compose restart
```

---

## 🔑 取得 Google Vision API 金鑰

如果還沒有 API 金鑰：

1. **前往 Google Cloud Console**  
   https://console.cloud.google.com/apis/credentials?project=flb-system

2. **點擊「+ 建立憑證」→「API 金鑰」**

3. **複製金鑰**（格式類似 `AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q`）

4. **（選填）限制金鑰**  
   設定 → API 限制 → 選擇「Cloud Vision API」

**詳細步驟**：參考 `GOOGLE_VISION_SETUP.md`

---

## ✅ 驗證修復

### 方法 1：使用檢查腳本

```bash
./check-ocr.sh
```

預期輸出：
```
✅ OCR_PROVIDER 已設為 google_vision
✅ API 金鑰已設定
✅ Docker 容器正在運行
✅ 容器內 OCR_PROVIDER = google_vision
✅ 日誌顯示 OCR 已啟用
```

### 方法 2：查看啟動日誌

```bash
docker logs flb-line-bot --tail 50 | grep OCR
```

預期輸出：
```
🖼️ OCR: ✅ google_vision
```

### 方法 3：實際測試

1. 在 LINE 中發送一張匯款截圖
2. 查看日誌：
   ```bash
   docker logs flb-line-bot --tail 100
   ```
3. 預期看到：
   ```
   📝 OCR 辨識文字: 交易結果 轉帳成功 ...
   🔍 檢查匯款關鍵字: { ... hitKeywords: true ... }
   🎯 準備發送匯款提醒到群組...
   ```

---

## 🆘 還是不行？

### 檢查清單

- [ ] `.env` 中的 `OCR_PROVIDER` 沒有被註解（開頭沒有 `#`）
- [ ] `GOOGLE_VISION_API_KEY` 是實際的金鑰（不是 `your_google_cloud_vision_api_key`）
- [ ] 金鑰格式正確（通常以 `AIza` 開頭，長度約 39 字元）
- [ ] Docker 容器已重啟（`docker-compose restart`）
- [ ] Google Cloud Vision API 已啟用

### 進階診斷

執行完整診斷：
```bash
./check-ocr.sh
```

查看詳細日誌：
```bash
docker logs flb-line-bot --tail 200
```

檢查容器環境變數：
```bash
docker exec flb-line-bot printenv | grep OCR
docker exec flb-line-bot printenv | grep GOOGLE_VISION
```

---

## 📚 相關文件

- **詳細診斷報告**：`docs/troubleshooting/🔍OCR未啟用診斷與修復.md`
- **Google Vision 設定指南**：`GOOGLE_VISION_SETUP.md`
- **OCR 測試指南**：`docs/testing/OCR_TEST_GUIDE.md`
- **環境變數範例**：`env.example`

---

## 📞 需要協助？

如果按照上述步驟仍無法解決，請提供以下資訊：

1. 檢查腳本輸出：
   ```bash
   ./check-ocr.sh > ocr-check-result.txt 2>&1
   ```

2. 最近 100 行日誌：
   ```bash
   docker logs flb-line-bot --tail 100 > docker-logs.txt 2>&1
   ```

3. 環境變數確認（**注意：不要洩漏完整 API 金鑰**）：
   ```bash
   docker exec flb-line-bot printenv | grep -E "(OCR|GOOGLE_VISION)" > env-check.txt
   ```

---

**建立時間**：2025-11-22 15:59  
**維護者**：Claude Code (AGENTS.md 規範)
