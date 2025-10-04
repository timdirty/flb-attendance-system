# FLB 簽到系統 API 文檔

## 概述

FLB 簽到系統提供完整的 RESTful API，支援講師和學生簽到功能，可與其他平台整合。

**基礎 URL：** `https://liff-sttendence-0908-production.up.railway.app`

**重要提醒：** 請確保使用正確的 API 端點。常見錯誤：
- ❌ 錯誤：`/api/attendance/course-students`
- ✅ 正確：`/api/course-students`

## 認證

目前 API 不需要認證，但建議在生產環境中添加適當的認證機制。

## API 端點

### 1. 獲取講師列表

**端點：** `GET /api/teachers`

**描述：** 獲取所有可用的講師列表

**回應：**
```json
{
  "success": true,
  "teachers": [
    {
      "name": "Tim",
      "userId": "Udb51363eb6fdc605a6a9816379a38103",
      "webApi": "https://script.google.com/...",
      "reportApi": "https://script.google.com/..."
    }
  ]
}
```

### 2. 獲取講師課程

**端點：** `POST /api/courses`

**描述：** 根據講師名稱獲取課程列表

**請求體：**
```json
{
  "teacher": "Tim"
}
```

**回應：**
```json
{
  "success": true,
  "courseTimes": [
    {
      "course": "SPM 南京復興教室",
      "time": "日 1330-1500 松山"
    }
  ]
}
```

### 3. 獲取課程學生

**端點：** `POST /api/course-students`

**描述：** 獲取特定課程的學生名單和簽到狀態

**請求體：**
```json
{
  "course": "SPM 南京復興教室",
  "time": "日 1330-1500 松山",
  "date": "2024-01-15"
}
```

**回應：**
```json
{
  "success": true,
  "students": [
    {
      "name": "張小明",
      "hasAttendanceToday": true,
      "attendanceRecords": [...],
      "todayAttendanceRecord": {...}
    }
  ]
}
```

### 4. 學生簽到

**端點：** `POST /api/student-attendance`

**描述：** 標記學生出席或缺席

**請求體：**
```json
{
  "studentName": "張小明",
  "date": "2024-01-15",
  "present": true,
  "teacherName": "Tim",
  "courseName": "SPM 南京復興教室"
}
```

**回應：**
```json
{
  "success": true,
  "message": "學生簽到成功"
}
```

### 5. 講師簽到

**端點：** `POST /api/teacher-report`

**描述：** 講師課程簽到和報表提交

**請求體：**
```json
{
  "teacherName": "Tim",
  "courseName": "SPM 南京復興教室",
  "courseTime": "日 1330-1500 松山",
  "date": "2024/01/15",
  "studentCount": 5,
  "courseContent": "數學課程內容",
  "webApi": ""
}
```

**回應：**
```json
{
  "success": true,
  "message": "講師簽到成功"
}
```

### 6. 直接跳轉到步驟三

**端點：** `POST /api/direct-step3`

**描述：** 驗證參數並獲取跳轉 URL

**請求體：**
```json
{
  "teacher": "Tim",
  "course": "SPM 南京復興教室",
  "time": "日 1330-1500 松山"
}
```

**回應：**
```json
{
  "success": true,
  "message": "成功獲取跳轉資料",
  "data": {
    "teacher": "Tim",
    "course": "SPM 南京復興教室",
    "time": "日 1330-1500 松山",
    "students": [...],
    "redirectUrl": "/?step=3&teacher=Tim&course=SPM%20南京復興教室&time=日%201330-1500%20松山"
  }
}
```

### 7. 直接步驟三頁面

**端點：** `GET /step3`

**描述：** 直接返回完整的步驟三頁面

**查詢參數：**
- `teacher`: 講師名稱
- `course`: 課程名稱
- `time`: 課程時間

**範例：**
```
GET /step3?teacher=Tim&course=SPM 南京復興教室&time=日 1330-1500 松山
```

