#!/bin/bash

# 🧪 多學生出席回應功能測試腳本

echo "🧪 開始測試多學生出席回應功能"
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

# 測試計數
TESTS_PASSED=0
TESTS_FAILED=0

# 測試函數
test_webhook() {
    local test_name=$1
    local data=$2
    
    echo -e "${YELLOW}測試: ${test_name}${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ 通過 (HTTP $http_code)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ 失敗 (HTTP $http_code)${NC}"
        echo "回應: $body"
        ((TESTS_FAILED++))
    fi
    
    echo ""
    sleep 1
}

echo "📝 測試 1: 全部會出席 (2 個孩子)"
test_webhook "全部會出席" '{
  "events": [{
    "type": "postback",
    "postback": {
      "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"attend_all\",\"studentCount\":2,\"students\":[{\"studentName\":\"王小明\",\"courseName\":\"ESM 四 16:00-17:00\",\"courseDate\":\"2025-10-24\",\"courseTime\":\"16:00-17:00\",\"location\":\"台北教室\",\"weekday\":\"星期四\"},{\"studentName\":\"王小華\",\"courseName\":\"JM 四 17:00-18:30\",\"courseDate\":\"2025-10-24\",\"courseTime\":\"17:00-18:30\",\"location\":\"台北教室\",\"weekday\":\"星期四\"}]}"
    },
    "source": {
      "userId": "U_test_multi_001"
    },
    "replyToken": "test_token_001"
  }]
}'

echo "📝 測試 2: 部分需要請假 (3 個孩子)"
test_webhook "部分需要請假" '{
  "events": [{
    "type": "postback",
    "postback": {
      "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"leave_some\",\"studentCount\":3,\"students\":[{\"studentName\":\"李小明\",\"courseName\":\"ESM 三 16:00-17:00\",\"courseDate\":\"2025-10-25\",\"courseTime\":\"16:00-17:00\",\"location\":\"新竹教室\",\"weekday\":\"星期三\"},{\"studentName\":\"李小華\",\"courseName\":\"JM 三 17:00-18:30\",\"courseDate\":\"2025-10-25\",\"courseTime\":\"17:00-18:30\",\"location\":\"新竹教室\",\"weekday\":\"星期三\"},{\"studentName\":\"李小強\",\"courseName\":\"SPM 三 18:30-20:00\",\"courseDate\":\"2025-10-25\",\"courseTime\":\"18:30-20:00\",\"location\":\"新竹教室\",\"weekday\":\"星期三\"}]}"
    },
    "source": {
      "userId": "U_test_multi_002"
    },
    "replyToken": "test_token_002"
  }]
}'

echo "📝 測試 3: 稍後確認 (2 個孩子)"
test_webhook "稍後確認" '{
  "events": [{
    "type": "postback",
    "postback": {
      "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"pending\",\"studentCount\":2,\"students\":[{\"studentName\":\"張小明\",\"courseName\":\"ESM 五 16:00-17:00\",\"courseDate\":\"2025-10-26\",\"courseTime\":\"16:00-17:00\",\"location\":\"台中教室\",\"weekday\":\"星期五\"},{\"studentName\":\"張小華\",\"courseName\":\"JM 五 17:00-18:30\",\"courseDate\":\"2025-10-26\",\"courseTime\":\"17:00-18:30\",\"location\":\"台中教室\",\"weekday\":\"星期五\"}]}"
    },
    "source": {
      "userId": "U_test_multi_003"
    },
    "replyToken": "test_token_003"
  }]
}'

echo "📝 測試 4: 選擇請假的孩子"
test_webhook "選擇請假孩子" '{
  "events": [{
    "type": "postback",
    "postback": {
      "data": "{\"action\":\"select_leave_student\",\"studentName\":\"李小明\",\"courseName\":\"ESM 三 16:00-17:00\",\"courseDate\":\"2025-10-25\",\"courseTime\":\"16:00-17:00\",\"location\":\"新竹教室\",\"weekday\":\"星期三\"}"
    },
    "source": {
      "userId": "U_test_multi_002"
    },
    "replyToken": "test_token_004"
  }]
}'

echo ""
echo "================================"
echo "📊 查詢儲存的資料"
echo "================================"
echo ""

echo -e "${BLUE}查詢所有學生回應：${NC}"
curl -s "$API_BASE/api/student-responses" | jq '.data | length' 2>/dev/null || echo "無法查詢資料"
echo ""

echo -e "${BLUE}查詢會出席的記錄：${NC}"
curl -s "$API_BASE/api/student-responses?responseType=attend" | jq '.total' 2>/dev/null || echo "無法查詢資料"
echo ""

echo -e "${BLUE}查詢待確認的記錄：${NC}"
curl -s "$API_BASE/api/student-responses?responseType=pending" | jq '.total' 2>/dev/null || echo "無法查詢資料"
echo ""

echo -e "${BLUE}最近的 5 筆記錄：${NC}"
curl -s "$API_BASE/api/student-responses" | jq '.data[:5] | .[] | {studentName, courseName, responseType, courseDate}' 2>/dev/null || echo "無法查詢資料"
echo ""

echo "================================"
echo "📊 測試結果統計"
echo "================================"
echo -e "${GREEN}✅ 通過: $TESTS_PASSED${NC}"
echo -e "${RED}❌ 失敗: $TESTS_FAILED${NC}"
echo "總計: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有測試通過！${NC}"
    exit 0
else
    echo -e "${RED}⚠️ 部分測試失敗${NC}"
    exit 1
fi


