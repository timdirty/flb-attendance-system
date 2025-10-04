# FLB 簽到系統（核心版）

> 精簡的 LINE Bot 簽到與出缺勤管理系統

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📖 系統簡介

FLB 簽到系統是一個基於 LINE Bot 的智能簽到管理系統，專注於核心功能：

### 核心功能
- ✅ LINE Webhook 處理
- ✅ 學生出缺勤查詢
- ✅ 講師簽到管理
- ✅ 學生簽到管理
- ✅ 用戶管理
- ✅ Rich Menu 管理
- ✅ 完整的配置系統

---

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
# 複製環境變數範例
cp env.example.txt .env
```

編輯 `.env` 填入必要資訊：

```env
# LINE Bot 設定（必填）
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_USER_ID=你的_管理員_User_ID

# 選填（使用預設值即可）
PORT=3000
```

### 3. 啟動系統

```bash
npm start
```

### 4. 驗證

訪問 `http://localhost:3000` 確認系統正常運行。

---

## 📱 LINE Bot 功能

### 使用關鍵字

| 關鍵字 | 功能 | 說明 |
|--------|------|------|
| `#查詢出缺勤` | 查詢出缺勤記錄 | 顯示個人的出席記錄和剩餘堂數 |
| `#內部人員` | 內部模式 | 綁定內部人員 Rich Menu |
| `#測試` | 測試模式 | 臨時解綁，5分鐘後自動重綁 |
| `#解綁` | 解除綁定 | 手動解除 Rich Menu |

### 功能展示

**出缺勤查詢** - 發送 `#查詢出缺勤`
- 📊 顯示學生基本資料
- 📈 顯示剩餘堂數（智能顏色警示）
- 📅 顯示最近 10 筆出席記錄
- 🎨 精美的 Flex Message 呈現

---

## 🔧 系統架構

### 檔案結構

```
FLB簽到系統（line）/
├── 📄 核心程式
│   ├── server.js                          # 主伺服器（精簡版）
│   ├── config.js                          # 配置管理系統
│   ├── teacher_mapping.js                 # 講師對應表
│   └── googleSheetsDatabaseWithLocal.js   # 資料庫管理
│
├── 💾 資料存儲
│   └── data/
│       ├── users.json                     # 使用者資料
│       ├── bindings.json                  # 綁定關係
│       └── sync_flag.json                 # 同步標記
│
├── 🌐 前端資源
│   └── public/
│       ├── index.html                     # 系統首頁
│       ├── admin.html                     # 管理介面
│       ├── webhook-test.html              # Webhook 測試
│       ├── script.js                      # 前端腳本
│       └── style.css                      # 樣式表
│
├── 📚 文檔
│   ├── README.md                          # 本檔案
│   ├── GETTING_STARTED.md                 # 快速開始指南
│   ├── CONFIG_GUIDE.md                    # 完整配置指南
│   ├── ATTENDANCE_QUERY_GUIDE.md          # 出缺勤功能說明
│   ├── QUICK_TEST_GUIDE.md                # 測試指南
│   └── API_DOCUMENTATION.md               # API 文檔
│
└── 🔧 配置檔
    ├── .env                               # 環境變數（自行創建）
    ├── env.example.txt                    # 環境變數範例
    ├── package.json                       # 專案設定
    └── flex-message-example.json          # Flex Message 範例
```

### 核心功能模組

1. **Webhook 處理** (`/webhook`)
   - 接收 LINE 訊息事件
   - 關鍵字檢測和處理
   - 自動用戶註冊

2. **簽到系統**
   - 講師簽到 (`/api/teacher-report`)
   - 學生簽到 (`/api/student-attendance`)
   - 課程學生查詢 (`/api/course-students`)

3. **用戶管理**
   - 用戶註冊 (`/api/register-user`)
   - 用戶查詢 (`/api/check-user`)
   - 用戶列表 (`/api/users`)

4. **講師管理**
   - 講師列表 (`/api/teachers`)
   - 講師課程 (`/api/teacher-courses`)
   - 講師綁定 (`/api/bind-teacher`)
   - 綁定狀態查詢 (`/api/check-teacher-binding`)

5. **Rich Menu 管理**
   - 綁定 Rich Menu
   - 解綁 Rich Menu
   - 內部人員 Rich Menu
   - 測試模式（自動重綁）

---

## ⚙️ 配置系統

### 可調整的參數

所有參數都集中在 `config.js` 和 `.env` 中：

#### 伺服器設定
```env
PORT=3000
SYSTEM_URL=http://localhost:3000
API_TIMEOUT=30000
```

#### LINE Bot 設定
```env
LINE_CHANNEL_ACCESS_TOKEN=你的權杖
LINE_USER_ID=管理員ID
RICH_MENU_ID=預設MenuID
INTERNAL_RICH_MENU_ID=內部人員MenuID
```

