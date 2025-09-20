# 第三步驟 Google Sheets API 詳細文檔

## 概述

第三步驟系統使用多個 Google Apps Script 部署的 Web App 來與 Google Sheets 進行互動。本文檔詳細說明所有相關的 API 端點、參數和回傳格式。

## 主要 Google Sheets API 端點

### 1. 主要 FLB API
**URL：** `https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec`

**用途：** 主要的 FLB 系統 API，處理講師、課程和學生資料

### 2. 學生簽到狀態 API
**URL：** `https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec`

**用途：** 專門處理學生簽到狀態和出缺席記錄

### 3. Link Calendar API
**URL：** `https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec`

**用途：** 處理課程日曆相關資料

### 4. 報表查詢 API
**URL：** `https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec`

**用途：** 處理報表查詢和統計資料

## 第三步驟相關的 API 調用

### 1. 獲取學生簽到狀態

**API 端點：** 學生簽到狀態 API
**Action：** `getRosterAttendance`

**請求格式：**
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

**請求參數：**
- `action`: `"getRosterAttendance"` (固定值)
- `course`: 課程名稱 (例如: "SPM")
- `period`: 課程時間 (例如: "日 1330-1500 松山")

**回傳格式：**
```json
{
    "success": true,
    "course": "SPM",
    "period": "日 1330-1500 松山",
    "count": 15,
    "students": [
        {
            "name": "張小明",
            "attendance": [
                {
                    "date": "2024-01-15",
                    "present": true,
                    "time": "13:35:00"
                },
                {
                    "date": "2024-01-08",
                    "present": false,
                    "time": null
                }
            ]
        },
        {
            "name": "李小花",
            "attendance": [
                {
                    "date": "2024-01-15",
                    "present": "leave",
                    "time": null
                }
            ]
        }
    ]
}
```

**狀態值說明：**
- `present: true` - 出席
- `present: false` - 缺席
- `present: "leave"` - 請假
- `time` - 簽到時間 (格式: "HH:mm:ss")

### 2. 學生簽到記錄

**API 端點：** 主要 FLB API
**Action：** `markAttendance`

**請求格式：**
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

**請求參數：**
- `action`: `"markAttendance"` (固定值)
- `studentName`: 學生姓名
- `date`: 日期 (格式: "YYYY-MM-DD")
- `present`: 出席狀態 (true/false/"leave")
- `teacherName`: 講師姓名
- `courseName`: 課程名稱

**回傳格式：**
```json
{
    "success": true,
    "message": "學生簽到記錄已更新",
    "studentName": "張小明",
    "date": "2024-01-15",
    "present": true,
    "timestamp": "2024-01-15 13:35:00"
}
```

### 3. 講師簽到報告

**API 端點：** 講師專屬的 Web API (從講師資料中獲取)
**Action：** `submitTeacherReport`

**請求格式：**
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

**請求參數：**
- `action`: `"submitTeacherReport"` (固定值)
- `teacherName`: 講師姓名
- `courseName`: 課程名稱
- `courseTime`: 課程時間
- `date`: 日期 (格式: "YYYY-MM-DD")
- `studentCount`: 總學生人數
- `courseContent`: 課程內容
- `assistantCount`: 實際出席人數

**回傳格式：**
```json
{
    "success": true,
    "message": "講師簽到報告已提交",
    "reportId": "RPT_20240115_001",
    "timestamp": "2024-01-15 13:40:00"
}
```

### 4. 獲取講師列表

**API 端點：** 主要 FLB API
**Action：** `getTeacherList`

**請求格式：**
```javascript
const response = await axios.post('https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec', {
    action: 'getTeacherList'
});
```

**回傳格式：**
```json
{
    "success": true,
    "teachers": [
        {
            "name": "Tim",
            "link": "https://docs.google.com/spreadsheets/d/1t7K4nIFT7yg2G9ji5bLXj-E16TQDF0uTCj_jbbD4BWk/edit?usp=sharing",
            "webApi": "https://script.google.com/macros/s/AKfycbyA7VzIX5muRXfOGrJeU0oDF2HwAqxAIJqo-zJeR9F12Q3R8ZzwgUODC6y1GCE1Ri4h/exec",
            "reportApi": "https://script.google.com/macros/s/AKfycbx8EqbbiYwqeBMp0GsVt77T1XvLKf_BT5dUDRmx9FRpJtZxU_jLrBbfV8nNq7OBPPe7/exec",
            "userId": "Ucf9b239"
        }
    ]
}
```

