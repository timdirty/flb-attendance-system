#!/bin/bash
# 重啟 Docker 容器並查看日誌

echo "🛑 停止容器..."
docker-compose down

echo "🔨 重新構建映像..."
docker-compose build

echo "🚀 啟動容器..."
docker-compose up -d

echo "📋 等待 3 秒..."
sleep 3

echo "📊 顯示即時日誌（Ctrl+C 退出）:"
docker-compose logs -f
