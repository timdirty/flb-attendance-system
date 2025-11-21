# 📸 OCR 圖片辨識功能測試執行指南

> **完整測試時間**：30-45 分鐘  
> **快速測試時間**：10 分鐘  
> **前置需求**：Google Vision API Key

---

## 📋 測試前準備

### Step 1：取得 Google Vision API Key

#### 方式 1：使用 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Cloud Vision API**
   - 搜尋「Vision API」
   - 點擊「啟用」
4. 建立 API 金鑰
   - 導航至「憑證」→「建立憑證」→「API 金鑰」
   - 複製金鑰

#### 方式 2：使用現有金鑰

如果已有 Google Cloud 專案與 API 金鑰，直接使用即可。

**💡 提示**：
- 免費額度：每月 1,000 次請求
- 超過後按次計費
- 測試建議：使用同一組圖片重複測試

---

### Step 2：配置環境變數

編輯 `.env` 檔案：

```bash
# OCR 設定
OCR_PROVIDER=google_vision
GOOGLE_VISION_API_KEY=your_google_cloud_vision_api_key_here

# 選填：自訂端點（通常不需要修改）
# GOOGLE_VISION_ENDPOINT=https://vision.googleapis.com/v1/images:annotate
```

**⚠️ 重要**：
- 請勿將 API Key 提交到 Git
- `.env` 已在 `.gitignore` 中，請確認

---

### Step 3：準備測試圖片

#### 必備測試圖片（5-10 張）

**類型 1：純文字圖片**
```
使用文字編輯器或簡報軟體製作：
- 「我已經匯款 1500 元」
- 「ATM 轉帳完成」
- 「已轉帳 NT$2000」
```

**製作方式**：
1. 打開文字編輯器（如 TextEdit、記事本）
2. 輸入測試文字，放大字體
3. 截圖（macOS: Cmd+Shift+4，Windows: Win+Shift+S）

**類型 2：模擬匯款截圖**
- 實際 ATM 轉帳截圖（可遮蔽敏感資訊）
- 網路銀行截圖
- 行動支付截圖

**類型 3：語意過濾測試**
```
- 「明天會匯款」
- 「還沒匯款」
- 「請問如何匯款？」
```

**類型 4：錯誤處理測試**
- 一般圖片（無文字）
- 模糊圖片
- 手寫文字

**圖片儲存位置**：
```
# 建議建立測試圖片資料夾
mkdir ~/OCR-Test-Images
```

---

### Step 4：啟動服務

```bash
# 方式 1：本機開發
npm run dev

# 方式 2：Docker
docker-compose restart

# 查看日誌
docker logs flb-attendance-system -f
```

---

### Step 5：執行環境檢查

```bash
./check-remittance-env.sh
```

**預期輸出**：
```
📸 檢查 OCR 設定（稍後測試）...
✅ OCR 已啟用 (Google Vision)
   📌 Provider: google_vision
```

---

## ⚡ 快速測試（10 分鐘）

### 測試 1：基本 OCR 辨識（3 分鐘）

#### 1.1 純文字圖片
```
📱 操作：
1. 製作包含「我已經匯款 1500 元」的文字圖片
2. 在 LINE 中發送此圖片

✅ 預期結果：
- Bot 回覆：「📄 已收到您的匯款資訊，將盡快為您確認。」
- 管理員收到通知，金額顯示 NT$ 1,500
- 日誌顯示：「📝 OCR 辨識文字：我已經匯款 1500 元」
```

**日誌檢查**：
```bash
docker logs flb-attendance-system --tail 50 | grep -E "OCR|辨識"
```

#### 1.2 查看辨識記錄
```bash
# 查看匯款記錄
cat src/data/remittance-records.json | tail -n 20

# 確認最新一筆記錄
# - messageText 應包含 OCR 辨識的文字
# - amount 應為 "1500"
```

---

### 測試 2：OCR + 語意過濾（3 分鐘）

```
📱 操作：
製作包含「明天會匯款」的圖片並發送

✅ 預期結果：
- Bot 回覆：「👀 已收到您的訊息，完成匯款後請再通知...」
- 管理員 **不會** 收到通知
- 日誌顯示：「⚠️ 匯款語意判斷為延後/詢問」
```

**記錄檢查**：
```bash
# 查看語意過濾記錄
cat src/data/remittance-intent-log.json

# 應有新記錄，reason = "postpone"
```

---

### 測試 3：無關鍵字圖片（2 分鐘）

```
📱 操作：
發送一般圖片（如風景照、文件等，無匯款文字）

✅ 預期結果：
- 無 Bot 回覆
- 無管理員通知
- 日誌顯示：「⚠️ 收到圖片但未偵測到匯款關鍵字」
```

