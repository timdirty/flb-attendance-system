#!/bin/bash
# 測試匯款通知功能

echo "🧪 測試匯款通知 webhook..."

curl -X POST http://localhost:3010/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "message",
        "replyToken": "test-token-123",
        "source": {
          "userId": "U1234567890abcdef",
          "type": "user"
        },
        "message": {
          "type": "text",
          "text": "我已經轉帳 1500 元了",
          "id": "test-message-123"
        },
        "timestamp": 1732171260000
      }
    ]
  }'

echo ""
echo "✅ 測試完成！請檢查終端日誌"
