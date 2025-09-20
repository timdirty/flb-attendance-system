# 第三步驟直接訪問 API - 快速參考

## 基本用法

**API 端點：** `https://liff-sttendence-0908-production.up.railway.app/step3`

**方法：** `GET`

## 必要參數

| 參數 | 說明 | 範例 |
|------|------|------|
| `teacher` | 講師姓名 | `Tim` |
| `course` | 課程名稱 | `SPM` |
| `time` | 課程時間 | `日 1330-1500 松山` |

## 快速範例

### 1. 直接連結
```
https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1
```

### 2. JavaScript 跳轉
```javascript
const url = `https://liff-sttendence-0908-production.up.railway.app/step3?teacher=${encodeURIComponent('Tim')}&course=${encodeURIComponent('SPM')}&time=${encodeURIComponent('日 1330-1500 松山')}`;
window.open(url, '_blank');
```

### 3. HTML 連結
```html
<a href="https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1" target="_blank">
    開啟簽到頁面
</a>
```

### 4. iframe 嵌入
```html
<iframe 
    src="https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1"
    width="100%" 
    height="600px">
</iframe>
```

## 錯誤處理

| 狀態碼 | 說明 | 解決方法 |
|--------|------|----------|
| 400 | 缺少參數 | 檢查是否提供所有必要參數 |
| 400 | 講師不存在 | 檢查講師姓名是否正確 |
| 400 | 課程不存在 | 檢查課程和時間組合 |
| 500 | 伺服器錯誤 | 稍後再試 |

## 注意事項

1. **URL 編碼：** 時間參數需要進行 URL 編碼
2. **模糊匹配：** 講師名稱支援模糊匹配
3. **載入時間：** 頁面載入約需 2-5 秒
4. **功能完整：** 包含學生簽到和講師簽到功能

## 測試連結

點擊以下連結測試 API：

[測試連結](https://liff-sttendence-0908-production.up.railway.app/step3?teacher=Tim&course=SPM&time=%E6%97%A5%201330-1500%20%E6%9D%BE%E5%B1%B1)