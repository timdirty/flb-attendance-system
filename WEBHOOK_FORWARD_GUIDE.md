# 🔄 Webhook 轉發功能完整指南

將 LINE webhook 事件同步轉發到其他服務，實現微服務架構、開發測試、資料分析等功能。

---

## 🎯 使用場景

### 1. **微服務架構**
將不同功能分散到不同服務：
- 主服務：處理簽到功能
- 課程服務：處理課程規劃查詢
- 分析服務：記錄使用統計
- 通知服務：發送管理員通知

### 2. **開發測試**
- 同時轉發到生產環境和測試環境
- 本機開發時接收真實 webhook 資料

### 3. **資料分析**
- 將所有訊息轉發到分析平台
- 記錄使用者行為數據
- 產生統計報表

### 4. **備份/備援**
- 主服務故障時的備援服務
- 資料備份到多個地點

---

## 🚀 快速開始

### 方式 1：使用環境變數（推薦）

在 `.env` 中設定：

```bash
# 啟用 Webhook 轉發
WEBHOOK_FORWARD_TARGETS='[
  {
    "name": "課程管理服務",
    "url": "https://course-service.example.com/webhook",
    "enabled": true
  },
  {
    "name": "測試環境",
    "url": "http://localhost:4000/webhook",
    "enabled": false
  }
]'

# 是否顯示轉發日誌（預設 true）
WEBHOOK_FORWARD_LOG=true
```

### 方式 2：使用 API 動態管理

```bash
# 查看目前狀態
curl http://localhost:3010/api/webhook-forward/status

# 新增轉發目標
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "課程服務",
    "url": "https://course-service.example.com/webhook",
    "enabled": true
  }'

# 啟用目標
curl -X PATCH http://localhost:3010/api/webhook-forward/targets/課程服務 \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 停用目標
curl -X PATCH http://localhost:3010/api/webhook-forward/targets/課程服務 \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 移除目標
curl -X DELETE http://localhost:3010/api/webhook-forward/targets/課程服務
```

---

## 📝 完整設定範例

### 基本設定

```javascript
{
  "name": "課程服務",           // 目標名稱（必填）
  "url": "https://...",        // webhook URL（必填）
  "enabled": true,             // 是否啟用（預設 true）
  "method": "POST",            // HTTP 方法（預設 POST）
  "timeout": 5000,             // 超時時間（毫秒，預設 5000）
  "headers": {                 // 自訂標頭（選填）
    "Authorization": "Bearer TOKEN",
    "X-Custom-Header": "value"
  }
}
```

### 進階設定 - 資料轉換

如果接收服務需要不同的資料格式：

```javascript
{
  "name": "自訂格式服務",
  "url": "https://custom-service.example.com/webhook",
  "enabled": true,
  "transform": function(webhookData) {
    // 轉換資料格式
    return {
      timestamp: new Date().toISOString(),
      source: "FLB-LINE-Bot",
      events: webhookData.events.map(event => ({
        type: event.type,
        userId: event.source?.userId,
        message: event.message?.text
      }))
    };
  }
}
```

### 多目標設定範例

```json
[
  {
    "name": "課程管理服務",
    "url": "https://course.example.com/webhook",
    "enabled": true,
    "headers": {
      "Authorization": "Bearer course-token-123"
    }
  },
  {
    "name": "資料分析服務",
    "url": "https://analytics.example.com/webhook",
    "enabled": true,
    "headers": {
      "X-API-Key": "analytics-key-456"
    }
  },
  {
    "name": "測試環境",
    "url": "http://localhost:4000/webhook",
    "enabled": false
  },
  {
    "name": "開發環境 (ngrok)",
    "url": "https://abc123.ngrok.io/webhook",
    "enabled": false
  }
]
```

---

## 🔍 過濾轉發

只轉發特定類型的事件：

```javascript
const WebhookForwarder = require('./src/webhook-forwarder');

const forwarder = new WebhookForwarder({
  targets: [...],
  filters: {
    // 只轉發訊息事件
    eventTypes: ['message'],
    
    // 只轉發文字訊息
    messageTypes: ['text'],
    
    // 只轉發包含特定關鍵字的訊息
    keywords: ['#課程規劃', '#簽到'],
    
    // 自訂過濾函數
    custom: function(webhookData) {
      // 只在工作時間轉發
      const hour = new Date().getHours();
      return hour >= 9 && hour <= 18;
    }
  }
});
```

---

## 📡 接收服務範例

### Node.js/Express

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('收到轉發的 webhook:', req.body);
  
  // 檢查來源
  if (req.headers['x-forwarded-from'] === 'FLB-LINE-Bot') {
    console.log('來自 FLB LINE Bot 的轉發');
    console.log('轉發時間:', req.headers['x-forward-time']);
  }
  
  // 處理 webhook 資料
  const events = req.body.events || [];
  events.forEach(event => {
    if (event.type === 'message') {
      console.log('訊息:', event.message.text);
      console.log('使用者:', event.source.userId);
    }
  });
  
  // 必須回應 200
  res.status(200).send('OK');
});

