# 🔗 外部 API 串接完整指南

## 📋 目錄
1. [比對邏輯說明](#比對邏輯說明)
2. [API 使用方法](#api-使用方法)
3. [實際範例](#實際範例)
4. [快速對照表](#快速對照表)

---

## 🔍 比對邏輯說明

### 核心概念
系統使用 **智能模糊比對** 來匹配課程，支援各種時間格式和位置標記。

### 比對三要素

#### 1️⃣ **星期（必須完全相同）**
```python
提取星期：正則表達式 r'[一二三四五六日]'

範例：
✅ "六" = "六"  → 匹配
❌ "六" ≠ "日"  → 不匹配
```

#### 2️⃣ **時間（自動正規化）**
```python
# 系統會自動轉換各種格式：
0930-1030  →  0930-1030  ✅
9:30-10:30 →  0930-1030  ✅
09:30-10:30→  0930-1030  ✅

# 比對規則：
1. 移除冒號
2. 補齊前導 0（例如：9 → 09）
3. 統一格式後比較
```

#### 3️⃣ **位置標記（智能匹配）**
```python
支援的位置標記：
- 到府
- 外
- （無標記）

比對邏輯：
✅ "六 0930-1030 到府" 可匹配 "六 0930-1030 到府"
✅ "六 0930-1030"      可匹配 "六 0930-1030 到府"（包含關係）
❌ "六 0930-1030 到府" 不匹配 "六 0930-1030 外"（衝突）
```

---

## 🔧 完整比對函數

### Python 實作（後端 API）

```python
def period_matches(student_period, course_period):
    """
    比對時段是否相符（改進版：正規化時間格式，支援到府/外等標記）
    """
    import re
    
    # 提取星期
    def extract_weekday(text):
        match = re.search(r'[一二三四五六日]', text)
        return match.group(0) if match else None
    
    # 提取並正規化時間（補齊前導0）
    def extract_time(text):
        # 匹配各種時間格式
        patterns = [
            r'(\d{1,2}):?(\d{2})\s*[-~到至]\s*(\d{1,2}):?(\d{2})',  # 9:30-10:30 或 0930-1030
            r'(\d{4})\s*[-~到至]\s*(\d{4})',  # 0930-1030
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                if len(match.groups()) == 4:
                    h1, m1, h2, m2 = match.groups()
                    return f"{h1.zfill(2)}{m1}-{h2.zfill(2)}{m2}"
                elif len(match.groups()) == 2:
                    t1, t2 = match.groups()
                    return f"{t1}-{t2}"
        return None
    
    # 提取位置標記（到府、外等）
    def extract_location(text):
        if '到府' in text:
            return '到府'
        elif '外' in text:
            return '外'
        return None
    
    s_weekday = extract_weekday(student_period)
    c_weekday = extract_weekday(course_period)
    
    # 星期必須相同
    if s_weekday != c_weekday:
        return False
    
    s_time = extract_time(student_period)
    c_time = extract_time(course_period)
    
    # 時間必須相同
    if s_time and c_time and s_time != c_time:
        return False
    
    # 檢查位置標記（如果查詢有指定位置，必須匹配；否則忽略）
    c_location = extract_location(course_period)
    s_location = extract_location(student_period)
    
    if c_location and s_location and c_location != s_location:
        return False
    
    return True
```

---

## 🌐 API 使用方法

### API 端點

#### 1. **智能課程查找 API（自動跳轉）**
```
GET https://course-viewer.funlearnbar.synology.me/api/find-course
```

**功能：**
- **預設行為**：找到課程後自動重定向（HTTP 302）到課程詳情頁
- **可選行為**：加上 `format=json` 返回 JSON 數據

**參數：**
- `course`: 課程類型（ESM, SPIKE, SPM, BOOST, EV3 等）
- `period`: 時段資訊（**必須包含星期** + 時間，可選位置）
- `format`: 回傳格式（可選，預設 `redirect`，可選 `json`）

**⚠️ 重要：period 必須包含星期**
- ✅ 正確：`六 0930-1030` 或 `六 0930-1030 到府`
- ❌ 錯誤：`0930-1030`（缺少星期）

**範例：**

1️⃣ **直接跳轉到課程頁面（推薦）**
```bash
# 直接在瀏覽器打開此 URL，會自動跳轉到課程詳情頁
https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六 0930-1030 到府

# 包含位置標記
https://course-viewer.funlearnbar.synology.me/api/find-course?course=SPM&period=一 1930-2030 到府

# 外部課程
https://course-viewer.funlearnbar.synology.me/api/find-course?course=SPIKE&period=五 1015-1140 外
```

2️⃣ **返回 JSON 數據（用於 API 整合）**
```bash
# 加上 format=json 參數
https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六 0930-1030 到府&format=json
```

---

### 📊 API 回應說明

#### 🔄 預設行為（自動重定向）

**不加 `format=json` 參數時**，API 會直接返回 HTTP 302 重定向：

```
HTTP/1.1 302 Found
Location: /viewer.html?file=ESM%20%E5%85%AD%209%3A30-10%3A30%20%E5%88%B0%E5%BA%9C%202620a4c0-ed84-80ee-98d8-f9cb54b5cbaf_all.csv
```

瀏覽器會自動跳轉到課程詳情頁面。

**使用場景：**
- 🔗 直接作為超連結使用：`<a href="/api/find-course?course=ESM&period=六 0930-1030 到府">查看課程</a>`
- 🌐 在瀏覽器直接打開 URL
- 📧 分享連結給家長/學生

---

#### 📋 JSON 格式回應

**加上 `format=json` 參數時**，返回 JSON 數據：

**成功回應：**
```json
{
  "success": true,
  "matched_file": "ESM 六 9:30-10:30 到府 2620a4c0-ed84-80ee-98d8-f9cb54b5cbaf_all.csv",
  "url": "/viewer.html?file=ESM%20%E5%85%AD%209%3A30-10%3A30%20%E5%88%B0%E5%BA%9C%202620a4c0-ed84-80ee-98d8-f9cb54b5cbaf_all.csv",
  "display_name": "ESM 六 9:30-10:30 到府",
  "course_data": { ... }
}
```

**失敗回應：**
```json
{
  "success": false,
  "error": "找不到符合的課程：ESM 日 1600-1700",
  "searched": {
    "course_type": "ESM",
    "weekday": "日",
    "time": "1600-1700",
    "period": "日 1600-1700"
  }
}
```

**多個結果：**
```json
{
  "success": true,
  "count": 2,
  "message": "找到 2 個符合的課程",
  "courses": [
    {
      "filename": "ESM 六 9:30-10:30 到府 xxx_all.csv",
      "url": "/viewer.html?file=...",
      "displayName": "ESM 六 9:30-10:30 到府"
    },
    ...
  ]
}
```

---

## 💻 實際範例

### 範例 1：從外部系統跳轉

```html
<!-- HTML 按鈕 -->
<button onclick="openCourse('ESM', '六 0930-1030 到府')">
  查看 ESM 六 9:30-10:30 到府 課程
</button>

<script>
async function openCourse(course, period) {
    const apiUrl = `https://course-viewer.funlearnbar.synology.me/api/find-course?course=${course}&period=${encodeURIComponent(period)}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.success) {
        // 直接跳轉到課程頁面
        window.open(data.url, '_blank');
    } else {
        alert('找不到對應課程：' + period);
    }
}
</script>
```

### 範例 2：JavaScript 直接查詢

```javascript
// 方法 1：使用 find-course API
async function getCourseUrl(course, period) {
    const response = await fetch(
        `https://course-viewer.funlearnbar.synology.me/api/find-course?course=${course}&period=${encodeURIComponent(period)}`
    );
    const data = await response.json();
    return data.success ? data.url : null;
}

// 使用
const url = await getCourseUrl('ESM', '六 0930-1030 到府');
if (url) {
    window.location.href = url;
}
```

### 範例 3：Python 後端調用

```python
import requests

def get_course_url(course, period):
    api_url = f"https://course-viewer.funlearnbar.synology.me/api/find-course"
    params = {
        'course': course,
        'period': period
    }
    
    response = requests.get(api_url, params=params)
    data = response.json()
    
    if data['success']:
        return data['url']
    return None

# 使用
url = get_course_url('ESM', '六 0930-1030 到府')
print(url)
```

---

## 📋 快速對照表

### 常見課程對照

| 課程類型 | 時段範例 | API 查詢 | 前端 URL |
|---------|---------|---------|----------|
| ESM 六 到府 | 六 9:30-10:30 | `?course=ESM&period=六 0930-1030 到府` | [查看連結](https://course-viewer.funlearnbar.synology.me/viewer.html?file=ESM%20%E5%85%AD%209%3A30-10%3A30%20%E5%88%B0%E5%BA%9C%202620a4c0-ed84-80ee-98d8-f9cb54b5cbaf_all.csv) |
| ESM 日 | 日 9:30-10:30 | `?course=ESM&period=日 0930-1030` | [查看連結](https://course-viewer.funlearnbar.synology.me/viewer.html?file=ESM%20%E6%97%A5%209%3A30-10%3A30%202620a4c0-ed84-803a-bbb6-ddbf61e03e08_all.csv) |
| SPIKE 五 外 | 五 10:15-11:40 | `?course=SPIKE&period=五 1015-1140 外` | [查看連結](https://course-viewer.funlearnbar.synology.me/viewer.html?file=SPIKE%20%E4%BA%94%2010%3A15-11%3A40%20%E5%A4%96%20%202720a4c0-ed84-81e6-8edb-d189df2b16d8_all.csv) |
| SPM 一 到府 | 一 19:30-20:30 | `?course=SPM&period=一 1930-2030 到府` | [查看連結](https://course-viewer.funlearnbar.synology.me/viewer.html?file=SPM%20%E4%B8%80%201930-2030%20%E5%88%B0%E5%BA%9C%20%202680a4c0-ed84-8112-acfa-d1a1d869cf01_all.csv) |

---

## 🔧 測試命令

### 1. 測試 API（命令列）

```bash
# 基本測試
curl "https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六%200930-1030%20到府"

# 查看格式化 JSON
curl -s "https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六%200930-1030%20到府" | python3 -m json.tool
```

### 2. 測試不同格式

```bash
# 測試 1：標準格式
curl "https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六%200930-1030%20到府"

# 測試 2：帶冒號
curl "https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六%209:30-10:30%20到府"

# 測試 3：無位置標記
curl "https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=日%200930-1030"

# 測試 4：外部教學
curl "https://course-viewer.funlearnbar.synology.me/api/find-course?course=SPIKE&period=五%201015-1140%20外"
```

---

## 🎯 比對規則總結

### ✅ 會成功匹配的情況：

| 查詢 | 檔案名稱 | 結果 | 原因 |
|------|---------|------|------|
| 六 0930-1030 到府 | ESM 六 9:30-10:30 到府 | ✅ | 時間正規化後相同 |
| 六 9:30-10:30 | ESM 六 9:30-10:30 到府 | ✅ | 位置可包含 |
| 日 930-1030 | ESM 日 9:30-10:30 | ✅ | 補齊前導0後相同 |
| 一 1930-2030 到府 | SPM 一 1930-2030 到府 | ✅ | 完全匹配 |

### ❌ 不會匹配的情況：

| 查詢 | 檔案名稱 | 結果 | 原因 |
|------|---------|------|------|
| 六 0930-1030 | ESM 日 9:30-10:30 | ❌ | 星期不同 |
| 六 0930-1030 | ESM 六 10:30-12:00 | ❌ | 時間不同 |
| 六 0930-1030 到府 | ESM 六 9:30-10:30 外 | ❌ | 位置衝突 |

---

## 🚀 快速開始

### Step 1: 啟動服務
```bash
# 啟動 API 服務器
cd course-viewer
python3 test-api.py &

# 啟動前端服務器
python3 -m http.server 8000 &
```

### Step 2: 測試 API
```bash
# 查詢課程
curl "https://course-viewer.funlearnbar.synology.me/api/find-course?course=ESM&period=六%200930-1030%20到府"
```

### Step 3: 從外部跳轉
```javascript
// 在你的系統中
const course = 'ESM';
const period = '六 0930-1030 到府';
const apiUrl = `https://course-viewer.funlearnbar.synology.me/api/find-course?course=${course}&period=${encodeURIComponent(period)}`;

fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.open(data.url, '_blank');
        }
    });
```

---

## 📝 注意事項

### 1. URL 編碼
在 HTTP 請求中，特殊字符需要編碼：
- 空格 → `%20`
- 冒號 → `%3A`
- 中文 → UTF-8 編碼

使用 `encodeURIComponent()` 自動處理。

### 2. 時間格式建議
為確保最高匹配率，建議使用：
- **四位數字格式**：`0930-1030`
- **包含位置標記**：`六 0930-1030 到府`

### 3. 錯誤處理
始終檢查 `success` 欄位：
```javascript
if (data.success) {
    // 成功處理
} else {
    // 錯誤處理
    console.log(data.message);
}
```

---

## 🔗 相關文檔

- [API使用文檔.md](./API使用文檔.md) - API 詳細規格
- [URL規則說明.md](./URL規則說明.md) - URL 格式說明
- [📋完整URL對照表.md](./📋完整URL對照表.md) - 所有課程連結

---

**完整的比對邏輯和 API 使用指南！** 🎉

如有任何問題，請參考上述文檔或聯繫技術支援。

