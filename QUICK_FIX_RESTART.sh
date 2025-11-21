#!/bin/bash

# ============================================
# 🚀 快速修復重啟腳本
# ============================================
# 用途：應用最新的修復並重啟服務
# 修復內容：
#   1. Flex Message URL scheme 錯誤
#   2. 匯款關鍵字太鬆散問題
# ============================================

echo "=================================="
echo "🚀 FLB 簽到系統 - 快速修復重啟"
echo "=================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 專案路徑
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "📂 專案路徑: $PROJECT_DIR"
echo ""

# ============================================
# 1. 檢查修改的檔案
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 檢查修改的檔案"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

files_to_check=(
    "server.js"
    "src/config.js"
)

all_files_exist=true

for file in "${files_to_check[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        file_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$PROJECT_DIR/$file" 2>/dev/null || stat -c "%y" "$PROJECT_DIR/$file" 2>/dev/null | cut -d'.' -f1)
        echo -e "${GREEN}✅${NC} $file"
        echo "   修改時間: $file_time"
    else
        echo -e "${RED}❌${NC} $file 不存在"
        all_files_exist=false
    fi
done

echo ""

if [ "$all_files_exist" = false ]; then
    echo -e "${RED}❌ 某些檔案不存在，請檢查${NC}"
    exit 1
fi

# ============================================
# 2. 檢查 Docker 狀態
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 檢查 Docker 狀態"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 檢查 Docker 是否運行
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo -e "${GREEN}✅${NC} Docker 運行中"
        
        # 檢查容器狀態
        if docker ps --format "{{.Names}}" | grep -q "flb-line-bot"; then
            echo -e "${GREEN}✅${NC} flb-line-bot 容器運行中"
            container_running=true
        else
            echo -e "${YELLOW}⚠️${NC}  flb-line-bot 容器未運行"
            container_running=false
        fi
    else
        echo -e "${RED}❌${NC} Docker daemon 未運行"
        echo "請先啟動 Docker Desktop"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️${NC}  本機無 Docker，請在 NAS 上執行"
    echo ""
    echo "請執行以下指令："
    echo -e "${BLUE}ssh your-username@your-nas-ip${NC}"
    echo -e "${BLUE}cd /volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）${NC}"
    echo -e "${BLUE}docker-compose restart${NC}"
    echo ""
    exit 0
fi

echo ""

# ============================================
# 3. 顯示修復內容
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 本次修復內容"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}修復 1：Flex Message URL Scheme 錯誤${NC}"
echo "  • 檔案：server.js"
echo "  • 修改：createRemittanceFlexBubble() 函數"
echo "  • 內容：加入 URL scheme 驗證（http:// 或 https://）"
echo ""
echo -e "${GREEN}修復 2：匯款關鍵字太鬆散${NC}"
echo "  • 檔案：src/config.js, server.js"
echo "  • 修改：雙重檢測機制"
echo "  • 內容："
echo "    策略1：明確完成短語（已匯款、轉帳完成等）"
echo "    策略2：基礎關鍵字 + 完成詞（匯款 + 已 = 觸發）"
echo ""

# ============================================
# 4. 詢問是否重啟
# ============================================
if [ "$container_running" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 準備重啟容器"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    read -p "是否立即重啟 Docker 容器？(y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔄 重啟中..."
        
        cd "$PROJECT_DIR"
        
        # 重啟容器
        if docker-compose restart; then
            echo -e "${GREEN}✅ 容器重啟成功${NC}"
            echo ""
            
            # 等待服務啟動
            echo "⏳ 等待服務啟動（5秒）..."
            sleep 5
            
            # 顯示日誌
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📋 最新日誌（按 Ctrl+C 停止）"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            docker logs flb-line-bot -f --tail 30
        else
            echo -e "${RED}❌ 容器重啟失敗${NC}"
            exit 1
        fi
    else
        echo ""
        echo "⏭️  已取消重啟"
        echo ""
        echo "手動重啟指令："
        echo -e "${BLUE}docker-compose restart${NC}"
        echo -e "${BLUE}docker logs flb-line-bot -f${NC}"
    fi
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 啟動容器"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    read -p "是否啟動 Docker 容器？(y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 啟動中..."
        
        cd "$PROJECT_DIR"
        
        # 啟動容器
        if docker-compose up -d; then
            echo -e "${GREEN}✅ 容器啟動成功${NC}"
            echo ""
            
            # 等待服務啟動
            echo "⏳ 等待服務啟動（10秒）..."
            sleep 10
            
            # 顯示日誌
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📋 最新日誌（按 Ctrl+C 停止）"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            docker logs flb-line-bot -f --tail 50
        else
            echo -e "${RED}❌ 容器啟動失敗${NC}"
            exit 1
        fi
    else
        echo ""
        echo "⏭️  已取消啟動"
        echo ""
        echo "手動啟動指令："
        echo -e "${BLUE}docker-compose up -d${NC}"
        echo -e "${BLUE}docker logs flb-line-bot -f${NC}"
    fi
fi

echo ""
echo "=================================="
echo "✅ 完成"
echo "=================================="
echo ""
echo "📚 測試文檔：KEYWORD_IMPROVEMENT_TEST.md"
echo "📊 測試結果：TEST_RESULTS_20251121.md"
echo ""
