# 🚀 快速部署到 NAS

5 分鐘內將 LINE Bot 部署到 Synology NAS！

---

## 📋 準備工作

確認您有：
- ✅ Synology NAS (DSM 7.0+)
- ✅ NAS 已安裝 Docker 套件
- ✅ 可以 SSH 連線到 NAS
- ✅ Railway 的環境變數（LINE tokens、Google Sheets API等）

---

## 🎯 方式一：在本機建立映像（推薦）

### 步驟 1：準備環境變數

```bash
# 複製範例檔案
cp env.example .env

# 編輯並填入實際值
nano .env
```

填入：
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_USER_ID`
- `GOOGLE_SHEETS_API`
- `GOOGLE_SHEETS_COOKIE`

### 步驟 2：建立並推送映像

```bash
# 建立映像
docker build -t flb-line-bot:latest .

# 儲存映像為檔案
docker save flb-line-bot:latest | gzip > flb-line-bot.tar.gz

# 上傳到 NAS
scp flb-line-bot.tar.gz admin@your-nas-ip:/volume1/docker/
```

### 步驟 3：在 NAS 上載入並運行

```bash
# SSH 連線到 NAS
ssh admin@your-nas-ip

# 載入映像
cd /volume1/docker
docker load < flb-line-bot.tar.gz

# 建立資料夾
mkdir -p /volume1/docker/flb-line-bot/{data,logs}

# 運行容器
docker run -d \
  --name flb-line-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -e LINE_CHANNEL_ACCESS_TOKEN="your_token" \
  -e LINE_CHANNEL_SECRET="your_secret" \
  -e LINE_USER_ID="your_user_id" \
  -e GOOGLE_SHEETS_API="your_api_url" \
  -e GOOGLE_SHEETS_COOKIE="your_cookie" \
  -e TZ="Asia/Taipei" \
  -v /volume1/docker/flb-line-bot/data:/app/data \
  -v /volume1/docker/flb-line-bot/logs:/app/logs \
  flb-line-bot:latest

# 檢查狀態
docker ps | grep flb-line-bot
docker logs flb-line-bot
```

---

## 🎯 方式二：使用 Docker Hub

### 步驟 1：推送到 Docker Hub

```bash
# 登入 Docker Hub
docker login

# 標記映像
docker tag flb-line-bot:latest yourusername/flb-line-bot:latest

# 推送
docker push yourusername/flb-line-bot:latest
```

### 步驟 2：在 NAS 上拉取並運行

```bash
# SSH 連線到 NAS
ssh admin@your-nas-ip

# 拉取映像
docker pull yourusername/flb-line-bot:latest

# 運行容器（同上）
docker run -d \
  --name flb-line-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -e LINE_CHANNEL_ACCESS_TOKEN="your_token" \
  -e LINE_CHANNEL_SECRET="your_secret" \
  -e LINE_USER_ID="your_user_id" \
  -e GOOGLE_SHEETS_API="your_api_url" \
  -e GOOGLE_SHEETS_COOKIE="your_cookie" \
  -e TZ="Asia/Taipei" \
  -v /volume1/docker/flb-line-bot/data:/app/data \
  -v /volume1/docker/flb-line-bot/logs:/app/logs \
  yourusername/flb-line-bot:latest
```

---

## 🌐 設定 Webhook

### 步驟 1：設定反向代理

1. 開啟 DSM → **控制台** → **登入入口網站** → **進階**
2. 點擊 **反向代理伺服器** → **新增**
3. 設定：
   ```
   描述：LINE Bot
   來源：HTTPS, linebot.yourdomain.com, 443
   目的地：HTTP, localhost, 3000
   ```
4. 點擊「確定」

### 步驟 2：設定 SSL

1. **控制台** → **安全性** → **憑證**
2. 新增 Let's Encrypt 憑證
3. 網域：`linebot.yourdomain.com`
4. 綁定到反向代理

### 步驟 3：更新 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Channel → **Messaging API**
3. Webhook URL：`https://linebot.yourdomain.com/webhook`
4. 點擊 **Verify** 測試

---

## ✅ 驗證部署

### 1. 測試健康檢查

```bash
# 從 NAS
curl http://localhost:3000/health

# 從外部
curl https://linebot.yourdomain.com/health
```

應該回傳：
```json
{
  "status": "ok",
  "service": "FLB LINE Bot",
  "timestamp": "2025-10-04T...",
  "uptime": 123
}
```

### 2. 測試 LINE Bot

1. 在 LINE 傳送訊息給 Bot
2. 檢查是否有回應
3. 查看 NAS 日誌：`docker logs flb-line-bot`

---

## 🛠️ 常用指令

```bash
# 查看即時日誌
docker logs -f flb-line-bot

# 重啟容器
docker restart flb-line-bot

# 停止容器
docker stop flb-line-bot

# 啟動容器
docker start flb-line-bot

# 查看資源使用
docker stats flb-line-bot

# 進入容器
docker exec -it flb-line-bot sh

# 查看環境變數
docker exec flb-line-bot env
```

---

## 🔄 更新應用

```bash
# 方式 1：重新建立映像
docker build -t flb-line-bot:latest .
docker save flb-line-bot:latest | gzip > flb-line-bot.tar.gz
scp flb-line-bot.tar.gz admin@your-nas-ip:/volume1/docker/

# 在 NAS 上
ssh admin@your-nas-ip
docker stop flb-line-bot
docker rm flb-line-bot
docker load < /volume1/docker/flb-line-bot.tar.gz
# 重新運行容器（使用上面的 docker run 指令）

# 方式 2：使用 Docker Hub
docker push yourusername/flb-line-bot:latest
# 在 NAS 上
docker pull yourusername/flb-line-bot:latest
docker stop flb-line-bot
docker rm flb-line-bot
# 重新運行容器
```

---

## 💾 備份資料

```bash
# 手動備份
tar -czf flb-backup-$(date +%Y%m%d).tar.gz \
  /volume1/docker/flb-line-bot/data

# 自動備份（加入排程）
# DSM 控制台 → 任務排程 → 新增 → 使用者定義的指令碼
```

---

## ❓ 常見問題

### Q: 容器無法啟動？
```bash
# 檢查日誌
docker logs flb-line-bot

# 檢查 Port 是否被占用
netstat -tuln | grep 3000
```

### Q: Webhook 驗證失敗？
1. 確認反向代理設定正確
2. 確認 SSL 憑證有效
3. 確認防火牆開放 443 port
4. 測試：`curl https://linebot.yourdomain.com/health`

### Q: 資料遺失？
確認 Volume 掛載正確：
```bash
docker inspect flb-line-bot | grep Mounts -A 10
```

---

## 📞 需要幫助？

- 查看完整文檔：`docs/deployment/NAS_DOCKER_DEPLOYMENT.md`
- 檢查日誌：`docker logs -f flb-line-bot`
- 測試健康檢查：`curl http://localhost:3000/health`

---

## ✨ 完成！

您的 LINE Bot 現在運行在 NAS 上了！

🎉 享受免費的自主託管服務！

