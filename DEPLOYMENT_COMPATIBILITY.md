# 部署兼容性說明

## 📋 多環境支援設計

本系統設計為**同時支援多種部署環境**，無需修改代碼：

### 支援的部署環境

- ✅ **Railway** - PaaS 雲端平台
- ✅ **Synology NAS** - 本地伺服器（Docker）
- ✅ **其他 Node.js 環境** - VPS、傳統主機等

---

## 🔧 配置讀取優先順序

系統採用**三層配置優先順序**，確保在任何環境都能正常運作：

```
1. 環境變數（process.env）      ← Railway、Docker 優先使用
   ↓ 如果沒有
2. .env 文件                     ← NAS、本地開發優先使用
   ↓ 如果也沒有
3. 預設值（硬編碼）              ← 保底，確保系統能啟動
```

### 程式碼實現（settings-api.js）

```javascript
const config = {
    LINE_CHANNEL_ACCESS_TOKEN: 
        process.env.LINE_CHANNEL_ACCESS_TOKEN  // 環境變數
        || envConfig.LINE_CHANNEL_ACCESS_TOKEN // .env 文件
        || '',                                  // 預設值
    // ... 其他配置項目
};
```

---

## 🚀 Railway 部署

### 配置方式

**主要使用**：Railway Variables（環境變數）

**操作步驟**：
1. 前往 Railway 專案 → Settings → Variables
2. 添加環境變數：
   ```
   LINE_CHANNEL_ACCESS_TOKEN=實際值
   LINE_CHANNEL_SECRET=實際值
   LINE_USER_ID=實際值
   ```
3. 儲存後自動重新部署

**特點**：
- ✅ 自動持久化（不會因部署而丟失）
- ✅ 支援即時更新
- ✅ 安全（不會進入版本控制）

**配置流程**：
```
Railway Variables
    ↓
process.env.XXX
    ↓
settings-api.js 讀取並返回
    ↓
Web 設定頁面顯示
```

---

## 🏠 NAS 部署（Synology DSM）

### 配置方式

**主要使用**：`.env` 文件

**操作步驟**：
1. 在專案根目錄建立 `.env` 文件
2. 填入配置：
   ```env
   LINE_CHANNEL_ACCESS_TOKEN=實際值
   LINE_CHANNEL_SECRET=實際值
   LINE_USER_ID=實際值
   ```
3. 使用 Docker Compose 或直接啟動

**特點**：
- ✅ 持久化（檔案存在 NAS 上）
- ✅ 易於備份和還原
- ✅ 支援 Docker volume 掛載

**配置流程**：
```
.env 文件（NAS 磁碟）
    ↓
dotenv 載入到 process.env
    ↓
configManager.readConfig() 讀取
    ↓
settings-api.js 合併並返回
    ↓
Web 設定頁面顯示
```

### Docker Compose 範例

```yaml
version: '3.8'
services:
  flb-attendance:
    image: node:18
    working_dir: /app
    volumes:
      - .:/app
      - ./data:/app/data  # 持久化資料
    environment:
      - NODE_ENV=production
    env_file:
      - .env  # 從 .env 文件載入環境變數
    ports:
      - "3000:3000"
    command: npm start
```

---

## 🧪 本地開發

### 配置方式

**主要使用**：`.env` 文件

**操作步驟**：
1. 複製 `.env.example` 為 `.env`
2. 填入開發用的配置
3. 執行 `npm start`

**特點**：
- ✅ 快速設定
- ✅ 不會提交到版本控制（.gitignore）
- ✅ 可以使用測試用的 Token

---

## ⚠️ 重要：維護兼容性的注意事項

### ❌ 不要做的事

1. **不要只依賴環境變數**
   ```javascript
   // ❌ 錯誤：只讀環境變數，NAS 上會失效
   const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
   ```

2. **不要只依賴 .env 文件**
   ```javascript
   // ❌ 錯誤：只讀 .env，Railway 上會失效
   const token = envConfig.LINE_CHANNEL_ACCESS_TOKEN;
   ```

3. **不要硬編碼配置**
   ```javascript
   // ❌ 錯誤：硬編碼，無法在不同環境使用
   const token = 'xxxxxxxxxxxxx';
   ```

### ✅ 應該做的事

1. **使用三層優先順序**
   ```javascript
   // ✅ 正確：同時支援所有環境
   const token = process.env.LINE_CHANNEL_ACCESS_TOKEN 
       || envConfig.LINE_CHANNEL_ACCESS_TOKEN 
       || '';
   ```

