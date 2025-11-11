#!/bin/bash

# 測試完整的請假流程（單個和多個學生）

BASE_URL="http://flbbot.funlearnbar.synology.me/"
WEBHOOK_URL="$BASE_URL/webhook"

echo "================================================"
echo "🧪 測試完整請假流程"
echo "================================================"
echo ""

# ==================== 測試 1：單個學生請假 ====================
echo "📝 測試 1：單個學生請假流程"
echo "------------------------------------------------"

# 步驟 1：學生點擊「請假」
echo "✅ 步驟 1/2：學生點擊「請假」"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-001",
      "source": {
        "userId": "U1234567890abcdef",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"attendance_reply\",\"response\":\"leave\",\"studentName\":\"測試學生A\",\"courseName\":\"Python 基礎班\",\"courseDate\":\"2025年10月25日\",\"courseTime\":\"14:00-16:00\",\"location\":\"站前教室\",\"weekday\":\"星期五\"}"
      }
    }]
  }'

echo -e "\n"
sleep 2

# 步驟 2：學生選擇請假原因
echo "✅ 步驟 2/2：學生選擇請假原因「生病」"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-002",
      "source": {
        "userId": "U1234567890abcdef",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"leave_reason\",\"reason\":\"生病\",\"studentName\":\"測試學生A\",\"courseName\":\"Python 基礎班\",\"courseDate\":\"2025年10月25日\",\"courseTime\":\"14:00-16:00\",\"location\":\"站前教室\",\"weekday\":\"星期五\"}"
      }
    }]
  }'

echo -e "\n\n"
sleep 3

# ==================== 測試 2：多個學生 - 部分請假 ====================
echo "📝 測試 2：多個學生請假流程（選擇其中一位）"
echo "------------------------------------------------"

# 步驟 1：家長點擊「需要請假」
echo "✅ 步驟 1/3：家長點擊「需要請假」"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-003",
      "source": {
        "userId": "U9876543210fedcba",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"leave_some\",\"studentCount\":2,\"students\":[{\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月26日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期六\"},{\"studentName\":\"小華\",\"courseName\":\"ESM 日 9:30-10:30\",\"courseDate\":\"2025年10月26日\",\"courseTime\":\"09:30-10:30\",\"location\":\"站前教室\",\"weekday\":\"星期六\"}]}"
      }
    }]
  }'

echo -e "\n"
sleep 2

# 步驟 2：家長選擇「小明」請假
echo "✅ 步驟 2/3：家長選擇「小明」請假"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-004",
      "source": {
        "userId": "U9876543210fedcba",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"select_leave_student\",\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月26日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期六\"}"
      }
    }]
  }'

echo -e "\n"
sleep 2

# 步驟 3：家長選擇請假原因「家庭因素」
echo "✅ 步驟 3/3：家長選擇請假原因「家庭因素」"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-005",
      "source": {
        "userId": "U9876543210fedcba",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"leave_reason\",\"reason\":\"家庭因素\",\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月26日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期六\"}"
      }
    }]
  }'

echo -e "\n\n"
sleep 3

# ==================== 測試 3：多個學生 - 全部出席 ====================
echo "📝 測試 3：多個學生全部出席"
echo "------------------------------------------------"

curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-006",
      "source": {
        "userId": "U9876543210fedcba",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"attend_all\",\"studentCount\":2,\"students\":[{\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月27日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期日\"},{\"studentName\":\"小華\",\"courseName\":\"ESM 日 9:30-10:30\",\"courseDate\":\"2025年10月27日\",\"courseTime\":\"09:30-10:30\",\"location\":\"站前教室\",\"weekday\":\"星期日\"}]}"
      }
    }]
  }'

echo -e "\n\n"
sleep 2

# ==================== 測試 4：多個學生 - 稍後確認 ====================
echo "📝 測試 4：多個學生稍後確認"
echo "------------------------------------------------"

curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "replyToken": "test-reply-token-007",
      "source": {
        "userId": "U9876543210fedcba",
        "type": "user"
      },
      "postback": {
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"pending\",\"studentCount\":2,\"students\":[{\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月28日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期一\"},{\"studentName\":\"小華\",\"courseName\":\"ESM 日 9:30-10:30\",\"courseDate\":\"2025年10月28日\",\"courseTime\":\"09:30-10:30\",\"location\":\"站前教室\",\"weekday\":\"星期一\"}]}"
      }
    }]
  }'

echo -e "\n\n"

echo "================================================"
echo "✅ 測試完成！"
echo "================================================"
echo ""
echo "📊 測試項目："
echo "  1. ✅ 單個學生請假（含請假原因）"
echo "  2. ✅ 多個學生部分請假（選擇特定學生 + 請假原因）"
echo "  3. ✅ 多個學生全部出席"
echo "  4. ✅ 多個學生稍後確認"
echo ""
echo "💡 請檢查："
echo "  - server.js 的 console 輸出"
echo "  - 是否正確調用 FLB API"
echo "  - 是否發送正確的確認訊息"
echo "  - pendingLeaves 是否正確管理"
echo ""

