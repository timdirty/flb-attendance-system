# 🚀 使用 Synology Drive 同步部署

因為您的專案已經透過 **Synology Drive** 同步到 NAS，部署超級簡單！

---

## 📁 目錄對應

| 位置 | 路徑 |
|------|------|
| 💻 **本機** | `/Users/apple/Library/CloudStorage/SynologyDrive-FLBTim/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）` |
| 🏠 **NAS** | `/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）` |

---

## ✨ 優勢

因為使用 Synology Drive 同步：
- ✅ **不需要 scp 上傳**檔案
- ✅ **不需要 git clone**
- ✅ `.env` 檔案**自動同步**到 NAS
- ✅ 本機修改**自動同步**到 NAS
- ✅ **超級方便**！

---

## 🚀 部署步驟（3 分鐘）

### 步驟 1：SSH 連線到 NAS

```bash
# 從本機連線到 NAS
ssh ctctim14@YOUR_NAS_IP

# 或使用 admin 帳號
ssh admin@YOUR_NAS_IP
```

### 步驟 2：進入專案目錄

```bash
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
```

### 步驟 3：執行部署腳本

```bash
# 設定執行權限
chmod +x deploy-on-nas.sh

# 執行部署
./deploy-on-nas.sh
```

**就這樣！** 🎉

---

## 📊 部署腳本會自動：

1. ✅ 檢查 `.env` 檔案
2. ✅ 建立 Docker 映像
3. ✅ 停止舊容器
4. ✅ 啟動新容器
5. ✅ 測試健康檢查
6. ✅ 顯示日誌

---

## 🔍 驗證部署

### 在 NAS 上檢查

```bash
# 查看容器狀態
docker ps | grep flb-line-bot

# 查看日誌
docker logs flb-line-bot

# 測試健康檢查
curl http://localhost:3010/health
```

### 從本機測試（透過 SSH）

```bash
# 從本機測試 NAS 上的服務
ssh ctctim14@YOUR_NAS_IP "curl http://localhost:3010/health"
```

---

## 🌐 設定反向代理

### 在 Synology DSM

1. **登入 DSM**
   - 瀏覽器開啟：`http://YOUR_NAS_IP:5000`

2. **設定反向代理**
   - 控制台 → 登入入口網站 → 進階
   - 反向代理伺服器 → 新增

3. **設定內容**
   ```
   描述：LINE Bot Webhook
   
   來源（外部請求）：
   - 通訊協定：HTTPS
   - 主機名稱：linebot.yourdomain.com
   - 連接埠：443
   
   目的地（內部服務）：
   - 通訊協定：HTTP
   - 主機名稱：localhost
   - 連接埠：3010
   ```

4. **設定 SSL 憑證**
   - 控制台 → 安全性 → 憑證
   - 新增 → Let's Encrypt
   - 網域名稱：linebot.yourdomain.com

---

## 🔄 更新應用

因為使用 Synology Drive 同步，更新超簡單：

### 方式 1：在本機修改（推薦）

```bash
# 1. 在本機修改程式碼
# 2. 等待 Synology Drive 自動同步（幾秒鐘）
# 3. SSH 到 NAS 重新部署

ssh ctctim14@YOUR_NAS_IP
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
./deploy-on-nas.sh
```

### 方式 2：快速重啟

```bash
# 如果只是重啟容器
ssh ctctim14@YOUR_NAS_IP "docker restart flb-line-bot"
```

---

## 💾 資料位置

### 持久化資料

所有資料都儲存在同步目錄中：

```
/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）/
├── data/              # 資料庫檔案
│   ├── users.json
│   ├── bindings.json
│   └── sync_flag.json
└── logs/              # 日誌檔案
    └── (容器日誌)
```

### 備份

因為在 Synology Drive 中：
- ✅ 自動版本控制
- ✅ 可以還原到任何時間點
- ✅ 不需要額外備份腳本

**在 DSM 中檢查版本：**
- File Station → 右鍵點擊資料夾
- 版本瀏覽器 → 選擇時間點還原

