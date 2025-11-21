#!/bin/bash

# 🔧 AIbot 認證問題修復腳本
# 此腳本幫助你為 AIbot 添加 API 密鑰或停用 AIbot

echo "🔧 AIbot 認證問題修復"
echo "===================="
echo ""
echo "目前 AIbot 回應 401 Unauthorized，需要 API 密鑰認證。"
echo ""
echo "請選擇修復方案："
echo "1) 為 AIbot 添加 API 密鑰（需要從 AIbot 團隊取得密鑰）"
echo "2) 暫時停用 AIbot 轉發"
echo "3) 完全移除 AIbot 目標"
echo "4) 取消"
echo ""
read -p "請輸入選項 (1-4): " choice

case $choice in
    1)
        echo ""
        read -p "請輸入 AIbot API 密鑰（Bearer Token）: " api_key
        
        if [ -z "$api_key" ]; then
            echo "❌ 錯誤：API 密鑰不能為空"
            exit 1
        fi
        
        echo ""
        echo "正在更新 AIbot 認證設定..."
        
        # 更新 webhook-targets.json
        cat > data/webhook-targets.json << EOF
[
  {
    "name": "AIbot",
    "url": "https://AIbot.funlearnbar.synology.me/api/webhook/receive",
    "method": "POST",
    "enabled": true,
    "headers": {
      "Authorization": "Bearer $api_key"
    },
    "timeout": 5000
  },
  {
    "name": "FLB課程提醒系統",
    "url": "https://calendar.funlearnbar.synology.me/webhook/line",
    "method": "POST",
    "enabled": true,
    "headers": {},
    "timeout": 5000
  }
]
EOF
        
        echo "✅ AIbot API 密鑰已添加！"
        echo ""
        echo "🚀 請重新部署容器："
        echo "   sudo docker-compose down"
        echo "   sudo docker-compose build --no-cache"
        echo "   sudo docker-compose up -d"
        ;;
        
    2)
        echo ""
        echo "正在停用 AIbot 轉發..."
        
        # 更新 webhook-targets.json
        cat > data/webhook-targets.json << EOF
[
  {
    "name": "AIbot",
    "url": "https://AIbot.funlearnbar.synology.me/api/webhook/receive",
    "method": "POST",
    "enabled": false,
    "headers": {},
    "timeout": 5000
  },
  {
    "name": "FLB課程提醒系統",
    "url": "https://calendar.funlearnbar.synology.me/webhook/line",
    "method": "POST",
    "enabled": true,
    "headers": {},
    "timeout": 5000
  }
]
EOF
        
        echo "✅ AIbot 已停用！"
        echo ""
        echo "🚀 請重新部署容器："
        echo "   sudo docker-compose down"
        echo "   sudo docker-compose build --no-cache"
        echo "   sudo docker-compose up -d"
        ;;
        
    3)
        echo ""
        echo "正在移除 AIbot 目標..."
        
        # 更新 webhook-targets.json
        cat > data/webhook-targets.json << EOF
[
  {
    "name": "FLB課程提醒系統",
    "url": "https://calendar.funlearnbar.synology.me/webhook/line",
    "method": "POST",
    "enabled": true,
    "headers": {},
    "timeout": 5000
  }
]
EOF
        
        echo "✅ AIbot 已移除！"
        echo ""
        echo "🚀 請重新部署容器："
        echo "   sudo docker-compose down"
        echo "   sudo docker-compose build --no-cache"
        echo "   sudo docker-compose up -d"
        ;;
        
    4)
        echo "已取消"
        exit 0
        ;;
        
    *)
        echo "❌ 無效的選項"
        exit 1
        ;;
esac

echo ""
echo "📊 修復完成後，請檢查日誌："
echo "   sudo docker logs -f flb-line-bot | grep -E \"(轉發|成功|失敗)\""
echo ""
echo "✅ 完成！"










