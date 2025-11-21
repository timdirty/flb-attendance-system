# 🧪 匯款文字功能測試執行指南

> **快速開始**：5-10 分鐘完成核心功能測試  
> **完整測試**：20-30 分鐘完成所有 28 個測試案例

---

## 📋 測試前準備

### 1. 環境檢查

執行以下指令確認環境配置：

```bash
# 進入專案目錄
cd /Users/apple/Library/CloudStorage/SynologyDrive-FLBTim/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）

# 檢查匯款相關設定
grep "REMITTANCE" .env
grep "ADMIN" .env

# 檢查伺服器狀態
docker ps | grep flb-attendance-system
```

### 2. 確認必要設定

**必須設定**：
```bash
# 方式 1：設定管理員 User ID
ADMIN_USER_IDS=Udb51363eb6fdc605a6a9816379a38103

# 或方式 2：設定管理員群組
REMITTANCE_GROUP_ID=your_group_id
```

**建議設定**：
```bash
# 匯款關鍵字（可自訂，預設已包含）
REMITTANCE_KEYWORDS=匯款,轉帳,轉帳完成,已轉,ATM

# 語意過濾（避免誤判）
REMITTANCE_POSTPONE_KEYWORDS=明天,明日,稍後,晚點,之後
REMITTANCE_NEGATIVE_KEYWORDS=還沒,尚未,未匯,暫不匯
REMITTANCE_INQUIRY_KEYWORDS=請問,如何匯,匯款方式,匯款資訊
REMITTANCE_QUESTION_INDICATORS=?,？,嗎,呢
REMITTANCE_DEFER_REPLY=👀 已收到您的訊息，完成匯款後請再通知，我們會立即處理 🙏
```

### 3. 啟動服務

```bash
# 方式 1：本機開發
npm run dev

# 方式 2：Docker
docker-compose up -d

# 查看日誌
docker logs flb-attendance-system -f
```

### 4. 準備測試工具

- ✅ LINE App（手機或桌面版）
- ✅ 測試案例文檔：`docs/testing/REMITTANCE_TEXT_TEST_CASES.md`
- ✅ 伺服器日誌視窗（用於監控）
- ✅ 記錄查看工具（查看 JSON 檔案）

---

## ⚡ 快速測試（5 分鐘）

### 核心功能驗證

#### 測試 1：基本匯款通知
```
📱 在 LINE 發送：「我已經轉帳 1500 元了」

✅ 檢查點：
1. Bot 回覆：「📄 已收到您的匯款資訊，將盡快為您確認。」
2. 管理員收到 Flex Message
3. 日誌顯示：「✅ 已發送匯款通知給管理員」
```

#### 測試 2：語意過濾
```
📱 在 LINE 發送：「明天處理匯款」

✅ 檢查點：
1. Bot 回覆：「👀 已收到您的訊息，完成匯款後請再通知...」
2. 管理員 **不會** 收到通知
3. 日誌顯示：「⚠️ 匯款語意判斷為延後/詢問，暫不觸發通知」
```

#### 測試 3：管理員確認
```
📱 管理員點擊：Flex Message 中的「✅ 已確認收款」

✅ 檢查點：
1. 管理員收到：「✅ 已回覆客戶，金額 NT$1,500」
2. 客戶收到：「✅ 已確認收到您的匯款：NT$1,500\n感謝！」
3. 記錄狀態更新為 confirmed
```

---

## 🎯 完整測試（20-30 分鐘）

### 步驟 1：測試基本關鍵字（5 個案例）

打開 `docs/testing/REMITTANCE_TEXT_TEST_CASES.md`，執行測試組 A：

```
A1. 發送：「我已經匯款了」
A2. 發送：「我已經轉帳 1500 元了」
A3. 發送：「轉帳完成」
A4. 發送：「已轉 NT$2000」
A5. 發送：「ATM 轉帳完成，金額 3000」
```

**記錄要點**：
- Bot 回覆是否正確
- 管理員是否收到通知
- 金額解析是否正確

### 步驟 2：測試金額解析（5 個案例）

執行測試組 B：

```
B1. 發送：「我匯款 1500」
B2. 發送：「已轉帳 NT$2000」
B3. 發送：「匯款 1,500 元」
B4. 發送：「轉帳 台幣 2000 元」
B5. 發送：「我已經匯款了」（無金額）
```

**檢查方式**：
```bash
# 查看最新的匯款記錄
cat src/data/remittance-records.json | tail -n 30
```

### 步驟 3：測試語意過濾（12 個案例）

執行測試組 C、D、E、F：

**C. 延後關鍵字**（3 個）：
```
C1. 發送：「明天處理匯款」
C2. 發送：「稍後匯款給你」
C3. 發送：「晚點轉帳 1500 元」
```

**D. 否定關鍵字**（3 個）：
```
D1. 發送：「還沒匯款」
D2. 發送：「尚未轉帳」
D3. 發送：「我未匯款」
```

**E. 詢問關鍵字**（3 個）：
```
E1. 發送：「請問如何匯款？」
E2. 發送：「匯款方式是什麼？」
E3. 發送：「如何匯款給你們？」
```

**F. 疑問標記**（3 個）：
```
F1. 發送：「我匯款了嗎?」
F2. 發送：「需要匯款嗎？」
F3. 發送：「可以匯款嗎」
```

**檢查方式**：
```bash
# 查看語意過濾記錄
cat src/data/remittance-intent-log.json
```

**預期**：這些訊息都應該觸發延後回覆，而不是匯款通知。

### 步驟 4：測試邊界案例（4 個案例）

執行測試組 G：

