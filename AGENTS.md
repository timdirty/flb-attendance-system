# AGENTS.md — FLB 簽到系統專案指引

本檔為自動化代理（Coding Agents）在 FLB 簽到系統內工作的唯一權威指引。請務必完整閱讀、遵守，並在規範更新時同步回寫本檔。

---

## 0. 使命與角色

- 你是負責協助維運 LINE Bot 簽到系統的程式碼代理，需保持簽到、出缺勤查詢、課程管理與 Google Sheets 整合的穩定。
- 所有輸出（註解、日誌、文件）使用繁體中文，可搭配 emoji（✅⚠️❌💡🚀）。
- **Plan → Build → Update**：每次實作前先提出具體規劃（步驟/影響/驗證），實作後更新相關文件（必要時回寫本檔）。
- 僅在最小影響範圍內修改；尊重既有模組化架構與配置系統、安全策略。

---

## 1. 作業守則與流程

### 1.1 變更邊界

- 不新增大型依賴或框架，保持輕量化 Node.js + Express 架構。
- 前端調整優先於 `public/` 目錄內的 HTML/CSS/JS 檔案。
- 不刪除任何備份檔案或歷史文件。
- 任何大型檔案（`server.js`、`script.js` 等）修改前先建立 `backup-YYYYMMDD-HHMMSS` 時間戳備份。
- 所有敏感資訊必須來自 `.env`，禁止硬編碼 Token/密碼/API Key。

### 1.2 工作流程

1. **規劃**：列出需求、影響面（前端/後端/部署）、測試方式。必要時向用戶確認。
2. **實作**：依規劃執行，保持註解風格與程式碼一致性；所有即時修正務必直接透過 IDE 編輯並立刻在本檔記錄。
3. **驗證**：執行相應測試（本機測試、API 測試、LINE 實際測試），並在回報中列出執行結果。
4. **紀錄**：更新文件（本檔、`docs/` 或對應 README）、必要時備份與記錄回滾方案。
5. **文件整理**：每次任務完成後，整理專案文件，將 .md 檔案分門別類到 `docs/` 對應目錄。
6. **版控提交**：每次任務完成後，必須執行 Git 版本控制流程：
   ```bash
   git add -A
   git commit -m "📝 描述變更內容"
   git push origin main
   ```

### 1.3 註解與日誌

- 區塊標題採固定樣板，使用 emoji 強調狀態；錯誤處理需輸出明確訊息。
- 伺服器日誌慣例：📝 一般、✅ 成功、⚠️ 警告、❌ 錯誤、🚀 啟動、🔄 轉發。

### 1.4 測試模式

- **本機測試**：`npm start` 或 `npm run dev`（預設 3000 埠）。
- **Docker 測試**：使用 `docker-compose up -d` 啟動容器（3010 埠）。
- **LINE 測試**：在 LINE 中發送關鍵字測試功能（`#查詢出缺勤`、`#簽到` 等）。

---

## 2. 專案根目錄與環境

- **GitHub 專案**：`timdirty/FLB-BOT-sys`（主要版本控制倉庫）
- **專案根目錄**：`/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）`（NAS 部署路徑）
- **本機開發路徑**：透過 Synology Drive 同步到本機
- **入口網址**：
  - 本機：`http://localhost:3000`
  - NAS：`http://localhost:3010`（Docker 容器內）
- **主要入口檔**：
  - 後端：`server.js`（Express 主伺服器，含 API、靜態服務、Webhook 處理）
  - 前端：`public/index.html`（系統首頁）、`public/admin.html`（管理介面）
- **環境變數（.env）重點**：`NODE_ENV`、`PORT`、`TZ`、LINE Bot 認證、Google Sheets API、Webhook 轉發設定

### 2.1 Git 版本控制規範

**每次任務完成後必須執行以下流程**：

