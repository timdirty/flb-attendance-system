# ⚡ 快速指令速查表

常用的管理指令，複製貼上即可使用。

---

## 🚀 部署相關

### 完整部署流程

```bash
# 1. SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 2. 進入專案目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 3. 重新部署
sudo ./deploy-on-nas.sh

# 4. 查看日誌
sudo docker logs -f flb-line-bot
```

### 快速重啟

```bash
sudo docker restart flb-line-bot
```

---

## 🤖 AIbot 轉發

### 生成 API Key

```bash
openssl rand -hex 32
```

### 設定轉發

```bash
# 使用生成的 API Key
sudo ./setup-aibot-forward.sh YOUR_API_KEY_HERE
```

### 查看轉發狀態

```bash
curl http://localhost:3010/api/webhook-forward/status
```

### 測試轉發

```bash
# 替換 YOUR_API_KEY 為實際的 Key
curl -X POST https://AIbot.funlearnbar.synology.me/api/webhook/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Forwarded-From: FLB-LINE-Bot" \
  -d '{
    "events": [{
      "type": "message",
      "message": {"type": "text", "text": "測試"},
      "source": {"userId": "test"},
      "timestamp": 1640000000000
    }]
  }'
```

---

## 🐳 Docker 管理

### 查看容器

```bash
# 運行中的容器
sudo docker ps

# 只看 FLB
sudo docker ps | grep flb-line-bot
```

### 查看日誌

```bash
# 即時日誌
sudo docker logs -f flb-line-bot

# 最近 50 行
sudo docker logs --tail 50 flb-line-bot

# 只看轉發
sudo docker logs -f flb-line-bot | grep "轉發"

# 只看錯誤
sudo docker logs -f flb-line-bot | grep -i error
```

### 重啟/停止/啟動

```bash
# 重啟
sudo docker restart flb-line-bot

# 停止
sudo docker stop flb-line-bot

# 啟動
sudo docker start flb-line-bot
```

### 資源使用

```bash
# 查看 CPU/記憶體
sudo docker stats flb-line-bot

# 單次快照
sudo docker stats --no-stream flb-line-bot
```

---

## 🔍 監控與除錯

### 健康檢查

```bash
# FLB 健康檢查
curl http://localhost:3010/health

# AIbot 健康檢查
curl https://AIbot.funlearnbar.synology.me/health
```

### 查看轉發統計

```bash
# FLB 轉發狀態
curl http://localhost:3010/api/webhook-forward/status | jq

# AIbot 處理統計
curl https://AIbot.funlearnbar.synology.me/api/stats
```

### 進入容器

```bash
# 進入容器 shell
sudo docker exec -it flb-line-bot sh

# 查看檔案
sudo docker exec flb-line-bot ls -la /app

# 查看環境變數
sudo docker exec flb-line-bot env
```

---

## 🛠️ 轉發管理

### 啟用/停用轉發

```bash
# 停用 AIbot 轉發
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 重新啟用
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 移除並重新設定

```bash
# 移除
curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/AIbot"

# 重新設定（記得替換 YOUR_API_KEY）
sudo ./setup-aibot-forward.sh YOUR_API_KEY
```

---

## 🔐 安全性檢查

### 檢查 API Key

```bash
# 檢查 AIbot 的 .env
cd /path/to/AIbot
cat .env | grep WEBHOOK_FORWARD_API_KEY
```

### 檢查轉發設定中的 API Key

```bash
curl http://localhost:3010/api/webhook-forward/status | jq '.targets[0].headers'
```

---

## 🧪 測試指令

### 測試 LINE 對話

```
在 LINE 中發送：

1. 系統指令測試：
   #help
   #簽到
   #本期課程規劃

2. AI 對話測試：
   樂程坊在哪裡？
   課程費用是多少？
   老師是誰？
```

### 查看處理結果

```bash
# FLB 日誌（即時）
sudo docker logs -f flb-line-bot

# AIbot 日誌（即時）
cd /path/to/AIbot
sudo docker-compose logs -f app
```

---

## 📊 效能分析

### 查看回應時間

```bash
# 測試 FLB 回應
time curl http://localhost:3010/health

# 測試 AIbot 回應
time curl https://AIbot.funlearnbar.synology.me/health

# 測試轉發延遲
time curl -X POST https://AIbot.funlearnbar.synology.me/api/webhook/receive \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Forwarded-From: FLB-LINE-Bot" \
  -d '{"events":[]}'
```

---

## 🔄 更新流程

### 本機修改後更新

```bash
# 1. 本機修改程式碼
# 2. 等待 Synology Drive 自動同步（約 5-10 秒）
# 3. SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 4. 重新部署
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
sudo ./deploy-on-nas.sh

# 5. 確認更新
sudo docker logs --tail 20 flb-line-bot
```

---

## 🆘 緊急處理

### 服務異常

```bash
# 1. 查看日誌找錯誤
sudo docker logs --tail 100 flb-line-bot | grep -i error

