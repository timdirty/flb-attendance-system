# 🔐 NAS Docker 權限問題解決方案

當您在 NAS 上執行 Docker 指令時遇到權限錯誤。

---

## ❌ 錯誤訊息

```
Got permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

---

## ✅ 解決方案

### 方案 1：使用 sudo（推薦）

```bash
# 使用 sudo 執行 Docker 指令
sudo docker logs -f flb-line-bot
sudo docker ps
sudo docker restart flb-line-bot
```

### 方案 2：將用戶加入 docker 群組（一勞永逸）

```bash
# 1. 使用 admin 或 root 執行
sudo synogroup --add docker ctctim14

# 2. 登出並重新登入
exit
ssh ctctim14@YOUR_NAS_IP

# 3. 確認群組
groups

# 4. 現在可以直接使用 Docker
docker logs -f flb-line-bot
```

### 方案 3：使用 admin 帳號（最簡單）

```bash
# 登出當前帳號
exit

# 使用 admin 登入
ssh admin@YOUR_NAS_IP

# admin 預設有 Docker 權限
docker logs -f flb-line-bot
```

---

## 🚀 快速開始（推薦）

### 使用 admin 帳號操作

```bash
# 1. SSH 連線（使用 admin）
ssh admin@YOUR_NAS_IP

# 2. 進入專案目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 3. 執行部署
./deploy-on-nas.sh

# 4. 查看日誌
docker logs -f flb-line-bot
```

---

## 📝 常用指令（加上 sudo）

如果您想繼續使用 ctctim14 帳號：

```bash
# 查看日誌
sudo docker logs -f flb-line-bot

# 查看容器狀態
sudo docker ps | grep flb-line-bot

# 重啟容器
sudo docker restart flb-line-bot

# 停止容器
sudo docker stop flb-line-bot

# 啟動容器
sudo docker start flb-line-bot

# 查看資源使用
sudo docker stats flb-line-bot

# 進入容器
sudo docker exec -it flb-line-bot sh
```

---

## 🔧 更新 deploy-on-nas.sh

為了避免權限問題，可以修改腳本使用 sudo：

```bash
# 編輯腳本
nano deploy-on-nas.sh

# 在所有 docker 指令前加上 sudo
# 例如：
# docker ps  →  sudo docker ps
# docker build  →  sudo docker build
# docker run  →  sudo docker run
```

---

## 💡 建議的工作流程

### 選項 A：使用 admin 帳號（最簡單）

```bash
# 始終使用 admin 登入
ssh admin@YOUR_NAS_IP
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
./deploy-on-nas.sh
```

### 選項 B：加入 docker 群組（一次設定）

```bash
# 一次性設定
ssh admin@YOUR_NAS_IP
sudo synogroup --add docker ctctim14

# 之後可以用 ctctim14 帳號
ssh ctctim14@YOUR_NAS_IP
docker logs -f flb-line-bot  # 不需要 sudo
```

### 選項 C：使用 sudo（每次都要）

```bash
# 每次都加 sudo
ssh ctctim14@YOUR_NAS_IP
sudo docker logs -f flb-line-bot
```

---

## 🎯 立即解決

**現在立刻可以用的指令：**

```bash
# 查看日誌（使用 sudo）
sudo docker logs -f flb-line-bot

# 或切換到 admin
exit
ssh admin@YOUR_NAS_IP
docker logs -f flb-line-bot
```

---

## ✅ 推薦方案

我建議使用 **方案 2**（加入 docker 群組）：

```bash
# 1. 用 admin 登入
ssh admin@YOUR_NAS_IP

# 2. 將 ctctim14 加入 docker 群組
sudo synogroup --add docker ctctim14

# 3. 重新登入 ctctim14
exit
ssh ctctim14@YOUR_NAS_IP

# 4. 測試（不需要 sudo）
docker ps
docker logs flb-line-bot
```

這樣以後就不需要每次都加 sudo 了！




