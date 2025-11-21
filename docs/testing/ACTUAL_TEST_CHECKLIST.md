# ✅ 實際測試執行清單

**測試日期**：  
**測試執行者**：  
**測試環境**：□ 本機 □ Docker / NAS

---

## 📋 測試前準備（必須完成）

### ⚠️ 當前環境狀態（2025-11-21 20:00）

| 檢查項目 | 狀態 | 必須修正 |
|---------|------|----------|
| .env 檔案存在 | ✅ | - |
| 管理員設定 | ❌ | **是** |
| OCR 設定 | ⚠️ | 否（文字測試不需要） |
| 服務運行 | ❌ | **是** |
| 測試文檔 | ✅ | - |

---

## 🔧 Step 1：設定管理員（必須）

### 方式 1：使用設定檔（推薦）

**檔案**：`src/data/admin-users.json`

```json
[
  {
    "userId": "Udb51363eb6fdc605a6a9816379a38103",
    "name": "主要管理員",
    "enabled": true,
    "notificationTypes": ["remittance"]
  }
]
```

✅ **此檔案已存在，無需修改**

### 方式 2：使用環境變數

編輯 `.env`，加入：

```bash
ADMIN_USER_IDS=Udb51363eb6fdc605a6a9816379a38103
```

### 驗證設定

```bash
# 檢查設定檔
cat src/data/admin-users.json

# 或檢查環境變數
grep "ADMIN_USER_IDS" .env
```

**完成狀態**：□ 已完成

---

## 🚀 Step 2：啟動服務（必須）

### 選擇啟動方式

#### 方式 A：本機開發

```bash
# 進入專案目錄
cd "/Users/apple/Library/CloudStorage/SynologyDrive-FLBTim/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 啟動服務
npm run dev
```

#### 方式 B：Docker（推薦）

```bash
# 啟動 Docker Desktop

# 進入專案目錄
cd "/Users/apple/Library/CloudStorage/SynologyDrive-FLBTim/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 啟動容器
docker-compose up -d

# 查看狀態
docker ps | grep flb
```

### 驗證服務運行

```bash
# 查看日誌（Docker）
docker logs flb-attendance-system --tail 50

# 或查看程序（本機）
ps aux | grep "node.*server.js"
```

**應看到**：
```
🚀 FLB 簽到系統已啟動
📍 Server running on port 3000
```

**完成狀態**：□ 已完成

---

## 📱 Step 3：準備 LINE 測試環境

### 檢查清單

- [ ] LINE App 已安裝（手機或桌面版）
- [ ] 已加入測試用的 LINE Bot 為好友
- [ ] 確認可以發送訊息給 Bot
- [ ] 準備測試用文字（可從測試案例複製）

### 測試用文字範例

```
# 基本測試
我已經匯款了
我已經轉帳 1500 元了
ATM 轉帳完成

# 語意過濾測試
明天處理匯款
還沒匯款
請問如何匯款？
```

**完成狀態**：□ 已完成

---

## 🧪 開始測試

### 文字功能測試（28 個案例）

#### 快速測試（5 分鐘）

**目標**：驗證核心功能

| 測試 | 操作 | 預期結果 | 實際結果 | 狀態 |
|------|------|----------|----------|------|
| T1 | 發送「我已經匯款了」 | Bot 回覆確認 + 管理員收到通知 |  | □ |
| T2 | 發送「明天處理匯款」 | Bot 回覆延後訊息，不通知管理員 |  | □ |
| T3 | 發送「我已經付款了」 | 無回覆（無關鍵字） |  | □ |

#### 完整測試（20-30 分鐘）

參考 `docs/testing/REMITTANCE_TEXT_TEST_GUIDE.md` 執行全部 28 個案例。

**測試組 A-H 執行記錄**：

| 測試組 | 執行時間 | 通過數 | 失敗數 | 備註 |
|--------|---------|--------|--------|------|
| A. 基本關鍵字 (5) |  |  |  |  |
| B. 金額解析 (5) |  |  |  |  |
| C. 延後過濾 (3) |  |  |  |  |
| D. 否定過濾 (3) |  |  |  |  |
| E. 詢問過濾 (3) |  |  |  |  |
| F. 疑問過濾 (3) |  |  |  |  |
| G. 邊界案例 (4) |  |  |  |  |
| H. 確認流程 (2) |  |  |  |  |

---

### OCR 功能測試（22 個案例）

**前置條件**：需設定 Google Vision API Key

#### Step 1：設定 OCR（選填）

```bash
# 編輯 .env
OCR_PROVIDER=google_vision
GOOGLE_VISION_API_KEY=your_google_cloud_vision_api_key

# 重啟服務
docker-compose restart
```

#### Step 2：準備測試圖片

