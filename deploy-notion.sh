#!/bin/bash

# 🚀 Notion 記帳整合部署腳本
# 用於在 NAS 上快速部署 Notion 整合功能

set -e

echo "🚀 開始部署 Notion 記帳整合..."
echo ""

# 檢查是否在專案目錄
if [ ! -f "package.json" ]; then
    echo "❌ 請在專案根目錄執行此腳本"
    exit 1
fi

# 步驟 1：拉取最新程式碼
echo "📥 步驟 1/5：拉取最新程式碼..."
git pull origin main || {
    echo "⚠️  Git pull 失敗，繼續..."
}
echo ""

# 步驟 2：檢查 .env 設定
echo "🔍 步驟 2/5：檢查環境變數..."
if grep -q "NOTION_API_TOKEN" .env && grep -q "NOTION_INCOME_DATABASE_ID" .env; then
    echo "✅ Notion 環境變數已設定"
    echo ""
    echo "📝 當前設定："
    grep "NOTION_API_TOKEN" .env | head -1
    grep "NOTION_INCOME_DATABASE_ID" .env | head -1
else
    echo "❌ 找不到 Notion 環境變數"
    echo ""
    echo "請在 .env 檔案中加入："
    echo "NOTION_API_TOKEN=ntn_xxx..."
    echo "NOTION_INCOME_DATABASE_ID=your_database_id"
    exit 1
fi
echo ""

# 步驟 3：停止容器
echo "🛑 步驟 3/5：停止 Docker 容器..."
sudo docker-compose down
echo ""

# 步驟 4：重新建置並啟動
echo "🔨 步驟 4/5：重新建置並啟動容器..."
sudo docker-compose up -d --build
echo ""

# 步驟 5：等待啟動完成
echo "⏳ 步驟 5/5：等待容器啟動..."
sleep 10
echo ""

# 檢查容器狀態
echo "📊 容器狀態："
sudo docker ps --filter "name=flb-line-bot" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 測試 Notion 連線
echo "🧪 測試 Notion 連線..."
sleep 5

curl -s http://localhost:3000/api/notion/test | python3 -m json.tool || {
    echo "⚠️  測試失敗，請檢查日誌"
    echo ""
    echo "查看日誌："
    echo "sudo docker logs flb-line-bot --tail 50 | grep Notion"
    exit 1
}
echo ""

echo "✅ 部署完成！"
echo ""
echo "📋 後續操作："
echo "1. 測試 Notion 連線："
echo "   curl http://localhost:3000/api/notion/test"
echo ""
echo "2. 檢查配置狀態："
echo "   curl http://localhost:3000/api/notion/config"
echo ""
echo "3. 查看日誌："
echo "   sudo docker logs flb-line-bot -f | grep Notion"
echo ""
echo "4. 實際測試："
echo "   在 LINE 中發送匯款截圖，然後點擊「✅ 確認收款」"
echo "   檢查 Notion 資料庫是否新增記錄"
echo ""
