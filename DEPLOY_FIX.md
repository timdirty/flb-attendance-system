# 🚀 Flex Message 修復部署指引

## 📋 修復內容總結

### ✅ 已完成的修改

1. **docker-compose.yml** (Line 18-48)
   - ✅ 新增 `SYSTEM_URL` 環境變數
   - ✅ 預設值：`https://flbbot.funlearnbar.synology.me`
   - ✅ 新增所有必要的環境變數（匯款、OCR、Webhook 等）

2. **server.js** (Line 3744-3754, 3886-3895)
   - ✅ 修復 `createRemittanceFlexBubble` 的 Logo URL 邏輯
   - ✅ 修復 `createPaymentConfirmationFlexMessage` 的 Logo URL 邏輯
   - ✅ 當系統 URL 是 localhost 時，自動使用外部公開圖片

3. **env.example** (Line 25-28)
   - ✅ 更新 SYSTEM_URL 範例為實際公網域名
   - ✅ 新增重要提示

---

## 🔧 部署步驟

### 方法 1：在 NAS 上直接重啟（推薦）

```bash
# 1. SSH 連線到 NAS
ssh your-username@your-nas-ip

# 2. 進入專案目錄
cd /volume1/homes/ctctim14/樂程坊計畫/課程資料/Cursor/FLB簽到系統（line）

# 3. 重新建立 Docker 映像（確保使用最新程式碼）
docker-compose build --no-cache

# 4. 重啟容器
docker-compose up -d

# 5. 查看日誌（確認系統 URL 正確）
docker logs flb-line-bot -f --tail 50
```

### 方法 2：使用 deploy-on-nas.sh 腳本

```bash
# 在專案目錄執行
./deploy-on-nas.sh
```

---

## ✅ 驗證步驟

### 1. 檢查系統 URL

重啟後，在日誌中應該看到：

```
📋 系統配置摘要:
==================================================
🌐 伺服器端口: 3010
🔗 系統 URL: https://flbbot.funlearnbar.synology.me  ← ✅ 應該是這個！
🤖 LINE Bot: ✅ 已配置
```

**如果還是顯示 `http://localhost:3000`**，請檢查：

```bash
# 檢查 .env 檔案是否存在
ls -la .env

# 檢查 SYSTEM_URL 是否設定
grep SYSTEM_URL .env
```

**如果 .env 中沒有 SYSTEM_URL，請新增**：

```bash
# 編輯 .env
nano .env

# 新增這一行（如果不存在）
SYSTEM_URL=https://flbbot.funlearnbar.synology.me

# 儲存並重啟
docker-compose restart
```

---

### 2. 測試 Flex Message

在 LINE 發送測試訊息：

#### ✅ 應該觸發匯款通知
```
我已匯款500元
```

**預期結果**：
- ✅ 管理員收到 Flex Message 卡片
- ✅ 日誌顯示：`✅ 主要Bot Flex Message 發送成功`
- ✅ 沒有 `invalid uri scheme` 錯誤

#### ❌ 不應該觸發
```
請問如何匯款
```

**預期結果**：
- ✅ 日誌顯示：`hitKeywords: false`
- ✅ 不觸發匯款通知

---

### 3. 檢查 Logo 圖片

**目前暫時使用外部圖片**，等之後再準備自己的 Logo。

如果想使用自己的 Logo：

```bash
# 1. 準備 Logo 圖片（建議 200x200 px 以上）
# 檔名：flb-logo.jpg

# 2. 上傳到 public/ 目錄
# 路徑：public/flb-logo.jpg

# 3. 確認檔案存在
ls -lh public/flb-logo.jpg

# 4. 確保檔案可公開訪問
# 測試 URL：https://flbbot.funlearnbar.synology.me/flb-logo.jpg
```

---

## 📊 預期成功日誌

```
🔗 系統 URL: https://flbbot.funlearnbar.synology.me
...
收到訊息: 我已匯款500元
🔍 檢查匯款關鍵字: {
  hasExplicitPhrase: true,
  hasBaseKeyword: true,
  hasCompletionWord: true,
  hasBothKeywordAndCompletion: true,
  hitKeywords: true
}
✅ 觸發匯款通知處理...
📤 發送匯款通知給 1 位管理員...
🤖 使用 主要Bot (primary) 發送 Flex Message
✅ 主要Bot Flex Message 發送成功給 [管理員ID]  ← 🎉 成功！
✅ 已發送匯款通知給管理員
```

---

## 🐛 故障排除

### 問題 1：還是顯示 `http://localhost:3000`

**原因**：.env 中沒有設定 SYSTEM_URL

**解決方法**：

```bash
# 在 .env 中新增
SYSTEM_URL=https://flbbot.funlearnbar.synology.me

# 重啟容器
docker-compose restart
```

---

### 問題 2：還是出現 `invalid uri scheme` 錯誤

**原因**：容器沒有重新建立，還在使用舊程式碼

**解決方法**：

```bash
# 停止並移除舊容器
docker-compose down

# 重新建立映像
docker-compose build --no-cache

# 啟動新容器
docker-compose up -d
```

---

### 問題 3：Flex Message 發送成功，但沒有顯示 Logo

**原因**：Logo 檔案不存在或無法公開訪問

**解決方法**：

1. **暫時方案**：系統會自動使用 LINE 官方範例圖片
2. **長期方案**：上傳 `flb-logo.jpg` 到 `public/` 目錄

---

## 📝 Git 提交

所有修改完成後，記得提交版本控制：

```bash
git add -A
git commit -m "🔧 修復 Flex Message URL 問題

✅ 完成項目：
- 在 docker-compose.yml 中新增 SYSTEM_URL 環境變數
- 修復 Flex Message Logo URL 邏輯（支援 localhost fallback）
- 更新 env.example 範例
- 預設使用公網域名：https://flbbot.funlearnbar.synology.me

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

---

## 🎯 下一步

修復完成後，可以繼續進行完整測試：

1. ✅ 測試匯款關鍵字精準度
2. ✅ 測試 OCR 圖片辨識
3. ✅ 測試語意過濾（「明天會匯款」等）

參考文檔：
- `KEYWORD_IMPROVEMENT_TEST.md` - 關鍵字測試計劃
- `SUPER_TEST_EXECUTION.md` - 完整測試計劃
