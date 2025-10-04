#!/bin/bash

# 直接在 NAS 上部署（適用於 Synology Drive 同步的專案）
# NAS 路徑：/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）

echo "🏠 直接在 NAS 上部署 FLB LINE Bot"
echo "===================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# NAS 專案路徑
NAS_PROJECT_DIR="/volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）"

echo -e "${BLUE}📁 專案位置：${NC}"
echo "   本機：/Users/apple/Library/CloudStorage/SynologyDrive-FLBTim/..."
echo "   NAS：$NAS_PROJECT_DIR"
echo ""

# 檢查 .env 檔案
if [ ! -f .env ]; then
    echo -e "${RED}❌ 錯誤：找不到 .env 檔案${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} .env 檔案已就緒"

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 錯誤：Docker 未安裝${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker 已安裝"

# 建立必要目錄
echo ""
echo "📁 建立必要目錄..."
mkdir -p data logs
echo -e "${GREEN}✓${NC} 目錄建立完成"

# 建立 Docker 映像
echo ""
echo "🔨 建立 Docker 映像..."
docker build -t flb-line-bot:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Docker 映像建立成功"
else
    echo -e "${RED}❌ Docker 映像建立失敗${NC}"
    exit 1
fi

# 停止並移除舊容器
echo ""
echo "🧹 清理舊容器..."
docker stop flb-line-bot 2>/dev/null || true
docker rm flb-line-bot 2>/dev/null || true
echo -e "${GREEN}✓${NC} 清理完成"

# 啟動容器（使用當前目錄的 .env）
echo ""
echo "🚀 啟動容器..."
docker run -d \
  --name flb-line-bot \
  --restart unless-stopped \
  -p 3010:3010 \
  --env-file .env \
  -v "$NAS_PROJECT_DIR/data:/app/data" \
  -v "$NAS_PROJECT_DIR/logs:/app/logs" \
  flb-line-bot:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 容器啟動成功"
else
    echo -e "${RED}❌ 容器啟動失敗${NC}"
    exit 1
fi

# 等待服務啟動
echo ""
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查容器狀態
echo ""
echo "📊 檢查容器狀態..."
docker ps | grep flb-line-bot

# 測試健康檢查
echo ""
echo "🔍 測試健康檢查端點..."
sleep 2
curl -s http://localhost:3010/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3010/health

# 顯示日誌
echo ""
echo "📋 最近的日誌："
echo "================================"
docker logs --tail 20 flb-line-bot

echo ""
echo "================================"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📝 常用指令："
echo "  查看即時日誌：docker logs -f flb-line-bot"
echo "  重啟容器：docker restart flb-line-bot"
echo "  停止容器：docker stop flb-line-bot"
echo "  查看狀態：docker ps | grep flb-line-bot"
echo "  進入容器：docker exec -it flb-line-bot sh"
echo ""
echo "🌐 服務位址："
echo "  本機測試：http://localhost:3010"
echo "  健康檢查：http://localhost:3010/health"
echo ""
echo -e "${BLUE}🔧 下一步：${NC}"
echo "  1. 在 DSM 設定反向代理（控制台 → 登入入口網站）"
echo "     來源：HTTPS linebot.yourdomain.com:443"
echo "     目的地：HTTP localhost:3010"
echo ""
echo "  2. 設定 SSL 憑證（控制台 → 安全性 → 憑證）"
echo ""
echo "  3. 更新 LINE Webhook URL"
echo "     https://developers.line.biz/console/"
echo "     新 Webhook：https://linebot.yourdomain.com/webhook"
echo ""
echo "  4. 測試 LINE Bot 功能"
echo ""

