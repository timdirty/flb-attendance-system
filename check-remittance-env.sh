#!/bin/bash

# ========================================
# 📋 匯款功能環境檢查腳本
# ========================================
# 用途：在測試前快速檢查匯款功能的必要配置
# 使用：chmod +x check-remittance-env.sh && ./check-remittance-env.sh

echo "🔍 FLB 簽到系統 - 匯款功能環境檢查"
echo "========================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查項目計數
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0

# ========================================
# 1. 檢查 .env 檔案
# ========================================
echo "📄 檢查環境變數檔案..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 檔案存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ .env 檔案不存在${NC}"
    echo "   請執行: cp env.example .env"
    exit 1
fi

echo ""

# ========================================
# 2. 檢查管理員設定
# ========================================
echo "👤 檢查管理員設定..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

ADMIN_IDS=$(grep "^ADMIN_USER_IDS=" .env 2>/dev/null | cut -d'=' -f2)
REMITTANCE_GROUP=$(grep "^REMITTANCE_GROUP_ID=" .env 2>/dev/null | cut -d'=' -f2)

if [ -n "$ADMIN_IDS" ] || [ -n "$REMITTANCE_GROUP" ]; then
    echo -e "${GREEN}✅ 管理員設定已配置${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    if [ -n "$ADMIN_IDS" ]; then
        echo "   📌 管理員 User IDs: $ADMIN_IDS"
    fi
    
    if [ -n "$REMITTANCE_GROUP" ]; then
        echo "   📌 管理員群組 ID: $REMITTANCE_GROUP"
    fi
else
    echo -e "${RED}❌ 未設定管理員 (ADMIN_USER_IDS 或 REMITTANCE_GROUP_ID)${NC}"
    echo "   請在 .env 中至少設定其中一項"
fi

echo ""

# ========================================
# 3. 檢查匯款關鍵字設定
# ========================================
echo "🔑 檢查匯款關鍵字..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

KEYWORDS=$(grep "^REMITTANCE_KEYWORDS=" .env 2>/dev/null | cut -d'=' -f2)

if [ -n "$KEYWORDS" ]; then
    echo -e "${GREEN}✅ 自訂匯款關鍵字已設定${NC}"
    echo "   📌 關鍵字: $KEYWORDS"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  使用預設匯款關鍵字${NC}"
    echo "   📌 預設: 匯款,轉帳,轉帳完成,已轉,ATM"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

echo ""

# ========================================
# 4. 檢查語意過濾設定
# ========================================
echo "🧠 檢查語意過濾設定..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

POSTPONE=$(grep "^REMITTANCE_POSTPONE_KEYWORDS=" .env 2>/dev/null | cut -d'=' -f2)
NEGATIVE=$(grep "^REMITTANCE_NEGATIVE_KEYWORDS=" .env 2>/dev/null | cut -d'=' -f2)
INQUIRY=$(grep "^REMITTANCE_INQUIRY_KEYWORDS=" .env 2>/dev/null | cut -d'=' -f2)
QUESTION=$(grep "^REMITTANCE_QUESTION_INDICATORS=" .env 2>/dev/null | cut -d'=' -f2)

FILTERS_SET=0
if [ -n "$POSTPONE" ]; then FILTERS_SET=$((FILTERS_SET + 1)); fi
if [ -n "$NEGATIVE" ]; then FILTERS_SET=$((FILTERS_SET + 1)); fi
if [ -n "$INQUIRY" ]; then FILTERS_SET=$((FILTERS_SET + 1)); fi
if [ -n "$QUESTION" ]; then FILTERS_SET=$((FILTERS_SET + 1)); fi

if [ $FILTERS_SET -gt 0 ]; then
    echo -e "${GREEN}✅ 語意過濾已啟用 ($FILTERS_SET/4 項)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    if [ -n "$POSTPONE" ]; then
        echo "   📌 延後關鍵字: $(echo $POSTPONE | cut -c1-50)..."
    fi
    if [ -n "$NEGATIVE" ]; then
        echo "   📌 否定關鍵字: $(echo $NEGATIVE | cut -c1-50)..."
    fi
    if [ -n "$INQUIRY" ]; then
        echo "   📌 詢問關鍵字: $(echo $INQUIRY | cut -c1-50)..."
    fi
    if [ -n "$QUESTION" ]; then
        echo "   📌 疑問標記: $QUESTION"
    fi
else
    echo -e "${YELLOW}⚠️  使用預設語意過濾設定${NC}"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

echo ""

# ========================================
# 5. 檢查 OCR 設定（稍後測試）
# ========================================
echo "📸 檢查 OCR 設定（稍後測試）..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

