# 第三步驟 API 完整說明文件

## 概述

第三步驟是學生簽到和講師簽到的核心功能，包含多個 API 端點來處理不同的操作。本文檔詳細說明所有相關的 API 調用方式、參數格式和回傳資料。

**基礎 URL：** `https://liff-sttendence-0908-production.up.railway.app`

## 主要 API 端點

### 1. 獲取課程學生列表

**端點：** `POST /api/course-students`

**用途：** 獲取指定課程的學生名單和簽到狀態

**請求參數：**
```json
{
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山",
    "date": "2024-01-15"
}
```

**請求範例：**
```javascript
const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/course-students', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山',
        date: '2024-01-15'
    })
});

const data = await response.json();
```

**回傳格式：**
```json
{
    "success": true,
    "students": [
        {
            "name": "張小明",
            "hasAttendanceToday": true,
            "attendanceTime": "2024-01-15 13:35:00",
            "status": "present"
        },
        {
            "name": "李小花",
            "hasAttendanceToday": "leave",
            "attendanceTime": null,
            "status": "leave"
        },
        {
            "name": "王大華",
            "hasAttendanceToday": false,
            "attendanceTime": null,
            "status": "absent"
        }
    ]
}
```

**狀態說明：**
- `hasAttendanceToday: true` - 已簽到
- `hasAttendanceToday: false` - 未簽到
- `hasAttendanceToday: "leave"` - 請假
- `hasAttendanceToday: null` - 無資料

### 2. 學生簽到

**端點：** `POST /api/student-attendance`

**用途：** 標記學生簽到狀態

**請求參數：**
```json
{
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山",
    "date": "2024-01-15",
    "studentName": "張小明",
    "status": "present"
}
```

**狀態值：**
- `"present"` - 出席
- `"absent"` - 缺席
- `"leave"` - 請假

**請求範例：**
```javascript
const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/student-attendance', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山',
        date: '2024-01-15',
        studentName: '張小明',
        status: 'present'
    })
});

const data = await response.json();
```

**回傳格式：**
```json
{
    "success": true,
    "message": "學生簽到狀態已更新",
    "studentName": "張小明",
    "status": "present",
    "timestamp": "2024-01-15 13:35:00"
}
```

### 3. 講師簽到

**端點：** `POST /api/teacher-report`

**用途：** 提交講師簽到報告

**請求參數：**
```json
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

**請求範例：**
```javascript
const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/teacher-report', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
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

const data = await response.json();
```

**回傳格式：**
```json
{
    "success": true,
    "message": "講師簽到報告已提交",
    "reportId": "RPT_20240115_001",
    "timestamp": "2024-01-15 13:40:00"
}
```

### 4. 直接跳轉到第三步驟

**端點：** `POST /api/direct-step3`

**用途：** 驗證講師、課程和時間，並獲取重定向 URL

**請求參數：**
```json
{
    "teacher": "Tim",
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山"
}
```

**請求範例：**
```javascript
const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/direct-step3', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        teacher: 'Tim',
        course: 'SPM 南京復興教室',
        time: '日 1330-1500 松山'
    })
});

const data = await response.json();
```

**回傳格式：**
```json
{
    "success": true,
    "message": "驗證成功，可以跳轉到第三步驟",
    "redirectUrl": "https://liff-sttendence-0908-production.up.railway.app/?step=3&teacher=Tim&course=SPM%20南京復興教室&time=日%201330-1500%20松山"
}
```

### 5. 直接渲染第三步驟頁面

**端點：** `GET /step3`

**用途：** 直接獲取完整的第三步驟 HTML 頁面

**請求參數：**
```
GET /step3?teacher=Tim&course=SPM%20南京復興教室&time=日%201330-1500%20松山
```

**請求範例：**
```javascript
const url = new URL('https://liff-sttendence-0908-production.up.railway.app/step3');
url.searchParams.append('teacher', 'Tim');
url.searchParams.append('course', 'SPM 南京復興教室');
url.searchParams.append('time', '日 1330-1500 松山');

const response = await fetch(url);
const html = await response.text();
```

**回傳格式：**
完整的 HTML 頁面，包含：
- 課程資訊顯示
- 學生名單和簽到按鈕
- 講師簽到表單
- 所有必要的 JavaScript 功能

## 錯誤處理

### 常見錯誤回應

**400 Bad Request：**
```json
{
    "success": false,
    "error": "缺少必要參數",
    "details": "course 參數是必需的"
}
```

**404 Not Found：**
```json
{
    "success": false,
    "error": "講師不存在",
    "details": "找不到講師 'Tim'"
}
```

**500 Internal Server Error：**
```json
{
    "success": false,
    "error": "伺服器內部錯誤",
    "details": "無法連接到 FLB API"
}
```

## 實作範例

### JavaScript 完整實作

```javascript
class FLBStep3API {
    constructor(baseURL = 'https://liff-sttendence-0908-production.up.railway.app') {
        this.baseURL = baseURL;
    }

