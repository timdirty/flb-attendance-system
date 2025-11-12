#!/bin/bash

# 快速部署關鍵字不通知管理員修復
# 日期：2025-10-23

echo "================================"
echo "🚀 快速部署修復"
echo "================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2 未安裝，將使用 node 直接啟動"
    USE_PM2=false
else
    USE_PM2=true
fi

echo -e "${BLUE}📝 部署步驟：${NC}"
echo ""

# 1. 檢查修改
echo -e "${YELLOW}1️⃣ 檢查代碼修改...${NC}"
if grep -q "notifyAdmin = true" server.js; then
    echo -e "${GREEN}   ✅ notifyAdmin 參數已加入${NC}"
else
    echo -e "   ❌ notifyAdmin 參數未找到"
    exit 1
fi

# 統計修改數量
false_count=$(grep -c "userId, false" server.js)
echo -e "${GREEN}   ✅ 找到 ${false_count} 處使用 notifyAdmin = false${NC}"
echo ""

# 2. 備份當前版本（可選）
echo -e "${YELLOW}2️⃣ 備份當前版本...${NC}"
backup_file="server.js.backup.$(date +%Y%m%d_%H%M%S)"
cp server.js "$backup_file"
echo -e "${GREEN}   ✅ 已備份至: $backup_file${NC}"
echo ""

# 3. 重啟服務
echo -e "${YELLOW}3️⃣ 重啟服務...${NC}"
if [ "$USE_PM2" = true ]; then
    # 使用 PM2
    if pm2 list | grep -q "flb-line-bot"; then
        pm2 restart flb-line-bot
        echo -e "${GREEN}   ✅ PM2 服務已重啟${NC}"
    else
        echo "   ⚠️ PM2 服務 'flb-line-bot' 不存在"
        echo "   請手動啟動：pm2 start server.js --name flb-line-bot"
    fi
else
    echo "   請手動重啟 Node.js 服務"
fi
echo ""

# 4. 查看日誌
echo -e "${YELLOW}4️⃣ 查看最新日誌...${NC}"
if [ "$USE_PM2" = true ] && pm2 list | grep -q "flb-line-bot"; then
    echo "   執行: pm2 logs flb-line-bot --lines 20"
    pm2 logs flb-line-bot --lines 20 --nostream
else
    if [ -f "logs/server.log" ]; then
        echo "   最新 10 行日誌:"
        tail -10 logs/server.log
    fi
fi
echo ""

# 5. 測試建議
echo "================================"
echo -e "${BLUE}🧪 測試建議${NC}"
echo "================================"
echo ""
echo "1. 使用非管理員帳號發送關鍵字："
echo "   - #本期課程規劃"
echo "   - #剩餘堂數"
echo "   - #出缺勤"
echo ""
echo "2. 檢查結果："
echo "   ✅ 客戶應收到: Flex Message + 文字回饋"
echo "   ❌ 管理員應不收到: 任何訊息"
echo ""
echo "3. 查看日誌確認："
echo "   pm2 logs flb-line-bot"
echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""






