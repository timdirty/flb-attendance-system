# 🐳 Docker 實用指令速查表

快速管理 FLB LINE Bot 的 Docker 容器。

---

## 🚀 基本操作

### 查看容器

```bash
# 查看運行中的容器
docker ps

# 查看所有容器（包含停止的）
docker ps -a

# 只看 FLB LINE Bot
docker ps | grep flb-line-bot

# 查看容器詳細資訊
docker inspect flb-line-bot
```

### 啟動/停止/重啟

```bash
# 啟動容器
docker start flb-line-bot

# 停止容器
docker stop flb-line-bot

# 重啟容器（最常用）
docker restart flb-line-bot

# 強制停止
docker kill flb-line-bot
```

### 刪除容器

```bash
# 停止並刪除容器
docker stop flb-line-bot && docker rm flb-line-bot

# 強制刪除（即使運行中）
docker rm -f flb-line-bot
```

---

## 📋 查看日誌

### 即時日誌（最常用）

```bash
# 即時顯示日誌（按 Ctrl+C 退出）
docker logs -f flb-line-bot

# 顯示最近 50 行
docker logs --tail 50 flb-line-bot

# 顯示最近 100 行並持續追蹤
docker logs --tail 100 -f flb-line-bot

# 顯示最近 10 分鐘的日誌
docker logs --since 10m flb-line-bot

# 顯示今天的日誌
docker logs --since $(date -u +%Y-%m-%dT00:00:00) flb-line-bot
```

### 日誌搜尋

```bash
# 搜尋包含 "error" 的日誌
docker logs flb-line-bot 2>&1 | grep -i error

# 搜尋包含 "webhook" 的日誌
docker logs flb-line-bot 2>&1 | grep webhook

# 搜尋最近的錯誤
docker logs --tail 500 flb-line-bot 2>&1 | grep -i error
```

---

## 💻 進入容器

### 執行指令

```bash
# 進入容器的 Shell
docker exec -it flb-line-bot sh

# 或使用 bash（如果有）
docker exec -it flb-line-bot bash

# 執行單一指令
docker exec flb-line-bot ls -la /app
docker exec flb-line-bot cat /app/data/users.json
docker exec flb-line-bot node -v

# 查看環境變數
docker exec flb-line-bot env
docker exec flb-line-bot env | grep LINE
```

### 進入容器後的常用指令

```bash
# 進入容器
docker exec -it flb-line-bot sh

# 在容器內：
ls -la                    # 查看檔案
cd /app                   # 進入應用目錄
cat data/users.json       # 查看資料
ps aux                    # 查看執行中的程序
df -h                     # 查看磁碟使用
exit                      # 離開容器
```

---

## 📊 監控與統計

### 資源使用

```bash
# 即時查看資源使用（CPU、記憶體）
docker stats flb-line-bot

# 查看單次快照
docker stats --no-stream flb-line-bot

# 查看所有容器的資源使用
docker stats
```

### 容器資訊

```bash
# 查看容器佔用的磁碟空間
docker system df

# 查看容器詳細配置
docker inspect flb-line-bot

# 查看容器的 Port 映射
docker port flb-line-bot

# 查看容器的環境變數
docker inspect flb-line-bot | grep -A 20 '"Env"'

# 查看容器的 Volume 掛載
docker inspect flb-line-bot | grep -A 10 '"Mounts"'
```

---

## 🏗️ 映像管理

### 查看映像

```bash
# 列出所有映像
docker images

# 只看 FLB 相關
docker images | grep flb

# 查看映像詳情
docker inspect flb-line-bot:latest
```

### 建立映像

```bash
# 從 Dockerfile 建立
docker build -t flb-line-bot:latest .

# 不使用快取重新建立
docker build --no-cache -t flb-line-bot:latest .

# 建立並標記版本
docker build -t flb-line-bot:v1.0 .
```

### 清理映像

```bash
# 刪除未使用的映像
docker image prune

# 刪除所有未使用的映像
docker image prune -a

# 刪除特定映像
docker rmi flb-line-bot:latest

# 強制刪除
docker rmi -f flb-line-bot:latest
```

---

## 🔄 更新與重新部署

### 快速更新流程

```bash
# 1. 停止並刪除舊容器
docker stop flb-line-bot && docker rm flb-line-bot

# 2. 重新建立映像
docker build -t flb-line-bot:latest .

# 3. 啟動新容器
docker run -d \
  --name flb-line-bot \
  --restart unless-stopped \
  -p 3010:3010 \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/logs:/app/logs" \
  flb-line-bot:latest

# 4. 查看日誌
docker logs -f flb-line-bot
```

### 使用 Docker Compose

```bash
# 啟動
docker-compose up -d

# 停止
docker-compose down

# 重新建立並啟動
docker-compose up -d --build

# 查看日誌
docker-compose logs -f

# 重啟服務
docker-compose restart
```

---

## 🧹 清理與維護

### 清理未使用的資源

```bash
# 清理停止的容器
docker container prune

# 清理未使用的映像
docker image prune

# 清理未使用的 Volume
docker volume prune

# 清理未使用的網路
docker network prune

# 清理所有未使用的資源（危險！）
docker system prune

# 清理所有（包含運行中的容器，超級危險！）
docker system prune -a --volumes
```

