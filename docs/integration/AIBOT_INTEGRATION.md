# 🤖 FLB ↔ AIbot 整合指南

完整的雙系統整合配置，實現智能簽到 + AI 對話。

---

## 🎯 系統架構

```
LINE Platform
    ↓ webhook
[FLB-LINE-Bot] (Node.js - 主系統)
    ├─ 處理簽到、課程規劃、報表
    └─ 轉發一般對話到 ↓
[AIbot] (FastAPI - AI 系統)
    └─ AI 智能對話、知識庫檢索
```

---

## ✅ AIbot 系統規格

根據您提供的資訊，AIbot 已具備：

### 接收端點

```
POST https://AIbot.funlearnbar.synology.me/api/webhook/receive
```

### 驗證機制

- ✅ 檢查 `Authorization: Bearer YOUR_API_KEY`
- ✅ 檢查 `X-Forwarded-From: FLB-LINE-Bot`
- ✅ 檢查時間戳（防止重放攻擊）

### 智能處理

- ✅ 自動忽略 `#` 開頭的系統關鍵字
- ✅ AI 引擎處理一般對話
- ✅ 知識庫檢索（2,919 筆資料）
- ✅ 對話記錄與分析

---

## 🚀 快速設定（完整流程）

### 步驟 1：生成並設定 API Key

#### 1.1 生成 API Key

```bash
# 在本機或 NAS 上執行
openssl rand -hex 32

# 輸出範例：
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**複製這個 Key，接下來會用到！**

#### 1.2 在 AIbot 設定 API Key

```bash
# SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 進入 AIbot 專案目錄
cd /path/to/AIbot

# 編輯 .env
nano .env

# 加入或更新：
WEBHOOK_FORWARD_API_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
WEBHOOK_FORWARD_LOG=true

# 儲存並退出（Ctrl+X, Y, Enter）

# 重啟 AIbot
sudo docker-compose restart

# 確認運行
sudo docker-compose logs -f app
```

---

### 步驟 2：同步 FLB 程式碼

```bash
# 檔案已透過 Synology Drive 自動同步到 NAS
# 確認同步完成：

# SSH 到 NAS
ssh ctctim14@YOUR_NAS_IP

# 檢查檔案是否存在
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"
ls -la setup-aibot-forward.sh

# 應該看到這個檔案
```

---

### 步驟 3：部署 FLB 主系統

```bash
# 在 NAS 上執行

# 進入專案目錄
cd "/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

# 重新部署（更新 webhook 轉發功能）
sudo ./deploy-on-nas.sh

# 等待部署完成，查看日誌
sudo docker logs -f flb-line-bot
```

---

### 步驟 4：設定 AIbot 轉發

```bash
# 在 NAS 上執行

# 使用您剛才生成的 API Key
sudo ./setup-aibot-forward.sh a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# 或設定環境變數
export AIBOT_API_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
sudo -E ./setup-aibot-forward.sh
```

應該看到：

```
🤖 設定 AIbot Webhook 轉發...
🔑 使用 API Key: a1b2c3d4...

📤 新增轉發目標...
{"success":true,"message":"轉發目標已新增","status":{...}}

📊 查看當前狀態...
{
  "success": true,
  "totalTargets": 1,
  "enabledTargets": 1,
  "targets": [
    {
      "name": "AIbot",
      "url": "https://AIbot.funlearnbar.synology.me/api/webhook/receive",
      "enabled": true
    }
  ]
}

✅ 設定完成！
```

---

### 步驟 5：測試整合

#### 5.1 測試 AIbot 端點

```bash
# 測試 AIbot 是否正常運行
curl https://AIbot.funlearnbar.synology.me/health

# 應該回應：
# {"status":"ok",...}
```

#### 5.2 測試轉發（手動）

```bash
# 使用 curl 模擬轉發
curl -X POST https://AIbot.funlearnbar.synology.me/api/webhook/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
  -H "X-Forwarded-From: FLB-LINE-Bot" \
  -H "X-Forward-Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "events": [
      {
        "type": "message",
        "message": {
          "type": "text",
          "text": "什麼是樂程坊？"
        },
        "source": {
          "userId": "test_user_123"
        },
        "timestamp": 1640000000000,
        "replyToken": "test_token"
      }
    ]
  }'
