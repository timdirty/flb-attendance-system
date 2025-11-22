#!/bin/bash

# 🔍 OCR 配置檢查腳本
# 用於快速診斷 OCR 功能是否正確設定

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🔍 OCR 配置檢查${NC}"
echo -e "${BLUE}======================================${NC}\n"

# 檢查項目計數
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0
ERRORS=0

# 1. 檢查 .env 檔案是否存在
echo -e "${BLUE}📝 檢查 1: .env 檔案${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 檔案存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ .env 檔案不存在${NC}"
    echo -e "${YELLOW}   💡 請從 env.example 複製：cp env.example .env${NC}"
    ERRORS=$((ERRORS + 1))
    exit 1
fi
echo ""

# 2. 檢查 OCR_PROVIDER 設定
echo -e "${BLUE}📝 檢查 2: OCR_PROVIDER 環境變數${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if grep -q "^OCR_PROVIDER=google_vision" .env; then
    echo -e "${GREEN}✅ OCR_PROVIDER 已設為 google_vision${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif grep -q "^# OCR_PROVIDER" .env || ! grep -q "OCR_PROVIDER" .env; then
    echo -e "${RED}❌ OCR_PROVIDER 未設定或被註解${NC}"
    echo -e "${YELLOW}   💡 請在 .env 中加入：OCR_PROVIDER=google_vision${NC}"
    ERRORS=$((ERRORS + 1))
else
    OCR_PROVIDER=$(grep "^OCR_PROVIDER=" .env | cut -d '=' -f2)
    echo -e "${YELLOW}⚠️  OCR_PROVIDER 設為: ${OCR_PROVIDER}${NC}"
    echo -e "${YELLOW}   📌 如要啟用 Google Vision OCR，請設為：OCR_PROVIDER=google_vision${NC}"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# 3. 檢查 GOOGLE_VISION_API_KEY 設定
echo -e "${BLUE}📝 檢查 3: GOOGLE_VISION_API_KEY${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if grep -q "^GOOGLE_VISION_API_KEY=AIza" .env; then
    API_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env | cut -d '=' -f2)
    API_KEY_PREVIEW="${API_KEY:0:20}...${API_KEY: -10}"
    echo -e "${GREEN}✅ API 金鑰已設定: ${API_KEY_PREVIEW}${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif grep -q "^# GOOGLE_VISION_API_KEY" .env || ! grep -q "GOOGLE_VISION_API_KEY" .env; then
    echo -e "${RED}❌ GOOGLE_VISION_API_KEY 未設定或被註解${NC}"
    echo -e "${YELLOW}   💡 請在 .env 中加入：GOOGLE_VISION_API_KEY=你的API金鑰${NC}"
    echo -e "${YELLOW}   📚 參考：GOOGLE_VISION_SETUP.md${NC}"
    ERRORS=$((ERRORS + 1))
elif grep -q "^GOOGLE_VISION_API_KEY=your_google_cloud_vision_api_key" .env; then
    echo -e "${RED}❌ API 金鑰尚未替換為實際值${NC}"
    echo -e "${YELLOW}   💡 請將 .env 中的 GOOGLE_VISION_API_KEY 改為實際的 API 金鑰${NC}"
    ERRORS=$((ERRORS + 1))
