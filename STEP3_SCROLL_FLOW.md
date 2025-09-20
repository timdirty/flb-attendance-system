# 第三步驟滾動邏輯流程圖

## 主要滾動流程

```
用戶操作
    ↓
步驟切換 (goToStep)
    ↓
scrollToMainContent()
    ↓
延遲 300ms
    ↓
找到步驟標題 (h2)
    ↓
滾動到步驟標題位置
    ↓
顯示詳細日誌
```

## 學生載入後的滾動邏輯

```
loadStudents() 完成
    ↓
displayStudents(studentList)
    ↓
檢查學生數量
    ↓
┌─────────────────┬─────────────────┐
│   沒有學生      │     有學生      │
│                 │                 │
│ scrollToTeacherReport() │ 保持在學生列表區域 │
│                 │                 │
│ 滾動到講師報表  │ 不觸發滾動      │
└─────────────────┴─────────────────┘
```

## 課程選擇防滾動機制

```
課程卡片點擊
    ↓
設置 isSelectingCourse = true
    ↓
selectCourse()
    ↓
延遲 500ms
    ↓
設置 isSelectingCourse = false
    ↓
恢復滾動功能
```

## 輸入框縮放滾動機制

```
輸入框完成輸入
    ↓
forceZoomToNormal()
    ↓
延遲 300ms (等待縮放完成)
    ↓
scrollToTeacherReportAfterZoom()
    ↓
延遲 50ms
    ↓
滾動到講師報表區域
```

## 滾動函數層級結構

```
scrollToMainContent()
├── 延遲 300ms
├── 找到步驟標題
├── 計算目標位置
├── 執行平滑滾動
└── 記錄詳細日誌

scrollToTeacherReport()
├── 延遲 300ms
├── 找到講師報表區域
├── 找到講師報表標題 (h3)
├── 計算目標位置
├── 執行平滑滾動
└── 記錄詳細日誌

scrollToTeacherReportAfterZoom()
├── 延遲 50ms (較短，因為縮放已完成)
├── 找到講師報表區域
├── 找到講師報表標題 (h3)
├── 計算目標位置
├── 執行平滑滾動
└── 記錄詳細日誌
```

## 滾動觸發條件

### 自動觸發
- ✅ 步驟切換時
- ✅ 講師載入完成後
- ✅ 課程載入完成後（僅步驟2）
- ✅ 沒有學生時
- ✅ 輸入框完成輸入後

### 手動觸發
- ✅ 點擊下一步按鈕
- ✅ 直接跳轉到第三步驟
- ✅ 課程選擇（雙擊進入下一步）

### 防觸發條件
- ❌ 課程選擇時（單擊）
- ❌ 正在選擇課程標記為 true 時

## 滾動目標位置

### 1. 步驟標題位置
```javascript
const targetPosition = stepTitle.offsetTop;
```

### 2. 講師報表標題位置
```javascript
const targetPosition = reportTitle.offsetTop;
```

### 3. 備用位置計算
```javascript
const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
const stepsHeight = document.querySelector('.steps')?.offsetHeight || 0;
const offset = headerHeight + stepsHeight + 30;
const targetPosition = mainContent.offsetTop - offset;
```

## 滾動配置

### 延遲時間
- **主要滾動**：300ms
- **縮放後滾動**：50ms
- **課程選擇恢復**：500ms

### 滾動行為
```javascript
window.scrollTo({
    top: Math.max(0, targetPosition),
    behavior: 'smooth'
});
```

### 日誌記錄
所有滾動操作都包含詳細的 console.log 記錄，包括：
- 目標元素
- 目標位置
- 當前滾動位置
- 元素文本內容
- 當前步驟
- 選擇狀態

## 錯誤處理

### 找不到目標元素
```javascript
if (!stepTitle) {
    // 使用備用邏輯
    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
    const stepsHeight = document.querySelector('.steps')?.offsetHeight || 0;
    const offset = headerHeight + stepsHeight + 30;
    const targetPosition = mainContent.offsetTop - offset;
}
```

### 找不到講師報表區域
```javascript
if (!teacherSection) {
    console.warn('⚠️ 找不到講師報表區域，滾動到頁面頂部');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

## 性能優化

1. **延遲執行**：避免 DOM 未完全更新時滾動
2. **條件檢查**：只在必要時執行滾動
3. **狀態管理**：使用標記防止重複觸發
4. **平滑滾動**：提供更好的用戶體驗
5. **詳細日誌**：便於調試和維護

---

**最後更新：** 2024年1月
**維護者：** 開發團隊
