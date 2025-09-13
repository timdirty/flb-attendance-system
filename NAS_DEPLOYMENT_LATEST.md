# FLB 簽到系統 - NAS 部署完整指南 (最新版)

## 🎯 功能特色
- ✅ LIFF 整合 - 自動記錄 LINE 使用者 ID
- ✅ 講師身份綁定系統
- ✅ 自動 Rich Menu 綁定/解除
- ✅ Google Sheets 資料庫同步
- ✅ 講師報表簽到通知
- ✅ 學生補簽到功能
- ✅ 管理員後台介面
- ✅ 雙向通知系統 (管理員 + 講師)

## 📋 部署步驟

### 1. 準備檔案

確保您有以下檔案需要上傳到 NAS：

```
flb-attendance-system/
├── server.js                    # 主程式
├── package.json                 # 依賴配置
├── package-lock.json           # 鎖定版本
├── googleSheetsDatabaseWithLocal.js  # Google Sheets 資料庫
├── public/                     # 前端檔案
│   ├── index.html              # LIFF 主頁面
│   ├── admin.html              # 管理員後台
│   ├── style.css               # 樣式
│   └── script.js               # 前端邏輯
├── Dockerfile                  # Docker 配置
├── docker-compose.yml          # Docker Compose 配置
├── nas-quick-deploy.sh         # 快速部署腳本
└── .env                        # 環境變數 (需要建立)
```

### 2. NAS 環境設定

#### A. 安裝必要套件
1. 在 Synology Package Center 安裝：
   - **Docker** (推薦)
   - **Node.js v18** (如果不用 Docker)

#### B. 建立專案目錄
```bash
mkdir -p /volume1/docker/flb-attendance
cd /volume1/docker/flb-attendance
```

### 3. 環境變數設定

建立 `.env` 檔案：
```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=LaeRrV+/XZ6oCJ2ZFzAFlZXHX822l50NxxM2x6vBkuoux4ptr6KjFJcIXL6pNJel2dKbZ7nxachvxvKrKaMNchMqGTywUl4KMGXhxd/bdiDM7M6Ad8OiXF+VzfhlSMXfu1MbDfxdwe0z/NLYHzadyQdB04t89/1O/w1cDnyilFU=
LINE_USER_ID=Udb51363eb6fdc605a6a9816379a38103

# 系統設定
PORT=3000
NODE_ENV=production

# Google Sheets API (如果需要)
GOOGLE_SHEETS_API=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
GOOGLE_SHEETS_COOKIE=YOUR_COOKIE_HERE
```

### 4. 部署方法

#### 方法 A: Docker 部署 (推薦)

1. **上傳所有檔案到 NAS**
2. **執行快速部署腳本**：
```bash
chmod +x nas-quick-deploy.sh
./nas-quick-deploy.sh
```

3. **或手動執行**：
```bash
# 停止舊容器
docker-compose down

# 重新構建
docker-compose build --no-cache

# 啟動服務
docker-compose up -d

# 檢查狀態
docker-compose ps
```

#### 方法 B: 直接 Node.js 部署

```bash
# 安裝依賴
npm install

# 使用 PM2 管理進程
npm install -g pm2

# 啟動應用
pm2 start server.js --name "flb-attendance"

# 設定開機自啟
pm2 startup
pm2 save
```

### 5. 反向代理設定

在 Synology DSM 中設定：

**控制台 → 應用程式入口 → 反向代理**

- **來源通訊協定**: HTTPS
- **來源主機名稱**: `your-domain.synology.me`
- **來源連接埠**: 443
- **目的地通訊協定**: HTTP
- **目的地主機名稱**: localhost
- **目的地連接埠**: 3000

### 6. LINE Developer Console 設定

1. 登入 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 Channel
3. 在 "Messaging API" 設定中：
   - Webhook URL: `https://your-domain.synology.me/webhook`
   - 點擊 "Verify" 驗證
4. 在 "LIFF" 設定中：
   - 新增 LIFF App
   - Endpoint URL: `https://your-domain.synology.me/`
   - 設定適當的 LIFF ID

### 7. 功能測試

#### A. 基本功能測試
```bash
# 測試主頁
curl http://localhost:3000

# 測試管理員後台
curl http://localhost:3000/admin

# 測試 API
curl http://localhost:3000/api/teachers
```

#### B. Webhook 測試
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
```

#### C. LINE 通知測試
```bash
curl -X POST http://localhost:3000/api/test-message \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","message":"NAS 部署測試"}'
```

### 8. 監控與維護

#### 查看日誌
```bash
# Docker 方式
docker-compose logs -f

# PM2 方式
pm2 logs flb-attendance
```

#### 重啟服務
```bash
# Docker 方式
docker-compose restart

# PM2 方式
pm2 restart flb-attendance
```

#### 更新應用
```bash
# 停止服務
docker-compose down

# 更新檔案 (上傳新版本)
# 重新構建
docker-compose build --no-cache

# 啟動服務
docker-compose up -d
```

### 9. 故障排除

#### 常見問題

1. **容器無法啟動**
   ```bash
   # 檢查日誌
   docker-compose logs
   
   # 檢查端口占用
   netstat -tlnp | grep :3000
   ```

2. **Webhook 驗證失敗**
   - 檢查反向代理設定
   - 檢查防火牆設定
   - 確認 SSL 憑證有效

3. **LINE 通知無法發送**
   - 檢查 LINE_CHANNEL_ACCESS_TOKEN
   - 檢查 LINE_USER_ID
   - 查看應用日誌

4. **資料庫同步問題**
   - 檢查 Google Sheets API 設定
   - 檢查網路連線
   - 查看同步日誌

#### 檢查命令
```bash
# 檢查容器狀態
docker-compose ps

# 檢查端口
netstat -tlnp | grep :3000

# 檢查進程
ps aux | grep node

# 檢查磁碟空間
df -h
```

### 10. 安全建議

1. **定期更新**
   - 定期更新 Docker 映像
   - 定期更新依賴套件

2. **備份設定**
   - 備份 `.env` 檔案
   - 備份 Docker Compose 配置

3. **監控資源**
   - 監控 CPU 和記憶體使用
   - 監控磁碟空間

## 🚀 快速部署命令

```bash
# 一鍵部署
wget -O nas-quick-deploy.sh https://your-repo/nas-quick-deploy.sh
chmod +x nas-quick-deploy.sh
./nas-quick-deploy.sh
```

## 📱 最終驗證清單

- [ ] 主頁正常載入
- [ ] 管理員後台可訪問
- [ ] LIFF 應用正常運作
- [ ] Webhook 驗證成功
- [ ] LINE 通知正常發送
- [ ] 講師綁定功能正常
- [ ] 報表簽到功能正常
- [ ] 補簽到功能正常
- [ ] Google Sheets 同步正常

## 📞 支援

如有問題，請檢查：
1. 應用日誌
2. 系統資源使用
3. 網路連線
4. 環境變數設定

---

**部署完成後，您的 FLB 簽到系統將在 NAS 上穩定運行！** 🎉