---

### 測試 4：錯誤處理（2 分鐘）

```
📱 操作：
暫時設定錯誤的 API Key（.env 中修改）
重啟服務，發送包含匯款文字的圖片

✅ 預期結果：
- 日誌顯示：「❌ OCR 處理失敗」
- 系統不崩潰，正常處理錯誤
- 不觸發匯款通知

恢復正確的 API Key 後再測試
```

---

## 🎯 完整測試（30-45 分鐘）

### 階段 1：OCR 基本功能（10 分鐘）

依照 `OCR_TEST_CASES.md` 執行測試組 I（5 個案例）：

**I1. 純文字圖片（清晰）**
- 製作清晰文字圖片
- 發送並記錄結果

**I2. 匯款截圖（ATM 轉帳）**
- 使用實際或模擬 ATM 截圖
- 檢查辨識準確度

**I3. 匯款截圖（網路銀行）**
- 使用網銀截圖
- 確認關鍵字辨識

**I4. 手寫文字圖片**
- 手寫「已轉帳 2000 元」
- 觀察辨識成功率

**I5. 模糊圖片**
- 使用模糊圖片
- 確認錯誤處理

**記錄方式**：
在 `OCR_TEST_CASES.md` 的「實際結果」欄位填寫測試結果。

---

### 階段 2：OCR + 匯款關鍵字（12 分鐘）

執行測試組 J（6 個案例）：

**J1-J5：各關鍵字測試**
- 製作包含各關鍵字的圖片
- 驗證觸發機制

**J6：無關鍵字測試**
- 確認不誤觸發

**重點檢查**：
```bash
# 即時監控日誌
docker logs flb-attendance-system -f | grep -E "OCR|匯款|關鍵字"
```

---

### 階段 3：OCR + 語意過濾（8 分鐘）

執行測試組 K（4 個案例）：

**K1. 延後關鍵字**
```
圖片內容：「明天會匯款」
預期：不觸發，記錄到 intent-log
```

**K2. 否定關鍵字**
```
圖片內容：「還沒匯款」
預期：不觸發
```

**K3-K4. 詢問與疑問**
```
圖片內容：「請問如何匯款？」
預期：不觸發
```

**驗證方式**：
```bash
# 查看語意過濾記錄
cat src/data/remittance-intent-log.json | jq '.[-3:]'

# 或不使用 jq
tail -n 50 src/data/remittance-intent-log.json
```

---

### 階段 4：混合訊息（6 分鐘）

執行測試組 L（3 個案例）：

**L1. 文字 + 圖片（都有關鍵字）**
```
步驟：
1. 發送文字：「我已經匯款了」
2. 發送圖片：包含「轉帳完成」

預期：兩筆獨立通知
```

**L2. 文字（無）+ 圖片（有）**
```
步驟：
1. 發送文字：「附上證明」
2. 發送圖片：包含「已轉帳 1000 元」

預期：只有圖片觸發
```

**L3. 文字（有）+ 圖片（無）**
```
步驟：
1. 發送文字：「我匯款 1500 元了」
2. 發送一般圖片

預期：只有文字觸發
```

---

### 階段 5：錯誤處理（4 分鐘）

執行測試組 M（4 個案例）：

**M1. OCR 未啟用**
```bash
# 修改 .env
OCR_PROVIDER=none

# 重啟服務
docker-compose restart

# 發送圖片
預期：日誌顯示「OCR 未啟用」
```

**M2. API Key 錯誤**
```bash
# 修改 .env
GOOGLE_VISION_API_KEY=wrong_key

# 重啟並測試
預期：日誌顯示「OCR 處理失敗」
```

**M3-M4. 特殊圖片**
- 發送極小圖片
- 發送損毀圖片

**恢復設定**：
```bash
# 測試完成後恢復正確設定
OCR_PROVIDER=google_vision
GOOGLE_VISION_API_KEY=correct_key

docker-compose restart
```

---

## 📊 測試結果記錄

### 方式 1：使用測試案例文檔

在 `OCR_TEST_CASES.md` 中記錄每個案例的實際結果。

### 方式 2：使用測試報告模板

複製並填寫 `OCR_TEST_REPORT_TEMPLATE.md`。

### 方式 3：查看系統記錄

```bash
# 匯款記錄（包含 OCR 辨識的文字）
cat src/data/remittance-records.json

# 語意過濾記錄
cat src/data/remittance-intent-log.json

# 伺服器日誌
docker logs flb-attendance-system --tail 200 > ocr-test-logs.txt
```

---

## 🔍 日誌監控與除錯

### 關鍵日誌訊息

