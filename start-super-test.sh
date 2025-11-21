#!/bin/bash

# ========================================
# 🚀 超級完整測試 - 一鍵啟動腳本
# ========================================

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║                                           ║"
echo "║   🚀 FLB 簽到系統 - 超級完整測試          ║"
echo "║                                           ║"
echo "║   文字測試：28 個案例                     ║"
echo "║   OCR 測試：22 個案例                     ║"
echo "║   總計：50 個測試案例                     ║"
echo "║                                           ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ========================================
# Step 1：環境檢查
# ========================================
echo -e "${BLUE}📋 Step 1：環境檢查${NC}"
echo "========================================"
echo ""

# 檢查 .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 檔案不存在${NC}"
    echo "   正在從 env.example 建立..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${GREEN}✅ .env 已建立${NC}"
    else
        echo -e "${RED}   找不到 env.example，請手動建立 .env${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env 檔案存在${NC}"
fi

# 檢查管理員設定
echo -e "${YELLOW}⚙️  檢查管理員設定...${NC}"
if [ -f "src/data/admin-users.json" ]; then
    ADMIN_COUNT=$(cat src/data/admin-users.json | grep -c '"userId"' || echo "0")
    if [ "$ADMIN_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ 管理員已設定（設定檔：$ADMIN_COUNT 位）${NC}"
    else
        echo -e "${YELLOW}⚠️  管理員設定檔無管理員，使用預設${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  使用預設管理員設定${NC}"
fi

# 檢查 Docker
echo -e "${YELLOW}⚙️  檢查 Docker 狀態...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未運行${NC}"
    echo ""
    echo "請選擇："
    echo "1) 啟動 Docker Desktop 並重新執行此腳本"
    echo "2) 使用本機模式（不需 Docker）"
    echo "3) 取消"
    echo ""
    read -p "請選擇 [1/2/3]: " docker_choice
    
    case $docker_choice in
        1)
            echo "請啟動 Docker Desktop 後重新執行：./start-super-test.sh"
            exit 0
            ;;
        2)
            USE_LOCAL=true
            echo -e "${YELLOW}⚠️  將使用本機模式${NC}"
            ;;
        *)
            echo "已取消"
            exit 0
            ;;
    esac
else
    echo -e "${GREEN}✅ Docker 正常運行${NC}"
    USE_LOCAL=false
fi

echo ""

# ========================================
# Step 2：啟動服務
# ========================================
echo -e "${BLUE}🚀 Step 2：啟動服務${NC}"
echo "========================================"
echo ""

if [ "$USE_LOCAL" = true ]; then
    # 本機模式
    echo "💻 使用本機開發模式..."
    
    if [ ! -d "node_modules" ]; then
        echo "📦 安裝依賴..."
        npm install
    fi
    
    echo "🚀 啟動服務..."
    npm run dev &
    SERVER_PID=$!
    
    echo "⏳ 等待服務啟動（5秒）..."
    sleep 5
    
    if ps -p $SERVER_PID > /dev/null; then
        echo -e "${GREEN}✅ 服務啟動成功（PID: $SERVER_PID）${NC}"
        SERVICE_TYPE="local"
    else
        echo -e "${RED}❌ 服務啟動失敗${NC}"
        exit 1
    fi
else
    # Docker 模式
    echo "🐳 使用 Docker 模式..."
    
    # 檢查容器是否已存在
    if docker ps -a | grep -q "flb-attendance-system"; then
        echo "🔄 容器已存在，重新啟動..."
        docker-compose restart
    else
        echo "🚀 啟動新容器..."
        docker-compose up -d
    fi
    
    echo "⏳ 等待容器啟動（5秒）..."
    sleep 5
    
    if docker ps | grep -q "flb-attendance-system"; then
        echo -e "${GREEN}✅ 容器啟動成功${NC}"
        SERVICE_TYPE="docker"
    else
        echo -e "${RED}❌ 容器啟動失敗${NC}"
        echo "查看錯誤：docker-compose logs"
        exit 1
    fi
fi

echo ""

# ========================================
# Step 3：準備測試資源
# ========================================
echo -e "${BLUE}📚 Step 3：準備測試資源${NC}"
echo "========================================"
echo ""

echo "測試執行計劃已建立："
echo -e "  ${GREEN}✅${NC} SUPER_TEST_EXECUTION.md"
echo ""

