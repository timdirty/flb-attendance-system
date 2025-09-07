# LINE Messaging API 設定說明

## 設定步驟

### 1. 申請 LINE 官方帳號和 Messaging API

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 使用您的 LINE 帳號登入
3. 點擊「Create」→「Create a new provider」
4. 輸入 Provider 名稱（例如：FLB簽到系統）
5. 點擊「Create」→「Create a new channel」
6. 選擇「Messaging API」
7. 填寫 Channel 資訊：
   - Channel name: FLB簽到系統
   - Channel description: 樂程坊簽到系統通知
   - Category: 教育
   - Subcategory: 其他
8. 同意條款並創建

### 2. 取得必要的憑證

#### 2.1 取得 Channel Access Token
1. 在 Channel 設定頁面，點擊「Messaging API」標籤
2. 找到「Channel access token」區塊
3. 點擊「Issue」生成 Token
4. 複製生成的 Token（格式類似：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

#### 2.2 取得您的 User ID
1. 在 Channel 設定頁面，點擊「Messaging API」標籤
2. 找到「Webhook settings」區塊
3. 點擊「Edit」
4. 啟用「Use webhook」
5. 在「Webhook URL」輸入：`https://your-domain.com/webhook`（暫時隨便填）
6. 儲存設定
7. 在「Messaging API」頁面找到「QR code」或「LINE Official Account」
8. 掃描 QR code 或搜尋官方帳號並加入好友
9. 發送任意訊息給官方帳號
10. 在「Messaging API」頁面的「Webhook」區塊，點擊「Verify」
11. 在「Webhook」設定中，您會看到「Webhook event」的日誌
12. 在日誌中找到您的 User ID（格式類似：`U1234567890abcdef1234567890abcdef1`）

### 3. 設定環境變數

#### 方法一：使用環境變數（推薦）
```bash
export LINE_CHANNEL_ACCESS_TOKEN=您的_Channel_Access_Token
export LINE_USER_ID=您的_User_ID
npm start
```

#### 方法二：修改 server.js
在 `server.js` 第 23-24 行，將預設值替換為您的實際憑證：
```javascript
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '您的實際_Channel_Access_Token';
const LINE_USER_ID = process.env.LINE_USER_ID || '您的實際_User_ID';
```

### 4. 測試功能

設定完成後，您可以測試 LINE Messaging API 功能：

```bash
curl -X POST http://localhost:3000/api/test-line-message \
  -H "Content-Type: application/json" \
  -d '{"message":"測試 LINE Messaging API 功能"}'
```

### 5. 通知內容範例

#### 學生簽到通知
```
📚 學生簽到通知

👨‍🏫 講師：張老師
👨‍🎓 學生：王小明
📅 日期：2025-01-03
📖 課程：數學課
✅ 狀態：出席

⏰ 時間：2025/1/3 下午2:30:45
```

#### 講師報表簽到通知
```
📊 講師報表簽到通知

👨‍🏫 講師：張老師
📖 課程：數學課
⏰ 時間：14:00-15:00
📅 日期：2025-01-03
👥 人數：15
📝 內容：代數運算

⏰ 簽到時間：2025/1/3 下午2:30:45
```

#### 補簽到通知
```
🔄 補簽到通知

👨‍🏫 講師：張老師
👨‍🎓 學生：王小明
📅 日期：2025-01-02
📖 課程：數學課
✅ 狀態：出席

⏰ 補簽時間：2025/1/3 下午2:30:45
```

## 注意事項

- 請妥善保管您的 Channel Access Token 和 User ID
- 如果憑證洩露，請立即到 LINE Developers Console 重新生成
- 通知是即時發送的，不會延遲
- 如果未設定憑證，系統會正常運作，只是不會發送通知
- LINE Messaging API 有發送限制，請參考官方文件

## 優勢

相比 LINE Notify，LINE Messaging API 的優勢：
- ✅ 更穩定的服務
- ✅ 更豐富的訊息格式支援
- ✅ 更好的錯誤處理
- ✅ 官方支援和維護
- ✅ 可以發送更複雜的訊息（圖片、按鈕等）

## 疑難排解

### 常見錯誤

1. **401 Unauthorized**
   - 檢查 Channel Access Token 是否正確
   - 確認 Token 是否已過期

2. **400 Bad Request**
   - 檢查 User ID 是否正確
   - 確認官方帳號是否已加入好友

3. **403 Forbidden**
   - 檢查 Channel 是否已啟用
   - 確認 API 權限設定

### 測試步驟

1. 確認官方帳號已加入好友
2. 測試發送訊息給官方帳號
3. 使用測試端點驗證設定
4. 檢查伺服器日誌確認發送狀態