### 查看空間使用

```bash
# 查看 Docker 佔用的總空間
docker system df

# 詳細顯示
docker system df -v
```

---

## 🔍 故障排除

### 常見問題診斷

```bash
# 容器是否運行？
docker ps | grep flb-line-bot

# 容器退出原因
docker inspect flb-line-bot | grep -A 5 '"State"'

# 查看最後 50 行日誌找錯誤
docker logs --tail 50 flb-line-bot 2>&1 | grep -i error

# 測試容器內的網路
docker exec flb-line-bot ping -c 3 google.com

# 測試容器內的服務
docker exec flb-line-bot curl http://localhost:3010/health

# 查看容器的啟動指令
docker inspect flb-line-bot | grep -A 5 '"Cmd"'
```

### 健康檢查

```bash
# 查看健康狀態
docker inspect --format='{{.State.Health.Status}}' flb-line-bot

# 查看健康檢查日誌
docker inspect --format='{{json .State.Health}}' flb-line-bot
```

---

## ⚡ 快速指令別名

在 `~/.zshrc` 或 `~/.bashrc` 加入：

```bash
# FLB LINE Bot 快速指令
alias flb-logs='docker logs -f flb-line-bot'
alias flb-logs50='docker logs --tail 50 flb-line-bot'
alias flb-restart='docker restart flb-line-bot'
alias flb-stop='docker stop flb-line-bot'
alias flb-start='docker start flb-line-bot'
alias flb-status='docker ps | grep flb-line-bot'
alias flb-stats='docker stats --no-stream flb-line-bot'
alias flb-shell='docker exec -it flb-line-bot sh'
alias flb-health='docker exec flb-line-bot curl http://localhost:3010/health'
alias flb-errors='docker logs --tail 200 flb-line-bot 2>&1 | grep -i error'

# 重新載入配置
source ~/.zshrc  # 或 source ~/.bashrc
```

使用：
```bash
flb-logs      # 查看即時日誌
flb-restart   # 重啟
flb-status    # 查看狀態
flb-health    # 健康檢查
```

---

## 🏠 NAS 專用（需要 sudo）

如果在 NAS 上需要 sudo：

```bash
# 方式 1：每次加 sudo
alias flb-logs='sudo docker logs -f flb-line-bot'
alias flb-restart='sudo docker restart flb-line-bot'

# 方式 2：建立 function
flb-logs() {
    ssh admin@YOUR_NAS_IP "docker logs -f flb-line-bot"
}

flb-restart() {
    ssh admin@YOUR_NAS_IP "docker restart flb-line-bot"
}
```

---

## 📦 備份與還原

### 備份容器資料

```bash
# 備份 data 目錄
docker cp flb-line-bot:/app/data ./backup/data-$(date +%Y%m%d)

# 或直接複製本機的 Volume
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 匯出容器為映像
docker commit flb-line-bot flb-line-bot:backup-$(date +%Y%m%d)
docker save flb-line-bot:backup-$(date +%Y%m%d) | gzip > flb-backup-$(date +%Y%m%d).tar.gz
```

### 還原

```bash
# 還原資料
docker cp ./backup/data-20251004/. flb-line-bot:/app/data/

# 載入備份映像
docker load < flb-backup-20251004.tar.gz
```

---

## 🎯 最常用的 10 個指令

```bash
1. docker logs -f flb-line-bot          # 查看即時日誌
2. docker restart flb-line-bot          # 重啟容器
3. docker ps | grep flb-line-bot        # 查看狀態
4. docker stats flb-line-bot            # 查看資源使用
5. docker exec -it flb-line-bot sh      # 進入容器
6. docker logs --tail 50 flb-line-bot   # 查看最近日誌
7. docker stop flb-line-bot             # 停止容器
8. docker start flb-line-bot            # 啟動容器
9. docker inspect flb-line-bot          # 查看詳細資訊
10. docker-compose restart              # 重啟（使用 compose）
```

---

## 💡 實用技巧

### 1. 即時監控日誌並過濾

```bash
# 只看包含 "webhook" 的日誌
docker logs -f flb-line-bot 2>&1 | grep --line-buffered webhook

# 只看錯誤
docker logs -f flb-line-bot 2>&1 | grep --line-buffered -i error
```

### 2. 自動重啟失敗的容器

```bash
# 建立容器時加上重啟策略
docker run -d --restart unless-stopped ...
```

### 3. 限制日誌大小

```bash
# 限制日誌檔案大小（在 docker-compose.yml）
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 4. 快速檢查容器健康

```bash
# 一行指令檢查所有
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 🆘 緊急情況

### 容器無法停止

```bash
# 強制停止
docker kill flb-line-bot

# 如果還是不行
sudo systemctl restart docker
```

### 容器一直重啟

```bash
# 查看為什麼重啟
docker logs --tail 100 flb-line-bot

# 停止自動重啟
docker update --restart=no flb-line-bot
docker stop flb-line-bot
```

### Docker 服務異常

```bash
# 重啟 Docker 服務（NAS）
sudo synoservicecfg --restart pkgctl-Docker

# Linux
sudo systemctl restart docker
```

---

**儲存這份清單，隨時查閱！** 📚

