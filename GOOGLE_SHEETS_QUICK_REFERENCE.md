# Google Sheets API 快速參考

## 主要 API 端點

### 1. 學生簽到狀態 API
```
https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec
```

### 2. 主要 FLB API
```
https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec
```

## 第三步驟相關的 API 調用

### 1. 獲取學生簽到狀態

**端點：** 學生簽到狀態 API
**Action：** `getRosterAttendance`

```javascript
const response = await axios.post('https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec', {
    action: 'getRosterAttendance',
    course: 'SPM',
    period: '日 1330-1500 松山'
}, {
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Cookie': 'NID=525=nsWVvbAon67C2qpyiEHQA3SUio_GqBd7RqUFU6BwB97_4LHggZxLpDgSheJ7WN4w3Z4dCQBiFPG9YKAqZgAokFYCuuQw04dkm-FX9-XHAIBIqJf1645n3RZrg86GcUVJOf3gN-5eTHXFIaovTmgRC6cXllv82SnQuKsGMq7CHH60XDSwyC99s9P2gmyXLppI'
    }
});
```

### 2. 記錄學生簽到

**端點：** 主要 FLB API
**Action：** `markAttendance`

```javascript
const response = await axios.post('https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec', {
    action: 'markAttendance',
    studentName: '張小明',
    date: '2024-01-15',
    present: true,
    teacherName: 'Tim',
    courseName: 'SPM'
});
```

### 3. 提交講師簽到報告

**端點：** 講師專屬 Web API
**Action：** `submitTeacherReport`

```javascript
const response = await axios.post(teacherWebApi, {
    action: 'submitTeacherReport',
    teacherName: 'Tim',
    courseName: 'SPM',
    courseTime: '日 1330-1500 松山',
    date: '2024-01-15',
    studentCount: 15,
    courseContent: '基礎動作練習',
    assistantCount: 12
});
```

## 狀態值

| 狀態 | 值 | 說明 |
|------|----|----|
| 出席 | `true` | 學生已簽到 |
| 缺席 | `false` | 學生未簽到 |
| 請假 | `"leave"` | 學生請假 |

## 重要參數

- **course**: 課程名稱 (例如: "SPM")
- **period**: 課程時間 (例如: "日 1330-1500 松山")
- **date**: 日期格式 (YYYY-MM-DD)
- **present**: 出席狀態 (true/false/"leave")

## 注意事項

1. **Cookie 認證**：學生簽到狀態 API 需要特定 Cookie
2. **超時設定**：建議設定 30 秒超時
3. **錯誤處理**：所有 API 調用都應該包含錯誤處理
4. **日期格式**：使用 YYYY-MM-DD 格式
5. **時間格式**：使用 "日 1330-1500 松山" 格式
