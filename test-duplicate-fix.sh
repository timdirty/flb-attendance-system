#!/bin/bash

# 🧪 測試重複訊息修復

echo "🧪 測試重複訊息修復"
echo "================================"
echo ""

# API 端點
API_BASE="http://localhost:3000"
WEBHOOK_ENDPOINT="$API_BASE/webhook"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📝 測試 1: 單一學生請假流程${NC}"
echo "================================"
echo ""

# 步驟 1: 點擊請假
echo -e "${YELLOW}步驟 1: 學生點擊「請假」${NC}"
curl -s -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "postback": {
        "data": "{\"action\":\"attendance_reply\",\"response\":\"leave\",\"studentName\":\"測試學生A\",\"courseName\":\"測試課程 A\",\"courseDate\":\"2025-10-24\",\"courseTime\":\"16:00-17:00\",\"location\":\"台北教室\",\"weekday\":\"星期四\"}"
      },
      "source": {"userId": "test_fix_001"},
      "replyToken": "test_token_001"
    }]
  }' > /dev/null

echo "✅ 已發送請假請求"
echo ""
sleep 2

# 步驟 2: 選擇理由
echo -e "${YELLOW}步驟 2: 學生選擇理由「生病」${NC}"
curl -s -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "postback": {
        "data": "{\"action\":\"leave_reason\",\"reason\":\"生病\",\"studentName\":\"測試學生A\",\"courseName\":\"測試課程 A\",\"courseDate\":\"2025-10-24\",\"courseTime\":\"16:00-17:00\",\"location\":\"台北教室\",\"weekday\":\"星期四\"}"
      },
      "source": {"userId": "test_fix_001"},
      "replyToken": "test_token_002"
    }]
  }' > /dev/null

echo "✅ 已發送請假理由"
echo ""
sleep 2

# 檢查結果
echo -e "${BLUE}📊 檢查儲存的資料${NC}"
response=$(curl -s "$API_BASE/api/student-responses?studentName=測試學生A")
count=$(echo "$response" | jq '.total' 2>/dev/null)

if [ "$count" = "1" ]; then
    echo -e "${GREEN}✅ 成功：只儲存了 1 筆記錄（沒有重複）${NC}"
else
    echo -e "${RED}❌ 警告：儲存了 $count 筆記錄（可能有重複）${NC}"
fi

echo ""
echo "詳細資料："
echo "$response" | jq '.data[] | {studentName, courseName, responseType, leaveReason, courseDate}' 2>/dev/null || echo "$response"

echo ""
echo "================================"
echo -e "${BLUE}📝 測試 2: 多學生選擇請假流程${NC}"
echo "================================"
echo ""

# 步驟 1: 選擇需要請假的孩子
echo -e "${YELLOW}步驟 1: 家長選擇需要請假的孩子${NC}"
curl -s -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "postback": {
        "data": "{\"action\":\"select_leave_student\",\"studentName\":\"測試學生B\",\"courseName\":\"測試課程 B\",\"courseDate\":\"2025-10-25\",\"courseTime\":\"17:00-18:30\",\"location\":\"新竹教室\",\"weekday\":\"星期五\"}"
      },
      "source": {"userId": "test_fix_002"},
      "replyToken": "test_token_003"
    }]
  }' > /dev/null

echo "✅ 已選擇請假孩子"
echo ""
sleep 2

# 步驟 2: 選擇理由
echo -e "${YELLOW}步驟 2: 選擇理由「家庭因素」${NC}"
curl -s -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "postback": {
        "data": "{\"action\":\"leave_reason\",\"reason\":\"家庭因素\",\"studentName\":\"測試學生B\",\"courseName\":\"測試課程 B\",\"courseDate\":\"2025-10-25\",\"courseTime\":\"17:00-18:30\",\"location\":\"新竹教室\",\"weekday\":\"星期五\"}"
      },
      "source": {"userId": "test_fix_002"},
      "replyToken": "test_token_004"
    }]
  }' > /dev/null

echo "✅ 已發送請假理由"
echo ""
sleep 2

# 檢查結果
echo -e "${BLUE}📊 檢查儲存的資料${NC}"
response=$(curl -s "$API_BASE/api/student-responses?studentName=測試學生B")
count=$(echo "$response" | jq '.total' 2>/dev/null)

if [ "$count" = "1" ]; then
    echo -e "${GREEN}✅ 成功：只儲存了 1 筆記錄（沒有重複）${NC}"
else
    echo -e "${RED}❌ 警告：儲存了 $count 筆記錄（可能有重複）${NC}"
fi

echo ""
echo "詳細資料："
echo "$response" | jq '.data[] | {studentName, courseName, responseType, leaveReason, courseDate}' 2>/dev/null || echo "$response"

echo ""
echo "================================"
echo -e "${BLUE}📊 查看所有測試記錄${NC}"
echo "================================"
echo ""

all_response=$(curl -s "$API_BASE/api/student-responses?studentName=測試學生")
total=$(echo "$all_response" | jq '.total' 2>/dev/null)

echo "總測試記錄數：$total"
echo ""

if [ "$total" = "2" ]; then
    echo -e "${GREEN}✅ 測試通過：兩個測試各產生 1 筆記錄，沒有重複${NC}"
else
    echo -e "${YELLOW}⚠️ 記錄數不符預期，請檢查是否有重複${NC}"
fi

echo ""
echo "所有記錄："
echo "$all_response" | jq '.data[] | {studentName, courseName, responseType, leaveReason, courseDate}' 2>/dev/null || echo "$all_response"

echo ""
echo "================================"
echo -e "${BLUE}🧹 清理測試資料${NC}"
echo "================================"
echo ""

# 獲取所有測試記錄的 ID
ids=$(echo "$all_response" | jq -r '.data[] | .id' 2>/dev/null)

if [ -n "$ids" ]; then
    echo "正在刪除測試記錄..."
    for id in $ids; do
        curl -s -X DELETE "$API_BASE/api/student-responses/$id" > /dev/null
        echo "  ✅ 已刪除: $id"
    done
    echo ""
    echo -e "${GREEN}✅ 測試資料已清理${NC}"
else
    echo "⚠️ 沒有測試資料需要清理"
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 測試完成！${NC}"
echo "================================"
echo ""
echo "建議檢查項目："
echo "1. 查看服務器日誌，確認沒有重複的「✅ 已發送確認訊息」"
echo "2. 在 LINE 聊天中測試，確認只收到一次確認訊息"
echo "3. 檢查管理員是否只收到一次通知"
echo ""
echo "查看日誌命令："
echo "  docker-compose logs -f | grep \"✅\|📥\|📝\""
echo ""