```bash
# 1. 檢查變更狀態
git status

# 2. 添加所有變更
git add -A

# 3. 提交變更（使用清楚的 commit 訊息）
git commit -m "📝 [類型] 簡短描述

✅ 完成項目：
- 項目 1
- 項目 2

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. 推送到 GitHub
git push origin main
```

**Commit 訊息規範**：
- 使用 emoji 標記類型：📚 文檔、✨ 新功能、🐛 修復、♻️ 重構、🎨 樣式、⚡ 性能、🔧 配置
- 第一行簡短描述（50 字內）
- 空一行後列出詳細變更項目
- 結尾加上 Claude Code 標記

---

## 3. 完整專案架構

```
FLB簽到系統（line）/
├── 📄 核心程式
│   ├── server.js                          # 主伺服器（Express）
│   ├── package.json                       # 專案設定與依賴
│   ├── Dockerfile                         # Docker 映像檔定義
│   └── docker-compose.yml                 # Docker Compose 配置
│
├── 📂 src/ (核心模組)
│   ├── config.js                          # 集中式配置管理
│   ├── config-manager.js                  # 配置管理器
│   ├── teacher_mapping.js                 # 講師對應表
│   ├── googleSheetsDatabaseWithLocal.js   # Google Sheets 資料庫管理
│   ├── webhook-forwarder.js               # Webhook 轉發模組
│   ├── settings-api.js                    # 設定 API 路由
│   └── data/                              # 資料存儲目錄
│       ├── groups.json                    # 群組資料
│       ├── student-responses.json         # 學生回應記錄
│       └── webhook-targets.json           # Webhook 轉發目標
│
├── 💾 資料存儲
│   └── data/
│       ├── users.json                     # 使用者資料
│       ├── bindings.json                  # Rich Menu 綁定關係
│       └── sync_flag.json                 # 同步標記
│
├── 🌐 前端資源
│   └── public/
│       ├── index.html                     # 系統首頁
│       ├── admin.html                     # 管理介面
│       ├── report.html                    # 報表頁面
│       ├── settings.html                  # 設定頁面
│       ├── webhook-test.html              # Webhook 測試工具
│       ├── script.js                      # 主要前端腳本
│       ├── settings.js                    # 設定頁面腳本
│       ├── style.css                      # 主要樣式表
│       ├── settings.css                   # 設定頁面樣式
│       └── logo.jpg                       # Logo 圖片
│
├── 📚 文檔（根目錄保留核心文件）
│   ├── README.md                          # 專案說明
│   ├── AGENTS.md                          # 本檔案（代理指引）
│   ├── QUICK_COMMANDS.md                  # 快速指令速查表
│   └── docs/                              # 詳細文檔目錄（分類整理）
│       ├── api/                           # API 文檔
│       │   ├── API_DOCUMENTATION.md       # API 完整文檔
│       │   └── 課程規劃API.md              # 課程規劃 API 說明
│       ├── integration/                   # 整合相關文檔
│       │   ├── AIBOT_INTEGRATION.md       # AIbot 完整整合指南
│       │   ├── AIBOT_SETUP.md             # AIbot 快速設定
│       │   ├── WEBHOOK_DOCS_SUMMARY.md    # Webhook 文檔摘要
│       │   └── 給轉發系統-請假功能實現指南.md # 請假功能整合
│       ├── deployment/                    # 部署相關文檔
│       │   ├── DOCKER_COMMANDS.md         # Docker 指令大全
│       │   ├── QUICK_DEPLOY.md            # 快速部署指南
│       │   ├── RAILWAY_TO_NAS.md          # Railway 遷移到 NAS
│       │   ├── SYNOLOGY_DRIVE_DEPLOY.md   # Synology Drive 部署
│       │   ├── NAS_DOCKER_PERMISSIONS.md  # NAS Docker 權限設定
│       │   ├── NAS_DOCKER_DEPLOYMENT.md   # NAS Docker 部署
│       │   └── RAILWAY_DEPLOYMENT_GUIDE.md # Railway 部署指南
│       ├── features/                      # 功能相關文檔
│       │   ├── GROUPS_GOOGLE_SHEETS_SYNC_SUMMARY.md # 群組同步
│       │   ├── GROUP_FEATURE_UPDATE.md    # 群組功能更新
│       │   └── GROUP_TESTING_GUIDE.md     # 群組測試指南
│       ├── troubleshooting/               # 故障排除文檔
│       │   ├── ✅關鍵字不通知管理員修復.md  # 關鍵字修復
│       │   ├── 📋修復總結.md               # 修復總結
│       │   ├── 📤上傳CSV到課程查看器.md    # CSV 上傳功能
│       │   ├── 🔍診斷課程規劃問題.md       # 課程規劃診斷
│       │   └── 🔧修復週次導航-快速指引.md  # 週次導航修復
│       ├── guides/                        # 使用指南
│       │   ├── CONFIG_GUIDE.md            # 配置指南
│       │   ├── LINE_BROWSER_BEHAVIOR.md   # LINE 瀏覽器行為
│       │   └── QUICK_START.md             # 快速開始
│       └── archived/                      # 已過時文檔
│           ├── CLEANUP_REPORT.md          # 清理報告
│           └── QUICK_REPLY_FORMAT_REFERENCE copy.md # 快速回覆格式
│
├── 🔧 配置檔
│   ├── .env                               # 環境變數（自行創建，不提交）
│   ├── env.example                        # 環境變數範例
│   └── .gitignore                         # Git 忽略清單
│
├── 📜 部署腳本
│   ├── deploy-on-nas.sh                   # NAS 部署腳本
│   ├── setup-aibot-forward.sh             # AIbot 轉發設定腳本
│   └── 快速部署腳本.sh                     # 快速部署腳本
│
└── 📊 日誌
    └── logs/                              # 日誌目錄
```

