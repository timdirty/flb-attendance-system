#!/bin/bash

# 快速部署 special-events-manager.html 到 course-viewer 伺服器
# 日期：2025-10-24

echo "================================"
echo "🚀 部署 special-events-manager.html"
echo "================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 檢查檔案是否存在
if [ ! -f "special-events-manager.html" ]; then
    echo -e "${RED}❌ 找不到 special-events-manager.html${NC}"
    exit 1
fi

echo -e "${BLUE}📝 部署方式選擇：${NC}"
echo ""
echo "1. SSH/SCP 直接上傳（需要 SSH 權限）"
echo "2. 使用 Synology File Station（手動）"
echo "3. 檢查本地檔案修改狀態"
echo ""
read -p "請選擇 (1/2/3): " choice
echo ""

case $choice in
    1)
        echo -e "${YELLOW}📡 使用 SSH/SCP 上傳...${NC}"
        echo ""
        
        # 提示輸入伺服器資訊
        read -p "伺服器地址 [funlearnbar.synology.me]: " server
        server=${server:-funlearnbar.synology.me}
        
        read -p "使用者名稱: " username
        
        read -p "目標路徑 [/volume1/web/course-viewer/]: " target_path
        target_path=${target_path:-/volume1/web/course-viewer/}
        
        echo ""
        echo -e "${YELLOW}正在備份遠端檔案...${NC}"
        ssh "$username@$server" "cp ${target_path}special-events-manager.html ${target_path}special-events-manager.html.backup.$(date +%Y%m%d_%H%M%S)"
        
        echo -e "${YELLOW}正在上傳檔案...${NC}"
        scp special-events-manager.html "$username@$server:${target_path}"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ 上傳成功！${NC}"
            echo ""
            echo -e "${BLUE}🧪 測試步驟：${NC}"
            echo "1. 訪問：https://course-viewer.funlearnbar.synology.me/special-events-manager.html"
            echo "2. 按 Cmd/Ctrl + Shift + R 強制重新載入"
            echo "3. 確認預設視圖是「本週」"
            echo "4. 測試「上一期/下一期」按鈕"
        else
            echo -e "${RED}❌ 上傳失敗${NC}"
            exit 1
        fi
        ;;
        
    2)
        echo -e "${BLUE}📁 手動上傳步驟：${NC}"
        echo ""
        echo "1. 開啟 Synology File Station"
        echo "   網址：https://funlearnbar.synology.me:5001"
        echo ""
        echo "2. 找到目標目錄（可能是以下之一）："
        echo "   - /web/course-viewer/"
        echo "   - /volume1/web/course-viewer/"
        echo "   - /docker/course-viewer/"
        echo ""
        echo "3. 備份現有檔案："
        echo "   - 右鍵 special-events-manager.html"
        echo "   - 選擇「重新命名」或「複製」"
        echo "   - 改名為 special-events-manager.html.backup"
        echo ""
        echo "4. 上傳新檔案："
        echo "   - 點擊「上傳」按鈕"
        echo "   - 選擇本地的 special-events-manager.html"
        echo "   - 確認上傳完成"
        echo ""
        echo "5. 測試："
        echo "   - 訪問：https://course-viewer.funlearnbar.synology.me/special-events-manager.html"
        echo "   - 按 Cmd/Ctrl + Shift + R 清除快取"
        echo "   - 確認「本週」是預設視圖"
        echo ""
        echo -e "${YELLOW}📄 本地檔案位置：${NC}"
        echo "   $(pwd)/special-events-manager.html"
        ;;
        
    3)
        echo -e "${BLUE}🔍 檢查本地檔案修改狀態...${NC}"
        echo ""
        
        # 檢查 timeRange
        echo -e "${YELLOW}1. 檢查預設視圖設定：${NC}"
        if grep -q "timeRange: 'week'" special-events-manager.html; then
            echo -e "   ${GREEN}✅ timeRange 已設為 'week'${NC}"
        else
            echo -e "   ${RED}❌ timeRange 未正確設定${NC}"
            grep "timeRange:" special-events-manager.html | head -1
        fi
        echo ""
        
        # 檢查 active 按鈕
        echo -e "${YELLOW}2. 檢查預設按鈕狀態：${NC}"
        if grep -q 'class="time-range-btn active" data-range="week"' special-events-manager.html; then
            echo -e "   ${GREEN}✅ 「本週」按鈕設為 active${NC}"
        else
            echo -e "   ${RED}❌ 按鈕狀態未正確設定${NC}"
            grep 'time-range-btn active' special-events-manager.html | head -1
        fi
        echo ""
        
        # 檢查 currentViewDate 使用
        echo -e "${YELLOW}3. 檢查 currentViewDate 使用：${NC}"
        count=$(grep -c "state.currentViewDate" special-events-manager.html)
        if [ "$count" -ge 3 ]; then
            echo -e "   ${GREEN}✅ 找到 $count 處使用 state.currentViewDate${NC}"
        else
            echo -e "   ${RED}❌ 只找到 $count 處使用 state.currentViewDate${NC}"
        fi
        echo ""
        
        echo -e "${BLUE}📊 檔案資訊：${NC}"
        echo "   檔案大小：$(ls -lh special-events-manager.html | awk '{print $5}')"
        echo "   修改時間：$(ls -l special-events-manager.html | awk '{print $6, $7, $8}')"
        echo ""
        
        echo -e "${YELLOW}💡 下一步：${NC}"
        echo "   請選擇選項 1 或 2 進行部署"
        ;;
        
    *)
        echo -e "${RED}❌ 無效選擇${NC}"
        exit 1
        ;;
esac

echo ""
echo "================================"
echo -e "${GREEN}✅ 操作完成${NC}"
echo "================================"






