#!/bin/bash

URL="https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 測試新部署 URL 的所有 POST APIs${NC}"
echo "================================"
echo ""

# Test 1: getStudentList (已知成功)
echo -e "${BLUE}測試 1: getStudentList (POST)${NC}"
RESPONSE=$(curl -s -X POST "$URL" -H "Content-Type: application/json" -d '{"action":"getStudentList"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ getStudentList 成功${NC}"
    echo "   學生數: $(echo "$RESPONSE" | jq -r '.count' 2>/dev/null)"
else
    echo -e "${RED}❌ getStudentList 失敗${NC}"
fi
echo ""

# Test 2: upsertGroups
echo -e "${BLUE}測試 2: upsertGroups (POST)${NC}"
RESPONSE=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsertGroups",
    "list": [
      {
        "groupId": "C_test_001",
        "groupName": "測試群組",
        "type": "group",
        "memberCount": 10
      }
    ]
  }')
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ upsertGroups 成功${NC}"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ upsertGroups 失敗${NC}"
    echo "$RESPONSE" | head -100
fi
echo ""

# Test 3: upsertUsers
echo -e "${BLUE}測試 3: upsertUsers (POST)${NC}"
RESPONSE=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsertUsers",
    "list": [
      {
        "userId": "U_test_001",
        "displayName": "測試用戶",
        "userName": "test_user"
      }
    ]
  }')
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ upsertUsers 成功${NC}"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ upsertUsers 失敗${NC}"
    echo "$RESPONSE" | head -100
fi
echo ""

# Test 4: upsertTeacherBindings
echo -e "${BLUE}測試 4: upsertTeacherBindings (POST)${NC}"
RESPONSE=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsertTeacherBindings",
    "list": [
      {
        "userId": "U_test_001",
        "teacherName": "測試老師",
        "teacherId": "T001"
      }
    ]
  }')
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ upsertTeacherBindings 成功${NC}"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ upsertTeacherBindings 失敗${NC}"
    echo "$RESPONSE" | head -100
fi
echo ""

# Test 5: listGroups (GET)
echo -e "${BLUE}測試 5: listGroups (GET)${NC}"
RESPONSE=$(curl -s "$URL?action=listGroups&limit=5")
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ listGroups (GET) 成功${NC}"
else
    echo -e "${RED}❌ listGroups (GET) 失敗${NC}"
fi
echo ""

echo "================================"
echo -e "${BLUE}測試完成！${NC}"