    // 獲取學生列表
    async getStudents(course, time, date) {
        try {
            const response = await fetch(`${this.baseURL}/api/course-students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ course, time, date })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('獲取學生列表失敗:', error);
            throw error;
        }
    }

    // 學生簽到
    async markAttendance(course, time, date, studentName, status) {
        try {
            const response = await fetch(`${this.baseURL}/api/student-attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course, time, date, studentName, status
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('學生簽到失敗:', error);
            throw error;
        }
    }

    // 講師簽到
    async submitTeacherReport(teacher, course, time, date, courseContent, studentCount, attendanceCount) {
        try {
            const response = await fetch(`${this.baseURL}/api/teacher-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teacher, course, time, date, courseContent, studentCount, attendanceCount
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('講師簽到失敗:', error);
            throw error;
        }
    }

    // 直接跳轉到第三步驟
    async directStep3(teacher, course, time) {
        try {
            const response = await fetch(`${this.baseURL}/api/direct-step3`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teacher, course, time })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('直接跳轉失敗:', error);
            throw error;
        }
    }

    // 獲取第三步驟頁面
    async getStep3Page(teacher, course, time) {
        try {
            const url = new URL(`${this.baseURL}/step3`);
            url.searchParams.append('teacher', teacher);
            url.searchParams.append('course', course);
            url.searchParams.append('time', time);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('獲取第三步驟頁面失敗:', error);
            throw error;
        }
    }
}

// 使用範例
const api = new FLBStep3API();

// 獲取學生列表
const students = await api.getStudents('SPM 南京復興教室', '日 1330-1500 松山', '2024-01-15');

// 學生簽到
await api.markAttendance('SPM 南京復興教室', '日 1330-1500 松山', '2024-01-15', '張小明', 'present');

// 講師簽到
await api.submitTeacherReport('Tim', 'SPM 南京復興教室', '日 1330-1500 松山', '2024-01-15', '基礎動作練習', 15, 12);
```

### Python 實作範例

```python
import requests
import json
from datetime import datetime

class FLBStep3API:
    def __init__(self, base_url='https://liff-sttendence-0908-production.up.railway.app'):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })

    def get_students(self, course, time, date):
        """獲取學生列表"""
        url = f"{self.base_url}/api/course-students"
        data = {
            'course': course,
            'time': time,
            'date': date
        }
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def mark_attendance(self, course, time, date, student_name, status):
        """學生簽到"""
        url = f"{self.base_url}/api/student-attendance"
        data = {
            'course': course,
            'time': time,
            'date': date,
            'studentName': student_name,
            'status': status
        }
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def submit_teacher_report(self, teacher, course, time, date, course_content, student_count, attendance_count):
        """講師簽到"""
        url = f"{self.base_url}/api/teacher-report"
        data = {
            'teacher': teacher,
            'course': course,
            'time': time,
            'date': date,
            'courseContent': course_content,
            'studentCount': student_count,
            'attendanceCount': attendance_count
        }
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def direct_step3(self, teacher, course, time):
        """直接跳轉到第三步驟"""
        url = f"{self.base_url}/api/direct-step3"
        data = {
            'teacher': teacher,
            'course': course,
            'time': time
        }
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def get_step3_page(self, teacher, course, time):
        """獲取第三步驟頁面"""
        url = f"{self.base_url}/step3"
        params = {
            'teacher': teacher,
            'course': course,
            'time': time
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.text

# 使用範例
api = FLBStep3API()

# 獲取學生列表
students = api.get_students('SPM 南京復興教室', '日 1330-1500 松山', '2024-01-15')

# 學生簽到
result = api.mark_attendance('SPM 南京復興教室', '日 1330-1500 松山', '2024-01-15', '張小明', 'present')

# 講師簽到
report = api.submit_teacher_report('Tim', 'SPM 南京復興教室', '日 1330-1500 松山', '2024-01-15', '基礎動作練習', 15, 12)
```

## 注意事項

1. **日期格式：** 使用 `YYYY-MM-DD` 格式
2. **時間格式：** 使用 `日 1330-1500 松山` 格式
3. **編碼：** URL 參數需要進行 URL 編碼
4. **錯誤處理：** 建議實作完整的錯誤處理機制
5. **重試機制：** 網路請求失敗時建議實作重試機制
6. **日誌記錄：** 建議記錄所有 API 調用和回應

## 測試工具

您可以使用以下工具測試 API：

1. **API 測試頁面：** `https://liff-sttendence-0908-production.up.railway.app/api-test.html`
2. **Postman 集合：** 可以匯入本文檔中的範例進行測試
3. **curl 命令：** 使用本文檔中的 curl 範例進行測試

## 聯絡資訊

如有任何問題，請聯絡開發團隊或查看完整的 API 文檔。