**OCR 成功**：
```
🖼️ 收到圖片訊息
📝 OCR 辨識文字（截斷顯示）: 我已經匯款 1500 元
🔍 檢查匯款關鍵字: { hitKeywords: true, ... }
✅ 觸發匯款通知處理...
```

**OCR 失敗**：
```
❌ OCR 處理失敗: Invalid API key
⚠️ 無法取得圖片內容，OCR 取消
```

**無關鍵字**：
```
📝 OCR 辨識文字: 今天天氣很好
🔍 檢查匯款關鍵字: { hitKeywords: false }
⚠️ 收到圖片但未偵測到匯款關鍵字
```

**語意過濾**：
```
📝 OCR 辨識文字: 明天會匯款
🔍 檢查匯款關鍵字: { hitKeywords: true, intentAnalysis: { shouldDefer: true } }
⚠️ 匯款語意判斷為延後/詢問，暫不觸發通知
```

### 即時監控指令

```bash
# 全面監控
docker logs flb-attendance-system -f

# 只看 OCR 相關
docker logs flb-attendance-system -f | grep -E "OCR|辨識|image"

# 只看匯款相關
docker logs flb-attendance-system -f | grep -E "匯款|remittance"
```

---

## ✅ 測試驗證清單

### 功能驗證

- [ ] OCR 成功辨識清晰文字圖片
- [ ] OCR 成功辨識匯款截圖
- [ ] 辨識結果正確觸發匯款通知
- [ ] 金額解析正確
- [ ] 語意過濾機制正常運作
- [ ] 無關鍵字圖片不觸發通知
- [ ] 混合訊息正常處理

### 錯誤處理驗證

- [ ] OCR 未啟用時正常處理
- [ ] API Key 錯誤時不崩潰
- [ ] 網路錯誤時系統穩定
- [ ] 特殊圖片正常處理

### 效能驗證

- [ ] OCR 處理時間合理（< 5 秒）
- [ ] 系統資源使用正常
- [ ] 並發請求正常處理

---

## 🐛 常見問題排除

### Q1：OCR 一直顯示「未啟用」

**檢查**：
```bash
grep "OCR_PROVIDER" .env
# 應顯示：OCR_PROVIDER=google_vision

grep "GOOGLE_VISION_API_KEY" .env
# 應有 API Key
```

**解決**：
1. 確認 .env 設定正確
2. 重啟服務：`docker-compose restart`
3. 查看啟動日誌確認 OCR 已啟用

---

### Q2：OCR 處理失敗

**可能原因**：
1. API Key 錯誤或過期
2. 網路連線問題
3. Google Vision API 配額用完
4. 圖片格式不支援

**檢查方式**：
```bash
# 查看詳細錯誤訊息
docker logs flb-attendance-system | grep -A 5 "OCR 處理失敗"
```

**解決方法**：
1. 驗證 API Key 是否正確
2. 檢查網路連線
3. 查看 Google Cloud Console 配額使用情況
4. 嘗試不同格式的圖片

---

### Q3：辨識文字不正確

**可能原因**：
1. 圖片模糊或解析度低
2. 文字太小或字體特殊
3. 背景複雜干擾辨識

**改進方式**：
1. 使用高解析度圖片
2. 文字放大、字體清晰
3. 背景單純

---

### Q4：有關鍵字但不觸發

**檢查順序**：
1. 確認 OCR 有辨識到文字
2. 確認關鍵字在配置中
3. 檢查是否被語意過濾攔截

**檢查指令**：
```bash
# 查看完整處理流程
docker logs flb-attendance-system | grep -A 10 "OCR 辨識"
```

---

## 📈 API 配額管理

### 查看使用量

前往 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Dashboard

### 免費配額

- 每月 1,000 次免費請求
- 超過後：$1.50 / 1,000 次

### 測試建議

1. **重複使用測試圖片**：避免浪費配額
2. **本機快取**：開發時可考慮快取辨識結果
3. **監控用量**：定期檢查 Google Cloud Console

---

## 🚀 測試完成後

### 1. 填寫測試報告

在 `OCR_TEST_CASES.md` 或建立新的測試報告。

### 2. 更新配置（如需）

根據測試結果調整關鍵字或語意過濾規則。

### 3. 備份測試圖片

將有效的測試圖片保存，供未來回歸測試使用。

### 4. 記錄已知問題

在測試報告中記錄任何發現的問題或限制。

---

## 📚 相關文檔

- **測試案例**：`OCR_TEST_CASES.md`
- **功能說明**：`docs/features/REMITTANCE_CONFIRMATION.md`
- **配置指南**：`docs/guides/CONFIG_GUIDE.md`

---

**建立日期**：2025-11-21  
**最後更新**：2025-11-21
