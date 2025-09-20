# 第三步驟 API 快速參考

## 基礎 URL
```
https://liff-sttendence-0908-production.up.railway.app
```

## 主要 API 端點

### 1. 獲取學生列表
```http
POST /api/course-students
Content-Type: application/json

{
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山",
    "date": "2024-01-15"
}
```

### 2. 學生簽到
```http
POST /api/student-attendance
Content-Type: application/json

{
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山",
    "date": "2024-01-15",
    "studentName": "張小明",
    "status": "present"
}
```

### 3. 講師簽到
```http
POST /api/teacher-report
Content-Type: application/json

{
    "teacher": "Tim",
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山",
    "date": "2024-01-15",
    "courseContent": "基礎動作練習",
    "studentCount": 15,
    "attendanceCount": 12
}
```

### 4. 直接跳轉
```http
POST /api/direct-step3
Content-Type: application/json

{
    "teacher": "Tim",
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山"
}
```

### 5. 直接頁面
```http
GET /step3?teacher=Tim&course=SPM%20南京復興教室&time=日%201330-1500%20松山
```

## 狀態值

| 狀態 | 說明 | 回傳值 |
|------|------|--------|
| present | 出席 | `true` |
| absent | 缺席 | `false` |
| leave | 請假 | `"leave"` |
| 無資料 | 未設定 | `null` |

## JavaScript 快速實作

```javascript
// 獲取學生列表
const students = await fetch('/api/course-students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山',
        date: '2024-01-15'
    })
}).then(r => r.json());

// 學生簽到
await fetch('/api/student-attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山',
        date: '2024-01-15',
        studentName: '張小明',
        status: 'present'
    })
});

// 講師簽到
await fetch('/api/teacher-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        teacher: 'Tim',
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山',
        date: '2024-01-15',
        courseContent: '基礎動作練習',
        studentCount: 15,
        attendanceCount: 12
    })
});
```

## 錯誤處理

```javascript
try {
    const response = await fetch('/api/course-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('成功:', result);
} catch (error) {
    console.error('錯誤:', error);
}
```
