# 第三步驟直接訪問 API 說明文件

## 概述

這個 API 端點允許您直接跳轉到簽到系統的第三步驟（學生簽到頁面），無需經過步驟一和步驟二的選擇過程。這對於整合到其他系統或創建快速訪問連結非常有用。

## API 端點

**URL：** `https://liff-sttendence-0908-production.up.railway.app/step3`

**方法：** `GET`

**用途：** 直接返回第三步驟的完整 HTML 頁面，包含學生簽到和講師簽到功能

## 請求參數

### 必要參數

| 參數名 | 類型 | 說明 | 範例 |
|--------|------|------|------|
| `teacher` | string | 講師姓名 | `Tim` |
| `course` | string | 課程名稱 | `SPM` |
| `time` | string | 課程時間 | `日 1330-1500 松山` |

### URL 編碼注意事項

- 時間參數中的空格和特殊字符需要進行 URL 編碼
- 範例：`日 1330-1500 松山` 編碼後為 `%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1`

## 請求範例

### 基本請求

```http
GET https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1
```

### JavaScript 範例

```javascript
// 構建 URL
const teacher = 'Tim';
const course = 'SPM';
const time = '日 1330-1500 松山';

const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent(teacher)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`;

// 在新視窗中打開
window.open(url, '_blank');

// 或在當前視窗中跳轉
window.location.href = url;
```

### Python 範例

```python
import urllib.parse
import webbrowser

teacher = 'Tim'
course = 'SPM'
time = '日 1330-1500 松山'

# 編碼參數
params = {
    'teacher': teacher,
    'course': course,
    'time': time
}

# 構建 URL
base_url = 'https://liff-sttendence-0908-production.up.railway.app/step3'
query_string = urllib.parse.urlencode(params)
url = f"{base_url}?{query_string}"

print(f"生成的 URL: {url}")

# 在瀏覽器中打開
webbrowser.open(url)
```

### cURL 範例

```bash
curl "https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1"
```

## 回應格式

### 成功回應

**狀態碼：** `200 OK`

**內容類型：** `text/html`

**回應內容：** 完整的 HTML 頁面，包含：

1. **頁面標題：** 顯示課程名稱
2. **課程資訊：** 講師、課程、時間
3. **學生簽到區域：** 
   - 學生列表（顯示當前簽到狀態）
   - 每個學生都有「出席」和「缺席」按鈕
4. **講師簽到區域：**
   - 課程內容輸入框
   - 學生人數輸入框
   - 講師簽到按鈕

### 錯誤回應

#### 400 Bad Request - 缺少必要參數

```html
<!DOCTYPE html>
<html>
<head>
    <title>參數錯誤</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="error">
        <h2>❌ 缺少必要參數</h2>
        <p>請提供 teacher、course 和 time 參數</p>
        <p>範例：/step3?teacher=Tim&course=數學課&time=09:00-10:00</p>
    </div>
</body>
</html>
```

#### 400 Bad Request - 講師不存在

```html
<!DOCTYPE html>
<html>
<head>
    <title>講師不存在</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="error">
        <h2>❌ 講師 "Tim" 不存在</h2>
        <p>可用的講師：Tim, John, Mary</p>
    </div>
</body>
</html>
```

#### 400 Bad Request - 課程不存在

```html
<!DOCTYPE html>
<html>
<head>
    <title>課程不存在</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="error">
        <h2>❌ 課程 "SPM" 在時間 "日 1330-1500 松山" 不存在</h2>
    </div>
</body>
</html>
```

#### 500 Internal Server Error

```html
<!DOCTYPE html>
<html>
<head>
    <title>伺服器錯誤</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="error">
        <h2>❌ 伺服器內部錯誤</h2>
        <p>請稍後再試</p>
    </div>
</body>
</html>
```

## 頁面功能

### 學生簽到功能

1. **學生狀態顯示：**
   - ✅ 已簽到且出席
   - ❌ 已簽到但缺席
   - 🏠 請假
   - ⚠️ 未簽到

2. **簽到按鈕：**
   - 出席按鈕：標記學生為出席
   - 缺席按鈕：標記學生為缺席

3. **即時更新：** 點擊按鈕後狀態會立即更新

### 講師簽到功能

1. **課程內容輸入：** 記錄課程內容
2. **學生人數輸入：** 記錄實際出席人數
3. **講師簽到按鈕：** 提交講師簽到報告

## 整合到其他系統

### 1. 嵌入 iframe

```html
<iframe 
    src="https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1"
    width="100%" 
    height="600px"
    frameborder="0">
