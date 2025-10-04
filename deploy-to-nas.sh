#!/bin/bash

# FLB LINE Bot - NAS 部署腳本

echo "🐳 FLB LINE Bot - NAS 部署腳本"
echo "================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查 .env 檔案
if [ ! -f .env ]; then
    echo -e "${RED}❌ 錯誤：找不到 .env 檔案${NC}"
    echo ""
    echo "請先建立 .env 檔案："
    echo "  cp env.example .env"
    echo "  nano .env  # 填入實際的設定值"
    exit 1
fi

echo -e "${GREEN}✓${NC} 找到 .env 檔案"

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 錯誤：Docker 未安裝${NC}"
    echo "請先安裝 Docker Desktop"
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

# 停止並移除舊容器（如果存在）
echo ""
echo "🧹 清理舊容器..."
docker stop flb-line-bot 2>/dev/null || true
docker rm flb-line-bot 2>/dev/null || true
echo -e "${GREEN}✓${NC} 清理完成"

# 啟動新容器
echo ""
echo "🚀 啟動容器..."
docker-compose up -d

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
curl -s http://localhost:3000/health | jq . || echo "請確認服務是否正常啟動"

# 顯示日誌
echo ""
echo "📋 最近的日誌："
docker logs --tail 20 flb-line-bot

echo ""
echo "================================"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📝 常用指令："
echo "  查看日誌：docker logs -f flb-line-bot"
echo "  重啟容器：docker restart flb-line-bot"
echo "  停止容器：docker stop flb-line-bot"
echo "  查看狀態：docker ps | grep flb-line-bot"
echo ""
echo "🌐 服務位址："
echo "  本機：http://localhost:3000"
echo "  健康檢查：http://localhost:3000/health"
echo ""
echo "🔧 下一步："
echo "  1. 設定 NAS 反向代理"
echo "  2. 設定 SSL 憑證"
echo "  3. 更新 LINE Webhook URL"
echo "  4. 測試 LINE Bot 功能"
echo ""

