#!/bin/bash

# 🧪 快速測試 Google Vision API 金鑰

API_KEY="AIzaSyDfYBGUCp1ixevg06acZCvWimwdqLKxh9Y"

echo "🧪 測試 Google Vision API..."
echo ""

RESPONSE=$(curl -s -X POST \
  "https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "image": {
          "source": {
            "imageUri": "https://cloud.google.com/vision/docs/images/bicycle_example.png"
          }
        },
        "features": [
          {
            "type": "TEXT_DETECTION"
          }
        ]
      }
    ]
  }')

if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ API 測試失敗"
    echo ""
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    
    if echo "$RESPONSE" | grep -q "BILLING_DISABLED"; then
        echo "💡 問題：計費未啟用"
        echo "   前往：https://console.developers.google.com/billing/enable?project=853046882453"
    elif echo "$RESPONSE" | grep -q "PERMISSION_DENIED"; then
        echo "💡 問題：權限被拒"
        echo "   1. 確認 Cloud Vision API 已啟用"
        echo "   2. 檢查 API 金鑰限制設定"
    fi
    exit 1
else
    echo "✅ API 測試成功！"
    echo "📝 Google Vision API 可以正常使用"
    echo ""
    
    if echo "$RESPONSE" | grep -q '"description"'; then
        echo "🔍 辨識測試："
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A 2 '"description"' | head -5
    fi
    exit 0
fi