app.listen(4000, () => {
  console.log('接收服務運行在 port 4000');
});
```

### Python/Flask

```python
from flask import Flask, request
import json

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    print('收到轉發的 webhook:', json.dumps(data, indent=2))
    
    # 檢查來源
    if request.headers.get('X-Forwarded-From') == 'FLB-LINE-Bot':
        print('來自 FLB LINE Bot 的轉發')
        print('轉發時間:', request.headers.get('X-Forward-Time'))
    
    # 處理 webhook 資料
    events = data.get('events', [])
    for event in events:
        if event['type'] == 'message':
            print('訊息:', event['message']['text'])
            print('使用者:', event['source']['userId'])
    
    return 'OK', 200

if __name__ == '__main__':
    app.run(port=4000)
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
)

type WebhookData struct {
    Events []struct {
        Type    string `json:"type"`
        Message struct {
            Text string `json:"text"`
        } `json:"message"`
        Source struct {
            UserID string `json:"userId"`
        } `json:"source"`
    } `json:"events"`
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := ioutil.ReadAll(r.Body)
    
    var data WebhookData
    json.Unmarshal(body, &data)
    
    fmt.Println("收到轉發的 webhook")
    
    // 檢查來源
    if r.Header.Get("X-Forwarded-From") == "FLB-LINE-Bot" {
        fmt.Println("來自 FLB LINE Bot 的轉發")
        fmt.Println("轉發時間:", r.Header.Get("X-Forward-Time"))
    }
    
    // 處理 webhook 資料
    for _, event := range data.Events {
        if event.Type == "message" {
            fmt.Println("訊息:", event.Message.Text)
            fmt.Println("使用者:", event.Source.UserID)
        }
    }
    
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func main() {
    http.HandleFunc("/webhook", webhookHandler)
    log.Fatal(http.ListenAndServe(":4000", nil))
}
```

---

## 🔐 安全性考量

### 1. **驗證來源**

檢查自訂標頭：

```javascript
app.post('/webhook', (req, res) => {
  // 驗證來源
  if (req.headers['x-forwarded-from'] !== 'FLB-LINE-Bot') {
    return res.status(403).send('Forbidden');
  }
  
  // 驗證密鑰
  const apiKey = req.headers['authorization'];
  if (apiKey !== 'Bearer YOUR_SECRET_KEY') {
    return res.status(401).send('Unauthorized');
  }
  
  // 處理 webhook...
});
```

在轉發設定中加入密鑰：

```json
{
  "name": "安全的服務",
  "url": "https://secure-service.example.com/webhook",
  "headers": {
    "Authorization": "Bearer YOUR_SECRET_KEY"
  }
}
```

### 2. **使用 HTTPS**

生產環境必須使用 HTTPS：

```json
{
  "url": "https://your-service.example.com/webhook"  // ✅ 安全
}
```

避免使用 HTTP：

```json
{
  "url": "http://your-service.example.com/webhook"   // ❌ 不安全
}
```

### 3. **IP 白名單**

接收服務可以限制只接受特定 IP：

```javascript
const ALLOWED_IPS = ['YOUR_NAS_IP', '192.168.1.100'];

app.post('/webhook', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (!ALLOWED_IPS.includes(clientIp)) {
    return res.status(403).send('IP not allowed');
  }
  
  // 處理 webhook...
});
```

---

## 🧪 本機開發測試

### 使用 ngrok

```bash
# 1. 啟動你的接收服務
node your-service.js  # port 4000

# 2. 啟動 ngrok
ngrok http 4000

# 3. 複製 ngrok URL（例如：https://abc123.ngrok.io）

# 4. 新增轉發目標
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "本機測試",
    "url": "https://abc123.ngrok.io/webhook",
    "enabled": true
  }'

# 5. 在 LINE 發送訊息測試
```

### 使用 localhost（同一台機器）

```bash
# 1. 啟動接收服務
node your-service.js  # port 4000

# 2. 新增轉發目標
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "本機測試",
    "url": "http://localhost:4000/webhook",
    "enabled": true
  }'

# 3. 測試
```

---

## 📊 監控與日誌

### 查看轉發狀態

```bash
# 查看所有目標狀態
curl http://localhost:3010/api/webhook-forward/status

# 回應範例：
{
  "success": true,
  "totalTargets": 3,
  "enabledTargets": 2,
  "targets": [
    {
      "name": "課程服務",
      "url": "https://course.example.com/webhook",
      "enabled": true
    },
    {
      "name": "分析服務",
      "url": "https://analytics.example.com/webhook",
      "enabled": true
    },
    {
      "name": "測試環境",
      "url": "http://localhost:4000/webhook",
      "enabled": false
    }
  ]
}
```

### 查看日誌

```bash
# Docker 環境
docker logs -f flb-line-bot | grep "轉發"

