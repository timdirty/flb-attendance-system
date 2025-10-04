# 🚂 → 🏠 從 Railway 遷移到 NAS

完整的遷移指南，保證無痛轉移！

---

## 📋 第一步：從 Railway 導出環境變數

### 方式 A：使用 Railway Dashboard（推薦）

1. **前往 Railway**
   - 網址：https://railway.app/dashboard
   - 登入您的帳號

2. **選擇專案**
   - 找到您的 LINE Bot 專案
   - 點擊進入

3. **查看環境變數**
   - 點擊 **Variables** 標籤
   - 您會看到所有環境變數

4. **複製變數值**
   ```
   LINE_CHANNEL_ACCESS_TOKEN = ey...（複製這個值）
   LINE_CHANNEL_SECRET = 8f...（複製這個值）
   LINE_USER_ID = Udb...（複製這個值）
   GOOGLE_SHEETS_API = https://script.google.com/...（複製這個值）
   GOOGLE_SHEETS_COOKIE = NID=...（複製這個值）
   ```

### 方式 B：使用匯入腳本（更快）

```bash
# 執行互動式腳本
chmod +x import-from-railway.sh
./import-from-railway.sh

# 腳本會引導您輸入每個變數
# 直接從 Railway 複製貼上即可
```

### 方式 C：手動建立 .env

```bash
# 複製範例檔案
cp env.example .env

# 編輯檔案
nano .env

# 從 Railway 複製貼上每個值
```

---

## 🧪 第二步：本機測試

### 測試環境變數是否正確

```bash
# 檢查 .env 檔案
cat .env

# 確認有這些變數：
# LINE_CHANNEL_ACCESS_TOKEN=ey...
# LINE_CHANNEL_SECRET=8f...
# LINE_USER_ID=Udb...
# GOOGLE_SHEETS_API=https://...
# GOOGLE_SHEETS_COOKIE=NID=...
# PORT=3010
```

### 啟動本機測試

```bash
# 使用 Docker Compose 啟動
docker-compose up

# 或在背景執行
docker-compose up -d

# 查看日誌
docker logs -f flb-line-bot
```

### 測試健康檢查

```bash
# 測試服務是否正常
curl http://localhost:3010/health

# 應該看到：
# {
#   "status": "ok",
#   "service": "FLB LINE Bot",
#   "uptime": 5
# }
```

### 測試 Webhook（可選）

```bash
# 安裝 ngrok（如果還沒有）
brew install ngrok

# 啟動 ngrok
ngrok http 3010

# 會得到一個臨時網址，例如：
# https://abc123.ngrok.io

# 在 LINE Developers Console 暫時設定 Webhook：
# https://abc123.ngrok.io/webhook

# 從 LINE 傳訊息測試
```

---

## 🏠 第三步：部署到 NAS

### 選項 A：使用自動腳本（最簡單）

```bash
# 一鍵部署
./deploy-to-nas.sh

# 腳本會自動：
# ✓ 檢查環境
# ✓ 建立 Docker 映像
# ✓ 啟動容器
# ✓ 測試健康檢查
```

### 選項 B：手動部署

```bash
# 1. 建立 Docker 映像
docker build -t flb-line-bot:latest .

# 2. 儲存為檔案
docker save flb-line-bot:latest | gzip > flb-line-bot.tar.gz

# 3. 上傳到 NAS
scp flb-line-bot.tar.gz admin@YOUR_NAS_IP:/volume1/docker/
scp .env admin@YOUR_NAS_IP:/volume1/docker/flb-line-bot/

# 4. SSH 到 NAS
ssh admin@YOUR_NAS_IP

# 5. 載入映像
cd /volume1/docker
docker load < flb-line-bot.tar.gz

# 6. 建立資料夾
mkdir -p /volume1/docker/flb-line-bot/{data,logs}
cd /volume1/docker/flb-line-bot

# 7. 啟動容器（使用 .env 檔案）
docker run -d \
  --name flb-line-bot \
  --restart unless-stopped \
  -p 3010:3010 \
  --env-file .env \
  -v /volume1/docker/flb-line-bot/data:/app/data \
  -v /volume1/docker/flb-line-bot/logs:/app/logs \
  flb-line-bot:latest

# 8. 檢查狀態
docker ps | grep flb-line-bot
docker logs flb-line-bot
curl http://localhost:3010/health
```

---

## 🌐 第四步：設定 NAS 反向代理

### 在 Synology DSM 設定

1. **開啟控制台**
   - 控制台 → 登入入口網站 → 進階

2. **新增反向代理**
   ```
   描述：LINE Bot Webhook
   
   來源（外部）：
   - 通訊協定：HTTPS
   - 主機名稱：linebot.yourdomain.com
   - 連接埠：443
   
   目的地（內部）：
   - 通訊協定：HTTP
   - 主機名稱：localhost
   - 連接埠：3010
   ```

3. **設定 SSL 憑證**
   - 控制台 → 安全性 → 憑證
   - 新增 → Let's Encrypt
   - 網域：linebot.yourdomain.com
   - 綁定到反向代理

---

## 🔗 第五步：更新 LINE Webhook

### 在 LINE Developers Console

