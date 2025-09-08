# LINE Webhook 設定指南

## 🔗 使用網址：attendance.funlearnbar.synology.me

### 步驟 1: 登入 LINE Developers Console

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 登入您的 LINE 帳號
3. 選擇您的 Channel

### 步驟 2: 設定 Webhook URL

1. **前往「Messaging API」頁面**
2. **找到「Webhook settings」區塊**
3. **點擊「Edit」**
4. **設定 Webhook URL**：
   ```
   https://attendance.funlearnbar.synology.me/webhook
   ```
5. **點擊「Update」**

### 步驟 3: 啟用 Webhook

1. **在「Webhook settings」區塊中**
2. **開啟「Use webhook」開關**
3. **點擊「Verify」按鈕**
4. **確認顯示「Success」**

### 步驟 4: 設定回應模式

1. **在「Messaging API」頁面中**
2. **找到「Response mode」區塊**
3. **選擇「Bot」**
4. **點擊「Update」**

### 步驟 5: 測試 Webhook

1. **在「Webhook settings」區塊中**
2. **點擊「Verify」按鈕**
3. **確認顯示「Success」**

### 步驟 6: 設定自動回應

1. **前往「Messaging API」頁面**
2. **找到「Auto-reply messages」區塊**
3. **關閉「Use auto-reply messages」**
4. **點擊「Update」**

### 步驟 7: 設定 Greeting messages

1. **前往「Messaging API」頁面**
2. **找到「Greeting messages」區塊**
3. **關閉「Use greeting messages」**
4. **點擊「Update」**

### 測試 Webhook 功能

#### 方法 1: 使用 LINE Developers Console
1. 在「Messaging API」頁面中
2. 點擊「Verify」按鈕
3. 確認顯示「Success」

#### 方法 2: 使用 curl 命令
```bash
curl -X POST https://attendance.funlearnbar.synology.me/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
```

#### 方法 3: 使用 LINE 官方帳號
1. 掃描 QR Code 或搜尋 LINE 官方帳號
2. 發送訊息給官方帳號
3. 檢查伺服器日誌是否收到訊息

### 故障排除

#### 問題 1: Webhook 驗證失敗
- 檢查 Docker 容器是否運行
- 檢查反向代理設定
- 檢查防火牆設定
- 檢查 SSL 憑證

#### 問題 2: 收到訊息但無回應
- 檢查伺服器日誌
- 檢查 LINE 通知功能
- 檢查環境變數設定

#### 問題 3: 502 Bad Gateway
- 檢查 Docker 容器狀態
- 檢查反向代理設定
- 重新啟動容器

### 驗證清單

- [ ] Webhook URL 已設定
- [ ] Webhook 已啟用
- [ ] Webhook 驗證成功
- [ ] 回應模式設為 Bot
- [ ] 自動回應已關閉
- [ ] 問候訊息已關閉
- [ ] 本地測試成功
- [ ] 外部測試成功
- [ ] LINE 官方帳號測試成功