---

## 4. 前端開發指引

### 4.1 前端架構

- **主要頁面**：
  - `index.html`：系統首頁，提供系統概覽與快速連結
  - `admin.html`：管理介面，用於講師簽到、學生簽到、課程管理
  - `report.html`：報表頁面，顯示出缺勤統計
  - `settings.html`：設定頁面，管理系統配置
  - `webhook-test.html`：Webhook 測試工具

### 4.2 前端腳本

- **主要腳本**：`script.js`（處理簽到、課程查詢、報表生成等核心功能）
- **設定腳本**：`settings.js`（處理系統設定的讀取與更新）
- **樣式表**：`style.css`（主要樣式）、`settings.css`（設定頁面樣式）

### 4.3 前端開發注意事項

- 使用原生 JavaScript，不依賴前端框架
- 保持程式碼簡潔，避免過度複雜化
- 所有 API 呼叫需包含錯誤處理
- UI 更新需考慮使用者體驗（載入狀態、錯誤提示等）

---

## 5. 後端與 API

### 5.1 主伺服器（server.js）

- **框架**：Express.js
- **中間件**：CORS、body-parser、靜態檔案服務
- **主要功能**：
  - LINE Webhook 處理
  - API 端點提供
  - 靜態檔案服務
  - Webhook 轉發

### 5.2 核心 API 端點

#### Webhook
| 端點 | 方法 | 功能 |
|------|------|------|
| `/webhook` | POST | LINE Webhook 處理 |

#### 用戶管理
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/register-user` | POST | 用戶註冊 |
| `/api/check-user` | POST | 檢查用戶 |
| `/api/users` | GET | 獲取用戶列表 |
| `/api/user-stats` | GET | 用戶統計 |

#### 講師管理
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/teachers` | GET | 獲取講師列表 |
| `/api/teacher-mapping` | GET | 講師對應表 |
| `/api/teacher-courses` | POST | 獲取講師課程 |
| `/api/teacher-courses-link` | POST | 獲取講師課程連結 |
| `/api/bind-teacher` | POST | 講師綁定 |
| `/api/unbind-teacher` | POST | 講師解綁 |
| `/api/check-teacher` | POST | 檢查講師 |
| `/api/check-teacher-binding` | POST | 檢查綁定狀態 |
| `/api/teacher-bindings` | GET | 獲取所有講師綁定 |
| `/api/teacher-bindings/:userId` | GET | 獲取特定講師綁定 |
| `/api/get-teacher-bindings` | POST | 獲取講師綁定（POST） |

