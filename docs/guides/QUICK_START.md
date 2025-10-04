# 🚀 快速開始指南

## 📅 額度重置時間
**2025 年 10 月 1 日 00:00（今晚午夜）**

---

## ⏰ 重置後立即測試（00:15 開始）

### 1️⃣ 基本測試（5 分鐘）

在 LINE 官方帳號發送以下訊息：

```
#剩餘堂數
```
**預期**：顯示 Loading 動畫 → Flex Message → 總結訊息

```
#完整出缺勤
```
**預期**：顯示 Loading 動畫 → 完整出缺勤記錄（不顯示剩餘堂數）

---

### 2️⃣ 檢查日誌（1 分鐘）

```bash
railway logs
```

**尋找**：
- ✅ `Loading Animation 發送成功`
- ✅ `Flex Message 發送成功`
- ✅ `已顯示 X 個學生的出缺勤記錄`

---

### 3️⃣ 如果有問題

**問題 A：沒有 Loading Animation**
```bash
# 檢查 log
railway logs | grep "Loading Animation"
```

**問題 B：Flex Message 格式錯誤**
```bash
# 本地測試
node test_flex_message.js

# 複製 JSON 到 Simulator 檢查
# https://developers.line.biz/flex-simulator/
```

**問題 C：Bot 額度問題**
```bash
# 檢查是否有錯誤訊息
railway logs | grep "monthly limit"
```

---

## 📚 完整文檔

- **詳細測試清單**：`LINE_API_RESET_CHECKLIST.md`
- **測試環境指南**：`LINE_FLEX_MESSAGE_TEST_GUIDE.md`
- **功能說明**：`ATTENDANCE_QUERY_README.md`

---

## 🎯 三種查詢模式

| 關鍵字 | 用途 |
|--------|------|
| `#剩餘堂數` | 快速查看（近 5 堂 + 剩餘堂數）|
| `#剩餘堂數完整` | 完整歷史（所有記錄 + 剩餘堂數）|
| `#完整出缺勤` | 純出缺勤（所有記錄，無剩餘堂數）|

---

**時間規劃**：
- `00:00` - 額度重置
- `00:15` - 開始測試
- `00:30` - 完成基本測試
- `01:00` - 完成所有測試

**準備好了嗎？讓我們在午夜後見！** 🌙✨
