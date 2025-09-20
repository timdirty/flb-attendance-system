# FLB 簽到系統整合範例

## 快速開始

### 1. JavaScript (瀏覽器)

```html
<!DOCTYPE html>
<html>
<head>
    <title>FLB 簽到系統整合</title>
    <script src="flb-attendance-sdk.js"></script>
</head>
<body>
    <div id="app">
        <h1>FLB 簽到系統</h1>
        <button onclick="loadTeachers()">載入講師</button>
        <button onclick="markAttendance()">學生簽到</button>
        <button onclick="teacherCheckin()">講師簽到</button>
    </div>

    <script>
        // 初始化 SDK
        const sdk = new FLBAttendanceSDK({
            baseURL: 'https://liff-sttendence-0908-production.up.railway.app'
        });

        async function loadTeachers() {
            try {
                const result = await sdk.getTeachers();
                console.log('講師列表:', result.teachers);
            } catch (error) {
                console.error('載入失敗:', error);
            }
        }

        async function markAttendance() {
            try {
                const result = await sdk.markStudentAttendance('張小明', true, 'Tim', 'SPM 南京復興教室');
                alert(result.success ? '簽到成功' : '簽到失敗');
            } catch (error) {
                console.error('簽到錯誤:', error);
            }
        }

        async function teacherCheckin() {
            try {
                const result = await sdk.teacherCheckin('Tim', 'SPM 南京復興教室', '日 1330-1500 松山', 5, '數學課程');
                alert(result.success ? '講師簽到成功' : '講師簽到失敗');
            } catch (error) {
                console.error('講師簽到錯誤:', error);
            }
        }
    </script>
</body>
</html>
```

### 2. Node.js

```javascript
const FLBAttendanceSDK = require('./flb-attendance-sdk-node.js');

async function main() {
    const sdk = new FLBAttendanceSDK({
        baseURL: 'https://liff-sttendence-0908-production.up.railway.app'
    });

    try {
        // 獲取講師列表
        const teachers = await sdk.getTeachers();
        console.log('講師列表:', teachers.teachers);

        // 學生簽到
        const result = await sdk.markStudentAttendance('張小明', true, 'Tim', 'SPM 南京復興教室');
        console.log('簽到結果:', result);

    } catch (error) {
        console.error('錯誤:', error);
    }
}

main();
```

### 3. Python

```python
from flb_attendance_sdk import FLBAttendanceSDK

def main():
    sdk = FLBAttendanceSDK(
        base_url="https://liff-sttendence-0908-production.up.railway.app"
    )
    
    try:
        # 獲取講師列表
        teachers = sdk.get_teachers()
        print("講師列表:", teachers['teachers'])
        
        # 學生簽到
        result = sdk.mark_student_attendance('張小明', True, 'Tim', 'SPM 南京復興教室')
        print("簽到結果:", result)
        
    except Exception as e:
        print("錯誤:", e)

if __name__ == "__main__":
    main()
```

## 進階整合

### React 組件

```jsx
import React, { useState, useEffect } from 'react';
import FLBAttendanceSDK from './flb-attendance-sdk.js';

function AttendanceApp() {
    const [sdk] = useState(new FLBAttendanceSDK());
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            const result = await sdk.getTeachers();
            setTeachers(result.teachers);
        } catch (error) {
            console.error('載入講師失敗:', error);
        }
    };

    const loadStudents = async (course, time) => {
        try {
            const result = await sdk.getStudents(course, time);
            setStudents(result.students);
        } catch (error) {
            console.error('載入學生失敗:', error);
        }
    };

    const markAttendance = async (studentName, present) => {
        try {
            const result = await sdk.markStudentAttendance(studentName, present, 'Tim', 'SPM 南京復興教室');
            if (result.success) {
                // 更新本地狀態
                setStudents(prev => prev.map(s => 
                    s.name === studentName 
                        ? { ...s, hasAttendanceToday: present }
                        : s
                ));
            }
        } catch (error) {
            console.error('簽到失敗:', error);
        }
    };

    return (
        <div>
            <h1>FLB 簽到系統</h1>
            <div>
                <h2>學生列表</h2>
                {students.map(student => (
                    <div key={student.name}>
                        <span>{student.name}</span>
                        <button onClick={() => markAttendance(student.name, true)}>
                            出席
                        </button>
                        <button onClick={() => markAttendance(student.name, false)}>
                            缺席
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AttendanceApp;
```

### Vue 組件

```vue
<template>
  <div>
    <h1>FLB 簽到系統</h1>
    <div v-for="student in students" :key="student.name">
      <span>{{ student.name }}</span>
      <button @click="markAttendance(student.name, true)">出席</button>
      <button @click="markAttendance(student.name, false)">缺席</button>
    </div>
  </div>
</template>

<script>
import FLBAttendanceSDK from './flb-attendance-sdk.js';

export default {
  data() {
    return {
      sdk: new FLBAttendanceSDK(),
      students: []
    };
  },
  async mounted() {
    await this.loadStudents();
  },
  methods: {
    async loadStudents() {
      try {
        const result = await this.sdk.getStudents('SPM 南京復興教室', '日 1330-1500 松山');
        this.students = result.students;
      } catch (error) {
        console.error('載入學生失敗:', error);
      }
    },
    async markAttendance(studentName, present) {
      try {
        const result = await this.sdk.markStudentAttendance(studentName, present, 'Tim', 'SPM 南京復興教室');
        if (result.success) {
          const student = this.students.find(s => s.name === studentName);
          if (student) {
            student.hasAttendanceToday = present;
          }
        }
      } catch (error) {
        console.error('簽到失敗:', error);
      }
    }
  }
};
</script>
```

## 部署建議

### 1. 環境變數配置

```bash
# .env
FLB_API_BASE_URL=https://liff-sttendence-0908-production.up.railway.app
FLB_API_KEY=your-api-key
FLB_TIMEOUT=30000
```

### 2. Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass https://liff-sttendence-0908-production.up.railway.app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 測試

```javascript
// test-sdk.js
const FLBAttendanceSDK = require('./flb-attendance-sdk-node.js');

async function testSDK() {
    const sdk = new FLBAttendanceSDK();
    
    // 測試講師列表
    const teachers = await sdk.getTeachers();
    console.assert(teachers.success, '講師列表獲取失敗');
    
    // 測試課程獲取
    const courses = await sdk.getCourses('Tim');
    console.assert(courses.success, '課程列表獲取失敗');
    
    console.log('所有測試通過！');
}

testSDK().catch(console.error);
```

## 支援

- 文檔：`API_DOCUMENTATION.md`
- 問題回報：GitHub Issues
- 聯絡：開發團隊
