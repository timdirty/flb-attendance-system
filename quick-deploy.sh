#!/bin/bash

# ========================================
# FLB 簽到系統 - 快速部署腳本
# 用於修復 Flex Message 問題後的快速部署
# ========================================

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色訊息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 標題
echo ""
echo "=========================================="
echo "  🚀 FLB 簽到系統 - 快速部署"
echo "=========================================="
echo ""

# 檢查是否在專案目錄
if [ ! -f "docker-compose.yml" ]; then
    print_error "找不到 docker-compose.yml，請確認在專案根目錄執行此腳本"
    exit 1
fi

print_success "已找到 docker-compose.yml"

# 檢查 .env 檔案
echo ""
print_info "檢查 .env 檔案..."
if [ ! -f ".env" ]; then
    print_warning ".env 檔案不存在"
    read -p "是否要從 env.example 複製？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp env.example .env
        print_success "已從 env.example 複製 .env"
        print_warning "請編輯 .env 檔案，填入實際的設定值"
        read -p "按 Enter 繼續..." 
    else
        print_error "請先建立 .env 檔案"
        exit 1
    fi
fi

# 檢查 SYSTEM_URL
print_info "檢查 SYSTEM_URL 設定..."
if grep -q "^SYSTEM_URL=" .env; then
    SYSTEM_URL=$(grep "^SYSTEM_URL=" .env | cut -d '=' -f 2)
    print_success "SYSTEM_URL: $SYSTEM_URL"
else
    print_warning "SYSTEM_URL 未設定，將使用預設值"
    print_info "預設值：https://flbbot.funlearnbar.synology.me"
fi

# 詢問部署方式
echo ""
echo "請選擇部署方式："
echo "  1) 快速重啟 (docker-compose restart)"
echo "  2) 重新建立並啟動 (docker-compose up -d --build)"
echo "  3) 完全重建 (down + build --no-cache + up -d)"
echo ""
read -p "請選擇 [1-3]: " -n 1 -r CHOICE
echo ""

case $CHOICE in
    1)
        print_info "執行快速重啟..."
        docker-compose restart
        print_success "容器已重啟"
        ;;
    2)
        print_info "重新建立並啟動容器..."
        docker-compose up -d --build
        print_success "容器已重新建立並啟動"
        ;;
    3)
        print_info "停止並移除舊容器..."
        docker-compose down
        
        print_info "重新建立 Docker 映像（無快取）..."
        docker-compose build --no-cache
        
        print_info "啟動新容器..."
        docker-compose up -d
        
        print_success "完全重建完成"
        ;;
    *)
        print_error "無效的選擇"
        exit 1
        ;;
esac

# 等待容器啟動
echo ""
print_info "等待容器啟動（5 秒）..."
sleep 5

# 檢查容器狀態
echo ""
print_info "檢查容器狀態..."
if docker ps | grep -q flb-line-bot; then
    print_success "容器 flb-line-bot 正在運行"
else
    print_error "容器 flb-line-bot 未運行"
    print_info "請檢查日誌：docker logs flb-line-bot"
    exit 1
fi

# 顯示日誌
echo ""
print_info "顯示最新日誌（按 Ctrl+C 退出）..."
echo "=========================================="
echo ""

sleep 2
docker logs flb-line-bot -f --tail 50

# 說明：此腳本會持續顯示日誌，用戶按 Ctrl+C 退出後繼續
echo ""
echo "=========================================="
print_success "部署完成！"
echo ""
print_info "驗證步驟："
echo "  1. 檢查日誌中的系統 URL 是否正確"
echo "  2. 在 LINE 發送「我已匯款500元」測試 Flex Message"
echo "  3. 檢查是否收到 Flex Message 且無錯誤"
echo ""
print_info "詳細測試指引請參考：DEPLOY_FIX.md"
echo ""