# 2. 重啟服務
sudo docker restart flb-line-bot

# 3. 如果還是不行，重新部署
sudo docker stop flb-line-bot && sudo docker rm flb-line-bot
sudo ./deploy-on-nas.sh
```

### 轉發失敗

```bash
# 1. 檢查 AIbot 是否運行
curl https://AIbot.funlearnbar.synology.me/health

# 2. 檢查轉發設定
curl http://localhost:3010/api/webhook-forward/status

# 3. 暫時停用轉發
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -d '{"enabled": false}'

# 4. 查看錯誤日誌
sudo docker logs --tail 100 flb-line-bot | grep "轉發失敗"
```

### 容器無法啟動

```bash
# 1. 查看容器狀態
sudo docker ps -a | grep flb-line-bot

# 2. 查看完整日誌
sudo docker logs flb-line-bot

# 3. 檢查 Port 是否被占用
sudo netstat -tlnp | grep 3010

# 4. 強制移除並重建
sudo docker rm -f flb-line-bot
sudo docker-compose up -d --force-recreate
```

---

## 💡 實用技巧

### 建立指令別名（本機）

在本機的 `~/.zshrc` 或 `~/.bashrc` 加入：

```bash
# NAS 快速連線
alias nas-ssh='ssh ctctim14@YOUR_NAS_IP'
alias nas-flb='ssh ctctim14@YOUR_NAS_IP "cd /volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line） && bash"'

# FLB 快速指令（透過 SSH）
alias flb-logs='ssh ctctim14@YOUR_NAS_IP "sudo docker logs -f flb-line-bot"'
alias flb-restart='ssh ctctim14@YOUR_NAS_IP "sudo docker restart flb-line-bot"'
alias flb-status='ssh ctctim14@YOUR_NAS_IP "curl -s http://localhost:3010/api/webhook-forward/status | jq"'
alias flb-health='ssh ctctim14@YOUR_NAS_IP "curl http://localhost:3010/health"'

# 重新載入配置
source ~/.zshrc  # 或 source ~/.bashrc
```

使用：

```bash
flb-logs      # 直接看日誌
flb-restart   # 直接重啟
flb-status    # 直接看狀態
```

### 建立 NAS 端別名

SSH 到 NAS 後，編輯 `~/.bashrc`：

```bash
nano ~/.bashrc

# 加入：
alias flb-cd='cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"'
alias flb-logs='sudo docker logs -f flb-line-bot'
alias flb-restart='sudo docker restart flb-line-bot'
alias flb-deploy='sudo ./deploy-on-nas.sh'
alias flb-status='curl -s http://localhost:3010/api/webhook-forward/status | jq'

# 儲存並套用
source ~/.bashrc
```

---

## 👥 群組管理 API

### 查看所有群組

```bash
# 本機測試
curl http://localhost:3000/api/groups | jq

# NAS 上
curl http://localhost:3010/api/groups | jq
```

### 查看群組統計

```bash
# 本機測試
curl http://localhost:3000/api/group-stats | jq

# NAS 上
curl http://localhost:3010/api/group-stats | jq
```

### 查看單一群組

```bash
# 替換 GROUP_ID 為實際的群組 ID
curl http://localhost:3010/api/groups/GROUP_ID | jq
```

### 搜尋群組

```bash
# 搜尋包含「測試」的群組
curl http://localhost:3010/api/groups/search/測試 | jq
```

### 更新群組名稱

```bash
# 替換 GROUP_ID 和群組名稱
curl -X PATCH http://localhost:3010/api/groups/GROUP_ID \
  -H "Content-Type: application/json" \
  -d '{"groupName": "新的群組名稱"}' | jq
```

### 查看群組日誌

```bash
# 只看群組相關日誌
sudo docker logs -f flb-line-bot | grep "群組"

# 只看群組記錄成功的日誌
sudo docker logs -f flb-line-bot | grep "群組活動已記錄"
```

---

## 📚 文檔快速連結

| 文檔 | 說明 |
|------|------|
| [AIBOT_INTEGRATION.md](./AIBOT_INTEGRATION.md) | AIbot 完整整合指南 |
| [AIBOT_SETUP.md](./AIBOT_SETUP.md) | AIbot 快速設定 |
| [WEBHOOK_FORWARD_GUIDE.md](./WEBHOOK_FORWARD_GUIDE.md) | Webhook 轉發完整文檔 |
| [DOCKER_COMMANDS.md](./DOCKER_COMMANDS.md) | Docker 指令大全 |
| [SYNOLOGY_DRIVE_DEPLOY.md](./SYNOLOGY_DRIVE_DEPLOY.md) | Synology Drive 部署 |
| [GROUP_TRACKING.md](./docs/GROUP_TRACKING.md) | 群組資訊記錄功能 |

---

**儲存這份清單，隨時使用！** ⚡

