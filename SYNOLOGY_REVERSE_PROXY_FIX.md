# Synology 反向代理 502 錯誤修復指南

## 🔍 問題診斷

**錯誤現象**: `attendance.funlearnbar.synology.me` 顯示 502 Bad Gateway

**原因分析**: 反向代理無法連接到後端 Docker 容器

## 🔧 修復步驟

### 步驟 1: 檢查 Docker 容器狀態

在 NAS 終端機中執行：
```bash
cd /volume1/docker/flb-attendance/
./diagnose-502-error.sh
```

### 步驟 2: 修復容器問題

如果容器有問題，執行：
```bash
./fix-502-error.sh
```

### 步驟 3: 檢查 Synology DSM 反向代理設定

1. **登入 DSM 控制台**
2. **前往「應用程式入口網站」**
3. **點擊「反向代理」**
4. **檢查現有規則**

#### 正確的反向代理設定：

```
規則名稱: FLB 簽到系統
來源協定: HTTPS
來源主機名稱: attendance.funlearnbar.synology.me
來源連接埠: 443
目的地協定: HTTP
目的地主機名稱: localhost
目的地連接埠: 3000
```

### 步驟 4: 檢查防火牆設定

1. **前往「安全性」>「防火牆」**
2. **檢查是否有規則開放 3000 端口**
3. **如果沒有，新增規則**：
   ```
   連接埠: 3000
   協定: TCP
   來源 IP: 全部
   動作: 允許
   ```

### 步驟 5: 檢查 Docker 網路

```bash
# 檢查 Docker 網路
docker network ls

# 檢查容器網路設定
docker-compose exec attendance-app ip addr
```

### 步驟 6: 測試連接

```bash
# 測試本地連接
curl http://localhost:3000

# 測試外部連接
curl http://您的NAS_IP:3000

# 測試 webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
```

## 🚨 常見問題和解決方案

### 問題 1: 容器無法啟動
```bash
# 檢查日誌
docker-compose logs

# 重新構建
docker-compose build --no-cache

# 重新啟動
docker-compose up -d
```

### 問題 2: 端口被佔用
```bash
# 檢查端口使用情況
netstat -tlnp | grep :3000

# 停止佔用端口的程序
sudo lsof -ti:3000 | xargs kill -9
```

### 問題 3: 反向代理設定錯誤
- 確認目標地址為 `localhost:3000`
- 確認協定為 `HTTP`（不是 HTTPS）
- 確認端口為 `3000`

### 問題 4: 防火牆阻擋
- 檢查 DSM 防火牆設定
- 檢查路由器端口轉發
- 確認 3000 端口已開放

## 🔄 完整重置流程

如果問題持續存在，執行完整重置：

```bash
# 1. 完全停止
docker-compose down --rmi all --volumes --remove-orphans

# 2. 清理系統
docker system prune -af

# 3. 重新部署
./nas-quick-deploy.sh

# 4. 檢查狀態
docker-compose ps
docker-compose logs -f
```

## 📋 驗證清單

- [ ] Docker 容器正在運行
- [ ] 端口 3000 正在監聽
- [ ] 本地連接正常 (http://localhost:3000)
- [ ] 外部連接正常 (http://NAS_IP:3000)
- [ ] 反向代理設定正確
- [ ] 防火牆規則正確
- [ ] Webhook 端點正常
- [ ] LINE 通知功能正常

## 🆘 如果問題仍然存在

請提供以下資訊：
1. `docker-compose ps` 輸出
2. `docker-compose logs` 輸出
3. 反向代理設定截圖
4. 防火牆設定截圖
5. 錯誤訊息截圖