OCR_PROVIDER=$(grep "^OCR_PROVIDER=" .env 2>/dev/null | cut -d'=' -f2)
GOOGLE_VISION_KEY=$(grep "^GOOGLE_VISION_API_KEY=" .env 2>/dev/null | cut -d'=' -f2)

if [ "$OCR_PROVIDER" = "google_vision" ] && [ -n "$GOOGLE_VISION_KEY" ]; then
    echo -e "${GREEN}✅ OCR 已啟用 (Google Vision)${NC}"
    echo "   📌 Provider: $OCR_PROVIDER"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif [ "$OCR_PROVIDER" = "google_vision" ]; then
    echo -e "${YELLOW}⚠️  OCR Provider 已設定但缺少 API Key${NC}"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  OCR 未啟用（圖片測試需手動加文字）${NC}"
    echo "   📌 目前文字測試不需要 OCR"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

echo ""

# ========================================
# 6. 檢查資料目錄
# ========================================
echo "📁 檢查資料目錄..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if [ -d "src/data" ]; then
    echo -e "${GREEN}✅ src/data 目錄存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # 檢查匯款記錄檔案
    if [ -f "src/data/remittance-records.json" ]; then
        RECORD_COUNT=$(cat src/data/remittance-records.json | grep -o '"id"' | wc -l)
        echo "   📌 匯款記錄: $RECORD_COUNT 筆"
    else
        echo "   📌 匯款記錄檔案將自動建立"
    fi
    
    # 檢查語意過濾記錄檔案
    if [ -f "src/data/remittance-intent-log.json" ]; then
        LOG_COUNT=$(cat src/data/remittance-intent-log.json | grep -o '"id"' | wc -l)
        echo "   📌 語意過濾記錄: $LOG_COUNT 筆"
    else
        echo "   📌 語意過濾記錄檔案將自動建立"
    fi
    
    # 檢查管理員設定檔
    if [ -f "src/data/admin-users.json" ]; then
        ADMIN_COUNT=$(cat src/data/admin-users.json | grep -o '"userId"' | wc -l)
        echo "   📌 管理員設定檔: $ADMIN_COUNT 位管理員"
    fi
else
    echo -e "${RED}❌ src/data 目錄不存在${NC}"
    echo "   請建立目錄: mkdir -p src/data"
fi

echo ""

# ========================================
# 7. 檢查伺服器狀態
# ========================================
echo "🚀 檢查伺服器狀態..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 檢查 Docker 容器
if command -v docker &> /dev/null; then
    if docker ps | grep -q "flb-attendance-system"; then
        echo -e "${GREEN}✅ Docker 容器運行中${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  Docker 容器未運行${NC}"
        echo "   啟動指令: docker-compose up -d"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    # 檢查 Node.js 程序
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${GREEN}✅ Node.js 服務運行中${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  服務未運行${NC}"
        echo "   啟動指令: npm run dev 或 docker-compose up -d"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""

# ========================================
# 8. 檢查測試文檔
# ========================================
echo "📚 檢查測試文檔..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if [ -f "docs/testing/REMITTANCE_TEXT_TEST_CASES.md" ]; then
    echo -e "${GREEN}✅ 測試案例文檔已就緒${NC}"
    echo "   📌 路徑: docs/testing/REMITTANCE_TEXT_TEST_CASES.md"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  測試案例文檔未找到${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "docs/testing/REMITTANCE_TEXT_TEST_GUIDE.md" ]; then
    echo -e "${GREEN}✅ 測試執行指南已就緒${NC}"
    echo "   📌 路徑: docs/testing/REMITTANCE_TEXT_TEST_GUIDE.md"
else
    echo -e "${YELLOW}⚠️  測試執行指南未找到${NC}"
fi

echo ""

# ========================================
# 總結
# ========================================
echo "========================================"
echo "📊 檢查結果統計"
echo "========================================"
echo -e "總檢查項目: $TOTAL_CHECKS"
echo -e "${GREEN}通過項目: $PASSED_CHECKS${NC}"
echo -e "${YELLOW}警告項目: $WARNINGS${NC}"

echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 所有檢查通過！環境已就緒，可以開始測試。${NC}"
    echo ""
    echo "📝 下一步："
    echo "   1. 打開測試案例文檔: docs/testing/REMITTANCE_TEXT_TEST_CASES.md"
    echo "   2. 閱讀測試指南: docs/testing/REMITTANCE_TEXT_TEST_GUIDE.md"
    echo "   3. 在 LINE 中開始測試"
    echo "   4. 監控日誌: docker logs flb-attendance-system -f"
    exit 0
else
    echo -e "${YELLOW}⚠️  部分檢查未通過，請修正後再進行測試。${NC}"
    exit 1
fi
