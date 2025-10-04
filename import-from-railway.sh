#!/bin/bash

# 從 Railway 匯入環境變數到 .env

echo "🚂 從 Railway 匯入環境變數"
echo "============================"
echo ""

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 請按照以下步驟操作：${NC}"
echo ""
echo "1. 前往 Railway Dashboard："
echo "   https://railway.app/dashboard"
echo ""
echo "2. 選擇您的 LINE Bot 專案"
echo ""
echo "3. 點擊 Variables 標籤"
echo ""
echo "4. 複製以下環境變數的值："
echo ""
echo -e "${YELLOW}需要的變數：${NC}"
echo "   - LINE_CHANNEL_ACCESS_TOKEN"
echo "   - LINE_CHANNEL_SECRET"
echo "   - LINE_USER_ID"
echo "   - GOOGLE_SHEETS_API"
echo "   - GOOGLE_SHEETS_COOKIE"
echo ""
echo "================================"
echo ""

# 建立 .env 檔案
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 檔案已存在${NC}"
    read -p "是否覆蓋？(y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
    mv .env .env.backup
    echo -e "${GREEN}✓${NC} 已備份為 .env.backup"
fi

echo ""
echo "請依序輸入環境變數的值（從 Railway 複製貼上）："
echo ""

# 讀取各個變數
read -p "LINE_CHANNEL_ACCESS_TOKEN: " line_token
read -p "LINE_CHANNEL_SECRET: " line_secret
read -p "LINE_USER_ID: " line_user_id
read -p "GOOGLE_SHEETS_API: " sheets_api
read -p "GOOGLE_SHEETS_COOKIE: " sheets_cookie

# 寫入 .env 檔案
cat > .env << EOF
# LINE Bot 設定（從 Railway 匯入）
LINE_CHANNEL_ACCESS_TOKEN=$line_token
LINE_CHANNEL_SECRET=$line_secret
LINE_USER_ID=$line_user_id

# Google Sheets 設定（從 Railway 匯入）
GOOGLE_SHEETS_API=$sheets_api
GOOGLE_SHEETS_COOKIE=$sheets_cookie

# 伺服器設定
PORT=3010
NODE_ENV=production
TZ=Asia/Taipei

# 匯入時間：$(date)
EOF

echo ""
echo -e "${GREEN}✅ .env 檔案已建立！${NC}"
echo ""
echo "📋 檔案內容預覽："
echo "================================"
cat .env | grep -v "COOKIE\|TOKEN\|SECRET" | head -10
echo "... (敏感資訊已隱藏)"
echo "================================"
echo ""
echo -e "${BLUE}🔒 安全提醒：${NC}"
echo "  - .env 檔案包含敏感資訊"
echo "  - 請勿提交到 Git"
echo "  - 請勿分享給他人"
echo ""
echo -e "${GREEN}✨ 下一步：${NC}"
echo "  執行: ./deploy-to-nas.sh"
echo "  或執行: docker-compose up -d"
echo ""

