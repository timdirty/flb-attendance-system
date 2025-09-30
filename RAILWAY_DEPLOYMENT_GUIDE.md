# 🚀 Railway 部署指南 - Web 設定系統

## ✅ 部署狀態

**Git 提交記錄**：
```
✅ Commit 1: b030637 - 新增 Web 設定系統
   - 新增設定頁面 (HTML/CSS/JS)
   - 新增配置管理器 (config-manager.js)
   - 新增設定 API (settings-api.js)
   - 新增完整文檔 (5 個 MD 文件)

✅ Commit 2: 9c7898f - 整合設定系統
   - 更新 server.js 路由
   - 新增設定頁面入口
   - 更新首頁樣式

✅ 推送到 GitHub: 完成
   Repository: github.com:timdirty/flb-attendance-system.git
   Branch: main
```

---

## 🌐 Railway 自動部署

您的 Railway 專案會自動偵測到 Git 推送並開始部署：

**Railway 專案資訊**：
- 專案 ID: `03d500c8-66cc-48a6-9e07-b5eb29b61913`
- 服務 ID: `83e4c777-b44c-40d3-bbb1-7d2fdb114124`
- 環境 ID: `e9a493c1-d31e-442c-83d8-d4c49cf46a7a`
- 專案 URL: https://railway.com/project/03d500c8-66cc-48a6-9e07-b5eb29b61913

---

## 📋 部署檢查清單

### 1. 檢查部署狀態
前往 Railway 專案頁面查看部署進度：
```
https://railway.com/project/03d500c8-66cc-48a6-9e07-b5eb29b61913/service/83e4c777-b44c-40d3-bbb1-7d2fdb114124?environmentId=e9a493c1-d31e-442c-83d8-d4c49cf46a7a
```

應該會看到：
- ✅ 正在構建（Building）
- ✅ 正在部署（Deploying）
- ✅ 部署成功（Running）

### 2. 設定環境變數

⚠️ **重要**：在 Railway 控制台設定以下環境變數：

#### 必要變數
```bash
LINE_CHANNEL_ACCESS_TOKEN=你的 Bot 1 Token
LINE_CHANNEL_SECRET=你的 Bot 1 Secret
LINE_USER_ID=你的管理員 User ID
```

#### 選填變數（啟用雙 Bot 節省費用）
```bash
LINE_BOT_2_ENABLED=true
LINE_CHANNEL_ACCESS_TOKEN_2=你的 Bot 2 Token
LINE_CHANNEL_SECRET_2=你的 Bot 2 Secret

# 負載平衡設定
LINE_LOAD_BALANCING=true
LINE_LOAD_BALANCING_STRATEGY=round_robin
LINE_FALLBACK_TO_PRIMARY=true
LINE_BATCH_DELAY=100
LINE_MAX_RETRIES=3
```

**設定方式**：
1. 進入 Railway 專案
2. 點擊您的服務
3. 前往 "Variables" 頁籤
4. 點擊 "New Variable"
5. 輸入變數名稱和值
6. 點擊 "Add"
7. 儲存後系統會自動重新部署

### 3. 取得系統 URL

部署完成後，Railway 會提供一個 URL，格式類似：
```
https://your-app-name.railway.app
```

或者使用自訂網域（如已設定）。

### 4. 訪問設定頁面

部署完成後，您可以通過以下方式訪問設定頁面：

**方法 1**：直接訪問
```
https://your-app-name.railway.app/settings
```

**方法 2**：從首頁訪問
```
https://your-app-name.railway.app/
點擊右上角的齒輪圖示 🔧
```

### 5. 首次配置

1. **訪問設定頁面**
   ```
   https://your-app-name.railway.app/settings
   ```

2. **配置 Bot 1**（必填）
   - 填入 Channel Access Token
   - 填入 Channel Secret
   - 填入管理員 LINE User ID
   - 填入 Rich Menu ID（可選）

3. **配置 Bot 2**（選填，節省費用）
   - 勾選「啟用 Bot 2」
   - 填入 Bot 2 資訊
   - 啟用負載平衡
   - 選擇策略：輪詢 (Round Robin)

4. **測試連線**
   - 點擊「🔌 測試連線」按鈕
   - 確認所有 Bot 顯示「成功」

5. **儲存設定**
   - 點擊「💾 儲存所有設定」
   - 等待成功訊息

6. **重新部署**（如需要）
   - 在 Railway 控制台手動觸發重新部署
   - 或等待系統自動重啟

---

## 🔧 Railway 專用配置

### 環境變數優先順序

Railway 上的配置優先順序：
1. **Railway 環境變數**（最高優先級）
2. **Web 設定頁面儲存的 .env**（次優先）
3. **config.js 預設值**（最低優先）

**建議**：
- 敏感資訊（Token、Secret）使用 Railway 環境變數
- 功能開關使用 Web 設定頁面
- 預設值使用 config.js

### 持久化存儲

⚠️ **注意**：Railway 預設使用臨時文件系統，每次部署會重置。

**解決方案**：

1. **方案 A**：使用 Railway 環境變數（推薦）
   - 所有配置設定在 Railway Variables
   - 不依賴 .env 文件
   - 自動持久化