1. **前往設定頁面**
   - https://developers.line.biz/console/
   - 選擇您的 Channel
   - Messaging API 標籤

2. **更新 Webhook URL**
   ```
   舊：https://your-app.up.railway.app/webhook
   新：https://linebot.yourdomain.com/webhook
   ```

3. **驗證 Webhook**
   - 點擊 **Verify** 按鈕
   - 應該看到「Success」

4. **啟用 Webhook**
   - 確認「Use webhook」已開啟

---

## ✅ 第六步：驗證部署

### 檢查清單

- [ ] 容器正在運行
  ```bash
  docker ps | grep flb-line-bot
  ```

- [ ] 健康檢查正常
  ```bash
  curl http://localhost:3010/health
  curl https://linebot.yourdomain.com/health
  ```

- [ ] 日誌沒有錯誤
  ```bash
  docker logs flb-line-bot
  ```

- [ ] LINE Bot 有回應
  - 在 LINE 傳訊息給 Bot
  - Bot 應該正常回覆

- [ ] 功能測試
  - 測試簽到功能
  - 測試查詢功能
  - 測試課程規劃功能

---

## 🗑️ 第七步：關閉 Railway（等確認無誤）

### ⚠️ 重要：先觀察 24 小時

不要急著關閉 Railway，先確保 NAS 版本穩定運行。

### 觀察重點

- [ ] NAS 版本運行 24 小時無問題
- [ ] 所有功能測試通過
- [ ] 日誌沒有異常錯誤
- [ ] LINE Bot 回應正常
- [ ] 資料有正確儲存

### 確認無誤後關閉 Railway

1. **前往 Railway Dashboard**
   - https://railway.app/dashboard

2. **選擇專案**
   - 找到您的 LINE Bot 專案

3. **暫停服務（推薦先這樣）**
   - Settings → Pause Service
   - 保留 7 天，確認沒問題再刪除

4. **完全刪除（確定不需要後）**
   - Settings → Delete Project

---

## 💾 資料備份

### 設定自動備份

在 NAS 上建立備份腳本：

```bash
# SSH 到 NAS
ssh admin@YOUR_NAS_IP

# 建立備份腳本
cat > /volume1/docker/flb-line-bot/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/volume1/backup/flb-line-bot"
DATA_DIR="/volume1/docker/flb-line-bot/data"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $DATA_DIR .

# 保留最近 30 天
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete

echo "備份完成: backup_$DATE.tar.gz"
EOF

# 設定權限
chmod +x /volume1/docker/flb-line-bot/backup.sh

# 測試備份
/volume1/docker/flb-line-bot/backup.sh
```

### 設定定時備份

在 DSM 控制台：
1. 控制台 → 任務排程
2. 新增 → 排程的任務 → 使用者定義的指令碼
3. 設定：
   - 任務：FLB LINE Bot 備份
   - 使用者：root
   - 排程：每天 03:00
   - 指令碼：`/volume1/docker/flb-line-bot/backup.sh`

---

## 📊 效益對比

### 成本節省

| 項目 | Railway | NAS | 節省 |
|------|---------|-----|------|
| 月費 | $5-20 | $0 | 100% |
| 年費 | $60-240 | $0 | $60-240 |

### 效能提升

| 項目 | Railway | NAS |
|------|---------|-----|
| CPU | 共享 | 專屬 |
| 記憶體 | 限制 512MB | 可調整 |
| 儲存空間 | 1GB | 無限制 |
| 網路速度 | 依區域 | 本地快 |

---

## ❓ 常見問題

### Q: .env 檔案安全嗎？

**A:** 非常重要！
- ✅ `.env` 已加入 `.gitignore`
- ✅ 不會被提交到 Git
- ⚠️ 請勿分享給他人
- ⚠️ NAS 上要設定好權限

### Q: Railway 可以立刻刪除嗎？

**A:** 建議等 1 週
- 先暫停服務（Pause）
- 觀察 NAS 版本穩定性
- 確認無誤再刪除

### Q: 如果 NAS 當機怎麼辦？

**A:** 準備備援方案
- 定期備份資料（自動腳本）
- 保留 Railway 專案（暫停狀態）
- 緊急時可快速切回 Railway

### Q: 環境變數會過期嗎？

**A:** 可能會
- `LINE_CHANNEL_ACCESS_TOKEN` 可能過期
- `GOOGLE_SHEETS_COOKIE` 可能過期
- 定期檢查和更新

---

## 🎉 完成！

恭喜您成功從 Railway 遷移到 NAS！

### 後續維護

- 📋 查看日誌：`docker logs -f flb-line-bot`
- 🔄 重啟服務：`docker restart flb-line-bot`
- 💾 手動備份：`/volume1/docker/flb-line-bot/backup.sh`
- 📊 監控狀態：`docker stats flb-line-bot`

### 需要幫助？

- 📖 查看完整文檔：`docs/deployment/NAS_DOCKER_DEPLOYMENT.md`
- 🚀 快速部署指南：`QUICK_DEPLOY.md`
- 🔧 自動部署腳本：`./deploy-to-nas.sh`

---

**享受免費的自主託管！** 🎊

