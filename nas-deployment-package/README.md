# FLB 簽到系統 - NAS 部署包

## 🚀 快速開始

### 1. 上傳檔案到 NAS
將整個 `nas-deployment-package` 資料夾上傳到您的 Synology NAS

### 2. 設定環境變數
```bash
cd /volume1/docker/flb-attendance
cp .env.example .env
# 編輯 .env 檔案，填入正確的 LINE API 資訊
```

### 3. 執行部署
```bash
chmod +x nas-quick-deploy.sh
./nas-quick-deploy.sh
```

### 4. 設定反向代理
在 DSM 控制台中設定反向代理，將您的域名指向 `localhost:3000`

## 📋 包含功能

- ✅ LIFF 整合
- ✅ 講師身份綁定
- ✅ Rich Menu 自動綁定
- ✅ Google Sheets 資料同步
- ✅ 雙向通知系統
- ✅ 管理員後台
- ✅ 報表簽到
- ✅ 補簽到功能

## 📖 詳細說明

請參考 `NAS_DEPLOYMENT_LATEST.md` 檔案獲取完整的部署指南。

## 🔧 故障排除

如果遇到問題，請檢查：
1. 環境變數設定
2. Docker 容器狀態
3. 網路連線
4. 防火牆設定

## 📞 支援

部署完成後，您可以訪問：
- 主頁：`http://your-nas-ip:3000`
- 管理後台：`http://your-nas-ip:3000/admin`
- Webhook：`http://your-nas-ip:3000/webhook`