#### 簽到與報表
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/course-students` | POST | 獲取課程學生 |
| `/api/student-attendance` | POST | 學生簽到 |
| `/api/makeup-attendance` | POST | 補課簽到 |
| `/api/teacher-report` | POST | 講師報表 |
| `/api/query-report` | POST | 查詢報表 |
| `/api/direct-step3` | POST | 直接進入步驟3 |

#### 群組管理
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/groups` | GET | 獲取群組列表 |
| `/api/groups/:groupId` | GET | 獲取特定群組 |
| `/api/groups/search/:query` | GET | 搜尋群組 |
| `/api/groups/:groupId` | PATCH | 更新群組 |
| `/api/group-stats` | GET | 群組統計 |

#### 學生回應記錄
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/student-responses` | GET | 獲取學生回應列表 |
| `/api/student-responses` | POST | 新增學生回應 |
| `/api/student-responses/:id` | DELETE | 刪除學生回應 |

#### Webhook 轉發
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/webhook-forward/status` | GET | 查看轉發狀態 |
| `/api/webhook-forward/targets` | POST | 新增轉發目標 |
| `/api/webhook-forward/targets/:nameOrUrl` | PATCH | 更新轉發目標 |
| `/api/webhook-forward/targets/:nameOrUrl` | DELETE | 刪除轉發目標 |

#### 管理員功能
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/admin/stats` | GET | 系統統計 |
| `/api/admin/users` | GET | 管理用戶列表 |
| `/api/admin/users/search` | GET | 搜尋用戶 |
| `/api/admin/bindings` | GET | 管理綁定列表 |
| `/api/admin/bindings/search` | GET | 搜尋綁定 |
| `/api/admin/bindings/:id/deactivate` | POST | 停用綁定 |
| `/api/admin/sync-user-name` | POST | 同步用戶名稱 |
| `/api/admin/sync-all-names` | POST | 同步所有名稱 |
| `/api/admin/backup-database` | POST | 備份資料庫 |
| `/api/admin/export-data` | GET | 匯出資料 |
| `/api/admin/sync-google-sheets` | POST | 同步 Google Sheets |
| `/api/admin/reinitialize` | POST | 重新初始化 |

#### 測試功能
| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/test-message` | POST | 測試訊息發送 |
| `/api/test-richmenu` | POST | 測試 Rich Menu |
| `/api/test-unbind-richmenu` | POST | 測試解綁 Rich Menu |
| `/api/test-google-sheets` | POST | 測試 Google Sheets |
| `/api/test-binding-notification` | POST | 測試綁定通知 |
| `/api/test-dual-bot` | POST | 測試雙 Bot |

### 5.3 核心模組

#### 5.3.1 配置管理（src/config.js）

- 集中管理所有系統配置
- 支援環境變數覆蓋
- 包含配置驗證與環境檢查
- 主要配置區塊：
  - 伺服器配置（端口、URL、超時）
  - LINE Bot 配置（Token、Rich Menu、測試模式）
  - Google Sheets API 配置
  - FLB API 端點
  - 資料庫配置
  - 功能開關
  - 關鍵字設定
  - UI 配置
  - 日誌配置
  - 安全配置

#### 5.3.2 Google Sheets 資料庫（src/googleSheetsDatabaseWithLocal.js）

- 整合 Google Sheets 作為資料來源
- 本地快取機制（減少 API 呼叫）
- 自動同步功能
- 支援學生資料、課程資料、出缺勤記錄查詢

#### 5.3.3 Webhook 轉發器（src/webhook-forwarder.js）

