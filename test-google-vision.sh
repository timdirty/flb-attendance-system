#!/bin/bash

# 🧪 Google Vision API 測試腳本
# 用於驗證 API 金鑰是否有效

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🧪 Google Vision API 測試${NC}"
echo -e "${BLUE}======================================${NC}\n"

# 從 .env 讀取 API 金鑰
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 檔案不存在${NC}"
    exit 1
fi

API_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env | cut -d '=' -f2)

if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ 無法從 .env 讀取 GOOGLE_VISION_API_KEY${NC}"
    exit 1
fi

API_KEY_PREVIEW="${API_KEY:0:20}...${API_KEY: -10}"
echo -e "${BLUE}📝 使用 API 金鑰: ${API_KEY_PREVIEW}${NC}\n"

# 建立測試圖片（簡單的 base64 編碼文字圖片）
# 這是一個包含 "TEST" 文字的小圖片
TEST_IMAGE_BASE64="/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAyADIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooA//9k="

# 發送請求到 Google Vision API
echo -e "${BLUE}📤 發送測試請求...${NC}\n"

RESPONSE=$(curl -s -X POST \
  "https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"requests\": [
      {
        \"image\": {
          \"content\": \"${TEST_IMAGE_BASE64}\"
        },
        \"features\": [
          {
            \"type\": \"TEXT_DETECTION\"
          }
        ]
      }
    ]
  }")

# 檢查回應
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}❌ API 請求失敗${NC}\n"
    echo -e "${YELLOW}錯誤詳情：${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    
    # 解析錯誤代碼
    ERROR_CODE=$(echo "$RESPONSE" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)
    ERROR_STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}🔍 錯誤診斷${NC}"
    echo -e "${YELLOW}======================================${NC}"
    
    case "$ERROR_CODE" in
        400)
            echo -e "${YELLOW}錯誤 400: API 請求格式錯誤${NC}"
            echo -e "可能原因："
            echo -e "  - API 金鑰格式不正確"
            echo -e "  - 請求內容有誤"
            ;;
        403)
            echo -e "${YELLOW}錯誤 403: 權限被拒絕${NC}"
            echo -e "可能原因："
            echo -e "  1. Cloud Vision API 未啟用"
            echo -e "     前往：https://console.cloud.google.com/apis/library/vision.googleapis.com?project=flb-system"
            echo -e "     點擊「啟用」按鈕"
            echo -e ""
            echo -e "  2. API 金鑰權限設定不正確"
            echo -e "     前往：https://console.cloud.google.com/apis/credentials?project=flb-system"
            echo -e "     編輯 API 金鑰 → 檢查「API 限制」"
            echo -e "     建議：選擇「不限制金鑰」或確保勾選「Cloud Vision API」"
            echo -e ""
            echo -e "  3. API 金鑰有 IP 或網域限制"
            echo -e "     檢查「應用程式限制」是否設定了不正確的 IP 白名單"
            ;;
        429)
            echo -e "${YELLOW}錯誤 429: API 配額已用盡${NC}"
            echo -e "可能原因："
            echo -e "  - API 免費配額已用完"
            echo -e "  - 請求頻率過高"
            ;;
        *)
            echo -e "${YELLOW}其他錯誤 ($ERROR_CODE)${NC}"
            echo -e "請檢查 Google Cloud Console 的 API 設定"
            ;;
    esac
    
    echo ""
    exit 1
elif echo "$RESPONSE" | grep -q '"textAnnotations"'; then
    echo -e "${GREEN}✅ API 測試成功！${NC}\n"
    echo -e "${GREEN}📝 Google Vision API 可以正常使用${NC}"
    echo -e "${GREEN}🖼️ OCR 功能已準備就緒${NC}\n"
    
    # 顯示辨識結果
    if echo "$RESPONSE" | grep -q '"description"'; then
        DETECTED_TEXT=$(echo "$RESPONSE" | grep -o '"description":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${BLUE}🔍 辨識到的文字: ${DETECTED_TEXT}${NC}\n"
    fi
    
    exit 0
else
    echo -e "${YELLOW}⚠️  API 回應異常${NC}\n"
    echo -e "${YELLOW}回應內容：${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    exit 1
fi
