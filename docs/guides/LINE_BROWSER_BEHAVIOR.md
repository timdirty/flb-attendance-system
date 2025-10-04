# LINE 瀏覽器開啟行為說明

## 📱 問題說明

當用戶點擊 Flex Message 中的「開啟課程規劃」按鈕時，可能會在**外部瀏覽器**而非 **LINE 內建瀏覽器**開啟。

---

## 🔍 LINE URI Action 的平台差異

### 移動版 LINE (iOS/Android)
- ✅ **預設行為**：在 LINE 內建瀏覽器開啟
- ✅ **條件**：URI action 未設定 `altUri`
- ⚠️ **例外**：某些系統設定或 LINE 版本可能影響

### 桌面版 LINE (Windows/Mac)
- ⚠️ **預設行為**：在系統預設瀏覽器開啟
- ❌ **無法強制使用內建瀏覽器**（LINE 桌面版限制）
- 📝 **官方行為**：這是 LINE 桌面版的設計

---

## 🛠️ 目前的實作

### 程式碼
```javascript
action: {
    type: 'uri',
    label: '📘 開啟課程規劃',
    uri: fullUrl  // 純 URL，無額外參數
}
```

### 為什麼移除了參數？
- ❌ `openExternalBrowser=0` 不是 LINE 官方標準
- ❌ 可能被忽略或導致非預期行為
- ✅ 使用純 URL 是最標準的做法

---

## 💡 解決方案

### 方案 1：接受平台差異（目前實作）
**適用情況**：大多數用戶使用移動版 LINE

**優點**：
- ✅ 無需額外設定
- ✅ 移動版用戶體驗良好
- ✅ 實作簡單

**缺點**：
- ⚠️ 桌面版用戶會跳到外部瀏覽器

---

### 方案 2：使用 LIFF (LINE Front-end Framework)
**適用情況**：需要在所有平台都在 LINE 內開啟

**實作步驟**：

#### 1. 註冊 LIFF App
前往 [LINE Developers Console](https://developers.line.biz/console/)：
1. 選擇您的 Provider
2. 選擇您的 Channel
3. 進入「LIFF」分頁
4. 點擊「Add」新增 LIFF app
5. 設定：
   - **LIFF app name**：課程規劃查看器
   - **Size**：Full
   - **Endpoint URL**：`https://course-viewer.funlearnbar.synology.me/viewer.html`
   - **Scope**：`profile`, `openid`
6. 取得 **LIFF ID**（格式：`1234567890-abcdefgh`）

#### 2. 修改目標網頁
在 `course-viewer` 的 `viewer.html` 中加入：

```html
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
<script>
  // 初始化 LIFF
  liff.init({ liffId: 'YOUR_LIFF_ID' })
    .then(() => {
      console.log('LIFF initialized');
      // 獲取 URL 參數
      const params = new URLSearchParams(window.location.search);
      const file = params.get('file');
      // 載入課程資料...
    })
    .catch((err) => {
      console.error('LIFF initialization failed', err);
    });
</script>
```

#### 3. 修改 server.js
```javascript
// 在 server.js 最上方定義 LIFF ID
const LIFF_ID = 'YOUR_LIFF_ID';  // 從 LINE Developers 取得

// 在 createCoursePlanBubble 函數中
if (fullUrl) {
    // 提取 URL 參數
    const urlObj = new URL(fullUrl);
    const params = urlObj.searchParams.toString();
    
    // 使用 LIFF URL
    const liffUrl = `https://liff.line.me/${LIFF_ID}?${params}`;
    
    bubble.footer = {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
            {
                type: 'button',
                style: 'primary',
                color: colors.gold,
                action: {
                    type: 'uri',
                    label: '📘 開啟課程規劃',
                    uri: liffUrl  // 使用 LIFF URL
                }
            }
        ]
    };
}
```

**優點**：
- ✅ 所有平台都在 LINE 內開啟
- ✅ 可以使用 LIFF SDK 功能
- ✅ 更好的用戶體驗

**缺點**：
- ⚠️ 需要修改目標網頁
- ⚠️ 需要 LINE Developers 權限
- ⚠️ 實作較複雜

---

### 方案 3：顯示提示訊息
**適用情況**：暫時性解決方案

在 Flex Message 中加入說明：

```javascript
bodyContents.push({
    type: 'text',
    text: '💡 小提示：移動版 LINE 會在內建瀏覽器開啟，桌面版會開啟系統瀏覽器',
    size: 'xxs',
    color: colors.textSecondary,
    wrap: true,
    margin: 'md'
});
```

---

## 📊 建議

### 對於大多數場景（目前）
✅ **使用方案 1**（目前實作）
- 大多數用戶使用移動版 LINE
- 實作簡單，維護容易
- 桌面版用戶體驗雖稍差但功能正常

### 對於追求完美體驗
🚀 **升級到方案 2（LIFF）**
- 需要額外開發工作
- 提供最佳用戶體驗
- 建議未來考慮實作

---

## ❓ 常見問題

### Q: 為什麼移動版和桌面版行為不同？
A: 這是 LINE 官方的設計決定。桌面版 LINE 沒有內建瀏覽器功能。

### Q: 可以偵測用戶使用的平台嗎？
A: 無法在 Flex Message 中偵測。但可以在 LIFF 中使用 `liff.getOS()` 偵測。

### Q: `altUri` 是什麼？
A: `altUri` 是桌面版 LINE 會使用的替代 URL。但我們不使用它，因為：
- 會強制桌面版開啟外部瀏覽器
- 不符合我們的需求

### Q: 有沒有不用 LIFF 的方法？
A: 沒有。要在桌面版 LINE 內開啟，只能使用 LIFF。

---

## 🔗 參考資料

- [LINE Messaging API - URI Action](https://developers.line.biz/en/docs/messaging-api/actions/#uri-action)
- [LIFF Documentation](https://developers.line.biz/en/docs/liff/overview/)
- [LIFF Starter App](https://github.com/line/line-liff-v2-starter)

---

## 📝 結論

目前的實作已經是**不使用 LIFF 的最佳做法**。如果需要在所有平台都在 LINE 內開啟，建議未來考慮實作 LIFF。