- 將 LINE Webhook 事件轉發到其他服務（如 AIbot）
- 支援多目標轉發
- 非同步轉發（不阻塞主流程）
- 持久化配置（儲存於 `data/webhook-targets.json`）
- 支援過濾器與條件轉發
- 錯誤處理與重試機制

#### 5.3.4 講師對應表（src/teacher_mapping.js）

- 管理講師姓名與 LINE User ID 的對應關係
- 提供查詢與驗證功能

---

## 6. 資料與設定

### 6.1 資料來源

- **學生資料**：Google Sheets API → 本地快取（`googleSheetsDatabaseWithLocal.js`）
- **講師資料**：`teacher_mapping.js`（講師姓名/LINE userId 對應）
- **用戶資料**：`data/users.json`（LINE 用戶註冊資料）
- **綁定關係**：`data/bindings.json`（Rich Menu 綁定狀態）
- **群組資料**：`src/data/groups.json`（群組資訊記錄）
- **學生回應**：`src/data/student-responses.json`（學生互動記錄）

### 6.2 配置檔

- **環境變數**：`.env`（必須自行創建，參考 `env.example`）
- **系統配置**：`src/config.js`（集中式配置管理）
- **Webhook 轉發**：`src/data/webhook-targets.json`（轉發目標配置）

### 6.3 時區

- 全域使用 `Asia/Taipei` 時區
- 在 `.env` 中設定 `TZ=Asia/Taipei`
- Docker 容器內也需設定時區環境變數

---

## 7. 測試與驗證

### 7.1 本機測試

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm start
# 或
npm run dev

# 訪問
http://localhost:3000
```

### 7.2 Docker 測試

```bash
# 建立映像檔
docker-compose build

# 啟動容器
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止容器
docker-compose down
```

### 7.3 API 測試

```bash
# 健康檢查
curl http://localhost:3000/health

# 獲取講師列表
curl http://localhost:3000/api/teachers

# 獲取用戶列表
curl http://localhost:3000/api/users

# 查看 Webhook 轉發狀態
curl http://localhost:3000/api/webhook-forward/status
```

### 7.4 LINE 功能測試

在 LINE 中測試以下關鍵字：

1. **系統關鍵字**：
   - `#查詢出缺勤`：查詢個人出缺勤記錄
   - `#內部人員`：綁定內部人員 Rich Menu
   - `#解綁`：解除 Rich Menu 綁定
   - `#測試`：測試模式（5分鐘後自動重綁）

2. **簽到功能**：
   - 透過 Rich Menu 或管理介面進行簽到

3. **AI 對話**（需啟用 AIbot 轉發）：
   - 一般對話會自動轉發到 AIbot 處理

### 7.5 測試檢查清單

- [ ] 本機伺服器正常啟動
- [ ] 所有 API 端點回應正常
- [ ] LINE Webhook 接收正常
- [ ] 關鍵字功能正常運作
- [ ] 簽到功能正常
- [ ] 出缺勤查詢正常
- [ ] Rich Menu 綁定/解綁正常
- [ ] Webhook 轉發正常（如有啟用）
- [ ] 日誌輸出正常且無錯誤

---

## 8. 部署與回滾

### 8.1 部署前清單

- [ ] 本地測試全數通過，無 `console.error`
- [ ] 已備份關鍵配置檔（`.env`、`data/*.json`）
- [ ] 文件（本檔、`docs/`）已更新
- [ ] 已透過 Synology Drive 同步最新程式碼到 NAS

### 8.2 NAS 部署步驟

```bash
# 1. SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 2. 進入專案目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 3. 執行部署腳本
sudo ./deploy-on-nas.sh

# 4. 查看日誌確認部署成功
sudo docker logs -f flb-line-bot
```

### 8.3 部署後驗證

```bash
# 健康檢查
curl http://localhost:3010/health

# 查看容器狀態
sudo docker ps | grep flb-line-bot

# 查看日誌
sudo docker logs --tail 50 flb-line-bot

# 測試 LINE 功能
# 在 LINE 中發送測試訊息
```

