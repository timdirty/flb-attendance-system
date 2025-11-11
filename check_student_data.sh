#!/bin/bash

echo "=== 檢查學生資料 ==="
echo ""
echo "正在查詢 Google Sheets API..."
echo ""

# 調用 API
response=$(curl -s -L -X POST \
  'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec' \
  -H 'Content-Type: application/json' \
  -d '{"action":"getStudentList"}')

echo "API 回應："
echo "$response" | head -20
echo ""
echo "=== 搜尋「陳宥愷」的資料 ==="
echo "$response" | grep -o '"name":"[^"]*陳[^"]*"[^}]*' | head -5

