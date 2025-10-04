# 🤖 AIbot Webhook 轉發設定

將 LINE webhook 轉發到 AIbot 專案，實現雙系統協作。

---

## 🎯 架構說明

```
LINE 官方伺服器
      ↓
   發送 webhook 到
      ↓
FLB 簽到系統（主系統）
https://flb.funlearnbar.synology.me/webhook
      ↓
   自動轉發到
      ↓
   ┌─────────────────┐
   ↓                 ↓
FLB 處理簽到      AIbot 處理對話
（主系統）        （AI 系統）
```

---

## ⚡ 快速設定（4 步驟）

### 步驟 0：生成 API Key（重要！）

```bash
# 生成安全的 API Key
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 複製生成的 Key，稍後會用到
```

⚠️ **這個 API Key 要在兩邊設定：**
- FLB 主系統（轉發時使用）
- AIbot 系統（驗證時使用）

### 步驟 1：在 AIbot 設定 API Key

在 AIbot 的 `.env` 中設定（應該已經設定好）：

```bash
# Webhook 轉發接收設定
WEBHOOK_FORWARD_API_KEY=your-secret-api-key-here
WEBHOOK_FORWARD_LOG=true
```

然後重啟 AIbot：

```bash
cd /path/to/AIbot
sudo docker-compose restart
```

### 步驟 2：重新部署 FLB 主系統

```bash
# SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 進入專案目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 重新部署（更新 webhook 轉發功能）
./deploy-on-nas.sh
```

### 步驟 3：設定轉發到 AIbot

```bash
# 使用設定腳本（推薦）
./setup-aibot-forward.sh YOUR_API_KEY

# 或使用環境變數
export AIBOT_API_KEY=YOUR_API_KEY
./setup-aibot-forward.sh
```

或手動設定：

```bash
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AIbot",
    "url": "https://AIbot.funlearnbar.synology.me/api/webhook/receive",
    "enabled": true,
    "timeout": 10000,
    "headers": {
      "Authorization": "Bearer YOUR_API_KEY",
      "X-Forwarded-From": "FLB-LINE-Bot"
    }
  }'
```

### 步驟 4：測試

在 LINE 發送訊息，兩個系統都會收到：
- ✅ FLB 簽到系統
- ✅ AIbot

---

## 📋 確認 AIbot 已準備接收

AIbot 專案需要有 `/api/webhook/receive` 端點：

```javascript
// AIbot 的 server.js 需要有這個端點

app.post('/webhook', (req, res) => {
  console.log('收到來自 FLB 的 webhook:', req.body);
  
  // 驗證來源（建議）
  if (req.headers['x-forwarded-from'] === 'FLB-LINE-Bot') {
    console.log('✅ 來自 FLB 的轉發');
  }
  
  const events = req.body.events || [];
  
  events.forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text;
      const userId = event.source.userId;
      
      // AIbot 處理邏輯
      console.log(`收到訊息: ${text}`);
      // processWithAI(text, userId);
    }
  });
  
  // 必須回應 200
  res.status(200).send('OK');
});
```

---

## 🔍 查看狀態

### 查看轉發設定

```bash
curl http://localhost:3010/api/webhook-forward/status
```

預期輸出：

```json
{
  "success": true,
  "totalTargets": 1,
  "enabledTargets": 1,
  "targets": [
    {
      "name": "AIbot",
      "url": "https://AIbot.funlearnbar.synology.me/webhook",
      "enabled": true
    }
  ]
}
```

### 查看轉發日誌

```bash
# FLB 主系統日誌
docker logs -f flb-line-bot | grep "轉發"

# 應該看到：
# 📤 轉發到 AIbot (https://AIbot.funlearnbar.synology.me/webhook)
# ✅ AIbot 轉發成功 (200, 45ms)
```

### 查看 AIbot 日誌

```bash
# 根據 AIbot 的部署方式查看日誌
docker logs -f aibot  # 如果是 Docker
pm2 logs aibot        # 如果是 PM2
tail -f logs/aibot.log # 如果是直接運行
```

---

## 🛠️ 管理指令

### 停用轉發

```bash
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### 啟用轉發

```bash
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 移除轉發

```bash
curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/AIbot"
```

### 更新設定

```bash
# 先移除
curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/AIbot"

# 再新增（使用新設定）
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AIbot",
    "url": "https://AIbot.funlearnbar.synology.me/webhook",
    "enabled": true,
    "timeout": 10000
  }'
```

---

## 🔐 安全性建議

### 1. 在 AIbot 驗證來源

```javascript
app.post('/webhook', (req, res) => {
  // 驗證來源
  if (req.headers['x-forwarded-from'] !== 'FLB-LINE-Bot') {
    console.log('⚠️ 未授權的請求');
    return res.status(403).send('Forbidden');
  }
  
  // 驗證時間（防止重放攻擊）
  const forwardTime = new Date(req.headers['x-forward-time']);
  const now = new Date();
  const timeDiff = (now - forwardTime) / 1000; // 秒
  
  if (timeDiff > 60) {
    console.log('⚠️ 請求過期');
    return res.status(400).send('Request expired');
  }
  
  // 處理 webhook...
});
```