---

## 📝 常用管理指令

```bash
# SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 進入專案目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 查看即時日誌
docker logs -f flb-line-bot

# 重啟容器
docker restart flb-line-bot

# 停止容器
docker stop flb-line-bot

# 啟動容器
docker start flb-line-bot

# 重新部署（更新後）
./deploy-on-nas.sh

# 查看資源使用
docker stats flb-line-bot

# 進入容器
docker exec -it flb-line-bot sh

# 查看環境變數
docker exec flb-line-bot env | grep LINE
```

---

## 🔧 本機快速指令

不用每次都 SSH，可以直接從本機執行：

```bash
# 定義 NAS 連線
NAS_SSH="ctctim14@YOUR_NAS_IP"
NAS_DIR="/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 查看日誌
ssh $NAS_SSH "docker logs --tail 50 flb-line-bot"

# 重啟服務
ssh $NAS_SSH "docker restart flb-line-bot"

# 測試健康檢查
ssh $NAS_SSH "curl http://localhost:3010/health"

# 重新部署
ssh $NAS_SSH "cd '$NAS_DIR' && ./deploy-on-nas.sh"
```

### 建立別名（可選）

在本機的 `~/.zshrc` 或 `~/.bashrc` 加入：

```bash
# FLB LINE Bot 管理別名
alias flb-logs='ssh ctctim14@YOUR_NAS_IP "docker logs -f flb-line-bot"'
alias flb-restart='ssh ctctim14@YOUR_NAS_IP "docker restart flb-line-bot"'
alias flb-status='ssh ctctim14@YOUR_NAS_IP "docker ps | grep flb-line-bot"'
alias flb-health='ssh ctctim14@YOUR_NAS_IP "curl http://localhost:3010/health"'
alias flb-deploy='ssh ctctim14@YOUR_NAS_IP "cd /volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line） && ./deploy-on-nas.sh"'
```

然後就可以在本機直接使用：
```bash
flb-logs      # 查看日誌
flb-restart   # 重啟服務
flb-status    # 查看狀態
flb-health    # 健康檢查
flb-deploy    # 重新部署
```

---

## 🎯 完整流程範例

### 首次部署

```bash
# 1. 在本機確認 .env 已存在
ls -la .env

# 2. SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 3. 進入目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 4. 確認檔案已同步
ls -la .env Dockerfile docker-compose.yml

# 5. 執行部署
chmod +x deploy-on-nas.sh
./deploy-on-nas.sh

# 6. 驗證
docker ps | grep flb-line-bot
curl http://localhost:3010/health
```

### 後續更新

```bash
# 1. 在本機修改程式碼（例如 server.js）

# 2. 等待同步（查看 Synology Drive 圖示）

# 3. 重新部署
ssh ctctim14@YOUR_NAS_IP "cd '/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）' && ./deploy-on-nas.sh"
```

---

## ⚠️ 注意事項

### 1. 同步延遲

- Synology Drive 同步可能需要幾秒鐘
- 大檔案可能需要更長時間
- 建議修改後等待 10 秒再部署

### 2. .env 檔案

- `.env` 包含敏感資訊
- 確認 `.gitignore` 有包含 `.env`
- 不要分享給他人

### 3. node_modules

- **不要同步** `node_modules/` 到 NAS
- 在 Synology Drive 設定中排除
- Docker 建立時會自動安裝

---

## 🎉 完成！

您的 LINE Bot 現在運行在 NAS 上，並且：
- ✅ 透過 Synology Drive 輕鬆更新
- ✅ 不需要複雜的 Git 或 SCP 操作
- ✅ 本機修改自動同步
- ✅ 完全免費運行

---

## 📚 相關文件

- 完整部署指南：`NAS_DOCKER_DEPLOYMENT.md`
- 快速開始：`QUICK_DEPLOY.md`
- Railway 遷移：`RAILWAY_TO_NAS.md`

---

**享受便捷的開發和部署體驗！** 🚀




