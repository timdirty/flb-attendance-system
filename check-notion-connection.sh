#!/bin/bash

# 🔍 快速檢查 Notion Integration 是否已連接

echo "🔍 檢查 Notion Integration 連接狀態..."
echo ""

# 檢查環境變數
if [ ! -f ".env" ]; then
    echo "❌ 找不到 .env 檔案"
    exit 1
fi

source .env

if [ -z "$NOTION_API_TOKEN" ] || [ -z "$NOTION_INCOME_DATABASE_ID" ]; then
    echo "❌ 環境變數未設定"
    exit 1
fi

echo "✅ 環境變數已設定"
echo "   Token: ${NOTION_API_TOKEN:0:15}..."
echo "   Database ID: ${NOTION_INCOME_DATABASE_ID:0:10}..."
echo ""

# 測試連線
echo "🔗 測試 Notion API 連線..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $NOTION_API_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  "https://api.notion.com/v1/databases/$NOTION_INCOME_DATABASE_ID")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 連線成功！Integration 已正確連接到資料庫"
    echo ""
    echo "📊 資料庫資訊："
    echo "$BODY" | python3 -m json.tool | grep -A 2 '"title"' | head -5
    echo ""
    echo "🎉 準備就緒！可以開始使用 Notion 記帳功能"
    exit 0
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ 連線失敗：找不到資料庫"
    echo ""
    echo "💡 解決方案："
    echo "   1. 在 Notion 中開啟資料庫頁面"
    echo "   2. 點擊右上角「⋯」"
    echo "   3. 選擇「+ Add connections」"
    echo "   4. 選擇「FLB 簽到系統」"
    echo "   5. 點擊「Confirm」"
    echo ""
    echo "   資料庫連結："
    echo "   https://www.notion.so/funlearnbar/FLB-1a10a4c0ed8480979cf6cd46c312f31f"
    exit 1
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ 連線失敗：Token 無效"
    echo ""
    echo "💡 解決方案："
    echo "   請檢查 NOTION_API_TOKEN 是否正確"
    exit 1
else
    echo "❌ 連線失敗：HTTP $HTTP_CODE"
    echo ""
    echo "回應內容："
    echo "$BODY" | python3 -m json.tool
    exit 1
fi
