# 📤 上傳 CSV 到課程查看器指南

**日期：** 2025-10-23  
**問題：** Export 更新了 CSV，但課程查看器顯示舊日期

---

## 🔍 問題診斷

### 現狀
- ✅ Notion 已匯出新的 CSV（日期從 2025-11-02 開始）
- ✅ 課程查看器 API 能找到檔案名稱
- ❌ 但實際 CSV 檔案內容未更新
- ❌ 課程查看器顯示「載入失敗」或舊日期

### 原因
**CSV 檔案只在本地更新，還沒有上傳到課程查看器伺服器**

---

## 🚀 上傳步驟

### 方式 1：透過課程管理系統後台

1. **登入課程管理後台**
   ```
   https://course-viewer.funlearnbar.synology.me/
   ```

2. **上傳 CSV 檔案**
   - 點選「上傳課程」或「更新課程」
   - 選擇匯出的 CSV 檔案
   - 檔案名稱：`ESM 日 13:30-14:30  2700a4c0-ed84-815b-afd9-fe55a814c14f_all.csv`

3. **確認上傳成功**
   - 檢查系統是否顯示「上傳成功」
   - 刷新課程列表確認

### 方式 2：透過 FTP/SFTP 上傳

如果您有伺服器權限：

```bash
# 連接到伺服器
ssh user@funlearnbar.synology.me

# 上傳檔案到正確的目錄
# (目錄可能是 /var/www/course-viewer/data/ 或類似路徑)
```

### 方式 3：透過 Synology Drive/File Station

1. 開啟 Synology File Station
2. 找到課程查看器的資料目錄
3. 上傳/替換 CSV 檔案

---

## ✅ 驗證步驟

上傳後，請執行以下驗證：

### 1️⃣ 清除瀏覽器快取
```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

### 2️⃣ 檢查 CSV 是否可訪問

```bash
# 測試 CSV 檔案是否存在
curl -I "https://course-viewer.funlearnbar.synology.me/courses/ESM%20%E6%97%A5%2013:30-14:30%20%202700a4c0-ed84-815b-afd9-fe55a814c14f_all.csv"

# 應該返回 200 OK 和 content-type: text/csv
```

### 3️⃣ 重新訪問課程查看器

```
https://course-viewer.funlearnbar.synology.me/viewer.html?file=ESM%20%E6%97%A5%2013:30-14:30%20%202700a4c0-ed84-815b-afd9-fe55a814c14f_all.csv
```

預期結果：
- ✅ 課程名稱正確顯示
- ✅ 第一堂課日期顯示 2025/11/02
- ✅ 課程主題為「碰碰機器人」

---

## 🔧 常見問題

### Q1: 上傳後還是顯示舊資料？

**A:** 清除瀏覽器快取並強制重新載入（Cmd/Ctrl + Shift + R）

### Q2: 檔案名稱不一致？

**A:** 確認匯出的檔案名稱與系統中的完全一致：
```
ESM 日 13:30-14:30  2700a4c0-ed84-815b-afd9-fe55a814c14f_all.csv
```
注意空格和特殊字元！

### Q3: 找不到上傳入口？

**A:** 請聯繫系統管理員或檢查：
- Synology NAS 的 File Station
- 課程管理後台的上傳功能
- FTP/SFTP 權限

---

## 📊 檔案對應關係

| 檔案位置 | 用途 | 更新方式 |
|---------|------|---------|
| Notion Database | 課程資料來源 | 手動編輯 |
| 本地 Export | 匯出的 CSV | Notion 匯出功能 |
| 課程查看器伺服器 | 網頁顯示 | **需要手動上傳** ⚠️ |

**重點：** Notion 匯出只會產生本地檔案，不會自動上傳到伺服器！

---

## 🔄 自動化建議

為避免手動上傳，可以考慮：

1. **設定自動同步**
   - 使用 Synology Drive 自動同步特定資料夾
   - 設定 cron job 定期同步

2. **API 整合**
   - 開發自動上傳腳本
   - 匯出後自動推送到伺服器

3. **Webhook 通知**
   - Notion → 觸發 webhook → 自動更新伺服器

---

## 📞 需要協助？

如果您：
- 沒有伺服器上傳權限
- 不確定檔案上傳位置
- 需要自動化解決方案

請聯繫系統管理員或技術支援團隊。

---

**文件版本：** 1.0  
**最後更新：** 2025-10-23