### 5. 獲取講師課程

**API 端點：** 主要 FLB API
**Action：** `getCoursesByTeacher`

**請求格式：**
```javascript
const response = await axios.post('https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec', {
    action: 'getCoursesByTeacher',
    teacher: 'Tim'
});
```

**回傳格式：**
```json
{
    "success": true,
    "courseTimes": [
        {
            "course": "SPM",
            "time": "日 1330-1500 松山",
            "note": "代課"
        }
    ]
}
```

## 完整的實作範例

### JavaScript 實作

```javascript
class FLBGoogleSheetsAPI {
    constructor() {
        this.FLB_API_URL = 'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec';
        this.ATTENDANCE_API_URL = 'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec';
        this.LINK_CALENDAR_API_URL = 'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec';
        this.REPORT_API_URL = 'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec';
    }

    // 獲取學生簽到狀態
    async getStudentAttendance(course, period) {
        try {
            const response = await axios.post(this.ATTENDANCE_API_URL, {
                action: 'getRosterAttendance',
                course: course,
                period: period
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'NID=525=nsWVvbAon67C2qpyiEHQA3SUio_GqBd7RqUFU6BwB97_4LHggZxLpDgSheJ7WN4w3Z4dCQBiFPG9YKAqZgAokFYCuuQw04dkm-FX9-XHAIBIqJf1645n3RZrg86GcUVJOf3gN-5eTHXFIaovTmgRC6cXllv82SnQuKsGMq7CHH60XDSwyC99s9P2gmyXLppI'
                }
            });

            return response.data;
        } catch (error) {
            console.error('獲取學生簽到狀態失敗:', error);
            throw error;
        }
    }

    // 記錄學生簽到
    async markStudentAttendance(studentName, date, present, teacherName, courseName) {
        try {
            const response = await axios.post(this.FLB_API_URL, {
                action: 'markAttendance',
                studentName: studentName,
                date: date,
                present: present,
                teacherName: teacherName,
                courseName: courseName
            });

            return response.data;
        } catch (error) {
            console.error('記錄學生簽到失敗:', error);
            throw error;
        }
    }

    // 提交講師簽到報告
    async submitTeacherReport(teacherWebApi, teacherName, courseName, courseTime, date, studentCount, courseContent, assistantCount) {
        try {
            const response = await axios.post(teacherWebApi, {
                action: 'submitTeacherReport',
                teacherName: teacherName,
                courseName: courseName,
                courseTime: courseTime,
                date: date,
                studentCount: studentCount,
                courseContent: courseContent,
                assistantCount: assistantCount
            });

            return response.data;
        } catch (error) {
            console.error('提交講師簽到報告失敗:', error);
            throw error;
        }
    }

    // 獲取講師列表
    async getTeachers() {
        try {
            const response = await axios.post(this.FLB_API_URL, {
                action: 'getTeacherList'
            });

            return response.data;
        } catch (error) {
            console.error('獲取講師列表失敗:', error);
            throw error;
        }
    }

    // 獲取講師課程
    async getTeacherCourses(teacher) {
        try {
            const response = await axios.post(this.FLB_API_URL, {
                action: 'getCoursesByTeacher',
                teacher: teacher
            });

            return response.data;
        } catch (error) {
            console.error('獲取講師課程失敗:', error);
            throw error;
        }
    }
}

// 使用範例
const api = new FLBGoogleSheetsAPI();

// 獲取學生簽到狀態
const attendance = await api.getStudentAttendance('SPM', '日 1330-1500 松山');

// 記錄學生簽到
await api.markStudentAttendance('張小明', '2024-01-15', true, 'Tim', 'SPM');

// 提交講師簽到報告
await api.submitTeacherReport(
    'https://script.google.com/macros/s/AKfycbyA7VzIX5muRXfOGrJeU0oDF2HwAqxAIJqo-zJeR9F12Q3R8ZzwgUODC6y1GCE1Ri4h/exec',
    'Tim',
    'SPM',
    '日 1330-1500 松山',
    '2024-01-15',
    15,
    '基礎動作練習',
    12
);
```

### Python 實作

