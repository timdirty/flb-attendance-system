# NAS 部署完整指南

## 🎯 目標
將完整的 Node.js 應用程式部署到 Synology NAS，讓 webhook 正常運作。

## 📋 部署步驟

### 1. 準備檔案

確保您有以下檔案需要上傳到 NAS：

```
attendance-app/
├── server.js
├── package.json
├── package-lock.json
├── public/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   ├── line-test.html
│   └── webhook-test.html
├── Procfile
├── .gitignore
└── README.md
```

### 2. NAS 設定

#### A. 安裝 Node.js
1. 在 Synology Package Center 安裝 **Node.js v18**
2. 或使用 Docker 容器

#### B. 上傳檔案
1. 將所有檔案上傳到 NAS 的 `/volume1/docker/attendance-app/` 目錄
2. 確保權限設定正確

#### C. 安裝依賴
```bash
cd /volume1/docker/attendance-app/
npm install
```

### 3. 環境變數設定

建立 `.env` 檔案：
```bash
LINE_CHANNEL_ACCESS_TOKEN=LaeRrV+/XZ6oCJ2ZFzAFlZXHX822l50NxxM2x6vBkuoux4ptr6KjFJcIXL6pNJel2dKbZ7nxachvxvKrKaMNchMqGTywUl4KMGXhxd/bdiDM7M6Ad8OiXF+VzfhlSMXfu1MbDfxdwe0z/NLYHzadyQdB04t89/1O/w1cDnyilFU=
LINE_USER_ID=Udb51363eb6fdc605a6a9816379a38103
PORT=3000
```

### 4. 啟動應用程式

#### 方法 A: 直接啟動
```bash
cd /volume1/docker/attendance-app/
node server.js
```

#### 方法 B: 使用 PM2 (推薦)
```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用程式
pm2 start server.js --name "attendance-app"

# 設定開機自動啟動
pm2 startup
pm2 save
```

#### 方法 C: 使用 Docker
建立 `docker-compose.yml`：
```yaml
version: '3.8'
services:
  attendance-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LINE_CHANNEL_ACCESS_TOKEN=LaeRrV+/XZ6oCJ2ZFzAFlZXHX822l50NxxM2x6vBkuoux4ptr6KjFJcIXL6pNJel2dKbZ7nxachvxvKrKaMNchMqGTywUl4KMGXhxd/bdiDM7M6Ad8OiXF+VzfhlSMXfu1MbDfxdwe0z/NLYHzadyQdB04t89/1O/w1cDnyilFU=
      - LINE_USER_ID=Udb51363eb6fdc605a6a9816379a38103
    restart: unless-stopped
```

### 5. 反向代理設定

在 Synology DSM 中設定：

**控制台 → 應用程式入口 → 反向代理**

- **來源通訊協定**: HTTPS
- **來源主機名稱**: attendance.funlearnbar.synology.me
- **來源連接埠**: 443
- **目的地通訊協定**: HTTP
- **目的地主機名稱**: localhost
- **目的地連接埠**: 3000

### 6. 測試部署

#### A. 檢查應用程式是否運行
```bash
curl http://localhost:3000
```

#### B. 測試 webhook 端點
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
```

#### C. 測試外網 webhook
```bash
curl -X POST https://attendance.funlearnbar.synology.me/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
```

### 7. LINE Developer Console 設定

1. 登入 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 Channel
3. 在 "Messaging API" 設定中
4. 將 Webhook URL 設為：`https://attendance.funlearnbar.synology.me/webhook`
5. 點擊 "Verify" 驗證

## 🔍 故障排除

### 常見問題

1. **404 錯誤**
   - 檢查應用程式是否正在運行
   - 檢查反向代理設定
   - 檢查檔案是否完整上傳

2. **500 錯誤**
   - 檢查環境變數設定
   - 檢查依賴套件是否安裝
   - 查看應用程式日誌

3. **連接超時**
   - 檢查防火牆設定
   - 檢查端口是否開放
   - 檢查 SSL 憑證

### 檢查命令

```bash
# 檢查端口
netstat -tlnp | grep :3000

# 檢查進程
ps aux | grep node

# 檢查日誌
pm2 logs attendance-app
# 或
docker logs attendance-app
```

## 📱 最終驗證

1. 訪問 `https://attendance.funlearnbar.synology.me/`
2. 測試 LINE webhook 驗證
3. 在 LINE 中發送訊息測試

## 🚀 快速部署腳本

建立 `deploy.sh`：
```bash
#!/bin/bash
echo "開始部署 FLB 簽到系統..."

# 停止現有服務
pm2 stop attendance-app 2>/dev/null || true

# 更新檔案
echo "更新檔案..."
# 這裡可以加入 git pull 或其他更新邏輯

# 安裝依賴
echo "安裝依賴..."
npm install

# 啟動服務
echo "啟動服務..."
pm2 start server.js --name "attendance-app"

# 檢查狀態
echo "檢查服務狀態..."
pm2 status

echo "部署完成！"
echo "訪問: https://attendance.funlearnbar.synology.me/"
echo "Webhook: https://attendance.funlearnbar.synology.me/webhook"
```

執行：
```bash
chmod +x deploy.sh
./deploy.sh
```
