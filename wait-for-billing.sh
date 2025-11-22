#!/bin/bash

# ⏱️ 等待計費啟用腳本
# 每 30 秒自動測試一次 API

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}⏱️  等待 Google Cloud 計費啟用${NC}"
echo -e "${BLUE}======================================${NC}\n"

echo -e "${YELLOW}💡 計費啟用通常需要 5-10 分鐘${NC}"
echo -e "${YELLOW}   本腳本會每 30 秒自動測試一次${NC}"
echo -e "${YELLOW}   按 Ctrl+C 可停止測試${NC}\n"

ATTEMPT=1
MAX_ATTEMPTS=40  # 最多測試 20 分鐘 (40 * 30秒)

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$TIMESTAMP] 測試 #${ATTEMPT}/${MAX_ATTEMPTS}${NC}"
    
    # 執行測試
    RESPONSE=$(curl -s -X POST \
      "https://vision.googleapis.com/v1/images:annotate?key=AIzaSyDfYBGUCp1ixevg06acZCvWimwdqLKxh9Y" \
      -H "Content-Type: application/json" \
      -d '{
        "requests": [{
          "image": {"source": {"imageUri": "https://cloud.google.com/vision/docs/images/bicycle_example.png"}},
          "features": [{"type": "TEXT_DETECTION"}]
        }]
      }')
    
    # 檢查結果
    if echo "$RESPONSE" | grep -q '"textAnnotations"'; then
        echo -e "\n${GREEN}======================================${NC}"
        echo -e "${GREEN}✅ 成功！計費已啟用${NC}"
        echo -e "${GREEN}======================================${NC}\n"
        echo -e "${GREEN}🎉 Google Vision API 可以正常使用了！${NC}\n"
        echo -e "${BLUE}📋 下一步：${NC}"
        echo -e "1. 在 NAS 上重啟 Docker 容器："
        echo -e "   ${YELLOW}sudo docker-compose restart${NC}\n"
        echo -e "2. 在 LINE 中發送匯款截圖測試\n"
        echo -e "3. 查看日誌確認 OCR 辨識："
        echo -e "   ${YELLOW}sudo docker logs flb-line-bot --tail 50${NC}\n"
        exit 0
    elif echo "$RESPONSE" | grep -q "BILLING_DISABLED"; then
        echo -e "   ${YELLOW}⏳ 計費尚未生效，繼續等待...${NC}\n"
    else
        echo -e "   ${RED}❌ 出現其他錯誤${NC}"
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20
        echo ""
    fi
    
    # 增加嘗試次數
    ATTEMPT=$((ATTEMPT + 1))
    
    # 如果還沒達到最大次數，等待 30 秒
    if [ $ATTEMPT -le $MAX_ATTEMPTS ]; then
        sleep 30
    fi
done

# 超過最大嘗試次數
echo -e "\n${YELLOW}======================================${NC}"
echo -e "${YELLOW}⚠️  已測試 20 分鐘，計費仍未生效${NC}"
echo -e "${YELLOW}======================================${NC}\n"
echo -e "${YELLOW}💡 建議檢查：${NC}\n"
echo -e "1. 確認計費帳戶已正確連結："
echo -e "   ${BLUE}https://console.cloud.google.com/billing?project=flb-system${NC}\n"
echo -e "2. 檢查信用卡驗證是否完成\n"
echo -e "3. 確認 Cloud Vision API 已啟用："
echo -e "   ${BLUE}https://console.cloud.google.com/apis/library/vision.googleapis.com?project=flb-system${NC}\n"
echo -e "4. 稍後手動再試："
echo -e "   ${BLUE}./test-api-key.sh${NC}\n"

exit 1