</iframe>
```

### 2. 彈出視窗

```javascript
function openAttendanceWindow(teacher, course, time) {
    const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent(teacher)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`;
    
    const popup = window.open(url, 'attendance', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    // 監聽視窗關閉
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            console.log('簽到視窗已關閉');
            // 可以在這裡執行回調函數
        }
    }, 1000);
}
```

### 3. 重定向

```javascript
function redirectToAttendance(teacher, course, time) {
    const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent(teacher)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`;
    window.location.href = url;
}
```

### 4. 動態載入

```javascript
async function loadAttendancePage(teacher, course, time) {
    try {
        const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent(teacher)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`;
        
        const response = await fetch(url);
        const html = await response.text();
        
        // 將 HTML 插入到指定容器中
        document.getElementById('attendance-container').innerHTML = html;
        
        // 重新執行頁面中的 JavaScript
        const scripts = document.getElementById('attendance-container').querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
        });
    } catch (error) {
        console.error('載入簽到頁面失敗:', error);
    }
}
```

## 驗證和錯誤處理

### 參數驗證

API 會自動驗證以下內容：

1. **必要參數檢查：** 確保 `teacher`、`course`、`time` 都存在
2. **講師存在性：** 檢查講師是否在系統中註冊
3. **課程存在性：** 檢查課程和時間組合是否有效
4. **模糊匹配：** 講師名稱支援模糊匹配（忽略空格、大小寫）

### 錯誤處理建議

```javascript
async function safeLoadAttendance(teacher, course, time) {
    try {
        const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent(teacher)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // 檢查是否為錯誤頁面
        if (html.includes('❌')) {
            throw new Error('API 返回錯誤頁面');
        }
        
        return html;
    } catch (error) {
        console.error('載入簽到頁面失敗:', error);
        
        // 顯示用戶友好的錯誤訊息
        alert('無法載入簽到頁面，請檢查參數是否正確');
        
        return null;
    }
}
```

## 安全注意事項

1. **參數驗證：** 所有參數都會在伺服器端進行驗證
2. **XSS 防護：** 所有用戶輸入都會進行適當的轉義
3. **CORS 支援：** API 支援跨域請求
4. **超時設定：** 內部 API 調用有 30 秒超時限制

## 效能考量

1. **快取：** 建議在客戶端實作適當的快取機制
2. **載入時間：** 頁面載入時間約 2-5 秒（取決於學生數量）
3. **並發限制：** 建議限制同時請求數量

## 測試方法

### 1. 瀏覽器測試

直接在瀏覽器中訪問 URL：
```
https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1
```

### 2. 程式化測試

```javascript
// 測試函數
async function testStep3API() {
    const testCases = [
        { teacher: 'Tim', course: 'SPM', time: '日 1330-1500 松山' },
        { teacher: 'John', course: '數學', time: '一 0900-1000 台北' },
        // 添加更多測試案例
    ];
    
    for (const testCase of testCases) {
        try {
            const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent(testCase.teacher)}&course=${encodeURIComponent(testCase.course)}&time=${encodeURIComponent(testCase.time)}`;
            
            const response = await fetch(url);
            console.log(`測試 ${testCase.teacher}: ${response.status} ${response.ok ? '成功' : '失敗'}`);
        } catch (error) {
            console.error(`測試 ${testCase.teacher} 失敗:`, error);
        }
    }
}

// 執行測試
testStep3API();
```

## 常見問題

### Q: 為什麼需要使用 URL 編碼？

A: 時間參數包含中文字符和空格，必須進行 URL 編碼才能正確傳遞。

### Q: 如何獲取可用的講師和課程列表？

A: 可以使用其他 API 端點：
- 獲取講師列表：`POST /api/teachers`
- 獲取講師課程：`POST /api/courses`

### Q: 頁面載入很慢怎麼辦？

A: 這是正常現象，因為需要從 Google Sheets 獲取學生資料。建議顯示載入指示器。

### Q: 可以自定義頁面樣式嗎？

A: 目前不支援自定義樣式，但可以通過 CSS 覆蓋來修改外觀。

## 聯絡資訊

如有任何問題或需要協助，請聯絡開發團隊。

---

**最後更新：** 2024年1月
**版本：** 1.0.0
