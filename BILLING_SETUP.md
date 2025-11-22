# 💳 Google Cloud 計費設定指南

## 📋 問題

API 金鑰測試時出現錯誤：

```
error: {
  code: 403,
  message: "This API method requires billing to be enabled",
  status: "PERMISSION_DENIED",
  reason: "BILLING_DISABLED"
}
```

**原因**：Google Vision API 需要啟用計費功能，即使在免費配額內也需要綁定信用卡。

---

## 💳 啟用計費（3 步驟）

### Step 1：前往計費頁面

**直接連結**（自動選擇專案）：
```
https://console.developers.google.com/billing/enable?project=853046882453
```

**或手動前往**：
```
https://console.cloud.google.com/billing?project=flb-system
```

---

### Step 2：設定計費帳戶

#### 情境 A：已有計費帳戶

1. 選擇現有的計費帳戶
2. 點擊「設定帳戶」
3. 確認連結

#### 情境 B：建立新計費帳戶

1. 點擊「建立計費帳戶」
2. 輸入帳戶名稱（例如：`FLB System Billing`）
3. 選擇國家/地區（台灣）
4. 輸入信用卡資訊：
   - 卡號
   - 到期日
   - CVV
5. 輸入帳單地址
6. 同意服務條款
7. 點擊「啟動免費試用」或「提交並啟用計費」

⚠️ **重要**：
- 需要有效的信用卡
- 台灣用戶可使用 VISA、Mastercard、JCB
- 信用卡僅用於身份驗證，免費配額內不會收費

---

### Step 3：等待生效

- ⏱️ 啟用後需等待 **5-10 分鐘**
- 🔄 期間可能仍看到 `BILLING_DISABLED` 錯誤
- ✅ 生效後即可正常使用

---

## 💰 費用說明

### 免費配額（每月）

Google Vision API TEXT_DETECTION 功能：

| 項目 | 免費額度 | 超出後費用 |
|------|---------|-----------|
| 文字辨識 | 前 1,000 次 | $1.50 USD / 1,000 次 |

### 實際使用估算

**本系統預估使用量**：

假設每天處理匯款截圖：
- 🔹 低使用量：每天 5 張 → 每月 150 次 → **免費** ✅
- 🔹 中使用量：每天 20 張 → 每月 600 次 → **免費** ✅
- 🔹 高使用量：每天 50 張 → 每月 1,500 次 → **約 $0.75 USD** 💵

**結論**：一般使用情況下，完全在免費額度內，不會產生費用。

### 查看使用量

前往 Google Cloud Console：
```
https://console.cloud.google.com/apis/api/vision.googleapis.com/metrics?project=flb-system
```

可查看：
- 每日請求次數
- 本月累計使用量
- 預估費用

---

## 🔔 設定預算警示（建議）

避免意外超支，建議設定預算警示：

### Step 1：前往預算頁面

```
https://console.cloud.google.com/billing/budgets?project=flb-system
```

### Step 2：建立預算

1. 點擊「建立預算」
2. **預算名稱**：`FLB Vision API Budget`
3. **專案**：選擇 `flb-system`
4. **服務**：選擇 `Cloud Vision API`（或選擇所有服務）
5. **預算金額**：
   - 類型：指定金額
   - 目標金額：`$5 USD`（或你希望的上限）
6. **警示閾值**：
   - 50%：$2.50 USD
   - 90%：$4.50 USD
   - 100%：$5.00 USD
7. 輸入通知 Email
8. 點擊「完成」

**效果**：達到閾值時會發送 Email 通知，但不會自動停止服務。

---

## ✅ 驗證計費已啟用

### 方法 1：執行測試腳本

```bash
./test-api-key.sh
```

**成功輸出**：
```
✅ API 測試成功！
📝 Google Vision API 可以正常使用
```

**失敗輸出**：
```
❌ API 測試失敗
💡 問題：計費未啟用
   前往：https://console.developers.google.com/billing/enable?project=853046882453
```