#### 功能開關
```env
FEATURE_ATTENDANCE_QUERY=true
FEATURE_INTERNAL_MODE=true
FEATURE_TEST_MODE=true
FEATURE_AUTO_REGISTER=true
```

#### 自訂關鍵字
```env
KEYWORD_ATTENDANCE_QUERY=#查詢出缺勤
KEYWORD_INTERNAL=#內部人員
KEYWORD_UNBIND=#解綁
KEYWORD_TEST=#測試
```

#### UI 客製化
```env
UI_PRIMARY_COLOR=#667EEA
UI_SUCCESS_COLOR=#06C755
UI_WARNING_COLOR=#FFB400
UI_DANGER_COLOR=#FF334B
UI_ATTENDANCE_LIMIT=10
UI_REMAINING_WARNING=5
```

**完整配置說明**：請參閱 [`CONFIG_GUIDE.md`](CONFIG_GUIDE.md)

---

## 📊 API 端點

### 核心 API

| 端點 | 方法 | 功能 |
|------|------|------|
| `/webhook` | POST | LINE Webhook 處理 |
| `/api/register-user` | POST | 用戶註冊 |
| `/api/check-user` | POST | 檢查用戶 |
| `/api/users` | GET | 獲取用戶列表 |
| `/api/teachers` | GET | 獲取講師列表 |
| `/api/teacher-courses` | POST | 獲取講師課程 |
| `/api/course-students` | POST | 獲取課程學生 |
| `/api/student-attendance` | POST | 學生簽到 |
| `/api/teacher-report` | POST | 講師報表 |
| `/api/bind-teacher` | POST | 講師綁定 |
| `/api/check-teacher-binding` | POST | 檢查綁定狀態 |

**詳細 API 說明**：請參閱 [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)

---

## 🔐 安全性

### 已實現的安全措施

- ✅ 環境變數管理敏感資訊
- ✅ LINE Webhook 簽名驗證（可配置）
- ✅ API 請求超時保護
- ✅ 速率限制（可配置）
- ✅ 錯誤處理和日誌記錄

### 安全最佳實踐

1. **不要**將 `.env` 提交到版本控制
2. **要**定期更換 Channel Access Token
3. **要**啟用 Webhook 簽名驗證
4. **要**設定合理的超時時間

---

## 🧪 測試

### 功能測試

1. **Webhook 測試**
   ```bash
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"events":[{"type":"message","message":{"type":"text","text":"#查詢出缺勤"},"source":{"userId":"測試ID"}}]}'
   ```

2. **網頁測試**
   - 訪問 `/webhook-test.html` 進行 Webhook 測試
   - 訪問 `/admin.html` 查看管理介面

3. **LINE 測試**
   - 在 LINE 中發送關鍵字測試功能

**完整測試指南**：請參閱 [`QUICK_TEST_GUIDE.md`](QUICK_TEST_GUIDE.md)

---

## 📝 版本記錄

### v2.0.0 (2025-09-30) - 核心版

#### ✨ 重大更新
- 🎯 精簡為核心功能版本
- 📦 移除冗餘功能和檔案
- 🔧 優化程式碼結構
- 📚 更新文檔系統

#### 核心功能
- ✅ LINE Webhook 處理
- ✅ 出缺勤查詢功能
- ✅ 講師簽到系統
- ✅ 學生簽到系統
- ✅ Rich Menu 管理
- ✅ 用戶管理系統

#### 配置系統
- ✅ 集中式配置管理
- ✅ 環境變數支援
- ✅ 功能開關
- ✅ 可自訂關鍵字
- ✅ UI 顏色客製化

#### 移除的功能
- ❌ NAS 部署相關
- ❌ Python 監控系統
- ❌ SDK 檔案
- ❌ 複雜的報表系統
- ❌ 測試頁面（僅保留核心）

---

## 📚 文檔導航

### 快速開始
- [5分鐘快速啟動](GETTING_STARTED.md)
- [配置指南](CONFIG_GUIDE.md)

### 功能說明
- [出缺勤查詢功能](ATTENDANCE_QUERY_GUIDE.md)
- [API 文檔](API_DOCUMENTATION.md)

### 測試
- [測試指南](QUICK_TEST_GUIDE.md)

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 開發流程
1. Fork 專案
2. 建立功能分支
3. 提交變更
4. 開啟 Pull Request

---

## 📄 授權

MIT License

---

## 👥 團隊

**開發**：FLB 開發團隊  
**版本**：2.0.0（核心版）  
**最後更新**：2025-09-30

---

## 📞 支援

遇到問題？

1. 📖 查閱文檔
2. 🔍 檢查配置
3. 📋 提交 Issue
4. 💬 聯繫團隊

---

<div align="center">

**FLB 簽到系統 - 簡單、強大、易用** 🎉

**[快速開始](GETTING_STARTED.md)** • **[配置指南](CONFIG_GUIDE.md)** • **[功能說明](ATTENDANCE_QUERY_GUIDE.md)**

Made with ❤️ by FLB Team

</div>