**回應：** 完整的 HTML 頁面

## 錯誤處理

所有 API 都遵循統一的錯誤格式：

```json
{
  "success": false,
  "error": "錯誤訊息"
}
```

**常見錯誤碼：**
- `400`: 請求參數錯誤
- `404`: 資源不存在
- `500`: 伺服器內部錯誤

## 整合範例

### JavaScript (前端)

```javascript
// 獲取講師列表
async function getTeachers() {
  const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/teachers');
  const data = await response.json();
  return data.teachers;
}

// 學生簽到
async function markStudentAttendance(studentName, present, teacherName, courseName) {
  const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/student-attendance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      studentName: studentName,
      date: new Date().toISOString().split('T')[0],
      present: present,
      teacherName: teacherName,
      courseName: courseName
    })
  });
  return await response.json();
}

// 講師簽到
async function teacherCheckin(teacherName, courseName, courseTime, studentCount, courseContent) {
  const today = new Date();
  const formattedDate = today.getFullYear() + '/' + 
    String(today.getMonth() + 1).padStart(2, '0') + '/' + 
    String(today.getDate()).padStart(2, '0');
    
  const response = await fetch('https://liff-sttendence-0908-production.up.railway.app/api/teacher-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      teacherName: teacherName,
      courseName: courseName,
      courseTime: courseTime,
      date: formattedDate,
      studentCount: studentCount,
      courseContent: courseContent,
      webApi: ''
    })
  });
  return await response.json();
}
```

### Python

```python
import requests
import json
from datetime import datetime

class FLBAttendanceAPI:
    def __init__(self, base_url="https://liff-sttendence-0908-production.up.railway.app"):
        self.base_url = base_url
    
    def get_teachers(self):
        """獲取講師列表"""
        response = requests.get(f"{self.base_url}/api/teachers")
        return response.json()
    
    def get_courses(self, teacher):
        """獲取講師課程"""
        response = requests.post(f"{self.base_url}/api/courses", 
                               json={"teacher": teacher})
        return response.json()
    
    def get_students(self, course, time, date=None):
        """獲取課程學生"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.post(f"{self.base_url}/api/course-students",
                               json={
                                   "course": course,
                                   "time": time,
                                   "date": date
                               })
        return response.json()
    
    def mark_student_attendance(self, student_name, present, teacher_name, course_name):
        """學生簽到"""
        response = requests.post(f"{self.base_url}/api/student-attendance",
                               json={
                                   "studentName": student_name,
                                   "date": datetime.now().strftime("%Y-%m-%d"),
                                   "present": present,
                                   "teacherName": teacher_name,
                                   "courseName": course_name
                               })
        return response.json()
    
    def teacher_checkin(self, teacher_name, course_name, course_time, 
                       student_count, course_content):
        """講師簽到"""
        formatted_date = datetime.now().strftime("%Y/%m/%d")
        
        response = requests.post(f"{self.base_url}/api/teacher-report",
                               json={
                                   "teacherName": teacher_name,
                                   "courseName": course_name,
                                   "courseTime": course_time,
                                   "date": formatted_date,
                                   "studentCount": student_count,
                                   "courseContent": course_content,
                                   "webApi": ""
                               })
        return response.json()
    
    def get_direct_step3_url(self, teacher, course, time):
        """獲取直接跳轉 URL"""
        response = requests.post(f"{self.base_url}/api/direct-step3",
                               json={
                                   "teacher": teacher,
                                   "course": course,
                                   "time": time
                               })
        return response.json()

# 使用範例
api = FLBAttendanceAPI()

# 獲取講師列表
teachers = api.get_teachers()
print("講師列表:", teachers)

# 學生簽到
result = api.mark_student_attendance("張小明", True, "Tim", "SPM 南京復興教室")
print("簽到結果:", result)
```

### Node.js

