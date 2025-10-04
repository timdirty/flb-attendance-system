# 🚀 Webhook 轉發快速開始

5 分鐘設定完成 LINE webhook 轉發功能。

---

## ⚡ 快速設定（3 步驟）

### 1️⃣ 新增轉發目標

```bash
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的服務",
    "url": "https://your-service.example.com/webhook",
    "enabled": true
  }'
```

### 2️⃣ 查看狀態

```bash
curl http://localhost:3010/api/webhook-forward/status
```

### 3️⃣ 測試

在 LINE 發送訊息，您的服務應該會收到 webhook！

---

## 📋 常用指令

### 查看所有目標

```bash
curl http://localhost:3010/api/webhook-forward/status
```

### 新增目標

```bash
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "目標名稱",
    "url": "https://your-url/webhook",
    "enabled": true
  }'
```

### 停用目標

```bash
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/目標名稱" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### 啟用目標

```bash
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/目標名稱" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 移除目標

```bash
curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/目標名稱"
```

---

## 🧪 本機測試

### 使用 ngrok（推薦）

```bash
# 終端機 1：啟動接收服務
node receive.js  # port 4000

# 終端機 2：啟動 ngrok
ngrok http 4000
# 複製 URL：https://abc123.ngrok.io

# 終端機 3：新增轉發目標
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "本機測試",
    "url": "https://abc123.ngrok.io/webhook",
    "enabled": true
  }'

# 在 LINE 發送訊息測試
```

### 接收服務範例（Node.js）

創建 `receive.js`：

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('\n📨 收到 webhook！');
  console.log('來源:', req.headers['x-forwarded-from']);
  console.log('時間:', req.headers['x-forward-time']);
  console.log('資料:', JSON.stringify(req.body, null, 2));
  
  const events = req.body.events || [];
  events.forEach(event => {
    if (event.type === 'message') {
      console.log('📩 訊息:', event.message.text);
      console.log('👤 使用者:', event.source.userId);
    }
  });
  
  res.status(200).send('OK');
});

app.listen(4000, () => {
  console.log('🎧 接收服務運行在 http://localhost:4000');
});
```

執行：

```bash
node receive.js
```

---

## 🔐 使用 API 密鑰

### 新增帶密鑰的目標

```bash
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "安全服務",
    "url": "https://secure-service.example.com/webhook",
    "enabled": true,
    "headers": {
      "Authorization": "Bearer YOUR_SECRET_KEY",
      "X-API-Key": "your-api-key-123"
    }
  }'
```

### 接收服務驗證

```javascript
app.post('/webhook', (req, res) => {
  // 驗證 API 密鑰
  const apiKey = req.headers['authorization'];
  if (apiKey !== 'Bearer YOUR_SECRET_KEY') {
    return res.status(401).send('Unauthorized');
  }
  
  // 驗證來源
  if (req.headers['x-forwarded-from'] !== 'FLB-LINE-Bot') {
    return res.status(403).send('Forbidden');
  }
  
  // 處理 webhook...
  res.status(200).send('OK');
});
```

---

## 📊 監控

### 查看轉發日誌

```bash
# Docker
docker logs -f flb-line-bot | grep "轉發"

# 直接運行
tail -f logs/app.log | grep "轉發"
```

### 查看轉發統計

```bash
# 查看狀態
curl http://localhost:3010/api/webhook-forward/status | jq

# 範例輸出：
{
  "success": true,
  "totalTargets": 3,
  "enabledTargets": 2,
  "targets": [...]
}
```

---

## 🛠️ 故障排除

### 轉發失敗？

```bash
# 1. 確認目標 URL 正確
curl http://localhost:3010/api/webhook-forward/status

# 2. 測試目標服務
curl -X POST https://your-service/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 3. 查看錯誤日誌
docker logs --tail 50 flb-line-bot | grep "轉發失敗"
```

### 沒有收到資料？

```bash
# 1. 確認目標已啟用
curl http://localhost:3010/api/webhook-forward/status
# 檢查 "enabled": true

# 2. 確認接收服務運行中
curl http://your-service/webhook

# 3. 查看轉發日誌
docker logs -f flb-line-bot | grep "📤"
```

---

## 💡 實用技巧

### 同時轉發到多個服務

```bash
# 課程服務
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{"name":"課程服務","url":"https://course.example.com/webhook","enabled":true}'

# 分析服務
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{"name":"分析服務","url":"https://analytics.example.com/webhook","enabled":true}'

# 測試服務（停用）
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{"name":"測試服務","url":"http://localhost:4000/webhook","enabled":false}'
```

### 臨時停用轉發

```bash
# 停用所有目標
curl http://localhost:3010/api/webhook-forward/status | \
  jq -r '.targets[].name' | \
  while read name; do
    curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/$name" \
      -H "Content-Type: application/json" \
      -d '{"enabled": false}'
  done
```

### 清空所有目標

```bash
# 刪除所有目標
curl http://localhost:3010/api/webhook-forward/status | \
  jq -r '.targets[].name' | \
  while read name; do
    curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/$name"
  done
```

---

## 🎯 使用場景範例

### 場景 1：開發時接收真實資料

```bash
# 啟動 ngrok
ngrok http 4000

# 新增轉發到本機
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "開發環境",
    "url": "https://YOUR_NGROK_URL/webhook",
    "enabled": true
  }'

# 現在可以在本機看到真實的 LINE webhook！
```

### 場景 2：微服務架構

```bash
# 主服務處理簽到
# + 轉發到課程服務
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{"name":"課程服務","url":"https://course-service/webhook","enabled":true}'

# + 轉發到通知服務
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{"name":"通知服務","url":"https://notification-service/webhook","enabled":true}'
```

### 場景 3：資料分析

```bash
# 轉發所有訊息到分析平台
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "資料分析",
    "url": "https://analytics.example.com/webhook",
    "enabled": true,
    "headers": {
      "X-Analytics-Key": "your-key"
    }
  }'
```

---

## 📚 更多資訊

- 完整文檔：[WEBHOOK_FORWARD_GUIDE.md](./WEBHOOK_FORWARD_GUIDE.md)
- API 文檔：[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Docker 指令：[DOCKER_COMMANDS.md](./DOCKER_COMMANDS.md)

---

**5 分鐘就能完成設定！** 🎉

需要幫助？查看完整文檔或聯繫開發者。