# 會看到類似：
# 📤 轉發到 課程服務 (https://course.example.com/webhook)
# ✅ 課程服務 轉發成功 (200, 45ms)
# 📤 轉發到 分析服務 (https://analytics.example.com/webhook)
# ✅ 分析服務 轉發成功 (200, 32ms)
```

### 停用日誌（減少輸出）

```bash
# 在 .env 中設定
WEBHOOK_FORWARD_LOG=false
```

---

## ⚡ 效能考量

### 1. **非同步轉發**

轉發是非同步的，不會阻塞主流程：

```javascript
// ✅ 不會等待轉發完成，立即處理下一個事件
webhookForwarder.forward(req.body);
```

### 2. **超時設定**

預設 5 秒超時，避免慢速服務影響效能：

```json
{
  "timeout": 5000  // 5 秒超時
}
```

### 3. **失敗不影響主服務**

即使轉發失敗，主服務仍正常運作：

```javascript
// 轉發失敗只會記錄錯誤，不影響主流程
webhookForwarder.forward(req.body).catch(error => {
  console.error('Webhook 轉發失敗:', error);
});
```

### 4. **限制目標數量**

建議不超過 5 個轉發目標，避免效能問題。

---

## 🛠️ 故障排除

### 問題 1：轉發失敗

```bash
# 檢查日誌
docker logs -f flb-line-bot | grep "轉發失敗"

# 常見原因：
# - URL 錯誤
# - 接收服務未啟動
# - 網路問題
# - 超時

# 解決方式：
# 1. 確認 URL 正確
# 2. 確認接收服務運行中
# 3. 測試網路連線
# 4. 增加 timeout
```

### 問題 2：沒有轉發

```bash
# 檢查是否有目標
curl http://localhost:3010/api/webhook-forward/status

# 檢查目標是否啟用
# enabled: true

# 檢查是否被過濾器擋掉
# 查看日誌是否有 "🚫 Webhook 不符合轉發條件"
```

### 問題 3：接收服務沒收到資料

```bash
# 1. 確認接收服務正在運行
curl http://接收服務URL/webhook

# 2. 確認網路可達
ping 接收服務域名

# 3. 確認防火牆設定
# 開放接收服務的 port

# 4. 查看接收服務的日誌
```

### 問題 4：本機測試收不到

```bash
# 使用 ngrok（推薦）
ngrok http 4000

# 或確認在同一網路
# 使用內網 IP：http://192.168.1.xxx:4000/webhook
```

---

## 📚 實際應用案例

### 案例 1：微服務架構

```
LINE Webhook
      ↓
FLB 主服務（簽到）
      ↓
   同時轉發到：
      ├─ 課程服務（課程規劃查詢）
      ├─ 通知服務（管理員通知）
      └─ 分析服務（使用統計）
```

### 案例 2：開發/生產環境

```
LINE Webhook
      ↓
生產環境服務
      ↓
   轉發到：
      └─ 開發環境（ngrok）
          （開發者可以看到真實資料）
```

### 案例 3：資料備份

```
LINE Webhook
      ↓
主服務
      ↓
   轉發到：
      ├─ 備份服務 1（資料庫 A）
      └─ 備份服務 2（資料庫 B）
```

---

## 🎓 進階技巧

### 1. **條件轉發**

只在特定條件下轉發：

```javascript
const forwarder = new WebhookForwarder({
  targets: [...],
  filters: {
    custom: function(webhookData) {
      const events = webhookData.events || [];
      
      // 只轉發講師的訊息
      return events.some(event => {
        const userId = event.source?.userId;
        return isTeacher(userId);
      });
    }
  }
});
```

### 2. **動態路由**

根據訊息內容轉發到不同服務：

```javascript
app.post('/webhook', async (req, res) => {
  res.status(200).send('OK');
  
  const events = req.body.events || [];
  
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text;
      
      if (text.includes('#課程')) {
        // 轉發到課程服務
        await forwardToCourseService(req.body);
      } else if (text.includes('#簽到')) {
        // 轉發到簽到服務
        await forwardToAttendanceService(req.body);
      }
    }
  }
});
```

### 3. **重試機制**

```javascript
const forwarder = new WebhookForwarder({
  targets: [...],
  retries: 3,  // 失敗時重試 3 次
  timeout: 5000
});
```

---

## 📋 檢查清單

部署前確認：

- [ ] 已設定轉發目標
- [ ] 已測試接收服務正常運作
- [ ] 使用 HTTPS（生產環境）
- [ ] 已設定 API 密鑰驗證
- [ ] 已設定適當的超時時間
- [ ] 已測試轉發功能
- [ ] 已檢查日誌輸出
- [ ] 已設定監控告警

---

**完整的 Webhook 轉發解決方案！** 🚀

有任何問題請參考本文檔或查看日誌排查。