### 8.4 快速回滾

```bash
# 1. 停止並移除容器
sudo docker stop flb-line-bot
sudo docker rm flb-line-bot

# 2. 還原備份配置（如需要）
cp data/backup/*.json data/

# 3. 使用上一版映像檔重新啟動
sudo docker-compose up -d

# 4. 檢查狀態
sudo docker ps
sudo docker logs -f flb-line-bot
```

---

## 9. 常見陷阱（修改前先檢查）

1. **環境變數未設定**：確保 `.env` 檔案存在且包含所有必要變數（參考 `env.example`）。
2. **LINE Token 錯誤**：檢查 `LINE_CHANNEL_ACCESS_TOKEN` 是否正確且未過期。
3. **Google Sheets API 失效**：檢查 API URL 是否正確，權限是否足夠。
4. **Port 衝突**：確認 3000（本機）或 3010（Docker）埠未被占用。
5. **Webhook 轉發失敗**：檢查目標 URL 是否可達，API Key 是否正確。
6. **Rich Menu 綁定失敗**：確認 Rich Menu ID 是否正確，LINE Bot 權限是否足夠。
7. **資料同步問題**：檢查 Google Sheets API 連線，確認本地快取檔案權限。
8. **Docker 容器無法啟動**：檢查 Dockerfile 與 docker-compose.yml 配置，確認映像檔建立成功。
9. **時區問題**：確保 `TZ=Asia/Taipei` 在 `.env` 和 docker-compose.yml 中都有設定。
10. **檔案權限問題**：NAS 上的檔案權限需正確設定（特別是 `data/` 目錄）。

---

## 10. 最近重要更新

### 2025-11-12｜訊息中心（Message Center）M1 規劃與落地

- ✅ 新增 `docs/features/MESSAGE_CENTER_SPEC.md`（持續回填）
- ✅ 後端新增：`src/message-service.js`（送信引擎）、`src/message-api.js`（API 路由，掛載於 `/api/message`）
- ✅ 前端新增：`public/message-admin.html/js/css`（Composer、模板庫、作業列表）
- ✅ 新增資料檔：`src/data/message-templates.json`、`src/data/message-jobs.json`
- ✅ `public/admin.html` 新增「📣 訊息中心」入口
- ✅ `env.example` 新增 `ADMIN_API_KEY` 與訊息中心預設參數

使用方式：在 `message-admin.html` 輸入 `X-Admin-Key` 後即可管理模板與發送作業（M1 支援 text 與 flex），並可：
- 搜尋/挑選收件人（使用者/教師/群組）、估算收件人數
- 立即或排程發送（Asia/Taipei）
- Rich Menu 綁定/解除（直連 LINE API）
- Bot 健康檢查、Loading 動畫測試


### 2025-11-11｜專案文件整理與規範化

- ✅ 完成專案文件分類整理
- ✅ 建立 `docs/` 目錄結構（api、integration、deployment、features、troubleshooting、guides、archived）
- ✅ 移動所有 .md 檔案到對應分類目錄
- ✅ 根目錄僅保留核心文件（README.md、AGENTS.md、QUICK_COMMANDS.md）
- ✅ 更新 AGENTS.md 加入文件整理規範與步驟
- ✅ 建立文件整理工作流程（每次任務完成後必須執行）
- ✅ 更新 API 端點文檔，準確反映專案實際功能（共 59 個端點）
- ✅ 將 API 端點分類為 8 大類：Webhook、用戶管理、講師管理、簽到與報表、群組管理、學生回應記錄、Webhook 轉發、管理員功能、測試功能

### 2025-11-11｜建立 AGENTS.md 代理指引

- 新增完整的代理工作指引文件
- 整合專案架構、開發流程、測試驗證、部署回滾等完整資訊
- 提供清晰的作業守則與常見陷阱提醒

### 2025-10-23｜Webhook 轉發功能完善