```

#### 5.3 查看 AIbot 日誌

```bash
# 應該看到處理記錄
sudo docker-compose logs --tail=50 app -f

# 預期輸出：
# 📥 收到轉發的 Webhook
#    來源: FLB-LINE-Bot
# ✅ 來自 FLB 的轉發
# 🤖 AI 處理: 什麼是樂程坊？
# ✅ AI 回覆已生成
```

#### 5.4 測試 LINE 真實對話

```
在 LINE 中測試：

測試 1：系統關鍵字（FLB 處理）
用戶：#help
預期：FLB 回應系統說明

測試 2：一般對話（AIbot 處理）
用戶：樂程坊在哪裡？
預期：AIbot 回應智能答案

測試 3：簽到功能（FLB 處理）
用戶：#簽到
預期：FLB 處理簽到流程

測試 4：課程查詢（FLB 處理）
用戶：#本期課程規劃
預期：FLB 回應課程 Flex Message
```

---

## 📊 監控與管理

### 查看轉發狀態

```bash
# 查看 FLB 轉發設定
curl http://localhost:3010/api/webhook-forward/status

# 查看 AIbot 狀態
curl https://AIbot.funlearnbar.synology.me/api/webhook/status
```

### 查看即時日誌

```bash
# FLB 日誌
sudo docker logs -f flb-line-bot

# 只看轉發相關
sudo docker logs -f flb-line-bot | grep "轉發"

# AIbot 日誌
cd /path/to/AIbot
sudo docker-compose logs -f app

# 只看 webhook 處理
sudo docker-compose logs app | grep "AI 處理"
```

### 管理轉發目標

```bash
# 暫時停用轉發
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 重新啟用
curl -X PATCH "http://localhost:3010/api/webhook-forward/targets/AIbot" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 移除轉發（如果需要重新設定）
curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/AIbot"
```

---

## 🔄 完整訊息流程

### 場景 1：一般對話（AI 處理）

```
1. 用戶在 LINE 發送："樂程坊課程費用是多少？"
   ↓
2. LINE Platform → FLB Webhook
   ↓
3. FLB 檢查：不是 # 開頭
   ↓
4. FLB 處理自己的邏輯（如記錄）
   ↓
5. FLB 自動轉發到 AIbot
   POST https://AIbot.funlearnbar.synology.me/api/webhook/receive
   Headers:
   - Authorization: Bearer API_KEY
   - X-Forwarded-From: FLB-LINE-Bot
   ↓
6. AIbot 接收並驗證：
   - 檢查 API Key ✅
   - 檢查來源 ✅
   - 檢查不是 # 開頭 ✅
   ↓
7. AIbot 處理：
   - 查詢知識庫
   - AI 生成回覆
   - 記錄對話
   ↓
8. AIbot 透過 LINE API 回覆用戶
   "樂程坊的課程費用依據課程類型而定..."
```

### 場景 2：系統關鍵字（FLB 處理）

```
1. 用戶在 LINE 發送："#簽到"
   ↓
2. LINE Platform → FLB Webhook
   ↓
3. FLB 檢查：是 # 開頭 ✅
   ↓
4. FLB 處理簽到邏輯
   ↓
5. FLB 也轉發到 AIbot（可選）
   ↓
6. AIbot 檢查：是 # 開頭
   ↓
7. AIbot 記錄但不處理（交給 FLB）
   ↓
8. FLB 回覆簽到結果
```

### 場景 3：課程規劃查詢（FLB 處理）

```
1. 用戶："#本期課程規劃"
   ↓
2. FLB 接收並處理：
   - 查詢課程 API
   - 生成 Flex Message
   - 回覆用戶
   ↓
3. 同時轉發到 AIbot（記錄用）
   ↓
4. AIbot 記錄但不處理
```

---

## 🔐 安全性檢查

### API Key 安全

✅ **已實作：**
- API Key 儲存在環境變數（不在程式碼中）
- 使用 Bearer Token 格式
- 256-bit 隨機金鑰

⚠️ **建議：**
- 定期更換 API Key（每 3-6 個月）
- 不要將 .env 檔案提交到 Git
- 限制 AIbot 只接受來自 FLB 的請求

### 來源驗證

✅ **已實作：**
- 檢查 `X-Forwarded-From` header
- 檢查時間戳（防止重放攻擊）
- 401/403 錯誤處理

### HTTPS 連線

✅ **已實作：**
- AIbot 使用 HTTPS（`https://AIbot.funlearnbar.synology.me`）
- SSL 證書有效

