# 第三步驟滾動邏輯完整說明

## 概述

第三步驟的滾動邏輯經過多次優化，現在採用智能滾動策略，根據學生人數和用戶操作動態決定滾動位置。

## 核心滾動函數

### 1. `scrollToMainContent()` - 主要滾動函數

**位置：** `public/script.js` 第 1266-1304 行

**功能：** 滾動到當前步驟的標題位置（頂部）

```javascript
function scrollToMainContent() {
    // 延遲一點時間確保 DOM 更新完成
    setTimeout(() => {
        const mainContent = document.querySelector('.step-content.active');
        if (mainContent) {
            // 一律滾動到步驟標題（頂部）
            const stepTitle = mainContent.querySelector('h2');
            if (stepTitle) {
                const targetPosition = stepTitle.offsetTop;
                
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
                
                console.log('📍 滾動到步驟標題:', {
                    stepTitle: stepTitle,
                    targetPosition: targetPosition,
                    currentScroll: window.scrollY,
                    titleText: stepTitle.textContent,
                    currentStep: currentStep,
                    isSelectingCourse: isSelectingCourse
                });
            } else {
                // 如果找不到標題，使用原來的邏輯
                const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                const stepsHeight = document.querySelector('.steps')?.offsetHeight || 0;
                const offset = headerHeight + stepsHeight + 30;
                
                const targetPosition = mainContent.offsetTop - offset;
                
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
            }
        }
    }, 300); // 增加延遲時間，確保DOM完全更新
}
```

**觸發時機：**
- 步驟切換時（`goToStep()` 函數中）
- 講師載入完成後
- 課程載入完成後（僅在步驟2）

### 2. `scrollToTeacherReport()` - 講師報表滾動函數

**位置：** `public/script.js` 第 1307-1351 行

**功能：** 滾動到講師報表區域

```javascript
function scrollToTeacherReport() {
    // 延遲一點時間確保 DOM 更新完成
    setTimeout(() => {
        // 找到講師報表區域
        const teacherSection = document.querySelector('.teacher-section');
        if (teacherSection) {
            // 找到講師報表標題（h3 元素）
            const reportTitle = teacherSection.querySelector('h3');
            if (reportTitle) {
                // 讓講師報表標題切齊頂部
                const targetPosition = reportTitle.offsetTop;
                
                // 平滑滾動
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
                
                console.log('📍 滾動到講師報表區域:', {
                    reportTitle: reportTitle,
                    targetPosition: targetPosition,
                    currentScroll: window.scrollY,
                    titleText: reportTitle.textContent
                });
            } else {
                // 如果找不到標題，滾動到講師報表區域的頂部
                const targetPosition = teacherSection.offsetTop;
                
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
                
                console.log('📍 滾動到講師報表區域（無標題）:', {
                    teacherSection: teacherSection,
                    targetPosition: targetPosition,
                    currentScroll: window.scrollY
                });
            }
        } else {
            console.warn('⚠️ 找不到講師報表區域，滾動到頁面頂部');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 300); // 增加延遲時間，確保DOM完全更新
}
```

**觸發時機：**
- 沒有學生時（在 `displayStudents()` 函數中）
- 輸入框完成輸入後（通過 `forceZoomToNormal()` 函數）

### 3. `scrollToTeacherReportAfterZoom()` - 縮放後滾動函數

**位置：** `public/script.js` 第 652-691 行

**功能：** 在輸入框縮放完成後滾動到講師報表

```javascript
function scrollToTeacherReportAfterZoom() {
    console.log('📍 縮放後滾動到講師報表標題');
    
    // 直接執行滾動，因為縮放已經在外部完成
    setTimeout(() => {
        // 查找講師報表標題
        const teacherSection = document.querySelector('.teacher-section');
        if (teacherSection) {
            const reportTitle = teacherSection.querySelector('h3');
            if (reportTitle) {
                const targetPosition = reportTitle.offsetTop;
                window.scrollTo({ 
                    top: Math.max(0, targetPosition), 
                    behavior: 'smooth' 
                });
                console.log('📍 已滾動到講師報表標題:', {
                    reportTitle: reportTitle,
                    targetPosition: targetPosition,
                    currentScroll: window.scrollY,
                    titleText: reportTitle.textContent
                });
            } else {
                // 如果找不到標題，滾動到講師報表區域
                const targetPosition = teacherSection.offsetTop;
                window.scrollTo({ 
                    top: Math.max(0, targetPosition), 
                    behavior: 'smooth' 
                });
                console.log('📍 已滾動到講師報表區域:', {
                    teacherSection: teacherSection,
                    targetPosition: targetPosition,
                    currentScroll: window.scrollY
                });
            }
        } else {
            console.warn('⚠️ 找不到講師報表區域，滾動到頁面頂部');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 50); // 減少延遲，因為縮放已經完成
}
```

## 智能滾動策略

### 1. 學生人數判斷邏輯

**位置：** `displayStudents()` 函數中（第 980-996 行）

```javascript
// 沒有學生時，滾動到講師報表區域（現在在最上方）
console.log('📍 步驟3學生API回應：沒有學生，滾動到講師報表區域');
scrollToTeacherReport();

return;

// 當有學生時，顯示學生名單區塊
console.log('📍 步驟3學生API回應：有學生，保持在學生列表區域', {
    studentCount: studentList.length,
    students: studentList.map(s => s.name)
});
```

