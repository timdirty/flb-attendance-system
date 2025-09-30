# ⚡ 設定系統速查表

## 🔗 快速訪問

| 頁面 | URL | 說明 |
|------|-----|------|
| 設定頁面 | `/settings` | Web 設定界面 |
| 首頁 | `/` | 系統首頁（右上角有設定按鈕） |
| 管理後台 | `/admin` | 管理後台 |

## 📡 API 端點速查

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/settings` | GET | 讀取配置 |
| `/api/settings` | POST | 儲存配置 |
| `/api/settings/test` | GET | 測試連線 |
| `/api/settings/backup` | GET | 備份配置 |
| `/api/settings/export` | GET | 匯出配置（JSON） |

## 💰 省錢策略速查

### 最省錢（推薦）
```
✅ 啟用 Bot 2
✅ 啟用負載平衡
策略：輪詢 (Round Robin)
批次延遲：100ms
節省：最多 50%
```

### 最穩定
```
✅ 啟用 Bot 2
✅ 啟用負載平衡
策略：主要優先 (Primary First)
批次延遲：100ms
節省：約 20-30%
```

### 平衡模式
```
✅ 啟用 Bot 2
✅ 啟用負載平衡
策略：隨機 (Random)
批次延遲：100ms
節省：約 40-45%
```

## 🔑 必填設定

### Bot 1（必須）
- ✅ Channel Access Token
- ✅ Channel Secret
- ✅ 管理員 LINE User ID

### Bot 2（選填）
- ⭕ 啟用 Bot 2（勾選）
- ⭕ Channel Access Token
- ⭕ Channel Secret

## ⚙️ 建議設定值

| 參數 | 建議值 | 說明 |
|------|--------|------|
| 批次發送延遲 | 100-200ms | 避免速率限制 |
| 最大重試次數 | 3 | 平衡成功率和效率 |
| 同步間隔 | 3600000ms (1小時) | Google Sheets 同步 |
| 日誌級別 | info | 生產環境 |
| 速率限制 | 100 請求/分鐘 | API 保護 |

## 🎨 預設顏色

| 用途 | 顏色代碼 |
|------|---------|
| 主要色 | #667EEA |
| 成功色 | #06C755 |
| 警告色 | #FFB400 |
| 危險色 | #FF334B |

## 🔧 故障排除速查

### 問題：設定頁面打不開
```bash
# 檢查系統是否運行
ps aux | grep node

# 重新啟動
npm start
```

### 問題：測試連線失敗
1. 檢查 Token/Secret 是否正確
2. 確認 Bot 在 LINE Console 中是否啟用
3. 檢查網路連線

### 問題：儲存設定後沒有生效
```bash
# 重新啟動系統
Ctrl + C
npm start
```

### 問題：系統無法啟動
```bash
# 使用最新備份恢復
ls -lt .env.backup.*
cp .env.backup.最新的 .env

# 或創建最小配置
echo "LINE_CHANNEL_ACCESS_TOKEN=your_token" > .env
echo "LINE_CHANNEL_SECRET=your_secret" >> .env
```

## 📁 重要文件位置

| 文件 | 路徑 | 說明 |
|------|------|------|
| 主配置 | `.env` | 環境變數配置 |
| 配置文件 | `config.js` | 系統配置定義 |
| 配置管理器 | `config-manager.js` | 讀寫 .env |
| 設定頁面 | `public/settings.html` | Web 界面 |
| 備份文件 | `.env.backup.*` | 自動備份 |

## 🚨 緊急恢復

### 方法 1：使用備份
```bash
# 找到最新備份
ls -lt .env.backup.* | head -1

# 恢復（替換時間戳記）
cp .env.backup.2025-09-30T14-30-45-123 .env
```

### 方法 2：最小配置
```bash
cat > .env << EOF
LINE_CHANNEL_ACCESS_TOKEN=你的Token
LINE_CHANNEL_SECRET=你的Secret
LINE_USER_ID=你的UserID
EOF
```

### 方法 3：刪除配置（使用預設值）
```bash
mv .env .env.broken
npm start
# 系統將使用 config.js 中的預設值
```

## 📊 監控檢查清單

### 每日檢查
- [ ] 兩個 Bot 都正常運作
- [ ] 訊息發送成功率 > 95%
- [ ] 沒有異常錯誤日誌

### 每週檢查
- [ ] 查看 LINE API 使用量
- [ ] 確認負載平衡是否正常運作
- [ ] 檢查備份文件是否存在

### 每月檢查
- [ ] 評估 API 費用節省效果
- [ ] 清理舊的備份文件
- [ ] 更新 Token（如需要）

## 🎯 性能優化建議

### 訊息量 < 100/月
```
不需要啟用 Bot 2
批次延遲：50ms
重試次數：2
```

### 訊息量 100-500/月
```
✅ 啟用 Bot 2
策略：主要優先
批次延遲：100ms
重試次數：3
```

### 訊息量 > 500/月
```
✅ 啟用 Bot 2
策略：輪詢
批次延遲：200ms
重試次數：3
```

## 🔐 安全檢查清單

- [ ] ✅ 啟用簽名驗證
- [ ] ✅ 啟用速率限制
- [ ] ⚠️ 不要在日誌中顯示敏感資訊
- [ ] ⚠️ 定期更換 Token
- [ ] ⚠️ 不要將 `.env` 文件提交到版本控制

## 📚 快速參考文檔

| 文檔 | 用途 |
|------|------|
| `SETTINGS_QUICKSTART.md` | 5分鐘快速開始 |
| `SETTINGS_GUIDE.md` | 完整使用指南 |
| `NEW_FEATURES_SETTINGS.md` | 新功能說明 |
| `CONFIG_GUIDE.md` | 配置詳解 |
| `DUAL_BOT_SETUP.md` | 雙 Bot 設定 |

## 💬 常用指令

```bash
# 啟動系統
npm start

# 檢查配置語法
node -c config-manager.js

# 查看配置（不包含敏感資訊）
node -e "require('dotenv').config(); console.log('Bot 1:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ 已設定' : '❌ 未設定')"

# 清理舊備份（保留最新 5 個）
ls -t .env.backup.* | tail -n +6 | xargs rm -f

# 測試 API 端點
curl http://localhost:3000/api/settings/test
```

## 🎨 快速配色方案

### 專業藍
```
主要色：#667EEA
成功色：#06C755
警告色：#FFB400
危險色：#FF334B
```

### 清新綠
```
主要色：#10B981
成功色：#059669
警告色：#F59E0B
危險色：#EF4444
```

### 活力橙
```
主要色：#F97316
成功色：#22C55E
警告色：#EAB308
危險色：#DC2626
```

---

**提示**：將此頁面加入書籤，隨時查閱！📌

**最後更新**：2025-09-30