### 2. 使用 API 密鑰（可選）

在 FLB 設定中加入密鑰：

```bash
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AIbot",
    "url": "https://AIbot.funlearnbar.synology.me/webhook",
    "enabled": true,
    "headers": {
      "Authorization": "Bearer YOUR_SECRET_KEY",
      "X-API-Key": "aibot-key-123"
    }
  }'
```

在 AIbot 驗證：

```javascript
app.post('/webhook', (req, res) => {
  const apiKey = req.headers['authorization'];
  
  if (apiKey !== 'Bearer YOUR_SECRET_KEY') {
    return res.status(401).send('Unauthorized');
  }
  
  // 處理 webhook...
});
```

---

## 🧪 測試流程

### 1. 測試連線

```bash
# 測試 AIbot 是否可達
curl https://AIbot.funlearnbar.synology.me/webhook

# 應該回應（可能是 404 或其他，但不是連線錯誤）
```

### 2. 測試轉發

```bash
# 在 LINE 發送測試訊息
"測試轉發"

# 查看 FLB 日誌
docker logs --tail 20 flb-line-bot

# 查看 AIbot 日誌
# 應該看到收到轉發的 webhook
```

### 3. 測試 AI 回應

```bash
# 在 LINE 發送
"你好，AI"

# AIbot 應該：
# 1. 收到 webhook
# 2. 處理 AI 邏輯
# 3. 回應訊息
```

---

## 📊 訊息流程

### 一般訊息

```
用戶在 LINE 發送: "你好"
      ↓
LINE 伺服器
      ↓
FLB 主系統接收
      ↓
   ├─ FLB 處理（檢查是否為關鍵字）
   └─ 轉發給 AIbot
      ↓
   AIbot 接收並處理
      ↓
   AIbot 回應 AI 對話
```

### 簽到關鍵字

```
用戶在 LINE 發送: "#簽到"
      ↓
LINE 伺服器
      ↓
FLB 主系統接收
      ↓
   ├─ FLB 處理簽到邏輯 ✅
   └─ 轉發給 AIbot
      ↓
   AIbot 接收（可以選擇忽略或記錄）
```

### 課程規劃關鍵字

```
用戶在 LINE 發送: "#本期課程規劃"
      ↓
LINE 伺服器
      ↓
FLB 主系統接收
      ↓
   ├─ FLB 查詢課程並回應 ✅
   └─ 轉發給 AIbot
      ↓
   AIbot 接收（可以選擇忽略或記錄）
```

---

## 🎯 AIbot 建議處理邏輯

```javascript
app.post('/webhook', (req, res) => {
  // 立即回應（必須）
  res.status(200).send('OK');
  
  const events = req.body.events || [];
  
  events.forEach(async event => {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text;
      const userId = event.source.userId;
      
      // 忽略 FLB 系統關鍵字（避免重複回應）
      if (text.startsWith('#')) {
        console.log('⏭️ 系統關鍵字，由 FLB 處理');
        return;
      }
      
      // 處理一般對話
      console.log(`🤖 處理 AI 對話: ${text}`);
      
      try {
        // 調用 AI API
        const aiResponse = await callAIAPI(text);
        
        // 回應給用戶
        await sendLineMessage(userId, aiResponse);
        
        console.log('✅ AI 回應完成');
      } catch (error) {
        console.error('❌ AI 處理失敗:', error);
      }
    }
  });
});
```

---

## 🚨 故障排除

### 問題 1：AIbot 沒收到 webhook

```bash
# 1. 確認轉發已啟用
curl http://localhost:3010/api/webhook-forward/status

# 2. 查看 FLB 日誌
docker logs --tail 50 flb-line-bot | grep "AIbot"

# 3. 測試 AIbot 連線
curl https://AIbot.funlearnbar.synology.me/webhook

# 4. 檢查防火牆
# 確認 port 已開放
```

### 問題 2：轉發失敗

```bash
# 查看錯誤日誌
docker logs --tail 100 flb-line-bot | grep "轉發失敗"

# 常見原因：
# - URL 錯誤
# - AIbot 服務未啟動
# - 網路問題
# - 超時
```

### 問題 3：收到但沒處理

```bash
# 確認 AIbot 的 webhook 端點正確
# 確認回應 200 OK
# 查看 AIbot 的日誌
```

---

## 📚 相關文檔

- [Webhook 轉發完整指南](./WEBHOOK_FORWARD_GUIDE.md)
- [快速開始](./WEBHOOK_FORWARD_QUICKSTART.md)
- [Docker 指令](./DOCKER_COMMANDS.md)

---

## ✅ 檢查清單

部署前確認：

- [ ] FLB 主系統已更新並重新部署
- [ ] AIbot 有 `/webhook` 端點
- [ ] AIbot 正在運行
- [ ] 已執行 `setup-aibot-forward.sh`
- [ ] 已測試 LINE 訊息轉發
- [ ] 兩個系統的日誌都正常
- [ ] AI 回應正常運作

---

**現在 FLB 和 AIbot 可以協同工作了！** 🎉

- FLB 處理：簽到、課程規劃、報表查詢
- AIbot 處理：AI 對話、智能客服