**邏輯：**
- **沒有學生**：自動滾動到講師報表區域
- **有學生**：保持在學生列表區域，不觸發滾動

### 2. 課程選擇防滾動機制

**位置：** 課程卡片點擊處理（第 755-780 行）

```javascript
if (clickCount === 1) {
    // 單擊：選擇課程
    clickTimer = setTimeout(() => {
        // 設置選擇課程標記，避免觸發滾動
        isSelectingCourse = true;
        console.log('📍 課程卡片單擊，設置選擇標記');
        
        selectCourse(course.course, course.time, course.note || '', event);
        clickCount = 0;
    }, 200);
}
```

**防滾動機制：**
- 使用 `isSelectingCourse` 標記防止課程選擇時觸發滾動
- 在 `selectCourse()` 函數中延遲清除標記

### 3. 輸入框縮放滾動機制

**位置：** `forceZoomToNormal()` 函數（第 642-649 行）

```javascript
// 等待縮放完成後再滾動
setTimeout(() => {
    console.log('⏳ 縮放完成，準備滾動到講師報表');
    scrollToTeacherReportAfterZoom();
}, 300); // 增加延遲時間確保縮放完成
```

**機制：**
- 輸入框完成輸入後自動縮放回正常大小
- 縮放完成後滾動到講師報表區域

## 滾動觸發時機

### 1. 自動觸發

| 時機 | 函數 | 滾動目標 | 條件 |
|------|------|----------|------|
| 步驟切換 | `goToStep()` | 步驟標題 | 無條件 |
| 講師載入完成 | `loadTeachers()` | 步驟標題 | 無條件 |
| 課程載入完成 | `loadCourses()` | 步驟標題 | 僅在步驟2 |
| 沒有學生 | `displayStudents()` | 講師報表 | 學生數量為0 |
| 輸入完成 | `forceZoomToNormal()` | 講師報表 | 無條件 |

### 2. 手動觸發

| 操作 | 函數 | 滾動目標 | 說明 |
|------|------|----------|------|
| 點擊下一步 | `nextStep()` | 步驟標題 | 通過 `goToStep()` |
| 直接跳轉 | `handleDirectStep3Redirect()` | 步驟標題 | 通過 `goToStep()` |

## 滾動配置參數

### 1. 延遲時間

```javascript
// 主要滾動延遲
setTimeout(() => {
    // 滾動邏輯
}, 300); // 300ms 延遲

// 縮放後滾動延遲
setTimeout(() => {
    // 滾動邏輯
}, 50); // 50ms 延遲（較短，因為縮放已完成）
```

### 2. 滾動行為

```javascript
window.scrollTo({
    top: Math.max(0, targetPosition),
    behavior: 'smooth' // 平滑滾動
});
```

### 3. 目標位置計算

```javascript
// 步驟標題位置
const targetPosition = stepTitle.offsetTop;

// 講師報表標題位置
const targetPosition = reportTitle.offsetTop;

// 備用位置計算（包含header和steps高度）
const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
const stepsHeight = document.querySelector('.steps')?.offsetHeight || 0;
const offset = headerHeight + stepsHeight + 30;
const targetPosition = mainContent.offsetTop - offset;
```

## 調試和日誌

### 1. 滾動日誌

所有滾動操作都有詳細的 console.log 記錄：

```javascript
console.log('📍 滾動到步驟標題:', {
    stepTitle: stepTitle,
    targetPosition: targetPosition,
    currentScroll: window.scrollY,
    titleText: stepTitle.textContent,
    currentStep: currentStep,
    isSelectingCourse: isSelectingCourse
});
```

### 2. 狀態追蹤

```javascript
console.log('📍 步驟3學生API回應：沒有學生，滾動到講師報表區域');
console.log('📍 步驟3學生API回應：有學生，保持在學生列表區域', {
    studentCount: studentList.length,
    students: studentList.map(s => s.name)
});
```

## 常見問題和解決方案

### 1. 滾動不生效

**原因：** DOM 未完全更新
**解決：** 增加延遲時間或檢查元素是否存在

### 2. 重複滾動

**原因：** 多個事件同時觸發滾動
**解決：** 使用標記機制（如 `isSelectingCourse`）防止重複觸發

### 3. 滾動位置不準確

**原因：** 元素位置計算錯誤
**解決：** 檢查 offsetTop 值，使用備用計算方法

## 最佳實踐

1. **延遲執行**：所有滾動操作都應該延遲執行，確保 DOM 完全更新
2. **狀態檢查**：滾動前檢查目標元素是否存在
3. **日誌記錄**：記錄滾動操作的詳細信息，便於調試
4. **條件判斷**：根據實際情況決定是否需要滾動
5. **平滑體驗**：使用 `behavior: 'smooth'` 提供更好的用戶體驗

## 版本歷史

- **v1.0**：基本滾動功能
- **v2.0**：添加智能滾動策略（根據學生人數）
- **v3.0**：添加課程選擇防滾動機制
- **v4.0**：添加輸入框縮放滾動機制
- **v5.0**：優化滾動邏輯，統一滾動到步驟標題

---

**最後更新：** 2024年1月
**維護者：** 開發團隊
