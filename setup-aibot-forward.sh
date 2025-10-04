#!/bin/bash

# 🤖 設定 AIbot Webhook 轉發
# 
# 用途：將 LINE webhook 轉發到 AIbot 專案
# 執行：./setup-aibot-forward.sh [API_KEY]
#
# 使用範例：
#   ./setup-aibot-forward.sh your-secret-api-key

# 從參數或環境變數讀取 API Key
API_KEY="${1:-${AIBOT_API_KEY}}"

if [ -z "$API_KEY" ]; then
  echo "⚠️  請提供 API Key"
  echo ""
  echo "使用方式："
  echo "  方式 1：./setup-aibot-forward.sh YOUR_API_KEY"
  echo "  方式 2：export AIBOT_API_KEY=YOUR_API_KEY && ./setup-aibot-forward.sh"
  echo ""
  echo "生成 API Key："
  echo "  openssl rand -hex 32"
  echo ""
  exit 1
fi

echo "🤖 設定 AIbot Webhook 轉發..."
echo "🔑 使用 API Key: ${API_KEY:0:8}..."

# 新增轉發目標（使用正確的端點和 API Key）
echo ""
echo "📤 新增轉發目標..."
curl -X POST http://localhost:3010/api/webhook-forward/targets \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"AIbot\",
    \"url\": \"https://AIbot.funlearnbar.synology.me/api/webhook/receive\",
    \"enabled\": true,
    \"timeout\": 10000,
    \"headers\": {
      \"Authorization\": \"Bearer ${API_KEY}\",
      \"X-Forwarded-From\": \"FLB-LINE-Bot\"
    }
  }"

echo ""
echo ""
echo "📊 查看當前狀態..."
curl -s http://localhost:3010/api/webhook-forward/status | jq '.'

echo ""
echo "✅ 設定完成！"
echo ""
echo "現在 LINE 收到的所有訊息都會同步轉發到："
echo "  🎓 FLB 簽到系統（主系統）"
echo "  🤖 AIbot 專案"
echo ""
echo "測試方式："
echo "  1. 在 LINE 發送任何訊息"
echo "  2. 查看兩個專案的日誌"
echo ""
echo "管理指令："
echo "  查看狀態：curl http://localhost:3010/api/webhook-forward/status"
echo "  停用轉發：curl -X PATCH 'http://localhost:3010/api/webhook-forward/targets/AIbot' -H 'Content-Type: application/json' -d '{\"enabled\": false}'"
echo "  啟用轉發：curl -X PATCH 'http://localhost:3010/api/webhook-forward/targets/AIbot' -H 'Content-Type: application/json' -d '{\"enabled\": true}'"
echo "  移除轉發：curl -X DELETE 'http://localhost:3010/api/webhook-forward/targets/AIbot'"
echo ""