2. **方案 B**：掛載 Volume（進階）
   - 在 Railway 設定 Volume
   - 掛載到 `/data` 或 `/app/data`
   - 配置文件會永久保存

### 自動部署流程

Railway 會在以下情況自動部署：

1. ✅ Git push 到 main 分支
2. ✅ 環境變數變更
3. ✅ 手動觸發重新部署

**部署流程**：
```
GitHub Push
    ↓
Railway 偵測到變更
    ↓
下載最新代碼
    ↓
安裝依賴 (npm install)
    ↓
啟動應用 (npm start)
    ↓
健康檢查
    ↓
部署成功 ✅
```

---

## 📊 部署後檢查

### 1. 檢查系統健康狀態

訪問首頁確認系統運行：
```bash
curl https://your-app-name.railway.app/
```

應該返回 HTML 內容。

### 2. 檢查設定 API

測試設定 API 端點：
```bash
# 測試連線
curl https://your-app-name.railway.app/api/settings/test

# 讀取配置
curl https://your-app-name.railway.app/api/settings
```

### 3. 查看日誌

在 Railway 控制台查看應用日誌：

1. 進入專案
2. 點擊服務
3. 前往 "Deployments"
4. 點擊最新部署
5. 查看 "Logs"

應該能看到：
```
📋 系統配置摘要:
==================================================
🌐 伺服器端口: 3000
🔗 系統 URL: https://your-app-name.railway.app
🤖 LINE Bot: ✅ 已配置
👤 管理員 ID: ✅ 已設定
==================================================
```

---

## 🔥 常見問題

### Q1: 部署後設定頁面打不開？

**原因**：可能是環境變數未設定或代碼未正確部署

**解決**：
1. 檢查 Railway 日誌有無錯誤
2. 確認環境變數已設定
3. 手動觸發重新部署

### Q2: 儲存設定後沒有生效？

**原因**：Railway 使用臨時文件系統

**解決**：
1. 使用 Railway 環境變數（推薦）
2. 設定 Volume 持久化存儲
3. 每次儲存後手動重啟服務

### Q3: 雙 Bot 負載平衡不工作？

**原因**：環境變數未正確設定

**解決**：
1. 確認 Railway 環境變數：
   ```
   LINE_BOT_2_ENABLED=true
   LINE_CHANNEL_ACCESS_TOKEN_2=實際 Token
   LINE_LOAD_BALANCING=true
   ```
2. 重新部署服務
3. 查看日誌確認 Bot 2 已啟用

### Q4: 如何更新配置？

**方法 1**：使用 Web 界面（推薦）
1. 訪問 `/settings`
2. 修改參數
3. 儲存設定
4. 在 Railway 手動重新部署

**方法 2**：直接修改環境變數
1. 在 Railway Variables 中修改
2. 系統自動重新部署

---

## 🎯 最佳實踐

### 1. 環境變數管理

✅ **推薦做法**：
```
# Railway Variables (敏感資訊)
LINE_CHANNEL_ACCESS_TOKEN=實際 Token
LINE_CHANNEL_SECRET=實際 Secret
LINE_USER_ID=實際 User ID

# Web 設定頁面 (功能開關)
負載平衡策略
批次延遲
最大重試次數
功能開關
```

### 2. 配置備份

定期備份配置：

1. **方法 1**：匯出配置
   ```
   訪問：/api/settings/export
   下載 JSON 文件
   ```

2. **方法 2**：截圖記錄
   - 設定頁面截圖
   - Railway Variables 截圖

### 3. 監控和維護

- ✅ 定期檢查 Railway 日誌
- ✅ 監控 Bot 訊息發送量
- ✅ 追蹤 API 使用費用
- ✅ 測試負載平衡效果

---

## 🚀 快速開始命令

```bash
# 1. 推送代碼到 GitHub（已完成）
git push origin main

# 2. Railway 自動部署（自動進行）
# 等待 2-5 分鐘

# 3. 取得部署 URL
# 在 Railway 控制台查看

# 4. 訪問設定頁面
# https://your-app-name.railway.app/settings

# 5. 配置系統
# 填入 Bot 資訊 → 測試連線 → 儲存

# 6. 完成！
```

---

## 📞 需要幫助？

如果遇到任何問題：

1. 📖 查看 Railway 日誌
2. 🔍 檢查環境變數設定
3. 📝 參考文檔：
   - `SETTINGS_QUICKSTART.md` - 快速開始
   - `SETTINGS_GUIDE.md` - 完整指南
   - `SETTINGS_CHEATSHEET.md` - 速查表

---

## 🎊 部署完成

**恭喜！您的 FLB 簽到系統已成功部署到 Railway！**

現在您可以：
- ✅ 透過 Web 界面管理所有配置
- ✅ 使用雙 Bot 節省 LINE API 費用
- ✅ 隨時調整系統參數
- ✅ 一鍵測試連線狀態

**立即體驗**：
```
🌐 系統首頁：https://your-app-name.railway.app/
⚙️ 設定頁面：https://your-app-name.railway.app/settings
```

---

**部署日期**：2025-09-30  
**Railway 專案**：https://railway.com/project/03d500c8-66cc-48a6-9e07-b5eb29b61913  
**版本**：1.0.0
