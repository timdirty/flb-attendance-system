#!/bin/bash

# 測試關鍵字不通知管理員功能
# 日期：2025-10-23

echo "================================"
echo "🧪 測試關鍵字不通知管理員功能"
echo "================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 測試檢查清單${NC}"
echo ""

# 檢查 1: server.js 是否有 notifyAdmin 參數
echo -e "${YELLOW}1️⃣ 檢查 sendLineMessage 函數是否增加 notifyAdmin 參數...${NC}"
if grep -q "async function sendLineMessage(message, targetUserId = null, notifyAdmin = true)" server.js; then
    echo -e "${GREEN}   ✅ 找到 notifyAdmin 參數${NC}"
else
    echo -e "${RED}   ❌ 未找到 notifyAdmin 參數${NC}"
fi
echo ""

# 檢查 2: 課程規劃關鍵字
echo -e "${YELLOW}2️⃣ 檢查課程規劃關鍵字是否使用 notifyAdmin = false...${NC}"
count=$(grep -c "已顯示.*位學生的本期課程規劃.*userId, false" server.js)
if [ "$count" -ge 1 ]; then
    echo -e "${GREEN}   ✅ 課程規劃關鍵字已設定 false ($count 處)${NC}"
else
    echo -e "${RED}   ❌ 課程規劃關鍵字未正確設定${NC}"
fi
echo ""

# 檢查 3: 出缺勤關鍵字
echo -e "${YELLOW}3️⃣ 檢查出缺勤關鍵字是否使用 notifyAdmin = false...${NC}"
count=$(grep -c "已顯示.*位學生的.*出缺勤.*userId, false" server.js)
if [ "$count" -ge 1 ]; then
    echo -e "${GREEN}   ✅ 出缺勤關鍵字已設定 false ($count 處)${NC}"
else
    echo -e "${RED}   ❌ 出缺勤關鍵字未正確設定${NC}"
fi
echo ""

# 檢查 4: 內部人員關鍵字
echo -e "${YELLOW}4️⃣ 檢查內部人員關鍵字是否使用 notifyAdmin = false...${NC}"
count=$(grep -c "切換為內部人員模式.*userId, false" server.js)
if [ "$count" -ge 1 ]; then
    echo -e "${GREEN}   ✅ 內部人員關鍵字已設定 false ($count 處)${NC}"
else
    echo -e "${RED}   ❌ 內部人員關鍵字未正確設定${NC}"
fi
echo ""

# 檢查 5: 解綁關鍵字
echo -e "${YELLOW}5️⃣ 檢查解綁關鍵字是否使用 notifyAdmin = false...${NC}"
count=$(grep -c "Rich Menu 已成功解除綁定.*userId, false" server.js)
if [ "$count" -ge 1 ]; then
    echo -e "${GREEN}   ✅ 解綁關鍵字已設定 false ($count 處)${NC}"
else
    echo -e "${RED}   ❌ 解綁關鍵字未正確設定${NC}"
fi
echo ""

# 檢查 6: 測試關鍵字
echo -e "${YELLOW}6️⃣ 檢查測試關鍵字是否使用 notifyAdmin = false...${NC}"
count=$(grep -c "測試模式已啟動.*userId, false" server.js)
if [ "$count" -ge 1 ]; then
    echo -e "${GREEN}   ✅ 測試關鍵字已設定 false ($count 處)${NC}"
else
    echo -e "${RED}   ❌ 測試關鍵字未正確設定${NC}"
fi
echo ""

# 檢查 7: sendLineMessageWithBot 函數
echo -e "${YELLOW}7️⃣ 檢查 sendLineMessageWithBot 是否正確處理 notifyAdmin...${NC}"
if grep -q "if (notifyAdmin && LINE_USER_ID" server.js; then
    echo -e "${GREEN}   ✅ notifyAdmin 條件判斷正確${NC}"
else
    echo -e "${RED}   ❌ notifyAdmin 條件判斷未正確設定${NC}"
fi
echo ""

# 總結
echo "================================"
echo -e "${BLUE}📊 測試總結${NC}"
echo "================================"
echo ""
echo "✅ 代碼檢查完成"
echo ""
echo -e "${YELLOW}📝 下一步：${NC}"
echo "   1. 重啟服務: pm2 restart flb-line-bot"
echo "   2. 實際測試關鍵字回應"
echo "   3. 確認管理員不會收到訊息"
echo ""
echo -e "${BLUE}🧪 實際測試建議：${NC}"
echo "   - 使用非管理員帳號發送: #本期課程規劃"
echo "   - 使用非管理員帳號發送: #剩餘堂數"
echo "   - 檢查管理員 LINE 聊天室是否收到訊息"
echo "   - 預期：管理員不應收到任何訊息"
echo ""

