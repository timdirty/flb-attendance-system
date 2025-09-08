# Synology 反向代理設定指南

## 🌐 使用原有網址：attendance.funlearnbar.synology.me

### 步驟 1: 在 DSM 中設定反向代理

1. **登入 Synology DSM 控制台**
2. **前往「應用程式入口網站」**
3. **點擊「反向代理」**
4. **點擊「新增」**

### 步驟 2: 設定反向代理規則

#### 基本設定
```
規則名稱: FLB 簽到系統
來源協定: HTTPS
來源主機名稱: attendance.funlearnbar.synology.me
來源連接埠: 443
```

#### 目的地設定
```
目的地協定: HTTP
目的地主機名稱: localhost
目的地連接埠: 3000
```

#### 進階設定（可選）
```
啟用 HSTS: 是
啟用 HTTP/2: 是
自訂標頭: 
  - X-Forwarded-Proto: https
  - X-Forwarded-For: $remote_addr
```

### 步驟 3: 設定防火牆

1. **前往「安全性」>「防火牆」**
2. **新增規則**：
   ```
   規則名稱: FLB 簽到系統
   連接埠: 3000
   協定: TCP
   來源 IP: 全部
   動作: 允許
   ```

### 步驟 4: 設定 LINE Webhook

在 LINE Developer Console 中設定：
```
Webhook URL: https://attendance.funlearnbar.synology.me/webhook
```

### 步驟 5: 測試設定

1. **測試本地連接**：
   ```bash
   curl http://localhost:3000
   ```

2. **測試外部連接**：
   ```bash
   curl https://attendance.funlearnbar.synology.me
   ```

3. **測試 Webhook**：
   ```bash
   curl -X POST https://attendance.funlearnbar.synology.me/webhook \
     -H "Content-Type: application/json" \
     -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
   ```

### 步驟 6: 設定 SSL 憑證（如果尚未設定）

1. **前往「安全性」>「憑證」**
2. **新增憑證**：
   - 選擇「Let's Encrypt」
   - 網域名稱：`attendance.funlearnbar.synology.me`
   - 電子郵件：您的郵箱

### 故障排除

#### 問題 1: 502 Bad Gateway
- 檢查 Docker 容器是否運行
- 檢查反向代理目標地址是否正確
- 檢查防火牆設定

#### 問題 2: 404 Not Found
- 檢查反向代理規則是否正確
- 檢查網域名稱是否正確
- 檢查 SSL 憑證是否有效

#### 問題 3: 連接超時
- 檢查防火牆設定
- 檢查路由器端口轉發
- 檢查網路連線

### 驗證清單

- [ ] Docker 容器正在運行
- [ ] 反向代理規則已設定
- [ ] 防火牆規則已設定
- [ ] SSL 憑證已設定
- [ ] LINE Webhook URL 已更新
- [ ] 本地連接正常
- [ ] 外部連接正常
- [ ] Webhook 端點正常
