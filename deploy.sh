#!/bin/bash

# FLB 學生簽到系統部署腳本
# 適用於 Synology DS923+

echo "開始部署 FLB 學生簽到系統..."

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "錯誤: Node.js 未安裝，請先在套件中心安裝 Node.js"
    exit 1
fi

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo "錯誤: npm 未安裝"
    exit 1
fi

# 創建日誌目錄
mkdir -p logs

# 安裝依賴
echo "安裝依賴套件..."
npm install --production

# 設置權限
chmod +x server.js

# 創建 systemd 服務文件（如果使用 systemd）
if command -v systemctl &> /dev/null; then
    echo "創建 systemd 服務..."
    sudo tee /etc/systemd/system/flb-attendance.service > /dev/null <<EOF
[Unit]
Description=FLB Student Attendance System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

    # 重新載入 systemd
    sudo systemctl daemon-reload
    sudo systemctl enable flb-attendance
    sudo systemctl start flb-attendance
    
    echo "服務已啟動，狀態："
    sudo systemctl status flb-attendance
else
    echo "使用 PM2 管理進程..."
    # 安裝 PM2
    npm install -g pm2
    
    # 啟動應用
    pm2 start server.js --name "flb-attendance"
    pm2 save
    pm2 startup
    
    echo "應用已啟動，狀態："
    pm2 status
fi

echo "部署完成！"
echo "應用程式運行在: http://your-nas-ip:3000"
echo "請確保防火牆已開放 3000 端口" 