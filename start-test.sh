#!/bin/bash

# ========================================
# 🧪 FLB 簽到系統 - 測試快速啟動腳本
# ========================================
# 用途：快速啟動測試環境並開啟日誌監控
# 使用：./start-test.sh

set -e

echo "🧪 FLB 簽到系統 - 測試環境啟動"
echo "========================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ========================================
# Step 1：環境檢查
# ========================================
echo "📋 Step 1：環境檢查..."
echo ""

# 檢查 .env 檔案
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 檔案不存在${NC}"
    echo "   請從 env.example 複製並設定"
    echo "   指令：cp env.example .env"
    exit 1
fi
echo -e "${GREEN}✅ .env 檔案存在${NC}"

# 檢查管理員設定
if grep -q "^ADMIN_USER_IDS=" .env 2>/dev/null; then
    ADMIN_IDS=$(grep "^ADMIN_USER_IDS=" .env | cut -d'=' -f2)
    if [ -n "$ADMIN_IDS" ]; then
        echo -e "${GREEN}✅ 管理員已設定（環境變數）${NC}"
    fi
elif [ -f "src/data/admin-users.json" ]; then
    ADMIN_COUNT=$(cat src/data/admin-users.json | grep -c '"userId"' || echo "0")
    if [ "$ADMIN_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ 管理員已設定（設定檔：$ADMIN_COUNT 位）${NC}"
    else
        echo -e "${YELLOW}⚠️  管理員設定檔存在但無管理員${NC}"
    fi
else
    echo -e "${RED}❌ 未設定管理員${NC}"
    echo "   請在 .env 中設定 ADMIN_USER_IDS"
    echo "   或編輯 src/data/admin-users.json"
    exit 1
fi

echo ""

# ========================================
# Step 2：選擇啟動方式
# ========================================
echo "🚀 Step 2：選擇啟動方式"
echo ""
echo "1) Docker（推薦）"
echo "2) 本機開發模式"
echo "3) 只監控日誌（服務已運行）"
echo ""
read -p "請選擇 [1/2/3]: " choice

case $choice in
    1)
        # Docker 模式
        echo ""
        echo "🐳 啟動 Docker 容器..."
        
        # 檢查 Docker 是否運行
        if ! docker info > /dev/null 2>&1; then
            echo -e "${RED}❌ Docker 未運行${NC}"
            echo "   請先啟動 Docker Desktop"
            exit 1
        fi
        
        # 啟動容器
        docker-compose up -d
        
        # 等待服務啟動
        echo "⏳ 等待服務啟動（3秒）..."
        sleep 3
        
        # 檢查容器狀態
        if docker ps | grep -q "flb-attendance-system"; then
            echo -e "${GREEN}✅ 容器啟動成功${NC}"
        else
            echo -e "${RED}❌ 容器啟動失敗${NC}"
            echo "   請查看 docker-compose 日誌"
            exit 1
        fi
        
        SERVICE_TYPE="docker"
        ;;
        
    2)
        # 本機模式
        echo ""
        echo "💻 啟動本機開發模式..."
        
        # 檢查 node_modules
        if [ ! -d "node_modules" ]; then
            echo "📦 安裝依賴..."
            npm install
        fi
        
        # 背景啟動服務
        npm run dev > /dev/null 2>&1 &
        NODE_PID=$!
        
        echo "⏳ 等待服務啟動（3秒）..."
        sleep 3
        
        # 檢查程序
        if ps -p $NODE_PID > /dev/null; then
            echo -e "${GREEN}✅ 服務啟動成功（PID: $NODE_PID）${NC}"
        else
            echo -e "${RED}❌ 服務啟動失敗${NC}"
            exit 1
        fi
        
        SERVICE_TYPE="local"
        ;;
        
    3)
        # 只監控
        echo ""
        echo "👀 準備監控日誌..."
        SERVICE_TYPE="monitor"
        ;;
        
    *)
        echo -e "${RED}❌ 無效選擇${NC}"
        exit 1
        ;;
esac

echo ""

# ========================================
# Step 3：顯示測試資訊
# ========================================
echo "📚 測試資訊"
echo "========================================"
echo ""
echo "📖 測試文檔："
echo "   - 文字測試案例：docs/testing/REMITTANCE_TEXT_TEST_CASES.md"
echo "   - 文字測試指南：docs/testing/REMITTANCE_TEXT_TEST_GUIDE.md"
echo "   - OCR 測試案例：docs/testing/OCR_TEST_CASES.md"
echo "   - 測試執行清單：docs/testing/ACTUAL_TEST_CHECKLIST.md"
echo ""
echo "🧪 快速測試："
echo "   1. 打開 LINE App"
echo "   2. 發送「我已經匯款了」給 Bot"
echo "   3. 預期：Bot 回覆 + 管理員收到通知"
echo ""
echo "📊 查看記錄："
echo "   - 匯款記錄：cat src/data/remittance-records.json"
echo "   - 語意過濾：cat src/data/remittance-intent-log.json"
echo ""
echo "========================================"
echo ""

# ========================================
# Step 4：啟動日誌監控
# ========================================
echo "📡 啟動日誌監控..."
echo "   提示：按 Ctrl+C 停止監控"
echo ""
sleep 2

# 根據啟動方式選擇監控指令
if [ "$SERVICE_TYPE" = "docker" ]; then
    # Docker 日誌
    docker logs flb-attendance-system -f --tail 100
elif [ "$SERVICE_TYPE" = "local" ]; then
    # 本機日誌（直接顯示 stdout）
    tail -f /dev/null
else
    # 嘗試 Docker
    if docker ps | grep -q "flb-attendance-system"; then
        docker logs flb-attendance-system -f --tail 100
    else
        echo -e "${YELLOW}⚠️  找不到運行中的服務${NC}"
        echo "   請先啟動服務"
    fi
fi