- [ ] 純文字圖片（5-10 張）
- [ ] 匯款截圖（ATM/網銀）
- [ ] 語意過濾測試圖片
- [ ] 錯誤測試圖片

#### Step 3：執行測試

參考 `docs/testing/OCR_TEST_GUIDE.md` 執行。

**測試組 I-M 執行記錄**：

| 測試組 | 執行時間 | 通過數 | 失敗數 | 備註 |
|--------|---------|--------|--------|------|
| I. OCR 基本功能 (5) |  |  |  |  |
| J. OCR + 關鍵字 (6) |  |  |  |  |
| K. OCR + 語意過濾 (4) |  |  |  |  |
| L. 混合訊息 (3) |  |  |  |  |
| M. OCR 錯誤處理 (4) |  |  |  |  |

---

## 📊 日誌監控

### 開啟日誌監控視窗

```bash
# Docker 環境
docker logs flb-attendance-system -f

# 或只看匯款相關
docker logs flb-attendance-system -f | grep -E "匯款|remittance|OCR"
```

### 關鍵日誌訊息

**成功觸發**：
```
🔍 檢查匯款關鍵字: { hitKeywords: true }
✅ 觸發匯款通知處理...
📤 發送匯款通知給 1 位管理員...
✅ 已發送匯款通知給管理員
```

**語意過濾**：
```
⚠️ 匯款語意判斷為延後/詢問，暫不觸發通知
```

**無關鍵字**：
```
🔍 檢查匯款關鍵字: { hitKeywords: false }
```

---

## 📝 測試結果記錄

### 查看系統記錄

```bash
# 匯款記錄
cat src/data/remittance-records.json

# 語意過濾記錄
cat src/data/remittance-intent-log.json

# 格式化查看（如有 jq）
cat src/data/remittance-records.json | jq '.'
```

### 記錄測試結果

**方式 1**：直接在測試案例文檔中記錄
- 編輯 `docs/testing/REMITTANCE_TEXT_TEST_CASES.md`
- 填寫「實際結果」欄位

**方式 2**：填寫測試報告
- 編輯 `docs/testing/REMITTANCE_TEST_REPORT.md`
- 記錄統計數據與問題

**方式 3**：使用本清單
- 在上方表格中記錄

---

## 🐛 問題排除

### Q1：管理員沒收到通知

**檢查步驟**：
```bash
# 1. 確認管理員 ID
cat src/data/admin-users.json

# 2. 查看日誌
docker logs flb-attendance-system | grep "管理員"

# 3. 確認服務已重啟
docker-compose restart
```

### Q2：Bot 沒有回應

**可能原因**：
1. 服務未運行
2. LINE Webhook 未設定
3. LINE Channel Access Token 錯誤

**檢查**：
```bash
# 查看伺服器日誌
docker logs flb-attendance-system --tail 100

# 確認服務運行
docker ps | grep flb
```

### Q3：關鍵字沒觸發

**檢查**：
```bash
# 查看關鍵字配置
grep "REMITTANCE_KEYWORDS" .env

# 查看處理日誌
docker logs flb-attendance-system | grep "檢查匯款關鍵字"
```

---

## ✅ 測試完成檢查

### 文字功能測試

- [ ] 執行了至少 3 個快速測試
- [ ] 所有基本關鍵字都能觸發
- [ ] 語意過濾正常運作
- [ ] 管理員確認流程正常
- [ ] 記錄檔案正確寫入

### OCR 功能測試（如有執行）

- [ ] OCR 成功辨識清晰文字
- [ ] 辨識結果正確觸發通知
- [ ] 語意過濾機制正常
- [ ] 錯誤處理正常

### 測試報告

- [ ] 已記錄測試結果
- [ ] 已記錄發現的問題
- [ ] 已備份測試日誌
- [ ] 已更新測試文檔

---

## 📚 測試資源

### 測試文檔
- `docs/testing/REMITTANCE_TEXT_TEST_GUIDE.md` - 文字測試指南
- `docs/testing/REMITTANCE_TEXT_TEST_CASES.md` - 28 個測試案例
- `docs/testing/OCR_TEST_GUIDE.md` - OCR 測試指南
- `docs/testing/OCR_TEST_CASES.md` - 22 個 OCR 案例

### 快速指令

```bash
# 環境檢查
./check-remittance-env.sh

# 啟動服務
docker-compose up -d

# 查看日誌
docker logs flb-attendance-system -f

# 查看記錄
cat src/data/remittance-records.json

# 停止服務
docker-compose down
```

---

## 🎯 測試總結

**測試完成時間**：  
**總測試案例**：  
**通過案例**：  
**失敗案例**：  
**通過率**：  

**主要發現**：


**需要改進**：


**下一步行動**：


---

**建立日期**：2025-11-21  
**測試執行者**：
