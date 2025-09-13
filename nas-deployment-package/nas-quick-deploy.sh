#!/bin/bash

echo "⚡ NAS 快速部署腳本"
echo "=================="

# 設定環境變數
export LINE_CHANNEL_ACCESS_TOKEN="LaeRrV+/XZ6oCJ2ZFzAFlZXHX822l50NxxM2x6vBkuoux4ptr6KjFJcIXL6pNJel2dKbZ7nxachvxvKrKaMNchMqGTywUl4KMGXhxd/bdiDM7M6Ad8OiXF+VzfhlSMXfu1MbDfxdwe0z/NLYHzadyQdB04t89/1O/w1cDnyilFU="
export LINE_USER_ID="Udb51363eb6fdc605a6a9816379a38103"

# 完全清理
echo "🧹 清理舊容器..."
docker-compose down --rmi all --volumes --remove-orphans 2>/dev/null || true
docker system prune -af

# 重新構建
echo "🔨 重新構建..."
docker-compose build --no-cache --pull

# 啟動服務
echo "🚀 啟動服務..."
docker-compose up -d

# 等待啟動
echo "⏳ 等待啟動..."
sleep 30

# 檢查狀態
echo "📊 檢查狀態..."
docker-compose ps

# 測試功能
echo "🧪 測試功能..."
sleep 5

# 測試主頁
if curl -s http://localhost:3000 | grep -q "FLB"; then
    echo "✅ 主頁正常"
else
    echo "❌ 主頁異常"
fi

# 測試 webhook
webhook_test=$(curl -s -X POST http://localhost:3000/webhook \
    -H "Content-Type: application/json" \
    -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}' \
    -w "%{http_code}")

if [[ "$webhook_test" == *"200"* ]] || [[ "$webhook_test" == *"OK"* ]]; then
    echo "✅ Webhook 正常"
else
    echo "❌ Webhook 異常"
fi

# 測試 LINE 通知
line_test=$(curl -s -X POST http://localhost:3000/api/test-message \
    -H "Content-Type: application/json" \
    -d '{"userId":"'$LINE_USER_ID'","message":"NAS 部署測試"}' \
    -w "%{http_code}")

if [[ "$line_test" == *"200"* ]] && [[ "$line_test" == *"success"* ]]; then
    echo "✅ LINE 通知正常"
else
    echo "❌ LINE 通知異常"
fi

# 測試講師列表 API
teachers_test=$(curl -s http://localhost:3000/api/teachers -w "%{http_code}")
if [[ "$teachers_test" == *"200"* ]]; then
    echo "✅ 講師列表 API 正常"
else
    echo "❌ 講師列表 API 異常"
fi

# 測試管理員統計 API
admin_test=$(curl -s http://localhost:3000/api/admin/stats -w "%{http_code}")
if [[ "$admin_test" == *"200"* ]]; then
    echo "✅ 管理員 API 正常"
else
    echo "❌ 管理員 API 異常"
fi

# 獲取 NAS IP
NAS_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "🎉 部署完成！"
echo "============="
echo "🌐 本地訪問: http://localhost:3000"
echo "🌐 外部訪問: http://$NAS_IP:3000"
echo "🔗 Webhook: http://$NAS_IP:3000/webhook"
echo ""
echo "📋 下一步："
echo "1. 在 DSM 中設定反向代理"
echo "2. 在 LINE Developer Console 設定 Webhook URL"
echo "3. 設定防火牆開放 3000 端口"