echo "開啟測試執行計劃？"
echo "1) 是，在瀏覽器開啟"
echo "2) 否，稍後查看"
read -p "請選擇 [1/2]: " open_choice

if [ "$open_choice" = "1" ]; then
    if command -v open > /dev/null; then
        open SUPER_TEST_EXECUTION.md
    elif command -v xdg-open > /dev/null; then
        xdg-open SUPER_TEST_EXECUTION.md
    else
        echo "請手動開啟：SUPER_TEST_EXECUTION.md"
    fi
fi

echo ""

# ========================================
# Step 4：顯示測試資訊
# ========================================
echo -e "${BLUE}📖 Step 4：測試資訊${NC}"
echo "========================================"
echo ""

echo -e "${CYAN}📊 測試統計${NC}"
echo "  • 文字測試：28 個案例（20-30 分鐘）"
echo "  • OCR 測試：22 個案例（30-45 分鐘）"
echo "  • 總計：50 個測試案例"
echo ""

echo -e "${CYAN}📝 文字測試快速驗證（3 分鐘）${NC}"
echo "  在 LINE 發送以下訊息："
echo ""
echo "  1️⃣  「我已經匯款了」"
echo "     預期：✅ Bot 回覆 + 管理員收到通知"
echo ""
echo "  2️⃣  「明天處理匯款」"
echo "     預期：👀 Bot 回覆延後訊息"
echo ""
echo "  3️⃣  「我已經付款了」"
echo "     預期：❌ 無回覆（無關鍵字）"
echo ""

echo -e "${CYAN}📸 OCR 測試（選填，需設定 API Key）${NC}"
echo "  • 設定指南：GOOGLE_VISION_SETUP.md"
echo "  • 測試案例：docs/testing/OCR_TEST_CASES.md"
echo ""

echo -e "${CYAN}📁 測試記錄查看${NC}"
echo "  • 匯款記錄："
echo "    cat src/data/remittance-records.json"
echo ""
echo "  • 語意過濾記錄："
echo "    cat src/data/remittance-intent-log.json"
echo ""

echo -e "${CYAN}📡 日誌監控${NC}"
if [ "$SERVICE_TYPE" = "docker" ]; then
    echo "  • 即時監控："
    echo "    docker logs flb-attendance-system -f"
    echo ""
    echo "  • 只看匯款："
    echo "    ./monitor-test.sh -r"
    echo ""
    echo "  • 只看 OCR："
    echo "    ./monitor-test.sh -o"
else
    echo "  • 查看終端輸出"
fi

echo ""
echo "========================================"
echo ""

# ========================================
# Step 5：啟動日誌監控
# ========================================
echo -e "${YELLOW}要現在開啟日誌監控嗎？${NC}"
echo "1) 是，開始監控（推薦）"
echo "2) 否，稍後手動監控"
read -p "請選擇 [1/2]: " monitor_choice

if [ "$monitor_choice" = "1" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}🎯 超級測試準備完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${CYAN}💡 提示：${NC}"
    echo "  • 日誌監控已啟動"
    echo "  • 按 Ctrl+C 停止監控"
    echo "  • 測試執行計劃：SUPER_TEST_EXECUTION.md"
    echo ""
    echo -e "${YELLOW}⏱️  3 秒後啟動日誌監控...${NC}"
    sleep 3
    
    if [ "$SERVICE_TYPE" = "docker" ]; then
        docker logs flb-attendance-system -f --tail 100
    else
        echo "本機模式：請查看終端輸出"
        tail -f /dev/null
    fi
else
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 超級測試環境已就緒！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${CYAN}🎯 下一步：${NC}"
    echo ""
    echo "  1️⃣  開啟 LINE App"
    echo "  2️⃣  參考 SUPER_TEST_EXECUTION.md 執行測試"
    echo "  3️⃣  記錄測試結果"
    echo ""
    echo -e "${CYAN}📊 監控指令：${NC}"
    if [ "$SERVICE_TYPE" = "docker" ]; then
        echo "  ./monitor-test.sh -r    # 匯款日誌"
        echo "  ./monitor-test.sh -o    # OCR 日誌"
        echo "  ./monitor-test.sh       # 所有日誌"
    fi
    echo ""
    echo -e "${CYAN}📁 查看記錄：${NC}"
    echo "  cat src/data/remittance-records.json"
    echo ""
    echo -e "${GREEN}祝測試順利！ 🚀${NC}"
    echo ""
fi