```
G1. 發送：「我已經付款了」（無關鍵字）
G2. 發送：（空白訊息）
G3. 發送：「明天我會匯款 1500 元」（關鍵字 + 過濾）
G4. 發送：「ATM轉帳完成」（無空格）
```

### 步驟 5：測試確認流程（2 個案例）

執行測試組 H：

```
H1. 正常確認流程
   - 發送：「我已經轉帳 1500 元了」
   - 管理員點擊確認按鈕
   - 檢查客戶是否收到確認訊息

H2. 重複確認
   - 在同一筆記錄上再次點擊確認
   - 應提示錯誤或已確認
```

---

## 📊 測試結果記錄

### 方式 1：直接在測試案例文檔中記錄

在 `docs/testing/REMITTANCE_TEXT_TEST_CASES.md` 的每個測試案例下方的「實際結果」欄位填寫。

### 方式 2：使用測試結果表格

| 測試 ID | 測試訊息 | 預期 | 實際 | 狀態 | 備註 |
|---------|----------|------|------|------|------|
| A1 | 我已經匯款了 | 觸發通知 |  |  |  |
| A2 | 我已經轉帳 1500 元了 | 觸發通知，金額 1500 |  |  |  |
| C1 | 明天處理匯款 | 延後回覆 |  |  |  |

### 方式 3：查看系統記錄

```bash
# 匯款記錄
cat src/data/remittance-records.json

# 語意過濾記錄
cat src/data/remittance-intent-log.json

# 伺服器日誌
docker logs flb-attendance-system --tail 100
```

---

## 🔍 日誌監控

### 關鍵日誌訊息

**成功觸發匯款通知**：
```
🔍 檢查匯款關鍵字: { hitKeywords: true, intentAnalysis: { shouldDefer: false } }
📤 發送匯款通知給 1 位管理員...
✅ 已發送匯款通知給管理員: Udb51363eb6fdc605a6a9816379a38103
```

**語意過濾延後**：
```
🔍 檢查匯款關鍵字: { hitKeywords: true, intentAnalysis: { shouldDefer: true, reason: 'postpone' } }
⚠️ 匯款語意判斷為延後/詢問，暫不觸發通知
```

**無關鍵字**：
```
🔍 檢查匯款關鍵字: { hitKeywords: false }
```

### 即時監控指令

```bash
# Docker 環境
docker logs flb-attendance-system -f | grep -E "匯款|remittance|REMITTANCE"

# 本機開發
# 日誌會直接顯示在終端
```

---

## ✅ 驗證清單

### 功能驗證

- [ ] 所有 5 個預設關鍵字都能觸發通知
- [ ] 金額解析正確（支援多種格式）
- [ ] 延後關鍵字正確過濾（不觸發通知）
- [ ] 否定關鍵字正確過濾
- [ ] 詢問關鍵字正確過濾
- [ ] 疑問標記正確過濾
- [ ] 管理員確認流程正常
- [ ] 客戶收到確認訊息

### 資料驗證

- [ ] `remittance-records.json` 正確記錄匯款
- [ ] `remittance-intent-log.json` 正確記錄語意過濾
- [ ] 記錄包含完整資訊（userId, displayName, amount, status 等）
- [ ] 確認後狀態更新為 `confirmed`
- [ ] 記錄 `confirmedBy` 和 `confirmedAt`

### 通知驗證

- [ ] 管理員收到 Flex Message
- [ ] Flex Message 內容正確（金額、用戶名稱、訊息）
- [ ] 客戶收到確認回覆
- [ ] 確認訊息包含正確金額

---

## 🐛 常見問題與排查

### Q1：管理員沒收到通知

**檢查清單**：
```bash
# 1. 檢查管理員 ID 設定
grep "ADMIN_USER_IDS" .env

# 2. 檢查日誌
docker logs flb-attendance-system | grep "管理員"

# 3. 檢查設定檔
cat src/data/admin-users.json
```

### Q2：語意過濾沒生效

**檢查清單**：
```bash
# 檢查語意過濾設定
grep "REMITTANCE_POSTPONE" .env
grep "REMITTANCE_NEGATIVE" .env
grep "REMITTANCE_INQUIRY" .env
```

### Q3：金額解析錯誤

**檢查方式**：
```bash
# 查看記錄中的 amount 欄位
cat src/data/remittance-records.json | grep -A 5 "amount"
```

### Q4：關鍵字沒觸發

**檢查清單**：
```bash
# 1. 檢查關鍵字設定
grep "REMITTANCE_KEYWORDS" .env

# 2. 查看日誌中的關鍵字檢查
docker logs flb-attendance-system | grep "檢查匯款關鍵字"
```

---

## 📝 測試報告範例

```
【匯款文字功能測試報告】

測試日期：2025-11-21
測試環境：Docker / NAS
測試執行者：Tim

測試結果統計：
- 總測試案例：28
- 通過：26
- 失敗：2
- 通過率：92.9%

失敗案例：
1. B3 - 逗號分隔金額解析失敗（「1,500」被解析為「1」）
2. H2 - 重複確認未顯示錯誤提示

改進建議：
1. 優化金額解析正則表達式，支援逗號分隔
2. 新增重複確認檢查與提示訊息

其他觀察：
- 語意過濾運作正常，有效避免誤判
- 管理員通知即時，延遲 < 1 秒
- 記錄檔案格式正確，易於追蹤
```

---

## 🚀 下一步

測試完成後：

1. ✅ 填寫測試報告
2. ✅ 更新 `REMITTANCE_TEXT_TEST_CASES.md` 的測試結果
3. ✅ 如有問題，記錄於「已知問題」區塊
4. ✅ 準備進行 OCR 圖片辨識測試（稍後）

---

**建立日期**：2025-11-21  
**最後更新**：2025-11-21
