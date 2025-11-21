# 💰 匯款確認功能 - 快速開始

## 📋 5 分鐘快速設定指南

### 步驟 1：設定管理員 User ID

**方式 A：使用設定檔**（推薦）

已為您創建預設設定檔 `src/data/admin-users.json`：

```json
[
  {
    "userId": "Udb51363eb6fdc605a6a9816379a38103",
    "name": "主要管理員",
    "role": "admin",
    "enabled": true,
    "createdAt": "2024-11-21T05:45:00.000Z",
    "notificationTypes": [
      "remittance",
      "leave",
      "registration",
      "teacher_binding"
    ]
  }
]
```

✅ **不需要修改任何程式碼！**此設定已生效。

---

**方式 B：使用環境變數**

在 `.env` 檔案中加入：

```bash
ADMIN_USER_IDS=Udb51363eb6fdc605a6a9816379a38103
```

---

### 步驟 2：（選填）設定群組通知

如果想要同時發送到管理員群組：

```bash
# .env
REMITTANCE_GROUP_ID=your_group_id_here
```

💡 **如何取得群組 ID？**
1. 將 LINE Bot 加入目標群組
2. 在群組中發送任意訊息
3. 查看伺服器日誌，找到類似 `C1234567890abcdef` 的 ID

---

### 步驟 3：重啟服務

```bash
# 本機開發
npm run dev

# Docker
docker-compose restart
```

---

### 步驟 4：測試功能

在 LINE 中發送測試訊息：

```
我已經轉帳 1500 元了
```

**預期結果**：

1. ✅ 您會收到自動回覆：「📄 已收到您的匯款資訊，將盡快為您確認。」
2. ✅ 管理員 `Udb51363eb6fdc605a6a9816379a38103` 會收到 Flex Message 通知
3. ✅ 伺服器日誌顯示：
   ```
   📤 發送匯款通知給 1 位管理員...
   ✅ 已發送匯款通知給管理員: Udb51363eb6fdc605a6a9816379a38103
   ```

---

### 步驟 5：管理員確認匯款

管理員在收到的 Flex Message 中點擊：

```
[ ✅ 已確認收款 ]
```

**系統會自動**：
- ✅ 回覆管理員：「✅ 已回覆客戶，金額 NT$1,500」
- ✅ 推播給客戶：「✅ 已確認收到您的匯款：NT$1,500\n感謝！」

---

## 🎯 完整功能測試清單

### 測試 1：文字匯款通知

```
✅ 發送：「我已經轉帳 1500 元了」
✅ 預期：管理員收到通知，金額顯示 NT$ 1,500
```

### 測試 2：圖片匯款通知

```
✅ 發送：文字「匯款完成」+ 匯款截圖
✅ 預期：管理員收到通知，顯示「（圖片／非文字訊息）」
```

### 測試 3：確認流程

```
✅ 管理員點擊「已確認收款」
✅ 預期：客戶收到確認訊息
```

---

## 📊 查看匯款記錄

匯款記錄儲存在：

```bash
cat src/data/remittance-records.json
```

範例輸出：

```json
[
  {
    "id": "remit_1732171260123_abc123",
    "userId": "U1234567890abcdef",
    "displayName": "王小明",
    "messageText": "我已經轉帳 1500 元了",
    "amount": "1500",
    "status": "confirmed",
    "confirmedBy": "Udb51363eb6fdc605a6a9816379a38103",
    "confirmedAt": "2024-11-21T05:42:15.456Z",
    "createdAt": "2024-11-21T05:41:00.123Z"
  }
]
```

---

## 🔧 進階設定

### 新增多位管理員

編輯 `src/data/admin-users.json`：

```json
[
  {
    "userId": "Udb51363eb6fdc605a6a9816379a38103",
    "name": "主要管理員",
    "enabled": true
  },
  {
    "userId": "U1234567890abcdef",
    "name": "財務管理員",
    "enabled": true
  },
  {
    "userId": "U0987654321fedcba",
    "name": "備用管理員",
    "enabled": false
  }
]
```

重啟服務後，匯款通知會同時發送給啟用的管理員。

---

### 自訂匯款關鍵字

在 `.env` 中修改：

```bash
REMITTANCE_KEYWORDS=匯款,轉帳,轉帳完成,已轉,ATM,付款完成,已付款
```

---

### 自訂 Flex Message 顏色

```bash
REMITTANCE_THEME_COLOR=#FF6B6B  # 改為紅色
```

---

## ❓ 常見問題

### Q1：管理員沒有收到通知？

**檢查清單**：
- ✅ 確認 User ID 正確（可在 LINE 中發送 `@me` 查看）
- ✅ 確認設定檔中 `enabled: true`
- ✅ 確認伺服器已重啟
- ✅ 查看日誌是否有錯誤訊息

---

### Q2：如何取得管理員的 User ID？

**方法 1**：查看伺服器日誌

管理員在 LINE 中發送任意訊息後，查看日誌中的 `userId`。

**方法 2**：使用管理介面

訪問 `http://localhost:3000/admin.html`，查看用戶列表。

---

### Q3：可以只發送給管理員，不發送到群組嗎？

可以！只要不設定 `REMITTANCE_GROUP_ID` 即可。

```bash
# .env
# REMITTANCE_GROUP_ID=  # 留空或註解掉
ADMIN_USER_IDS=Udb51363eb6fdc605a6a9816379a38103
```

---

### Q4：如何停用某位管理員？

編輯 `src/data/admin-users.json`，將 `enabled` 改為 `false`：

```json
{
  "userId": "U0987654321fedcba",
  "name": "已停用的管理員",
  "enabled": false
}
```

無需重啟，設定會立即生效。

---

## 📚 相關文檔

- 📖 [匯款確認完整說明](./REMITTANCE_CONFIRMATION.md)
- 👥 [多管理員使用指南](./MULTI_ADMIN_GUIDE.md)
- 🚀 [快速部署指南](../deployment/QUICK_DEPLOY.md)

---

## 🎉 設定完成！

您已成功設定匯款確認功能！

**下一步**：
- 🧪 測試完整流程
- 📱 通知團隊成員新功能上線
- 📊 觀察使用情況並調整設定

**需要協助？**
查看日誌：`docker logs flb-attendance-system -f`

---

**建立日期**：2024/11/21  
**最後更新**：2024/11/21
