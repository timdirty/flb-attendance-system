#!/bin/bash

# 🧪 學生回應 API 測試腳本
# 測試 POST 和 GET /api/student-responses

echo "🧪 開始測試學生回應 API"
echo "================================"
echo ""

# API 端點
API_BASE="http://localhost:3000"
API_ENDPOINT="$API_BASE/api/student-responses"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數
TESTS_PASSED=0
TESTS_FAILED=0

# 測試函數
test_api() {
    local test_name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=$5
    
    echo -e "${YELLOW}測試: ${test_name}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 通過 (HTTP $http_code)${NC}"
        echo "回應: $body" | jq . 2>/dev/null || echo "$body"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ 失敗 (預期 HTTP $expected_status, 實際 HTTP $http_code)${NC}"
        echo "回應: $body"
        ((TESTS_FAILED++))
    fi
    
    echo ""
}

echo "📝 測試 1: 新增「會出席」回應"
test_api "新增會出席" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生A",
  "courseName": "ESM 四 16:00-17:00",
  "courseDate": "2025-10-24",
  "courseTime": "16:00-17:00",
  "location": "台北教室",
  "weekday": "星期四",
  "responseType": "attend",
  "userId": "U_test_001"
}' "200"

echo "📝 測試 2: 新增「請假」回應（含理由）"
test_api "新增請假" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生B",
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025-10-26",
  "courseTime": "9:30-11:00",
  "location": "新竹教室",
  "weekday": "星期六",
  "responseType": "leave",
  "leaveReason": "生病",
  "userId": "U_test_002"
}' "200"

echo "📝 測試 3: 新增「待確認」回應"
test_api "新增待確認" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生C",
  "courseName": "JM 日 14:00-16:00",
  "courseDate": "2025-10-27",
  "courseTime": "14:00-16:00",
  "location": "台中教室",
  "weekday": "星期日",
  "responseType": "pending",
  "userId": "U_test_003"
}' "200"

echo "📝 測試 4: 更新學生回應（相同學生+課程+日期）"
test_api "更新回應" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生A",
  "courseName": "ESM 四 16:00-17:00",
  "courseDate": "2025-10-24",
  "responseType": "leave",
  "leaveReason": "家庭因素"
}' "200"

echo "❌ 測試 5: 缺少必填欄位"
test_api "缺少必填欄位" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生D"
}' "400"

echo "❌ 測試 6: 請假但未提供理由"
test_api "請假無理由" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生E",
  "courseName": "ESM 四 16:00-17:00",
  "courseDate": "2025-10-28",
  "responseType": "leave"
}' "400"

echo "❌ 測試 7: 無效的回應類型"
test_api "無效回應類型" "POST" "$API_ENDPOINT" '{
  "studentName": "測試學生F",
  "courseName": "ESM 四 16:00-17:00",
  "courseDate": "2025-10-29",
  "responseType": "invalid_type"
}' "400"

echo "📊 測試 8: 查詢所有學生回應"
test_api "查詢所有回應" "GET" "$API_ENDPOINT" "" "200"

echo "📊 測試 9: 查詢特定學生的回應"
test_api "查詢特定學生" "GET" "$API_ENDPOINT?studentName=測試學生B" "" "200"

echo "📊 測試 10: 查詢特定日期的回應"
test_api "查詢特定日期" "GET" "$API_ENDPOINT?courseDate=2025-10-24" "" "200"

echo "📊 測試 11: 查詢特定類型的回應"
test_api "查詢請假回應" "GET" "$API_ENDPOINT?responseType=leave" "" "200"

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