- 完善 `webhook-forwarder.js` 模組
- 支援持久化配置（`data/webhook-targets.json`）
- 新增轉發管理 API（新增/更新/刪除目標）
- 整合 AIbot 轉發功能

### 2025-10-01｜配置系統重構

- 建立集中式配置管理（`src/config.js`）
- 支援環境變數覆蓋所有配置
- 新增配置驗證與環境檢查
- 改善日誌輸出與錯誤處理

### 2025-09-30｜核心版本發布（v2.0.0）

- 精簡為核心功能版本
- 移除冗餘功能和檔案
- 優化程式碼結構
- 更新文檔系統

---

## 11. 參考文件

### 11.1 文件整理規範

**每次任務完成後必須執行文件整理**，確保專案文件結構清晰：

#### 根目錄保留文件（僅保留核心文件）
- `README.md`：專案說明
- `AGENTS.md`：代理指引（本檔）
- `QUICK_COMMANDS.md`：快速指令速查表

#### docs/ 分類目錄結構

| 目錄 | 用途 | 範例 |
|------|------|------|
| `docs/api/` | API 文檔 | API_DOCUMENTATION.md |
| `docs/integration/` | 整合相關 | AIBOT_INTEGRATION.md, WEBHOOK_DOCS_SUMMARY.md |
| `docs/deployment/` | 部署相關 | DOCKER_COMMANDS.md, QUICK_DEPLOY.md |
| `docs/features/` | 功能說明 | GROUP_FEATURE_UPDATE.md |
| `docs/troubleshooting/` | 故障排除 | 修復總結.md, 診斷問題.md |
| `docs/guides/` | 使用指南 | CONFIG_GUIDE.md, QUICK_START.md |
| `docs/archived/` | 已過時文檔 | 舊版文件、清理報告 |

#### 文件整理步驟

```bash
# 1. 檢查根目錄的 .md 檔案
find . -maxdepth 1 -name "*.md" -type f

# 2. 根據類型移動到對應目錄
# 整合類 → docs/integration/
# 部署類 → docs/deployment/
# 功能類 → docs/features/
# 故障排除 → docs/troubleshooting/
# 已過時 → docs/archived/

# 3. 更新 AGENTS.md 的文件結構說明
```

### 11.2 核心文件

- `README.md`：專案說明與快速開始
- `QUICK_COMMANDS.md`：常用指令速查表
- `env.example`：環境變數範例

### 11.3 整合文件（docs/integration/）

- `AIBOT_INTEGRATION.md`：AIbot 完整整合指南
- `AIBOT_SETUP.md`：AIbot 快速設定
- `WEBHOOK_DOCS_SUMMARY.md`：Webhook 文檔摘要
- `給轉發系統-請假功能實現指南.md`：請假功能整合

### 11.4 部署文件（docs/deployment/）

- `DOCKER_COMMANDS.md`：Docker 指令大全
- `QUICK_DEPLOY.md`：快速部署指南
- `RAILWAY_TO_NAS.md`：Railway 遷移到 NAS
- `SYNOLOGY_DRIVE_DEPLOY.md`：Synology Drive 部署
- `NAS_DOCKER_PERMISSIONS.md`：NAS Docker 權限設定

### 11.5 功能文件（docs/features/）

- `GROUP_FEATURE_UPDATE.md`：群組功能更新
- `GROUP_TESTING_GUIDE.md`：群組測試指南
- `GROUPS_GOOGLE_SHEETS_SYNC_SUMMARY.md`：群組 Google Sheets 同步

### 11.6 API 文件（docs/api/）

- `API_DOCUMENTATION.md`：API 完整文檔
- `課程規劃API.md`：課程規劃 API 說明

### 11.7 使用指南（docs/guides/）

- `CONFIG_GUIDE.md`：配置指南
- `LINE_BROWSER_BEHAVIOR.md`：LINE 瀏覽器行為
- `QUICK_START.md`：快速開始

---

## 12. 開發最佳實踐

### 12.1 程式碼風格