else
    API_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env | cut -d '=' -f2)
    if [ ${#API_KEY} -lt 30 ]; then
        echo -e "${YELLOW}⚠️  API 金鑰長度異常（少於 30 字元）${NC}"
        echo -e "${YELLOW}   📌 Google Vision API 金鑰通常為 39 字元${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ API 金鑰已設定（長度正常）${NC}"
    fi
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# 4. 檢查 Docker 容器狀態
echo -e "${BLUE}📝 檢查 4: Docker 容器狀態${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if docker ps --format "{{.Names}}" | grep -q "^flb-line-bot$"; then
    echo -e "${GREEN}✅ Docker 容器正在運行${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # 檢查容器內的環境變數
    echo -e "\n${BLUE}📝 檢查 4.1: 容器環境變數${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    CONTAINER_OCR_PROVIDER=$(docker exec flb-line-bot printenv OCR_PROVIDER 2>/dev/null || echo "")
    CONTAINER_API_KEY=$(docker exec flb-line-bot printenv GOOGLE_VISION_API_KEY 2>/dev/null || echo "")
    
    if [ -n "$CONTAINER_OCR_PROVIDER" ] && [ "$CONTAINER_OCR_PROVIDER" = "google_vision" ]; then
        echo -e "${GREEN}✅ 容器內 OCR_PROVIDER = google_vision${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  容器內 OCR_PROVIDER = ${CONTAINER_OCR_PROVIDER:-未設定}${NC}"
        echo -e "${YELLOW}   💡 需要重啟容器以載入新設定：docker-compose restart${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if [ -n "$CONTAINER_API_KEY" ]; then
        CONTAINER_API_KEY_PREVIEW="${CONTAINER_API_KEY:0:20}...${CONTAINER_API_KEY: -10}"
        echo -e "${GREEN}✅ 容器內 GOOGLE_VISION_API_KEY = ${CONTAINER_API_KEY_PREVIEW}${NC}"
    else
        echo -e "${YELLOW}⚠️  容器內未設定 GOOGLE_VISION_API_KEY${NC}"
        echo -e "${YELLOW}   💡 需要重啟容器以載入新設定：docker-compose restart${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Docker 容器未運行${NC}"
    echo -e "${YELLOW}   💡 啟動容器：docker-compose up -d${NC}"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# 5. 檢查啟動日誌
echo -e "${BLUE}📝 檢查 5: 啟動日誌中的 OCR 狀態${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if docker ps --format "{{.Names}}" | grep -q "^flb-line-bot$"; then
    # 檢查日誌中是否有 OCR 設定資訊
    OCR_LOG=$(docker logs flb-line-bot 2>&1 | grep "🖼️ OCR:" | tail -1)
    
    if echo "$OCR_LOG" | grep -q "✅ google_vision"; then
        echo -e "${GREEN}✅ 日誌顯示 OCR 已啟用${NC}"
        echo -e "${GREEN}   ${OCR_LOG}${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif echo "$OCR_LOG" | grep -q "❌ 未啟用"; then
        echo -e "${RED}❌ 日誌顯示 OCR 未啟用${NC}"
        echo -e "${RED}   ${OCR_LOG}${NC}"
        echo -e "${YELLOW}   💡 請檢查上述環境變數設定，並重啟容器${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${YELLOW}⚠️  無法從日誌中確定 OCR 狀態${NC}"
        echo -e "${YELLOW}   💡 請查看完整日誌：docker logs flb-line-bot --tail 100${NC}"
        WARNINGS=$((WARNINGS + 1))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  容器未運行，無法檢查日誌${NC}"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# 總結
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}📊 檢查結果總結${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "總檢查項目: ${TOTAL_CHECKS}"
echo -e "${GREEN}✅ 通過: ${PASSED_CHECKS}${NC}"
echo -e "${YELLOW}⚠️  警告: ${WARNINGS}${NC}"
echo -e "${RED}❌ 錯誤: ${ERRORS}${NC}"
echo ""

# 建議操作
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ 發現錯誤，OCR 功能無法正常運作${NC}\n"
    echo -e "${YELLOW}📋 建議操作：${NC}"
    echo -e "1. 編輯 .env 檔案，加入以下設定："
    echo -e "   ${BLUE}OCR_PROVIDER=google_vision${NC}"
    echo -e "   ${BLUE}GOOGLE_VISION_API_KEY=你的實際API金鑰${NC}"
    echo -e "\n2. 如果還沒有 API 金鑰，請參考："
    echo -e "   ${BLUE}GOOGLE_VISION_SETUP.md${NC}"
    echo -e "\n3. 設定完成後，重啟 Docker 容器："
    echo -e "   ${BLUE}docker-compose restart${NC}"
    echo -e "\n4. 再次執行本腳本驗證："
    echo -e "   ${BLUE}./check-ocr.sh${NC}\n"
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  檢查完成，但有警告項目${NC}\n"
    echo -e "${YELLOW}📋 建議操作：${NC}"
    echo -e "1. 如果修改了 .env，請重啟容器以載入新設定："
    echo -e "   ${BLUE}docker-compose restart${NC}"
    echo -e "\n2. 查看啟動日誌確認 OCR 狀態："
    echo -e "   ${BLUE}docker logs flb-line-bot --tail 50 | grep OCR${NC}"
    echo -e "\n3. 測試 OCR 功能："
    echo -e "   在 LINE 中發送一張包含文字的圖片（例如匯款截圖）\n"
else
    echo -e "${GREEN}✅ OCR 配置檢查通過！${NC}\n"
    echo -e "${GREEN}📋 下一步：${NC}"
    echo -e "1. 在 LINE 中發送一張包含文字的圖片測試 OCR"
    echo -e "2. 查看日誌確認 OCR 辨識結果："
    echo -e "   ${BLUE}docker logs flb-line-bot --tail 50${NC}"
    echo -e "\n3. 預期日誌輸出："
    echo -e "   ${GREEN}📝 OCR 辨識文字: ...${NC}"
    echo -e "   ${GREEN}🔍 檢查匯款關鍵字: { ... hitKeywords: true ... }${NC}\n"
fi

echo -e "${BLUE}======================================${NC}\n"

# 退出碼
if [ $ERRORS -gt 0 ]; then
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    exit 2
else
    exit 0
fi