```python
import requests
import json
from datetime import datetime

class FLBGoogleSheetsAPI:
    def __init__(self):
        self.flb_api_url = 'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec'
        self.attendance_api_url = 'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec'
        self.link_calendar_api_url = 'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec'
        self.report_api_url = 'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec'
        
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Cookie': 'NID=525=nsWVvbAon67C2qpyiEHQA3SUio_GqBd7RqUFU6BwB97_4LHggZxLpDgSheJ7WN4w3Z4dCQBiFPG9YKAqZgAokFYCuuQw04dkm-FX9-XHAIBIqJf1645n3RZrg86GcUVJOf3gN-5eTHXFIaovTmgRC6cXllv82SnQuKsGMq7CHH60XDSwyC99s9P2gmyXLppI'
        })

    def get_student_attendance(self, course, period):
        """獲取學生簽到狀態"""
        try:
            response = self.session.post(self.attendance_api_url, json={
                'action': 'getRosterAttendance',
                'course': course,
                'period': period
            }, timeout=30)
            
            response.raise_for_status()
            return response.json()
        except Exception as error:
            print(f'獲取學生簽到狀態失敗: {error}')
            raise error

    def mark_student_attendance(self, student_name, date, present, teacher_name, course_name):
        """記錄學生簽到"""
        try:
            response = self.session.post(self.flb_api_url, json={
                'action': 'markAttendance',
                'studentName': student_name,
                'date': date,
                'present': present,
                'teacherName': teacher_name,
                'courseName': course_name
            })
            
            response.raise_for_status()
            return response.json()
        except Exception as error:
            print(f'記錄學生簽到失敗: {error}')
            raise error

    def submit_teacher_report(self, teacher_web_api, teacher_name, course_name, course_time, date, student_count, course_content, assistant_count):
        """提交講師簽到報告"""
        try:
            response = self.session.post(teacher_web_api, json={
                'action': 'submitTeacherReport',
                'teacherName': teacher_name,
                'courseName': course_name,
                'courseTime': course_time,
                'date': date,
                'studentCount': student_count,
                'courseContent': course_content,
                'assistantCount': assistant_count
            })
            
            response.raise_for_status()
            return response.json()
        except Exception as error:
            print(f'提交講師簽到報告失敗: {error}')
            raise error

    def get_teachers(self):
        """獲取講師列表"""
        try:
            response = self.session.post(self.flb_api_url, json={
                'action': 'getTeacherList'
            })
            
            response.raise_for_status()
            return response.json()
        except Exception as error:
            print(f'獲取講師列表失敗: {error}')
            raise error

    def get_teacher_courses(self, teacher):
        """獲取講師課程"""
        try:
            response = self.session.post(self.flb_api_url, json={
                'action': 'getCoursesByTeacher',
                'teacher': teacher
            })
            
            response.raise_for_status()
            return response.json()
        except Exception as error:
            print(f'獲取講師課程失敗: {error}')
            raise error

# 使用範例
api = FLBGoogleSheetsAPI()

# 獲取學生簽到狀態
attendance = api.get_student_attendance('SPM', '日 1330-1500 松山')

# 記錄學生簽到
api.mark_student_attendance('張小明', '2024-01-15', True, 'Tim', 'SPM')

# 提交講師簽到報告
api.submit_teacher_report(
    'https://script.google.com/macros/s/AKfycbyA7VzIX5muRXfOGrJeU0oDF2HwAqxAIJqo-zJeR9F12Q3R8ZzwgUODC6y1GCE1Ri4h/exec',
    'Tim',
    'SPM',
    '日 1330-1500 松山',
    '2024-01-15',
    15,
    '基礎動作練習',
    12
)
```

## 重要注意事項

1. **Cookie 認證：** 學生簽到狀態 API 需要特定的 Cookie 進行認證
2. **超時設定：** 建議設定 30 秒超時，因為 Google Apps Script 可能需要較長時間處理
3. **錯誤處理：** 所有 API 調用都應該包含適當的錯誤處理
4. **日期格式：** 使用 `YYYY-MM-DD` 格式
5. **時間格式：** 使用 `日 1330-1500 松山` 格式
6. **狀態值：** 出席狀態使用 `true`/`false`/`"leave"`

## 測試方法

您可以使用以下方法測試 API：

1. **使用 Postman：** 匯入本文檔中的範例進行測試
2. **使用 curl：** 使用本文檔中的 curl 範例進行測試
3. **使用瀏覽器：** 在瀏覽器控制台中測試 JavaScript 範例

## 聯絡資訊

如有任何問題，請聯絡開發團隊或查看完整的 API 文檔。