### 方法 2：手動測試

```bash
curl -s -X POST \
  "https://vision.googleapis.com/v1/images:annotate?key=AIzaSyDfYBGUCp1ixevg06acZCvWimwdqLKxh9Y" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "image": {
          "source": {
            "imageUri": "https://cloud.google.com/vision/docs/images/bicycle_example.png"
          }
        },
        "features": [{"type": "TEXT_DETECTION"}]
      }
    ]
  }' | python3 -m json.tool
```

**成功**：回應中包含 `"textAnnotations"`  
**失敗**：回應中包含 `"error"`

---

## 🔧 計費啟用後的後續步驟

### 1. 確認 API 可用

```bash
./test-api-key.sh
```

### 2. 在 NAS 上重啟容器

```bash
ssh ctctim14@nas的IP

cd ~/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）
sudo docker-compose restart
```

### 3. 測試 LINE 匯款偵測

1. 在 LINE 中發送匯款截圖
2. 查看日誌：
   ```bash
   sudo docker logs flb-line-bot --tail 50
   ```
3. 預期日誌：
   ```
   📝 OCR 辨識文字: 交易結果 轉帳成功 ...
   🔍 檢查匯款關鍵字: { ... hitKeywords: true ... }
   🎯 準備發送匯款提醒到群組...
   ```

---

## 🆘 常見問題

### Q1：啟用計費會馬上收費嗎？

**答**：不會。只要在免費配額內（每月 1,000 次），不會產生任何費用。

### Q2：如何關閉 API 以停止可能的收費？

**方法 1：停用 API**
```
https://console.cloud.google.com/apis/api/vision.googleapis.com?project=flb-system
```
點擊「停用 API」

**方法 2：刪除 API 金鑰**
```
https://console.cloud.google.com/apis/credentials?project=flb-system
```
找到 API 金鑰 → 點擊刪除

**方法 3：在系統中停用 OCR**

編輯 `.env`：
```bash
# 將 OCR_PROVIDER 設為 none
OCR_PROVIDER=none
```
然後重啟容器。

### Q3：信用卡資訊安全嗎？

**答**：是的。Google Cloud 使用業界標準的 PCI DSS 認證，信用卡資訊經過加密存儲。

### Q4：免費試用期結束後會怎樣？

Google Cloud 新用戶有 **$300 USD 的免費額度**（90 天內使用）。試用期結束後：
- 仍有每月 1,000 次的永久免費配額
- 超過才會收費
- 不會自動扣款，需要手動升級

### Q5：如何監控費用？

前往計費報表：
```
https://console.cloud.google.com/billing/reports?project=flb-system
```

可查看：
- 每日/每月費用
- 各項服務成本
- 趨勢分析

---

## 📚 相關資源

- **Google Cloud 計費文件**：https://cloud.google.com/billing/docs
- **Vision API 定價**：https://cloud.google.com/vision/pricing
- **免費配額說明**：https://cloud.google.com/free
- **本專案 OCR 設定**：`GOOGLE_VISION_SETUP.md`
- **權限錯誤修復**：`docs/troubleshooting/🔧OCR權限錯誤修復.md`

---

## 📝 檢查清單

完成計費設定後的檢查：

- [ ] 計費帳戶已建立並連結到專案
- [ ] 信用卡資訊已驗證
- [ ] 等待 5-10 分鐘讓設定生效
- [ ] 執行 `./test-api-key.sh` 測試成功
- [ ] （選填）設定預算警示
- [ ] 在 NAS 上重啟 Docker 容器
- [ ] LINE 測試匯款截圖辨識成功

---

**建立時間**：2025-11-22 16:13  
**專案 ID**：853046882453  
**API 金鑰**：AIzaSyDfYBGU...（已驗證有效）  
**狀態**：⏳ 待啟用計費  
**維護者**：Claude Code (AGENTS.md 規範)