---

## 📈 效能考量

### FLB 端

- ✅ 非同步轉發（不阻塞 LINE webhook 回應）
- ✅ 10 秒超時設定
- ✅ 失敗不影響主流程

### AIbot 端

- ✅ 快速回應（200 OK）
- ✅ 異步處理 AI 邏輯
- ✅ 知識庫已預載入記憶體

### 預期效能

- LINE → FLB：< 100ms
- FLB → AIbot：< 50ms（轉發）
- AIbot AI 處理：1-3 秒
- 總回應時間：< 5 秒

---

## 🛠️ 故障排除

### 問題 1：轉發失敗（401 Unauthorized）

```bash
# 原因：API Key 不一致或錯誤
# 解決：

# 檢查 FLB 設定
curl http://localhost:3010/api/webhook-forward/status

# 檢查 AIbot .env
cd /path/to/AIbot
cat .env | grep WEBHOOK_FORWARD_API_KEY

# 確認兩邊一致
```

### 問題 2：轉發失敗（403 Forbidden）

```bash
# 原因：缺少 X-Forwarded-From header
# 解決：

# 確認轉發設定包含 headers
curl http://localhost:3010/api/webhook-forward/status

# 應該看到：
# "headers": {
#   "Authorization": "Bearer ...",
#   "X-Forwarded-From": "FLB-LINE-Bot"
# }
```

### 問題 3：AIbot 收到但沒有回應

```bash
# 檢查 AIbot 日誌
cd /path/to/AIbot
sudo docker-compose logs --tail=100 app

# 查找錯誤訊息
sudo docker-compose logs app | grep -i error

# 常見原因：
# - 知識庫未載入
# - AI API 額度用完
# - LINE API Token 錯誤
```

### 問題 4：轉發超時

```bash
# 增加超時時間
curl -X DELETE "http://localhost:3010/api/webhook-forward/targets/AIbot"

curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AIbot",
    "url": "https://AIbot.funlearnbar.synology.me/api/webhook/receive",
    "enabled": true,
    "timeout": 15000,
    "headers": {...}
  }'
```

---

## 📝 檢查清單

部署前確認：

### FLB 主系統
- [ ] 已透過 Synology Drive 同步最新程式碼
- [ ] 已重新部署 Docker
- [ ] `setup-aibot-forward.sh` 存在且可執行
- [ ] 已查看部署日誌確認無錯誤

### AIbot 系統
- [ ] API Key 已設定在 .env
- [ ] Docker 容器正常運行
- [ ] 知識庫已載入（2,919 筆）
- [ ] `/api/webhook/receive` 端點正常

### 轉發設定
- [ ] 已執行 `setup-aibot-forward.sh`
- [ ] API Key 兩邊一致
- [ ] 轉發狀態顯示 enabled: true
- [ ] URL 正確：`/api/webhook/receive`

### 測試驗證
- [ ] curl 測試成功
- [ ] AIbot 日誌顯示收到訊息
- [ ] LINE 一般對話測試成功
- [ ] LINE 系統關鍵字測試成功

---

## 🎉 完成！

設定完成後，您將擁有：

### FLB 主系統處理
- ✅ 簽到功能
- ✅ 課程規劃查詢
- ✅ 報表產生
- ✅ 系統管理功能

### AIbot 系統處理
- ✅ AI 智能對話
- ✅ 知識庫問答
- ✅ 客服支援
- ✅ 對話分析

### 協同效果
- ✅ 無縫使用體驗
- ✅ 各司其職，效能最佳
- ✅ 完整的對話記錄
- ✅ 可持續改進的 AI

---

## 📚 相關文檔

- [AIBOT_SETUP.md](./AIBOT_SETUP.md) - 快速設定指南
- [WEBHOOK_FORWARD_GUIDE.md](./WEBHOOK_FORWARD_GUIDE.md) - 轉發完整文檔
- [DOCKER_COMMANDS.md](./DOCKER_COMMANDS.md) - Docker 指令

---

**兩個系統完美整合，提供最佳的智能客服體驗！** 🚀

