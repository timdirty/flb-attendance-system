# 📋 Quick Reply 格式快速參考表

## ⚠️ 重要系統架構說明

**當前架構：**
```
LINE Bot ➜ Webhook ➜ 轉發系統 (處理 postback) ➜ FLB API (儲存資料)
                         ↓
                    不轉發 postback
                    (避免重複處理)
```

**關鍵重點：**
- ✅ Postback 事件由**轉發系統**處理
- ✅ 轉發系統調用 **FLB API** (`POST /api/student-responses`) 儲存資料
- ✅ 轉發系統**不轉發** postback 事件給 FLB（避免重複）
- ✅ 轉發系統負責回覆 LINE 訊息給家長

---

## 🔍 快速索引

| 類型 | action 值 | 說明 | 詳細章節 |
|-----|----------|-----|---------|
| 單個學生出席回覆 | `attendance_reply` | 家長回覆單一學生的出缺席 | [→](#1-單個學生出席回覆) |
| 多個學生出席回覆 | `multi_student_attendance_reply` | 家長回覆多個學生的統一狀態 | [→](#2-多個學生出席回覆) |
| 請假原因 | `leave_reason` | 家長選擇請假原因 | [→](#3-請假原因回覆) |
| 選擇請假學生 | `select_leave_student` | 多學生情況下選擇特定學生請假 | [→](#2-多個學生出席回覆) |

---

## 1. 單個學生出席回覆

### 📤 發送格式（行事曆系統 → LINE）

**Quick Reply 按鈕：**
```json
{
  "items": [
    {
      "type": "action",
      "action": {
        "type": "postback",
        "label": "✅ 會出席",
        "data": "{\"action\":\"attendance_reply\",\"response\":\"attend\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期三\",\"studentName\":\"小明\"}",
        "displayText": "✅ 會出席"
      }
    },
    {
      "type": "action",
      "action": {
        "type": "postback",
        "label": "🏥 請假",
        "data": "{\"action\":\"attendance_reply\",\"response\":\"leave\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期三\",\"studentName\":\"小明\"}",
        "displayText": "🏥 請假"
      }
    },
    {
      "type": "action",
      "action": {
        "type": "postback",
        "label": "⏳ 待確認",
        "data": "{\"action\":\"attendance_reply\",\"response\":\"pending\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期三\",\"studentName\":\"小明\"}",
        "displayText": "⏳ 待確認"
      }
    }
  ]
}
```

### 📥 接收格式（LINE Webhook → 轉發系統）

**Webhook Event（轉發系統接收）：**
```json
{
  "events": [
    {
      "type": "postback",
      "replyToken": "xxxxxxxxxx",
      "source": {
        "userId": "Udb5xxxxx",
        "type": "user"
      },
      "timestamp": 1729654800000,
      "postback": {
        "data": "{\"action\":\"attendance_reply\",\"response\":\"attend\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期三\",\"studentName\":\"小明\"}"
      }
    }
  ]
}
```

### 📡 FLB API 接收格式（轉發系統 → FLB API）

**API Request（轉發系統發送到 FLB）：**
```http
POST https://calendar.funlearnbar.synology.me/api/student-responses
Content-Type: application/json

{
  "studentName": "小明",
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "location": "站前教室",
  "weekday": "星期三",
  "responseType": "attend",
  "userId": "Udb5xxxxx",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

**FLB API 預期回應：**
```json
{
  "success": true,
  "message": "記錄成功",
  "data": {
    "id": "response_123",
    "studentName": "小明",
    "responseType": "attend",
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

### 📦 解析後的資料

```json
{
  "action": "attendance_reply",
  "response": "attend",        // 或 "leave" 或 "pending"
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "location": "站前教室",
  "weekday": "星期三",
  "studentName": "小明"
}
```

### 🔧 處理邏輯（轉發系統）

**⚠️ 重要：postback 事件由轉發系統處理，不轉發給 FLB API**

```javascript
// 轉發系統處理 postback
if (postbackData.action === 'attendance_reply') {
  const { response, studentName, courseName, courseDate, courseTime, location, weekday } = postbackData;
  const userId = event.source.userId;
  
  switch (response) {
    case 'attend':
      // 1. 調用 FLB API 儲存出席記錄
      await axios.post('https://calendar.funlearnbar.synology.me/api/student-responses', {
        studentName,
        courseName,
        courseDate,
        courseTime,
        location,
        weekday,
        responseType: 'attend',
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 2. 回覆確認訊息
      await replyMessage(
        replyToken,
        `✅ 已記錄您的回覆：會出席\n\n課程：${courseName}\n日期：${courseDate}`
      );
      break;
      
    case 'leave':
      // 1. 暫存請假申請
      pendingLeaves.set(`${userId}_${courseDate}`, {
        userId, studentName, courseName, courseDate, 
        courseTime, location, weekday,
        timestamp: new Date().toISOString()
      });
      
      // 2. 詢問請假原因（發送 Quick Reply）
      await sendLeaveReasonOptions(userId, postbackData, replyToken);
      break;
      
    case 'pending':
      // 1. 調用 FLB API 儲存待確認記錄
      await axios.post('https://calendar.funlearnbar.synology.me/api/student-responses', {
        studentName,
        courseName,
        courseDate,
        courseTime,
        location,
        weekday,
        responseType: 'pending',
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 2. 回覆確認訊息
      await replyMessage(
        replyToken,
        `✅ 已記錄您的回覆：待確認\n\n課程：${courseName}\n日期：${courseDate}`
      );
      break;
  }
}
```

---

## 2. 多個學生出席回覆

### 📤 發送格式（行事曆系統 → LINE）

**Quick Reply 按鈕：**
```json
{
  "items": [
    {
      "type": "action",
      "action": {
        "type": "postback",
        "label": "✅ 全部會出席",
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"attend_all\",\"count\":2}",
        "displayText": "✅ 全部會出席"
      }
    },
    {
      "type": "action",
      "action": {
        "type": "postback",
        "label": "🏥 需要請假",
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"leave_some\",\"count\":2}",
        "displayText": "🏥 需要請假"
      }
    },
    {
      "type": "action",
      "action": {
        "type": "postback",
        "label": "⏳ 稍後確認",
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"pending\",\"count\":2}",
        "displayText": "⏳ 稍後確認"
      }
    }
  ]
}
```

### 📥 接收格式（LINE Webhook → 轉發系統）

**Webhook Event（轉發系統接收）：**
```json
{
  "events": [
    {
      "type": "postback",
      "replyToken": "xxxxxxxxxx",
      "source": {
        "userId": "Udb5xxxxx",
        "type": "user"
      },
      "timestamp": 1729654800000,
      "postback": {
        "data": "{\"action\":\"multi_student_attendance_reply\",\"response\":\"attend_all\",\"count\":2,\"students\":[{\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期三\"},{\"studentName\":\"小華\",\"courseName\":\"ESM 日 9:30-10:30\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-10:30\",\"location\":\"站前教室\",\"weekday\":\"星期三\"}]}"
      }
    }
  ]
}
```

### 📡 FLB API 接收格式（轉發系統 → FLB API）

**API Requests（轉發系統為每位學生發送到 FLB）：**

```http
POST https://calendar.funlearnbar.synology.me/api/student-responses
Content-Type: application/json

{
  "studentName": "小明",
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "location": "站前教室",
  "weekday": "星期三",
  "responseType": "attend",
  "userId": "Udb5xxxxx",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

```http
POST https://calendar.funlearnbar.synology.me/api/student-responses
Content-Type: application/json

{
  "studentName": "小華",
  "courseName": "ESM 日 9:30-10:30",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-10:30",
  "location": "站前教室",
  "weekday": "星期三",
  "responseType": "attend",
  "userId": "Udb5xxxxx",
  "timestamp": "2025-10-23T10:30:01.000Z"
}
```

### 📦 解析後的資料

```json
{
  "action": "multi_student_attendance_reply",
  "response": "attend_all",    // 或 "leave_some" 或 "pending"
  "count": 2                   // 學生數量
}
```

### 🔧 處理邏輯（轉發系統）

**⚠️ 重要：postback 事件由轉發系統處理，並調用 FLB API 儲存資料**

```javascript
// 轉發系統處理多學生 postback
if (postbackData.action === 'multi_student_attendance_reply') {
  const { response, count, students } = postbackData;
  const userId = event.source.userId;
  
  // 🔑 關鍵：postback 中已包含學生資訊，或從 FLB API 查詢
  // students 格式：
  // [
  //   { studentName: '小明', courseName: 'SPM 六 9:30', courseDate: '...', courseTime: '...', location: '...', weekday: '...' },
  //   { studentName: '小華', courseName: 'ESM 日 9:30', courseDate: '...', courseTime: '...', location: '...', weekday: '...' }
  // ]
  
  switch (response) {
    case 'attend_all':
      // 1. 為每位學生調用 FLB API 儲存出席記錄
      for (const student of students) {
        await axios.post('https://calendar.funlearnbar.synology.me/api/student-responses', {
          studentName: student.studentName,
          courseName: student.courseName,
          courseDate: student.courseDate,
          courseTime: student.courseTime,
          location: student.location,
          weekday: student.weekday,
          responseType: 'attend',
          userId,
          timestamp: new Date().toISOString()
        });
      }
      
      // 2. 回覆確認訊息
      const courseList = students.map(s => `• ${s.studentName} - ${s.courseName}`).join('\n');
      await replyMessage(
        replyToken,
        `✅ 已確認全部會出席\n📊 共 ${count} 位孩子的課程\n${courseList}`
      );
      break;
      
    case 'leave_some':
      // 1. 暫存多學生資訊
      pendingLeaves.set(`${userId}_multi`, {
        userId,
        students,
        action: 'select_leave_student',
        timestamp: new Date().toISOString()
      });
      
      // 2. 詢問具體是哪個孩子需要請假（發送 Quick Reply）
      const quickReplyItems = students.map(student => ({
        type: 'action',
        action: {
          type: 'postback',
          label: `${student.studentName} 請假`,
          data: JSON.stringify({
            action: 'select_leave_student',
            studentName: student.studentName,
            courseName: student.courseName,
            courseDate: student.courseDate,
            courseTime: student.courseTime,
            location: student.location,
            weekday: student.weekday
          }),
          displayText: `${student.studentName} 請假`
        }
      }));
      
      await replyWithQuickReply(
        replyToken,
        '請選擇需要請假的孩子：',
        { items: quickReplyItems }
      );
      break;
      
    case 'pending':
      // 1. 為每位學生調用 FLB API 儲存待確認記錄
      for (const student of students) {
        await axios.post('https://calendar.funlearnbar.synology.me/api/student-responses', {
          studentName: student.studentName,
          courseName: student.courseName,
          courseDate: student.courseDate,
          courseTime: student.courseTime,
          location: student.location,
          weekday: student.weekday,
          responseType: 'pending',
          userId,
          timestamp: new Date().toISOString()
        });
      }
      
      // 2. 回覆確認訊息
      await replyMessage(
        replyToken,
        `⏳ 已記錄為待確認\n📊 共 ${count} 位孩子的課程\n請稍後再確認出缺席狀態`
      );
      break;
  }
}
```

---

## 3. 請假原因回覆

### 📤 發送格式（FLB API → LINE）

**當家長選擇「請假」後，系統詢問原因：**

```json
{
  "replyToken": "xxxxxxxxxx",
  "messages": [
    {
      "type": "text",
      "text": "請選擇 小明 的請假原因：",
      "quickReply": {
        "items": [
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": "🤒 生病",
              "data": "{\"action\":\"leave_reason\",\"studentName\":\"小明\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"reason\":\"生病\"}",
              "displayText": "🤒 生病"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": "🏠 家庭因素",
              "data": "{\"action\":\"leave_reason\",\"studentName\":\"小明\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"reason\":\"家庭因素\"}",
              "displayText": "🏠 家庭因素"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": "📅 臨時有事",
              "data": "{\"action\":\"leave_reason\",\"studentName\":\"小明\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"reason\":\"臨時有事\"}",
              "displayText": "📅 臨時有事"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": "✏️ 其他原因",
              "data": "{\"action\":\"leave_reason\",\"studentName\":\"小明\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"reason\":\"其他\"}",
              "displayText": "✏️ 其他原因"
            }
          }
        ]
      }
    }
  ]
}
```

### 📥 接收格式（LINE Webhook → 轉發系統）

**Webhook Event（轉發系統接收）：**
```json
{
  "events": [
    {
      "type": "postback",
      "replyToken": "yyyyyyyyyy",
      "source": {
        "userId": "Udb5xxxxx",
        "type": "user"
      },
      "timestamp": 1729654900000,
      "postback": {
        "data": "{\"action\":\"leave_reason\",\"studentName\":\"小明\",\"courseName\":\"SPM 六 9:30-11:00\",\"courseDate\":\"2025年10月23日\",\"courseTime\":\"09:30-11:00\",\"location\":\"站前教室\",\"weekday\":\"星期三\",\"reason\":\"生病\"}"
      }
    }
  ]
}
```

### 📡 FLB API 接收格式（轉發系統 → FLB API）

**API Request（轉發系統發送到 FLB）：**
```http
POST https://calendar.funlearnbar.synology.me/api/student-responses
Content-Type: application/json

{
  "studentName": "小明",
  "courseName": "SPM 六 9:30-11:00",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "location": "站前教室",
  "weekday": "星期三",
  "responseType": "leave",
  "leaveReason": "生病",
  "userId": "Udb5xxxxx",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

**FLB API 預期回應：**
```json
{
  "success": true,
  "message": "請假記錄成功",
  "data": {
    "id": "response_124",
    "studentName": "小明",
    "responseType": "leave",
    "leaveReason": "生病",
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

### 📦 解析後的資料

```json
{
  "action": "leave_reason",
  "studentName": "小明",
  "courseDate": "2025年10月23日",
  "courseTime": "09:30-11:00",
  "reason": "生病"         // 或 "家庭因素" 或 "臨時有事" 或 "其他"
}
```

### 🔧 處理邏輯（轉發系統）

**⚠️ 重要：postback 事件由轉發系統處理，並調用 FLB API 儲存請假資料**

```javascript
// 轉發系統處理請假原因
if (postbackData.action === 'leave_reason') {
  const { studentName, courseDate, courseTime, courseName, location, weekday, reason } = postbackData;
  const userId = event.source.userId;
  
  // 1. 從暫存中取得完整請假資訊
  const leaveKey = `${userId}_${courseDate}`;
  const leaveInfo = pendingLeaves.get(leaveKey) || pendingLeaves.get(`${leaveKey}_${studentName}`);
  
  if (leaveInfo) {
    // 2. 調用 FLB API 儲存請假記錄（含原因）
    await axios.post('https://calendar.funlearnbar.synology.me/api/student-responses', {
      studentName: leaveInfo.studentName || studentName,
      courseName: leaveInfo.courseName || courseName,
      courseDate: leaveInfo.courseDate || courseDate,
      courseTime: leaveInfo.courseTime || courseTime,
      location: leaveInfo.location || location,
      weekday: leaveInfo.weekday || weekday,
      responseType: 'leave',
      leaveReason: reason,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // 3. 回覆確認訊息給家長
    await replyMessage(
      replyToken,
      `✅ 已記錄 ${leaveInfo.studentName} 的請假申請\n\n📚 課程：${leaveInfo.courseName}\n📅 日期：${leaveInfo.courseDate}\n🏥 原因：${reason}\n\n已通知系統記錄`
    );
    
    // 4. 通知管理員（可選）
    if (process.env.ADMIN_GROUP_ID) {
      await notifyAdmin({
        studentName: leaveInfo.studentName,
        courseName: leaveInfo.courseName,
        courseDate: leaveInfo.courseDate,
        leaveReason: reason
      });
    }
    
    // 5. 清除暫存
    pendingLeaves.delete(leaveKey);
    pendingLeaves.delete(`${leaveKey}_${studentName}`);
  }
}
```

---

## 📊 資料大小檢查

### ⚠️ LINE API 限制

| 項目 | 限制 | 說明 |
|-----|-----|-----|
| `postback.data` | **最多 300 字元** | 超過會收到 400 錯誤 |
| `label` | 最多 20 字元 | 按鈕顯示文字 |
| `displayText` | 最多 300 字元 | 點擊後顯示在聊天室的文字 |

### ✅ 當前格式大小

| 類型 | 大小 | 狀態 |
|-----|-----|-----|
| 單個學生（`attendance_reply`） | ~250 字元 | ✅ 安全 |
| 多個學生（`multi_student_attendance_reply`） | ~90 字元 | ✅ 非常安全 |
| 請假原因（`leave_reason`） | ~180 字元 | ✅ 安全 |

---

## 🔄 完整互動流程圖

### 流程 A：單個學生 - 出席

```
┌──────────────────────────┐
│ 行事曆系統發送 Flex Message  │
│ + Quick Reply             │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ 家長點擊「✅ 會出席」      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ LINE Webhook 觸發          │
│ action: attendance_reply   │
│ response: attend           │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ FLB API 處理               │
│ 1. 更新資料庫             │
│ 2. 回覆確認訊息           │
└──────────────────────────┘
```

### 流程 B：單個學生 - 請假

```
┌──────────────────────────┐
│ 行事曆系統發送 Flex Message  │
│ + Quick Reply             │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ 家長點擊「🏥 請假」        │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ LINE Webhook 觸發          │
│ action: attendance_reply   │
│ response: leave            │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ FLB API 詢問請假原因       │
│ 發送 Quick Reply           │
│ (生病/家庭因素/臨時有事)  │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ 家長選擇原因               │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ LINE Webhook 觸發          │
│ action: leave_reason       │
│ reason: 生病               │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ FLB API 處理               │
│ 1. 更新資料庫（含原因）   │
│ 2. 回覆確認訊息           │
│ 3. 通知講師               │
└──────────────────────────┘
```

### 流程 C：多個學生 - 全部出席

```
┌──────────────────────────┐
│ 行事曆系統發送 Carousel     │
│ + Quick Reply             │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ 家長點擊「✅ 全部會出席」  │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ LINE Webhook 觸發          │
│ action: multi_student_...  │
│ response: attend_all       │
│ count: 2                   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ FLB API 處理               │
│ 1. 根據 userId 查詢課程   │
│ 2. 全部標記為出席         │
│ 3. 回覆確認訊息           │
└──────────────────────────┘
```

### 流程 D：多個學生 - 需要請假

```
┌──────────────────────────┐
│ 行事曆系統發送 Carousel     │
│ + Quick Reply             │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ 家長點擊「🏥 需要請假」    │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ LINE Webhook 觸發          │
│ action: multi_student_...  │
│ response: leave_some       │
│ count: 2                   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ FLB API 詢問是誰請假       │
│ 發送 Quick Reply           │
│ (小明請假 / 小華請假)     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ 家長選擇「小明請假」       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ LINE Webhook 觸發          │
│ action: attendance_reply   │
│ response: leave            │
│ studentName: 小明          │
└──────────┬───────────────┘
           ↓
        （同流程 B）
```

---

## 💡 實作建議

### 1. 資料庫查詢最佳化

**查詢家長的所有課程時，要考慮時間範圍：**

```sql
-- 查詢該家長今日課程
SELECT 
  s.student_name,
  c.course_name,
  c.course_date,
  c.course_time
FROM parent_students ps
JOIN courses c ON ps.student_id = c.student_id
WHERE ps.parent_line_user_id = ?
  AND c.course_date = CURDATE()
ORDER BY c.course_time;
```

### 2. 併發處理

**如果家長快速點擊多次：**

```javascript
// 使用交易 (transaction) 避免重複更新
await db.transaction(async (trx) => {
  // 檢查是否已經處理過
  const existing = await trx('attendance')
    .where({ student_name, course_date, course_time })
    .first();
  
  if (existing.status === 'attend' || existing.status === 'leave') {
    // 已經處理過，不重複更新
    return;
  }
  
  await trx('attendance')
    .where({ student_name, course_date, course_time })
    .update({ status, leave_reason, updated_at: new Date() });
});
```

### 3. 錯誤處理

```javascript
try {
  const postbackData = JSON.parse(event.postback.data);
  
  // 驗證必要欄位
  if (!postbackData.action) {
    throw new Error('Missing action field');
  }
  
  // 處理邏輯...
  
} catch (error) {
  console.error('Webhook 處理錯誤:', error);
  
  // 回覆錯誤訊息給用戶
  await replyMessage(
    event.replyToken,
    '⚠️ 處理失敗，請稍後再試或聯繫客服'
  );
}
```

### 4. 日誌記錄

```javascript
// 記錄所有 Postback 事件
await db('webhook_logs').insert({
  event_type: 'postback',
  user_id: event.source.userId,
  action: postbackData.action,
  response: postbackData.response,
  data: JSON.stringify(postbackData),
  timestamp: new Date()
});
```

---

## 🧪 測試檢查清單

### 單個學生功能
- [ ] 點擊「會出席」→ 資料庫正確更新為 `attend`
- [ ] 點擊「請假」→ 正確詢問原因
- [ ] 選擇請假原因 → 資料庫正確記錄原因
- [ ] 點擊「待確認」→ 資料庫正確更新為 `pending`
- [ ] 回覆訊息格式正確且友善

### 多個學生功能
- [ ] 點擊「全部會出席」→ 所有課程正確更新為 `attend`
- [ ] 點擊「需要請假」→ 正確顯示學生選擇列表
- [ ] 選擇特定學生請假 → 正確進入請假流程
- [ ] 點擊「稍後確認」→ 所有課程正確更新為 `pending`
- [ ] `userId` 正確關聯到所有課程

### 邊界情況
- [ ] 快速重複點擊 → 不會重複處理
- [ ] 課程已結束 → 正確提示
- [ ] 未找到課程資料 → 正確錯誤處理
- [ ] JSON 解析失敗 → 正確錯誤處理
- [ ] 資料庫連線失敗 → 正確錯誤處理

---

## 📞 聯絡資訊

如果在對接過程中有任何問題，請參考：

- **詳細實作範例：** `WEBHOOK_INTEGRATION_GUIDE.md`
- **Carousel 實現：** `CAROUSEL_QUICK_REPLY_FIX.md`
- **技術分析：** `TEMPLATE_AND_QUICKREPLY_ANALYSIS.md`

---

**最後更新：** 2025-10-23  
**版本：** v1.0  
**狀態：** ✅ 已驗證可用

