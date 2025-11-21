#!/bin/bash

# ========================================
# 📡 FLB 簽到系統 - 測試日誌監控腳本
# ========================================
# 用途：即時監控測試相關日誌
# 使用：./monitor-test.sh [選項]

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 預設選項
FILTER="all"
LINES=50

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --remittance|-r)
            FILTER="remittance"
            shift
            ;;
        --ocr|-o)
            FILTER="ocr"
            shift
            ;;
        --error|-e)
            FILTER="error"
            shift
            ;;
        --lines|-n)
            LINES="$2"
            shift 2
            ;;
        --help|-h)
            echo "使用方式：./monitor-test.sh [選項]"
            echo ""
            echo "選項："
            echo "  -r, --remittance    只顯示匯款相關日誌"
            echo "  -o, --ocr           只顯示 OCR 相關日誌"
            echo "  -e, --error         只顯示錯誤日誌"
            echo "  -n, --lines <N>     顯示最近 N 行（預設：50）"
            echo "  -h, --help          顯示此幫助訊息"
            echo ""
            echo "範例："
            echo "  ./monitor-test.sh                # 顯示所有日誌"
            echo "  ./monitor-test.sh -r             # 只顯示匯款相關"
            echo "  ./monitor-test.sh -o -n 100      # 顯示最近 100 行 OCR 日誌"
            exit 0
            ;;
        *)
            echo "未知選項：$1"
            echo "使用 --help 查看說明"
            exit 1
            ;;
    esac
done

echo "📡 FLB 簽到系統 - 測試日誌監控"
echo "========================================"
echo ""

# 檢查服務運行
SERVICE_RUNNING=false

# 檢查 Docker
if docker ps | grep -q "flb-attendance-system" 2>/dev/null; then
    echo -e "${GREEN}✅ 檢測到 Docker 容器運行${NC}"
    SERVICE_TYPE="docker"
    SERVICE_RUNNING=true
# 檢查本機程序
elif ps aux | grep -E "node.*server.js" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✅ 檢測到本機服務運行${NC}"
    SERVICE_TYPE="local"
    SERVICE_RUNNING=true
else
    echo -e "${RED}❌ 未檢測到運行中的服務${NC}"
    echo ""
    echo "請先啟動服務："
    echo "  - Docker：docker-compose up -d"
    echo "  - 本機：npm run dev"
    echo "  - 或使用：./start-test.sh"
    exit 1
fi

echo ""

# 顯示篩選器資訊
case $FILTER in
    remittance)
        echo -e "${BLUE}🔍 篩選器：匯款相關日誌${NC}"
        GREP_PATTERN="匯款|remittance|轉帳|ATM|金額"
        ;;
    ocr)
        echo -e "${BLUE}🔍 篩選器：OCR 相關日誌${NC}"
        GREP_PATTERN="OCR|辨識|圖片|image|Vision"
        ;;
    error)
        echo -e "${BLUE}🔍 篩選器：錯誤日誌${NC}"
        GREP_PATTERN="❌|ERROR|錯誤|失敗|Error"
        ;;
    *)
        echo -e "${BLUE}🔍 篩選器：所有日誌${NC}"
        GREP_PATTERN=""
        ;;
esac

echo "📊 顯示行數：最近 $LINES 行"
echo ""
echo "========================================"
echo "提示：按 Ctrl+C 停止監控"
echo "========================================"
echo ""

sleep 1

# 執行監控
if [ "$SERVICE_TYPE" = "docker" ]; then
    # Docker 日誌監控
    if [ -n "$GREP_PATTERN" ]; then
        docker logs flb-attendance-system -f --tail $LINES 2>&1 | grep -E --color=always "$GREP_PATTERN"
    else
        docker logs flb-attendance-system -f --tail $LINES
    fi
else
    # 本機日誌監控（假設日誌輸出到 stdout）
    echo -e "${YELLOW}⚠️  本機模式日誌監控功能有限${NC}"
    echo "   建議使用 Docker 模式或查看終端輸出"
    echo ""
    
    # 如果有日誌檔案，監控檔案
    if [ -f "logs/server.log" ]; then
        if [ -n "$GREP_PATTERN" ]; then
            tail -f -n $LINES logs/server.log | grep -E --color=always "$GREP_PATTERN"
        else
            tail -f -n $LINES logs/server.log
        fi
    else
        echo "   找不到日誌檔案"
        echo "   請在啟動服務的終端視窗查看輸出"
    fi
fi