```javascript
const axios = require('axios');

class FLBAttendanceAPI {
    constructor(baseURL = 'https://liff-sttendence-0908-production.up.railway.app') {
        this.baseURL = baseURL;
    }
    
    async getTeachers() {
        const response = await axios.get(`${this.baseURL}/api/teachers`);
        return response.data;
    }
    
    async getCourses(teacher) {
        const response = await axios.post(`${this.baseURL}/api/courses`, {
            teacher: teacher
        });
        return response.data;
    }
    
    async getStudents(course, time, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }
        
        const response = await axios.post(`${this.baseURL}/api/course-students`, {
            course: course,
            time: time,
            date: date
        });
        return response.data;
    }
    
    async markStudentAttendance(studentName, present, teacherName, courseName) {
        const response = await axios.post(`${this.baseURL}/api/student-attendance`, {
            studentName: studentName,
            date: new Date().toISOString().split('T')[0],
            present: present,
            teacherName: teacherName,
            courseName: courseName
        });
        return response.data;
    }
    
    async teacherCheckin(teacherName, courseName, courseTime, studentCount, courseContent) {
        const today = new Date();
        const formattedDate = today.getFullYear() + '/' + 
            String(today.getMonth() + 1).padStart(2, '0') + '/' + 
            String(today.getDate()).padStart(2, '0');
        
        const response = await axios.post(`${this.baseURL}/api/teacher-report`, {
            teacherName: teacherName,
            courseName: courseName,
            courseTime: courseTime,
            date: formattedDate,
            studentCount: studentCount,
            courseContent: courseContent,
            webApi: ''
        });
        return response.data;
    }
}

module.exports = FLBAttendanceAPI;
```

### PHP

```php
<?php
class FLBAttendanceAPI {
    private $baseURL;
    
    public function __construct($baseURL = 'https://liff-sttendence-0908-production.up.railway.app') {
        $this->baseURL = $baseURL;
    }
    
    public function getTeachers() {
        $response = file_get_contents($this->baseURL . '/api/teachers');
        return json_decode($response, true);
    }
    
    public function getCourses($teacher) {
        $data = json_encode(['teacher' => $teacher]);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => $data
            ]
        ]);
        $response = file_get_contents($this->baseURL . '/api/courses', false, $context);
        return json_decode($response, true);
    }
    
    public function markStudentAttendance($studentName, $present, $teacherName, $courseName) {
        $data = json_encode([
            'studentName' => $studentName,
            'date' => date('Y-m-d'),
            'present' => $present,
            'teacherName' => $teacherName,
            'courseName' => $courseName
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => $data
            ]
        ]);
        $response = file_get_contents($this->baseURL . '/api/student-attendance', false, $context);
        return json_decode($response, true);
    }
}

// 使用範例
$api = new FLBAttendanceAPI();
$teachers = $api->getTeachers();
echo "講師列表: " . json_encode($teachers);
?>
```

## 整合建議

### 1. 認證機制
建議在生產環境中添加 API 金鑰或 JWT 認證：

```javascript
// 添加認證 header
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

### 2. 錯誤處理
所有 API 調用都應該包含適當的錯誤處理：

```javascript
try {
  const result = await api.markStudentAttendance(studentName, present, teacherName, courseName);
  if (result.success) {
    console.log('簽到成功');
  } else {
    console.error('簽到失敗:', result.error);
  }
} catch (error) {
  console.error('API 調用失敗:', error);
}
```

### 3. 快取策略
對於講師列表和課程列表等相對穩定的數據，建議實施快取：

```javascript
// 簡單的記憶體快取
const cache = new Map();

async function getCachedTeachers() {
  if (cache.has('teachers')) {
    return cache.get('teachers');
  }
  
  const teachers = await api.getTeachers();
  cache.set('teachers', teachers);
  return teachers;
}
```

### 4. 重試機制
對於網路請求，建議實施重試機制：

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 支援

如有任何問題或需要協助，請聯繫開發團隊。