- 使用 2 空格縮排
- 使用 `const` 和 `let`，避免 `var`
- 函數命名使用駝峰式（camelCase）
- 常數命名使用全大寫加底線（UPPER_SNAKE_CASE）
- 適當使用註解說明複雜邏輯

### 12.2 錯誤處理

- 所有 API 呼叫需包含 try-catch
- 錯誤訊息需清楚描述問題
- 使用適當的 HTTP 狀態碼
- 記錄錯誤日誌（使用 emoji 標記）

### 12.3 安全性

- 敏感資訊必須存放在 `.env`
- 不將 `.env` 提交到版本控制
- 驗證所有使用者輸入
- 使用 HTTPS（生產環境）
- 定期更換 API Key 和 Token

### 12.4 效能優化

- 使用本地快取減少 API 呼叫
- 非同步處理耗時操作
- 適當設定超時時間
- 避免阻塞主執行緒

### 12.5 版本控制

- 提交訊息使用清楚的描述
- 使用 emoji 標記提交類型（🚀 新功能、🐛 修復、📚 文檔等）
- 重大變更前先建立分支
- 定期同步遠端倉庫

---

## 13. 故障排除

### 13.1 伺服器無法啟動

**症狀**：執行 `npm start` 後伺服器無法啟動

**可能原因與解決方案**：
1. Port 被占用：`lsof -i :3000` 檢查，使用其他 Port 或終止占用程序
2. 環境變數缺失：檢查 `.env` 檔案是否存在且完整
3. 依賴未安裝：執行 `npm install`
4. Node.js 版本過舊：確認 Node.js >= 18.0.0

### 13.2 LINE Webhook 無回應

**症狀**：LINE 發送訊息後無任何回應

**可能原因與解決方案**：
1. Webhook URL 設定錯誤：檢查 LINE Developers Console 設定
2. Token 錯誤：確認 `LINE_CHANNEL_ACCESS_TOKEN` 正確
3. 伺服器未運行：確認伺服器正常啟動
4. 防火牆阻擋：檢查防火牆設定

### 13.3 出缺勤查詢失敗

**症狀**：發送 `#查詢出缺勤` 後無法取得資料

**可能原因與解決方案**：
1. Google Sheets API 失效：檢查 API URL 與權限
2. 學生資料不存在：確認學生已在 Google Sheets 中註冊
3. 快取過期：清除本地快取或重啟伺服器
4. API 超時：增加 `API_TIMEOUT` 設定值

### 13.4 Webhook 轉發失敗

**症狀**：日誌顯示轉發失敗訊息

**可能原因與解決方案**：
1. 目標 URL 無法連線：檢查目標服務是否運行
2. API Key 錯誤：確認 Authorization header 正確
3. 超時設定過短：增加 `timeout` 設定
4. 目標服務回應錯誤：檢查目標服務日誌

### 13.5 Docker 容器異常

**症狀**：Docker 容器無法啟動或頻繁重啟

**可能原因與解決方案**：
1. 映像檔建立失敗：重新執行 `docker-compose build --no-cache`
2. 環境變數未傳遞：檢查 docker-compose.yml 中的 environment 設定
3. Volume 權限問題：確認 `data/` 和 `logs/` 目錄權限
4. 資源不足：檢查 NAS 資源使用狀況

---

## 14. 聯絡與支援

### 14.1 問題回報

遇到問題時，請提供以下資訊：
1. 問題描述（包含錯誤訊息）
2. 重現步驟
3. 環境資訊（Node.js 版本、作業系統等）
4. 相關日誌

### 14.2 功能建議

歡迎提出功能建議，請說明：
1. 功能需求描述
2. 使用場景
3. 預期效果

---

> 若需調整上述規範，請於變更說明中清楚描述「動機/範圍 → 影響面（前端/後端/部署）→ 回滾方式」，並同步更新本檔。

---

**FLB 簽到系統 - 簡單、強大、易用** 🎉

**最後更新**：2025-11-11
**版本**：v2.0.0
