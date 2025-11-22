#!/bin/bash

# 🔍 FLB 簽到系統完整自檢腳本
# 檢查所有關鍵組件的運行狀態

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 統計變數
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0
ERRORS=0

# Docker 指令前綴（Synology NAS 需要 sudo）
DOCKER_CMD="docker"
COMPOSE_CMD="docker-compose"
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
        COMPOSE_CMD="sudo docker-compose"
    fi
fi

echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     FLB 簽到系統 - 完整自檢報告               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}執行時間：$(date '+%Y-%m-%d %H:%M:%S')${NC}\n"

# ==================== 1. 檔案系統檢查 ====================
echo -e "${CYAN}【1/10】檔案系統檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# 1.1 必要檔案
echo -e "${YELLOW}檢查必要檔案...${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
REQUIRED_FILES=(
    "server.js"
    "package.json"
    "Dockerfile"
    "docker-compose.yml"
    ".env"
    "src/config.js"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
    else
        echo -e "  ${RED}❌${NC} $file ${RED}(缺失)${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✅ 所有必要檔案存在${NC}\n"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ 缺少 $MISSING_FILES 個必要檔案${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# 1.2 資料目錄
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -d "data" ] && [ -d "src/data" ]; then
    echo -e "${GREEN}✅ 資料目錄完整${NC}\n"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  部分資料目錄不存在${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# ==================== 2. 環境變數檢查 ====================
echo -e "${CYAN}【2/10】環境變數檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# 2.1 .env 檔案
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 檔案存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # 檢查關鍵環境變數
    echo -e "\n${YELLOW}檢查關鍵環境變數...${NC}"
    
    # LINE Bot
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "^LINE_CHANNEL_ACCESS_TOKEN=eyJ" .env; then
        echo -e "  ${GREEN}✅${NC} LINE_CHANNEL_ACCESS_TOKEN"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}❌${NC} LINE_CHANNEL_ACCESS_TOKEN ${YELLOW}(未設定或格式錯誤)${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # OCR
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "^OCR_PROVIDER=google_vision" .env; then
        echo -e "  ${GREEN}✅${NC} OCR_PROVIDER=google_vision"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠️ ${NC} OCR_PROVIDER ${YELLOW}(未設為 google_vision)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "^GOOGLE_VISION_API_KEY=AIza" .env; then
        API_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env | cut -d '=' -f2)
        API_KEY_PREVIEW="${API_KEY:0:20}...${API_KEY: -10}"
        echo -e "  ${GREEN}✅${NC} GOOGLE_VISION_API_KEY=${API_KEY_PREVIEW}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}❌${NC} GOOGLE_VISION_API_KEY ${YELLOW}(未設定)${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Google Sheets
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "^GOOGLE_SHEETS_API=https://script.google.com" .env; then
        echo -e "  ${GREEN}✅${NC} GOOGLE_SHEETS_API"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠️ ${NC} GOOGLE_SHEETS_API ${YELLOW}(未設定)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
else
    echo -e "${RED}❌ .env 檔案不存在${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==================== 3. Docker 狀態檢查 ====================
echo -e "${CYAN}【3/10】Docker 容器狀態${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if $DOCKER_CMD ps --format "{{.Names}}" 2>/dev/null | grep -q "^flb-line-bot$"; then
    echo -e "${GREEN}✅ Docker 容器正在運行${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # 檢查容器健康狀態
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    CONTAINER_STATUS=$($DOCKER_CMD ps --filter "name=flb-line-bot" --format "{{.Status}}" 2>/dev/null)
    if echo "$CONTAINER_STATUS" | grep -q "Up"; then
        echo -e "${GREEN}✅ 容器狀態：${CONTAINER_STATUS}${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  容器狀態：${CONTAINER_STATUS}${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # 檢查容器環境變數
    echo -e "\n${YELLOW}檢查容器環境變數...${NC}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    CONTAINER_OCR_PROVIDER=$($DOCKER_CMD exec flb-line-bot printenv OCR_PROVIDER 2>/dev/null || echo "")
    if [ "$CONTAINER_OCR_PROVIDER" = "google_vision" ]; then
        echo -e "  ${GREEN}✅${NC} OCR_PROVIDER=google_vision"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠️ ${NC} OCR_PROVIDER=${CONTAINER_OCR_PROVIDER:-未設定}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    CONTAINER_API_KEY=$($DOCKER_CMD exec flb-line-bot printenv GOOGLE_VISION_API_KEY 2>/dev/null || echo "")
    if [ -n "$CONTAINER_API_KEY" ]; then
        CONTAINER_API_KEY_PREVIEW="${CONTAINER_API_KEY:0:20}...${CONTAINER_API_KEY: -10}"
        echo -e "  ${GREEN}✅${NC} GOOGLE_VISION_API_KEY=${CONTAINER_API_KEY_PREVIEW}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}❌${NC} GOOGLE_VISION_API_KEY ${YELLOW}(未設定)${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
else
    echo -e "${RED}❌ Docker 容器未運行${NC}"
    echo -e "${YELLOW}   請執行：docker-compose up -d${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==================== 4. 容器日誌檢查 ====================
echo -e "${CYAN}【4/10】容器日誌檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

if $DOCKER_CMD ps --format "{{.Names}}" 2>/dev/null | grep -q "^flb-line-bot$"; then
    # 檢查 OCR 啟用狀態
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    OCR_LOG=$($DOCKER_CMD logs flb-line-bot 2>&1 | grep "🖼️ OCR:" | tail -1)
    
    if echo "$OCR_LOG" | grep -q "✅ google_vision"; then
        echo -e "${GREEN}✅ OCR 已啟用：${OCR_LOG}${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif echo "$OCR_LOG" | grep -q "❌ 未啟用"; then
        echo -e "${RED}❌ OCR 未啟用：${OCR_LOG}${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${YELLOW}⚠️  無法從日誌確認 OCR 狀態${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # 檢查是否有錯誤
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    ERROR_COUNT=$($DOCKER_CMD logs flb-line-bot 2>&1 | tail -100 | grep -c "❌" || true)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ 最近無錯誤日誌${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  最近有 $ERROR_COUNT 條錯誤日誌${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  容器未運行，無法檢查日誌${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==================== 5. Google Vision API 測試 ====================
echo -e "${CYAN}【5/10】Google Vision API 測試${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

if [ -f ".env" ] && grep -q "^GOOGLE_VISION_API_KEY=AIza" .env; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    API_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env | cut -d '=' -f2)
    
    echo -e "${YELLOW}測試 Google Vision API...${NC}"
    
    API_RESPONSE=$(curl -s -X POST \
      "https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{
        "requests": [{
          "image": {"source": {"imageUri": "https://cloud.google.com/vision/docs/images/bicycle_example.png"}},
          "features": [{"type": "TEXT_DETECTION"}]
        }]
      }')
    
    if echo "$API_RESPONSE" | grep -q '"textAnnotations"'; then
        echo -e "${GREEN}✅ Google Vision API 正常運作${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif echo "$API_RESPONSE" | grep -q "BILLING_DISABLED"; then
        echo -e "${RED}❌ 計費未啟用${NC}"
        echo -e "${YELLOW}   前往：https://console.developers.google.com/billing/enable?project=853046882453${NC}"
        ERRORS=$((ERRORS + 1))
    elif echo "$API_RESPONSE" | grep -q "PERMISSION_DENIED"; then
        echo -e "${RED}❌ API 權限被拒${NC}"
        echo -e "${YELLOW}   請檢查 Cloud Vision API 是否已啟用${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${RED}❌ API 測試失敗${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  API 金鑰未設定，跳過測試${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==================== 6. 網路連線檢查 ====================
echo -e "${CYAN}【6/10】網路連線檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# 檢查 LINE API
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s -I https://api.line.me 2>&1 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ LINE API 可連線${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ LINE API 無法連線${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 檢查 Google Sheets API
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s -I https://script.google.com 2>&1 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Google Sheets API 可連線${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ Google Sheets API 無法連線${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 檢查 Google Vision API
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s -I https://vision.googleapis.com 2>&1 | grep -q "200\|301\|302\|401\|403"; then
    echo -e "${GREEN}✅ Google Vision API 可連線${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ Google Vision API 無法連線${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==================== 7. 伺服器健康檢查 ====================
echo -e "${CYAN}【7/10】伺服器健康檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s http://localhost:3010/health 2>&1 | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ 伺服器健康檢查通過${NC}"
    HEALTH_DATA=$(curl -s http://localhost:3010/health 2>/dev/null)
    echo -e "${BLUE}   運行時間：$(echo "$HEALTH_DATA" | grep -o '"uptime":[0-9]*' | cut -d':' -f2) 秒${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  無法連接到本機伺服器 (localhost:3010)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==================== 8. Git 版本控制檢查 ====================
echo -e "${CYAN}【8/10】Git 版本控制${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -d ".git" ]; then
    echo -e "${GREEN}✅ Git 倉庫存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # 檢查未提交的變更
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if git diff --quiet && git diff --cached --quiet; then
        echo -e "${GREEN}✅ 工作目錄乾淨（無未提交變更）${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  有未提交的變更${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # 顯示最新 commit
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "無法取得")
    echo -e "${BLUE}   最新提交：${LAST_COMMIT}${NC}"
else
    echo -e "${YELLOW}⚠️  不是 Git 倉庫${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==================== 9. 磁碟空間檢查 ====================
echo -e "${CYAN}【9/10】磁碟空間檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${GREEN}✅ 磁碟空間充足 (使用 ${DISK_USAGE}%)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif [ "$DISK_USAGE" -lt 95 ]; then
    echo -e "${YELLOW}⚠️  磁碟空間偏高 (使用 ${DISK_USAGE}%)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}❌ 磁碟空間不足 (使用 ${DISK_USAGE}%)${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==================== 10. 功能完整性檢查 ====================
echo -e "${CYAN}【10/10】功能完整性檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# 檢查關鍵函數是否存在
echo -e "${YELLOW}檢查關鍵功能模組...${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if grep -q "function parseAmountFromText" server.js; then
    echo -e "  ${GREEN}✅${NC} 金額提取函數 (parseAmountFromText)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "  ${RED}❌${NC} 金額提取函數缺失"
    ERRORS=$((ERRORS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if grep -q "function extractTextWithGoogleVision" server.js; then
    echo -e "  ${GREEN}✅${NC} OCR 辨識函數 (extractTextWithGoogleVision)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "  ${RED}❌${NC} OCR 辨識函數缺失"
    ERRORS=$((ERRORS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if grep -q "function handleRemittanceCandidate" server.js; then
    echo -e "  ${GREEN}✅${NC} 匯款處理函數 (handleRemittanceCandidate)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "  ${RED}❌${NC} 匯款處理函數缺失"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==================== 總結報告 ====================
echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              自檢結果總結                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}總檢查項目：${TOTAL_CHECKS}${NC}"
echo -e "${GREEN}✅ 通過：${PASSED_CHECKS}${NC}"
echo -e "${YELLOW}⚠️  警告：${WARNINGS}${NC}"
echo -e "${RED}❌ 錯誤：${ERRORS}${NC}\n"

# 計算通過率
PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ 系統狀態：完美 (通過率 ${PASS_RATE}%)              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}\n"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  系統狀態：良好 (通過率 ${PASS_RATE}%)              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════╝${NC}\n"
    echo -e "${YELLOW}💡 建議處理警告項目以達到最佳狀態${NC}\n"
    exit 1
else
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ 系統狀態：需要修復 (通過率 ${PASS_RATE}%)         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}\n"
    echo -e "${RED}❗ 請優先處理錯誤項目${NC}\n"
    exit 2
fi
