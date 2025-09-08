# NAS Webhook 設定指南

## 🎯 目標
將 LINE Webhook 從本地開發環境 (`http://localhost:3000/webhook`) 遷移到您的 NAS 外網連結 (`https://attendance.funlearnbar.synology.me/webhook`)

## 📋 設定步驟

### 1. NAS 反向代理設定

在您的 Synology NAS 中設定反向代理：

**控制台 → 應用程式入口 → 反向代理**

- **來源通訊協定**: HTTPS
- **來源主機名稱**: attendance.funlearnbar.synology.me
- **來源連接埠**: 443
- **目的地通訊協定**: HTTP
- **目的地主機名稱**: localhost (或您的 NAS 內部 IP)
- **目的地連接埠**: 3000

### 2. 防火牆設定

**控制台 → 安全性 → 防火牆**

確保以下端口開放：
- 443 (HTTPS)
- 80 (HTTP) - 如果需要重定向

### 3. SSL 憑證

確保您的域名 `attendance.funlearnbar.synology.me` 有有效的 SSL 憑證：
- 使用 Let's Encrypt 免費憑證
- 或匯入您自己的憑證

### 4. 應用程式部署

將您的 Node.js 應用程式部署到 NAS：

#### 方法 A: Docker 部署
```bash
# 在 NAS 上建立 docker-compose.yml
version: '3.8'
services:
  attendance-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LINE_CHANNEL_ACCESS_TOKEN=您的_TOKEN
      - LINE_USER_ID=您的_USER_ID
    restart: unless-stopped
```

#### 方法 B: Node.js 直接部署
1. 將專案檔案上傳到 NAS
2. 安裝 Node.js
3. 執行 `npm install`
4. 設定環境變數
5. 使用 PM2 或 systemd 管理程序

### 5. LINE Developer Console 設定

1. 登入 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 Channel
3. 進入 "Messaging API" 設定
4. 將 Webhook URL 設為：`https://attendance.funlearnbar.synology.me/webhook`
5. 點擊 "Verify" 驗證連線
6. 啟用 "Use webhook"

## 🧪 測試步驟

### 1. 本地測試
訪問：`http://localhost:3000/webhook-test.html`

### 2. 外網測試
訪問：`https://attendance.funlearnbar.synology.me/webhook-test.html`

### 3. LINE Webhook 驗證
在 LINE Developer Console 中點擊 "Verify" 按鈕

## 🔧 故障排除

### 常見問題

1. **SSL 憑證錯誤**
   - 檢查憑證是否有效
   - 確認域名設定正確

2. **反向代理設定錯誤**
   - 檢查目的地端口是否正確
   - 確認應用程式正在運行

3. **防火牆阻擋**
   - 檢查 443 端口是否開放
   - 確認 NAS 防火牆設定

4. **應用程式未啟動**
   - 檢查 Node.js 程序是否運行
   - 查看應用程式日誌

### 檢查命令

```bash
# 檢查端口是否開放
netstat -tlnp | grep :3000

# 檢查 SSL 憑證
openssl s_client -connect attendance.funlearnbar.synology.me:443

# 檢查應用程式日誌
pm2 logs attendance-app
# 或
docker logs attendance-app
```

## 📱 最終驗證

1. 在 LINE 中發送訊息給您的 Bot
2. 檢查 NAS 上的應用程式日誌
3. 確認收到 webhook 請求

## 🔄 環境變數設定

在 NAS 上設定以下環境變數：

```bash
export LINE_CHANNEL_ACCESS_TOKEN="您的_CHANNEL_ACCESS_TOKEN"
export LINE_USER_ID="您的_USER_ID"
```

或在 Docker 環境中：

```yaml
environment:
  - LINE_CHANNEL_ACCESS_TOKEN=您的_CHANNEL_ACCESS_TOKEN
  - LINE_USER_ID=您的_USER_ID
```

## 📞 支援

如果遇到問題，請檢查：
1. NAS 系統日誌
2. 應用程式日誌
3. 網路連線狀態
4. SSL 憑證狀態
