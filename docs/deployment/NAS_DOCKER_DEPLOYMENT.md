# 🐳 NAS Docker 部署完整指南

將 LINE Bot 從 Railway 遷移到 Synology NAS Docker 運行。

---

## 📋 目錄

1. [前置準備](#前置準備)
2. [建立 Docker 映像](#建立-docker-映像)
3. [部署到 NAS](#部署到-nas)
4. [設定 Webhook](#設定-webhook)
5. [資料持久化](#資料持久化)
6. [監控與維護](#監控與維護)
7. [從 Railway 遷移](#從-railway-遷移)

---

## 🔧 前置準備

### 1. NAS 需求

- ✅ Synology NAS (DSM 7.0+)
- ✅ Docker 套件已安裝
- ✅ 至少 1GB 可用 RAM
- ✅ 10GB 可用硬碟空間
- ✅ 固定 IP 或 DDNS（用於 Webhook）

### 2. 網路需求

- ✅ 公開 IP 或使用 Cloudflare Tunnel
- ✅ 開放 Port（如 3000）
- ✅ SSL 憑證（Let's Encrypt 或 Cloudflare）

### 3. 本機需求

- ✅ Docker Desktop (Mac/Windows)
- ✅ Git 已安裝
- ✅ 可以連線到 NAS

---

## 🐳 建立 Docker 映像

### 步驟 1：建立 Dockerfile

在專案根目錄建立 `Dockerfile`：

```dockerfile
# 使用 Node.js 20 LTS
FROM node:20-slim

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴（生產環境）
RUN npm ci --only=production

# 複製所有必要檔案
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/
COPY data/ ./data/

# 建立 data 目錄（如果不存在）
RUN mkdir -p /app/data

# 暴露 Port 3000
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用
CMD ["node", "server.js"]
```

### 步驟 2：建立 .dockerignore

```
node_modules
.git
.gitignore
.env
*.md
docs/
CLEANUP_REPORT.md
.DS_Store
*.log
```

### 步驟 3：建立健康檢查端點

在 `server.js` 中加入（如果還沒有）：

```javascript
// 健康檢查端點
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

### 步驟 4：建立 Docker Compose 檔案

建立 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  flb-line-bot:
    build: .
    image: flb-line-bot:latest
    container_name: flb-line-bot
    restart: unless-stopped
    
    ports:
      - "3000:3000"
    
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TZ=Asia/Taipei
      
      # LINE Bot 設定（從 .env 讀取）
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - LINE_USER_ID=${LINE_USER_ID}
      
      # Google Sheets 設定
      - GOOGLE_SHEETS_API=${GOOGLE_SHEETS_API}
      - GOOGLE_SHEETS_COOKIE=${GOOGLE_SHEETS_COOKIE}
    
    volumes:
      # 資料持久化
      - ./data:/app/data
      # 日誌
      - ./logs:/app/logs
    
    networks:
      - flb-network
    
    # 資源限制
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M

networks:
  flb-network:
    driver: bridge
```

---

## 📦 部署到 NAS

### 方案 A：使用 Docker Hub（推薦）

#### 1. 建立並推送映像

```bash
# 登入 Docker Hub
docker login

# 建立映像
docker build -t yourusername/flb-line-bot:latest .

# 推送到 Docker Hub
docker push yourusername/flb-line-bot:latest
```

#### 2. 在 NAS 上拉取並運行

透過 NAS Docker GUI：
1. 開啟 Docker 套件
2. 映像 → 新增 → 從 URL 新增
3. 輸入：`yourusername/flb-line-bot:latest`
4. 下載完成後，啟動容器

或使用 SSH：

```bash
# SSH 連線到 NAS
ssh admin@your-nas-ip

# 拉取映像
docker pull yourusername/flb-line-bot:latest

# 運行容器
docker run -d \
  --name flb-line-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -e LINE_CHANNEL_ACCESS_TOKEN="your_token" \
  -e LINE_CHANNEL_SECRET="your_secret" \
  -e LINE_USER_ID="your_user_id" \
  -e GOOGLE_SHEETS_API="your_api" \
  -e GOOGLE_SHEETS_COOKIE="your_cookie" \
  -e TZ="Asia/Taipei" \
  -v /volume1/docker/flb-line-bot/data:/app/data \
  -v /volume1/docker/flb-line-bot/logs:/app/logs \
  yourusername/flb-line-bot:latest
```

### 方案 B：直接在 NAS 上建立（需要較多資源）

```bash
# SSH 連線到 NAS
ssh admin@your-nas-ip

# 建立專案目錄
mkdir -p /volume1/docker/flb-line-bot
cd /volume1/docker/flb-line-bot

# 從 GitHub 拉取程式碼
git clone https://github.com/timdirty/flb-attendance-system.git .

# 建立 .env 檔案
nano .env
# 填入環境變數（參考下方範例）

# 使用 Docker Compose 啟動
docker-compose up -d
```

---

## 🔐 環境變數設定

建立 `.env` 檔案：

```env
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_USER_ID=your_line_user_id_here

# Google Sheets 設定
GOOGLE_SHEETS_API=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
GOOGLE_SHEETS_COOKIE=your_cookie_here

# 伺服器設定
PORT=3000
NODE_ENV=production
TZ=Asia/Taipei
```

⚠️ **重要**：不要將 `.env` 提交到 Git！

---

## 🌐 設定 Webhook

### 步驟 1：設定反向代理（Synology）

1. **開啟 DSM 控制台** → 登入入口網站 → 進階
2. 點擊「反向代理伺服器」
3. 建立新規則：

```
描述：LINE Bot Webhook
來源：
  - 通訊協定：HTTPS
  - 主機名稱：linebot.yourdomain.com
  - 連接埠：443

目的地：
  - 通訊協定：HTTP
  - 主機名稱：localhost
  - 連接埠：3000
```

### 步驟 2：設定 SSL 憑證

**方式 A：Let's Encrypt（推薦）**

1. 控制台 → 安全性 → 憑證
2. 新增 → Let's Encrypt
3. 輸入網域名稱
4. 綁定到反向代理

**方式 B：Cloudflare**（更簡單）

1. 使用 Cloudflare Tunnel（Zero Trust）
2. 不需要開放任何 Port
3. 自動 SSL

### 步驟 3：設定 LINE Webhook URL

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Channel
3. Messaging API 設定
4. Webhook URL：`https://linebot.yourdomain.com/webhook`
5. 啟用「Use webhook」
6. 點擊「Verify」測試

---

## 💾 資料持久化

### 重要資料目錄

```
/volume1/docker/flb-line-bot/
├── data/              # 本地資料庫
│   ├── users.json     # 使用者資料
│   ├── bindings.json  # 綁定資料
│   └── sync_flag.json # 同步標記
└── logs/              # 日誌檔案
    └── app.log
```

### 備份策略

#### 方式 A：使用 Synology 快照

1. 控制台 → 共用資料夾
2. 編輯 `docker` 資料夾
3. 啟用「快照複寫」
4. 設定排程（每日 3:00 AM）

#### 方式 B：自動備份腳本

建立 `backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/volume1/backup/flb-line-bot"
DATA_DIR="/volume1/docker/flb-line-bot/data"
DATE=$(date +%Y%m%d_%H%M%S)

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 備份資料
tar -czf $BACKUP_DIR/data_$DATE.tar.gz -C $DATA_DIR .

# 保留最近 7 天的備份
find $BACKUP_DIR -name "data_*.tar.gz" -mtime +7 -delete

echo "備份完成: $BACKUP_DIR/data_$DATE.tar.gz"
```

設定 Cron Job：
```bash
# 每天凌晨 3:00 備份
0 3 * * * /volume1/docker/flb-line-bot/backup.sh
```

---

## 📊 監控與維護

### 查看日誌

```bash
# 即時日誌
docker logs -f flb-line-bot

# 最近 100 行
docker logs --tail 100 flb-line-bot

# 帶時間戳記
docker logs -t flb-line-bot
```

### 重啟容器

```bash
# 重啟
docker restart flb-line-bot

# 停止
docker stop flb-line-bot

# 啟動
docker start flb-line-bot

# 重新建立（更新後）
docker-compose down
docker-compose up -d
```

### 更新應用

```bash
# 從 GitHub 拉取最新版
cd /volume1/docker/flb-line-bot
git pull

# 重新建立映像
docker-compose build

# 重新啟動
docker-compose down
docker-compose up -d
```

### 健康檢查

```bash
# 檢查容器狀態
docker ps | grep flb-line-bot

# 檢查健康狀態
curl http://localhost:3000/health

# 檢查資源使用
docker stats flb-line-bot
```

---

## 🔄 從 Railway 遷移

### 步驟 1：備份 Railway 資料

```bash
# 下載環境變數
# Railway Dashboard → Settings → Environment Variables → Export

# 下載資料檔案（如果有）
# Railway Dashboard → Data → Export
```

### 步驟 2：在 NAS 部署新版本

按照上面的步驟部署到 NAS。

### 步驟 3：測試 NAS 版本

```bash
# 測試健康檢查
curl https://linebot.yourdomain.com/health

# 測試 Webhook（在 LINE Developers Console）
```

### 步驟 4：切換 Webhook URL

1. 前往 LINE Developers Console
2. 更新 Webhook URL：
   - 舊：`https://your-app.up.railway.app/webhook`
   - 新：`https://linebot.yourdomain.com/webhook`
3. 驗證新 URL

### 步驟 5：監控 24 小時

觀察是否有任何錯誤或問題。

### 步驟 6：關閉 Railway

確認一切正常後：
1. Railway Dashboard → Settings
2. 刪除專案或停用服務

---

## 🎯 效能優化

### 1. 使用 PM2（可選）

在 Dockerfile 中：

```dockerfile
# 安裝 PM2
RUN npm install -g pm2

# 使用 PM2 啟動
CMD ["pm2-runtime", "start", "server.js", "--name", "flb-line-bot"]
```

### 2. 資源限制

在 `docker-compose.yml` 中已設定：
- CPU: 最多 1 核心
- 記憶體: 最多 512MB

### 3. 日誌輪替

建立 `logrotate.conf`：

```
/volume1/docker/flb-line-bot/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## ❓ 常見問題

### Q1: Webhook 驗證失敗？

**A:** 檢查：
1. 反向代理設定是否正確
2. SSL 憑證是否有效
3. Port 3000 是否開放
4. 防火牆設定

### Q2: 容器一直重啟？

**A:** 檢查：
```bash
docker logs flb-line-bot
```
可能原因：
- 環境變數缺失
- Port 衝突
- 記憶體不足

### Q3: 資料遺失？

**A:** 確認 Volume 掛載：
```bash
docker inspect flb-line-bot | grep Mounts -A 10
```

### Q4: 如何使用 Cloudflare Tunnel？

**A:** 請參考 `CLOUDFLARE_TUNNEL.md`（待建立）

---

## 📚 相關文件

- [Docker 官方文件](https://docs.docker.com/)
- [Synology Docker 套件](https://www.synology.com/zh-tw/dsm/packages/Docker)
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)

---

## ✅ 檢查清單

部署前：
- [ ] NAS Docker 已安裝
- [ ] 網域和 SSL 已設定
- [ ] 環境變數已準備
- [ ] 備份策略已規劃

部署中：
- [ ] Dockerfile 已建立
- [ ] 映像已建立並推送
- [ ] 容器已啟動
- [ ] 健康檢查通過

部署後：
- [ ] Webhook 已設定
- [ ] LINE Bot 可正常回應
- [ ] 資料持久化正常
- [ ] 監控已設定
- [ ] Railway 已關閉

---

## 🎊 完成！

您的 LINE Bot 現在運行在 NAS 上了！

有任何問題請參考日誌或聯繫技術支援。

