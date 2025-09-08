# Synology DSM 設定指南

## 🏠 在 Synology NAS 上部署 FLB 簽到系統

### 前置需求

1. **Synology NAS** 支援 Docker
2. **Docker** 和 **Docker Compose** 已安裝
3. **DSM 7.0** 或更新版本

### 步驟 1: 安裝 Docker

1. 開啟 **DSM 控制台**
2. 前往 **套件中心**
3. 搜尋並安裝 **Docker**
4. 安裝完成後啟動 Docker

### 步驟 2: 上傳程式檔案

1. 使用 **File Station** 或 **SFTP** 上傳所有檔案到 NAS
2. 建議路徑：`/volume1/docker/flb-attendance/`

### 步驟 3: 執行部署

```bash
# 連接到 NAS 終端機
ssh admin@您的NAS_IP

# 進入程式目錄
cd /volume1/docker/flb-attendance/

# 設定執行權限
chmod +x deploy-to-nas.sh

# 執行部署
./deploy-to-nas.sh
```

### 步驟 4: 設定反向代理

1. 開啟 **DSM 控制台**
2. 前往 **應用程式入口網站**
3. 點擊 **反向代理**
4. 新增規則：

```
來源協定: HTTPS
來源主機名稱: 您的域名
來源連接埠: 443
目的地協定: HTTP
目的地主機名稱: localhost
目的地連接埠: 3000
```

### 步驟 5: 設定防火牆

1. 開啟 **DSM 控制台**
2. 前往 **安全性** > **防火牆**
3. 新增規則：

```
連接埠: 3000
協定: TCP
來源 IP: 全部
動作: 允許
```

### 步驟 6: 設定 LINE Webhook

1. 前往 **LINE Developers Console**
2. 選擇您的 Channel
3. 設定 **Webhook URL**：
   ```
   https://您的域名/webhook
   ```
4. 驗證 Webhook 設定

### 步驟 7: 設定自動啟動

1. 開啟 **Docker** 應用程式
2. 選擇 **flb-attendance-app** 容器
3. 點擊 **編輯**
4. 勾選 **啟用自動重新啟動**

### 步驟 8: 監控和維護

#### 查看容器狀態
```bash
docker-compose ps
```

#### 查看容器日誌
```bash
docker-compose logs -f
```

#### 重新部署
```bash
./deploy-to-nas.sh
```

#### 停止服務
```bash
docker-compose down
```

#### 完全清理
```bash
docker-compose down --rmi all --volumes
docker system prune -af
```

### 故障排除

#### 問題 1: 容器無法啟動
```bash
# 檢查日誌
docker-compose logs

# 檢查端口衝突
netstat -tlnp | grep :3000
```

#### 問題 2: 無法從外部訪問
1. 檢查防火牆設定
2. 檢查反向代理設定
3. 檢查路由器端口轉發

#### 問題 3: LINE Webhook 404 錯誤
1. 確認容器正在運行
2. 檢查 Webhook URL 設定
3. 確認反向代理規則正確

### 安全建議

1. **定期更新** Docker 映像檔
2. **備份資料** 定期備份 logs 目錄
3. **監控日誌** 定期檢查容器日誌
4. **SSL 憑證** 使用有效的 SSL 憑證
5. **防火牆** 只開放必要端口

### 效能優化

1. **資源限制** 在 docker-compose.yml 中設定記憶體限制
2. **日誌輪轉** 設定日誌檔案大小限制
3. **定期清理** 定期清理 Docker 系統

### 備份和還原

#### 備份
```bash
# 備份程式檔案
tar -czf flb-backup-$(date +%Y%m%d).tar.gz .

# 備份資料庫（如果有）
docker-compose exec attendance-app tar -czf /app/backup.tar.gz /app/logs
```

#### 還原
```bash
# 解壓備份檔案
tar -xzf flb-backup-YYYYMMDD.tar.gz

# 重新部署
./deploy-to-nas.sh
```

### 聯絡支援

如果遇到問題，請提供以下資訊：
1. DSM 版本
2. Docker 版本
3. 容器日誌
4. 錯誤訊息截圖
