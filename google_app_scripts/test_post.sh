#!/bin/bash

URL="https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec"

echo "🧪 測試 POST API"
echo "================================"
echo ""

# Test 1: getStudentList
echo "測試 1: getStudentList"
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"getStudentList"}' | jq .

echo ""
echo "================================"
echo ""

# Test 2: upsertGroups
echo "測試 2: upsertGroups"
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsertGroups",
    "list": [
      {
        "groupId": "C_test_001",
        "groupName": "測試群組"
      }
    ]
  }' | jq .

echo ""
echo "================================"
echo ""

# Test 3: listGroups (用 POST)
echo "測試 3: listGroups (POST)"
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"listGroups"}' | jq .

