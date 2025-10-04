# FLB 簽到系統配置指南

## 📋 目錄

1. [快速開始](#快速開始)
2. [配置檔案說明](#配置檔案說明)
3. [環境變數設定](#環境變數設定)
4. [配置參數詳解](#配置參數詳解)
5. [常見配置範例](#常見配置範例)
6. [疑難排解](#疑難排解)

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製環境變數範例檔：

```bash
cp env.example.txt .env
```

編輯 `.env` 檔案，填入必要的配置：

```env
# 必填項目
LINE_CHANNEL_ACCESS_TOKEN=您的LINE頻道存取權杖
LINE_USER_ID=您的管理員UserId
```

### 3. 啟動伺服器

```bash
npm start
```

---

## 配置檔案說明

本系統使用兩種配置方式：

1. **`config.js`**：主要配置檔案，包含所有可調參數
2. **`.env`**：環境變數檔案，用於存放敏感資訊和環境特定配置

### 配置優先順序

環境變數（`.env`）> 配置檔預設值（`config.js`）

---

## 環境變數設定

### 必填環境變數

這些變數是系統運行的必要條件：

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot 頻道存取權杖 | `YOUR_TOKEN_HERE` |
| `LINE_USER_ID` | 管理員的 LINE User ID | `Uxxxxxxxxxxxxxxx` |

### 可選環境變數

| 類別 | 變數名稱 | 預設值 | 說明 |
|------|---------|--------|------|
| **伺服器** | `PORT` | `3000` | 伺服器端口 |
| | `SYSTEM_URL` | 自動偵測 | 系統網址 |
| | `API_TIMEOUT` | `30000` | API 超時時間(ms) |
| **LINE** | `RICH_MENU_ID` | 預設ID | Rich Menu ID |
| | `LINE_BATCH_DELAY` | `100` | 批次發送延遲(ms) |
| **API** | `FLB_API_URL` | 預設URL | FLB API 端點 |
| | `STUDENT_DATA_API_URL` | 預設URL | 學生資料 API |
| **UI** | `UI_PRIMARY_COLOR` | `#667EEA` | 主要顏色 |
| | `UI_ATTENDANCE_LIMIT` | `10` | 出席記錄顯示數量 |

### 功能開關

所有功能預設都是啟用的，可透過環境變數關閉：

```env
# 關閉出缺勤查詢功能
FEATURE_ATTENDANCE_QUERY=false

# 關閉測試模式
FEATURE_TEST_MODE=false
```

### 關鍵字自訂

可自訂各功能的觸發關鍵字：

```env
KEYWORD_INTERNAL=#內部人員
KEYWORD_UNBIND=#解綁
KEYWORD_TEST=#測試
KEYWORD_ATTENDANCE_QUERY=#查詢出缺勤
```

---

## 配置參數詳解

### 1. 伺服器配置 (`config.server`)

```javascript
{
  port: 3000,                    // 伺服器端口
  systemUrl: 'http://...',       // 系統網址
  timeout: {
    api: 30000,                  // API 請求超時
    line: 10000,                 // LINE API 超時
    webhook: 10000               // Webhook 超時
  }
}
```

**使用時機**：
- 更改伺服器端口：當預設端口被佔用時
- 調整超時時間：當 API 回應較慢時

### 2. LINE Bot 配置 (`config.line`)

```javascript
{
  channelAccessToken: '',        // 頻道存取權杖（必填）
  adminUserId: '',               // 管理員 User ID（必填）
  richMenu: {
    default: 'xxx',              // 預設 Rich Menu ID
    internal: 'yyy'              // 內部人員 Rich Menu ID
  },
  testMode: {
    duration: 300000,            // 測試模式持續時間（5分鐘）
    autoRebind: true             // 是否自動重新綁定
  }
}
```

**使用時機**：
- 設定不同的 Rich Menu：為不同用戶群組設定不同選單
- 調整測試模式時間：根據測試需求調整持續時間

### 3. API 端點配置 (`config.api`)

```javascript
{
  flb: 'https://...',            // FLB 主要 API
  linkCalendar: 'https://...',   // 行事曆 API
  report: 'https://...',         // 報表 API
  studentData: 'https://...',    // 學生資料 API
  studentAttendance: 'https://...' // 學生簽到 API
}
```

**使用時機**：
- API 更新：當 API 端點變更時
- 測試環境：切換到測試用的 API

### 4. 功能開關 (`config.features`)

```javascript
{
  attendanceQuery: true,         // 出缺勤查詢
  internalMode: true,            // 內部人員模式
  testMode: true,                // 測試模式
  teacherCheckin: true,          // 講師簽到
  studentCheckin: true,          // 學生簽到
  reports: true,                 // 報表功能
  autoRegister: true             // 自動註冊
}
```

**使用時機**：
- 維護時期：暫時關閉某些功能
- 分階段上線：逐步啟用新功能

### 5. UI 配置 (`config.ui`)

```javascript
{
  colors: {
    primary: '#667EEA',          // 主要色
    success: '#06C755',          // 成功色（綠）
    warning: '#FFB400',          // 警告色（黃）
    danger: '#FF334B',           // 危險色（紅）
    text: '#111111',             // 文字色
    textSecondary: '#8C8C8C',    // 次要文字色
    background: '#F7F7F7'        // 背景色
  },
  attendanceRecordLimit: 10,     // 出席記錄顯示數量
  remainingThreshold: {
    warning: 5,                  // 警告閾值
    danger: 0                    // 危險閾值
  }
}
```

**使用時機**：
- 品牌客製化：調整為品牌專屬色彩
- 調整顯示數量：根據介面需求調整記錄數量

### 6. 安全配置 (`config.security`)

```javascript
{
  verifySignature: true,         // 驗證 Webhook 簽名
  allowedIPs: [],                // 允許的 IP 清單
  rateLimit: {
    enabled: true,               // 啟用速率限制
    windowMs: 60000,             // 時間窗口（1分鐘）
    max: 100                     // 最大請求數
  }
}
```

**使用時機**：
- 提升安全性：限制特定 IP 存取
- 防止濫用：設定 API 呼叫限制

---

## 常見配置範例

### 範例 1：開發環境配置

```env
# .env（開發環境）
NODE_ENV=development
DEV_MOCK_MODE=true
LOG_LEVEL=debug
LOG_VERBOSE=true

PORT=3000
SYSTEM_URL=http://localhost:3000

LINE_CHANNEL_ACCESS_TOKEN=測試權杖
LINE_USER_ID=測試UserId
```

**說明**：
- 啟用模擬模式，不實際發送 LINE 訊息
- 詳細日誌輸出，方便除錯
- 使用本地網址

### 範例 2：生產環境配置

```env
# .env（生產環境）
NODE_ENV=production
LOG_LEVEL=info
LOG_VERBOSE=false

# Railway 會自動設定
RAILWAY_PUBLIC_DOMAIN=your-app.railway.app

LINE_CHANNEL_ACCESS_TOKEN=正式權杖
LINE_USER_ID=正式UserId

# 安全設定
SECURITY_VERIFY_SIGNATURE=true
SECURITY_RATE_LIMIT=true
```

**說明**：
- 關閉詳細日誌，減少輸出
- 啟用安全驗證和速率限制
- 使用正式的 LINE 權杖

### 範例 3：自訂品牌色彩

```env
# .env（品牌客製化）
UI_PRIMARY_COLOR=#1E88E5
UI_SUCCESS_COLOR=#43A047
UI_WARNING_COLOR=#FFA726
UI_DANGER_COLOR=#E53935
```

**說明**：
- 調整為公司品牌色系
- Flex Message 會自動使用新的顏色

### 範例 4：自訂關鍵字（多語言）

```env
# .env（英文版）
KEYWORD_INTERNAL=#internal
KEYWORD_UNBIND=#unbind
KEYWORD_TEST=#test
KEYWORD_ATTENDANCE_QUERY=#check-attendance
```

**說明**：
- 可將關鍵字改為英文或其他語言
- 適合國際化需求

### 範例 5：調整效能參數

```env
# .env（高流量環境）
API_TIMEOUT=60000
LINE_TIMEOUT=15000
WEBHOOK_TIMEOUT=15000

SECURITY_RATE_LIMIT_WINDOW=60000
SECURITY_RATE_LIMIT_MAX=500

LINE_BATCH_DELAY=50
```

**說明**：
- 增加超時時間，適應網路較慢的環境
- 提高速率限制，支援更多併發請求
- 減少批次延遲，提升發送速度

---

## 疑難排解

### Q1：啟動時顯示「LINE_CHANNEL_ACCESS_TOKEN 未設定」

**原因**：未正確設定環境變數

**解決方法**：
1. 確認 `.env` 檔案存在於專案根目錄
2. 檢查 `.env` 檔案中是否有 `LINE_CHANNEL_ACCESS_TOKEN=...`
3. 確認權杖沒有多餘的空格或引號

### Q2：配置沒有生效

**原因**：可能需要重啟伺服器

**解決方法**：
```bash
# 停止伺服器（Ctrl+C）
# 重新啟動
npm start
```

### Q3：如何查看當前配置？

**方法 1**：查看啟動日誌

啟動時會自動顯示配置摘要：

```
📋 系統配置摘要:
==================================================
🌐 伺服器端口: 3000
🔗 系統 URL: http://localhost:3000
🤖 LINE Bot: ✅ 已配置
👤 管理員 ID: ✅ 已設定
📊 資料庫類型: google-sheets
🔧 開發模式: ✅ 啟用
🧪 模擬模式: ❌ 停用
==================================================
```

**方法 2**：使用 Node.js 檢查

```bash
node -e "const config = require('./config'); console.log(JSON.stringify(config, null, 2))"
```

### Q4：顏色設定沒有改變

**可能原因**：
1. 顏色格式錯誤（需使用 Hex 格式，如 `#667EEA`）
2. 快取問題

**解決方法**：
```bash
# 清除 Node.js 快取
rm -rf node_modules/.cache

# 重新啟動
npm start
```

### Q5：關鍵字不起作用

**檢查清單**：
- [ ] 確認功能開關已啟用（如 `FEATURE_ATTENDANCE_QUERY=true`）
- [ ] 確認關鍵字設定正確（完全匹配，包括大小寫）
- [ ] 檢查 Webhook 是否正常接收訊息
- [ ] 查看伺服器日誌是否有錯誤訊息

---

## 配置最佳實踐

### 1. 安全性

❌ **不要**：
- 將 `.env` 檔案提交到 Git
- 在程式碼中硬編碼敏感資訊
- 使用過於簡單的管理員 ID

✅ **要**：
- 將 `.env` 加入 `.gitignore`
- 使用環境變數存放敏感資訊
- 定期更換 Access Token

### 2. 可維護性

❌ **不要**：
- 直接修改 `config.js` 的預設值
- 在多個地方重複配置

✅ **要**：
- 透過 `.env` 覆寫設定
- 集中管理所有配置
- 為配置添加註解說明

### 3. 效能

❌ **不要**：
- 設定過短的超時時間
- 設定過高的速率限制

✅ **要**：
- 根據實際情況調整超時
- 合理設定速率限制
- 監控系統效能指標

---

## 配置檔案結構

```
專案根目錄/
├── config.js              # 主要配置檔（不要直接修改預設值）
├── .env                   # 環境變數檔（不要提交到 Git）
├── env.example.txt        # 環境變數範例
├── server.js              # 主程式（使用配置）
├── package.json           # 專案設定
└── CONFIG_GUIDE.md        # 本說明文件
```

---

## 進階配置

### 自訂配置驗證

在 `config.js` 中，系統會自動驗證配置：

```javascript
function validateConfig() {
    const errors = [];
    
    // 加入自訂驗證邏輯
    if (!config.line.channelAccessToken) {
        errors.push('LINE_CHANNEL_ACCESS_TOKEN 未設定');
    }
    
    return errors;
}
```

### 動態配置載入

配置會在系統啟動時載入，如需動態更新：

```javascript
// 重新載入配置（需重啟伺服器）
delete require.cache[require.resolve('./config')];
const newConfig = require('./config');
```

---

## 相關資源

- [LINE Messaging API 文件](https://developers.line.biz/zh-hant/docs/messaging-api/)
- [環境變數最佳實踐](https://12factor.net/zh_cn/config)
- [Node.js 配置管理](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

---

**最後更新**：2025-09-30  
**版本**：1.0.0  
**維護者**：FLB 開發團隊

如有任何問題或建議，歡迎提交 Issue 或聯繫開發團隊。