2. **提供合理的預設值**
   ```javascript
   // ✅ 正確：即使沒有配置也能啟動
   const port = process.env.PORT || 3000;
   const logLevel = process.env.LOG_LEVEL || 'info';
   ```

3. **保持 .env.example 更新**
   - 每次新增環境變數都要更新範本
   - 提供說明和預設值

---

## 🧩 配置項目對照表

| 環境變數名稱 | Railway | NAS (.env) | 預設值 | 說明 |
|-------------|---------|------------|--------|------|
| LINE_CHANNEL_ACCESS_TOKEN | ✅ 必須 | ✅ 必須 | - | Bot 1 Token |
| LINE_CHANNEL_SECRET | ✅ 必須 | ✅ 必須 | - | Bot 1 Secret |
| LINE_USER_ID | ✅ 必須 | ✅ 必須 | - | 管理員 ID |
| LINE_BOT_2_ENABLED | ⭕ 選填 | ⭕ 選填 | false | 啟用 Bot 2 |
| LINE_LOAD_BALANCING | ⭕ 選填 | ⭕ 選填 | false | 負載平衡 |
| GOOGLE_SHEETS_API | ⭕ 選填 | ⭕ 選填 | 預設 URL | API 端點 |
| PORT | ✅ 自動 | ⭕ 選填 | 3000 | 服務端口 |

---

## 🔄 遷移指南

### 從 Railway 遷移到 NAS

1. **匯出 Railway 環境變數**
   - 在 Railway Variables 複製所有變數

2. **建立 .env 文件**
   ```bash
   cd /path/to/app
   nano .env
   # 貼上從 Railway 複製的變數
   ```

3. **測試啟動**
   ```bash
   npm start
   # 檢查是否正常讀取配置
   ```

### 從 NAS 遷移到 Railway

1. **讀取 .env 文件內容**
   ```bash
   cat .env
   ```

2. **在 Railway Variables 設定**
   - 將 .env 的每一行添加到 Railway Variables

3. **推送代碼並部署**
   ```bash
   git push origin main
   ```

---

## ✅ 兼容性測試清單

部署到新環境時，請確認以下項目：

### 基礎測試
- [ ] 系統能正常啟動
- [ ] 訪問首頁顯示正常
- [ ] 訪問 `/settings` 頁面正常
- [ ] API `/api/settings` 返回配置

### 配置測試
- [ ] LINE Bot Token 正確讀取
- [ ] Google Sheets API URL 正確
- [ ] 功能開關狀態正確
- [ ] UI 色彩配置正確

### 功能測試
- [ ] LINE Bot 訊息發送正常
- [ ] 資料庫讀寫正常
- [ ] Web 設定頁面儲存功能正常
- [ ] 雙 Bot 負載平衡正常（如啟用）

---

## 📞 問題排查

### 問題：配置沒有載入

**檢查順序**：

1. **檢查環境變數**
   ```bash
   # Railway: 在控制台 Variables 檢查
   # NAS: 
   printenv | grep LINE_
   ```

2. **檢查 .env 文件**
   ```bash
   cat .env
   # 確認檔案存在且格式正確
   ```

3. **檢查日誌**
   ```bash
   # 啟動時應該顯示配置摘要
   npm start
   # 查看是否有 "配置讀取成功" 訊息
   ```

### 問題：Railway 和 NAS 行為不一致

**可能原因**：
- 環境變數名稱不一致
- .env 文件格式錯誤
- 版本不同步

**解決方法**：
1. 確認兩邊的配置值一致
2. 檢查代碼版本相同
3. 查看日誌比對差異

---

## 🎯 總結

### 核心原則

**「一份代碼，多處部署」**

本系統的配置系統設計確保：
- ✅ 同一份代碼可以在 Railway、NAS、本地開發環境運行
- ✅ 無需修改代碼，只需調整配置
- ✅ 配置有多層後援，確保穩定性
- ✅ 支援從一個環境遷移到另一個環境

### 維護建議

1. **新增配置時**
   - 同時支援環境變數和 .env
   - 提供合理預設值
   - 更新此文檔

2. **測試時**
   - 在多個環境測試
   - 確認配置正確讀取
   - 驗證功能正常

3. **部署時**
   - 檢查兼容性清單
   - 備份現有配置
   - 逐步遷移驗證

---

**最後更新**：2025-09-30  
**兼容性版本**：1.0.0  
**測試環境**：Railway ✅ | Synology NAS ✅ | 本地開發 ✅
