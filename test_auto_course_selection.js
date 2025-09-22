/**
 * 自動課程選擇功能測試
 * 測試系統是否能夠正確檢測正在進行的課程並自動選擇
 */

// 模擬課程數據
const mockCourses = [
    {
        course: 'SPM',
        time: '日 1330-1500 松山',
        location: '松山',
        students: '3',
        note: ''
    },
    {
        course: 'IELTS',
        time: '一 1930-2030 到府',
        location: '到府',
        students: '2',
        note: ''
    },
    {
        course: 'TOEFL',
        time: '二 1600-1700 外',
        location: '外',
        students: '1',
        note: ''
    }
];

// 模擬時間計算函數（簡化版）
function mockCalculateTimeDistance(courseTime) {
    // 模擬當前時間為週日 13:20（課程開始前10分鐘）
    const currentTime = new Date();
    currentTime.setHours(13, 20, 0, 0); // 週日 13:20
    
    // 解析課程時間
    const timeMatch = courseTime.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
    if (!timeMatch) return Infinity;
    
    const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7 };
    const weekdays = timeMatch[1].split('');
    const startHour = parseInt(timeMatch[2].substring(0, 2));
    const startMinute = parseInt(timeMatch[2].substring(2, 4));
    const endHour = parseInt(timeMatch[3].substring(0, 2));
    const endMinute = parseInt(timeMatch[3].substring(2, 4));
    
    const currentWeekday = 7; // 週日
    const currentHour = 13;
    const currentMinute = 20;
    
    const courseStartMinutes = startHour * 60 + startMinute;
    const courseEndMinutes = endHour * 60 + endMinute;
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // 檢查是否在課程時間內
    if (weekdays.includes('日') && courseStartMinutes <= currentTimeInMinutes && courseEndMinutes > currentTimeInMinutes) {
        return 0; // 正在進行中
    }
    
    // 檢查是否即將開始（10分鐘內）
    if (weekdays.includes('日') && courseStartMinutes > currentTimeInMinutes) {
        const minutesUntilStart = courseStartMinutes - currentTimeInMinutes;
        if (minutesUntilStart <= 10) {
            return minutesUntilStart; // 返回剩餘分鐘數
        }
    }
    
    return Infinity; // 其他情況
}

// 模擬自動選擇函數
function mockCheckAndAutoSelectCourse(courses) {
    console.log('🔍 檢查是否有即將開始或正在進行的課程需要自動選擇');
    
    // 找到即將開始（10分鐘內）或正在進行的課程
    const upcomingCourse = courses.find(course => {
        const timeDistance = mockCalculateTimeDistance(course.time);
        // 課程即將開始（10分鐘內）或正在進行中
        return timeDistance >= 0 && timeDistance <= 10;
    });
    
    if (upcomingCourse) {
        const timeDistance = mockCalculateTimeDistance(upcomingCourse.time);
        const statusText = timeDistance === 0 ? '正在進行中' : `還有 ${timeDistance} 分鐘開始`;
        
        console.log('✅ 發現即將開始或正在進行的課程，自動選擇:', {
            course: upcomingCourse.course,
            time: upcomingCourse.time,
            note: upcomingCourse.note,
            timeDistance: timeDistance,
            status: statusText
        });
        
        console.log(`📢 顯示提示：檢測到${statusText}的課程：${upcomingCourse.course}，自動選擇中...`);
        console.log('🚀 自動跳轉到第三步驟');
        
        return {
            success: true,
            selectedCourse: upcomingCourse,
            message: `自動選擇成功 - ${statusText}`
        };
    } else {
        console.log('ℹ️ 沒有即將開始或正在進行的課程，保持正常選擇模式');
        return {
            success: false,
            selectedCourse: null,
            message: '沒有即將開始或正在進行的課程'
        };
    }
}

// 執行測試
console.log('=== 自動課程選擇功能測試 ===');
console.log('模擬當前時間：週日 13:20（課程開始前10分鐘）');
console.log('課程列表：');
mockCourses.forEach((course, index) => {
    const timeDistance = mockCalculateTimeDistance(course.time);
    console.log(`${index + 1}. ${course.course} (${course.time}) - 時間距離: ${timeDistance}`);
});

console.log('\n--- 執行自動選擇檢查 ---');
const result = mockCheckAndAutoSelectCourse(mockCourses);

console.log('\n--- 測試結果 ---');
console.log('成功:', result.success);
console.log('選擇的課程:', result.selectedCourse);
console.log('訊息:', result.message);

// 測試不同時間場景
console.log('\n=== 測試不同時間場景 ===');

// 場景1：課程開始前
console.log('\n場景1：課程開始前（週日 13:00）');
const beforeCourse = mockCourses.map(course => ({
    ...course,
    time: '日 1330-1500 松山' // 13:30-15:00
}));

// 模擬13:00的時間計算
function mockCalculateTimeDistanceBefore(courseTime) {
    const timeMatch = courseTime.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
    if (!timeMatch) return Infinity;
    
    const startHour = parseInt(timeMatch[2].substring(0, 2));
    const startMinute = parseInt(timeMatch[2].substring(2, 4));
    const currentTimeInMinutes = 13 * 60 + 0; // 13:00
    const courseStartMinutes = startHour * 60 + startMinute;
    
    return courseStartMinutes - currentTimeInMinutes; // 30分鐘後開始
}

beforeCourse.forEach(course => {
    const timeDistance = mockCalculateTimeDistanceBefore(course.time);
    console.log(`${course.course} (${course.time}) - 時間距離: ${timeDistance}分鐘`);
});

// 場景2：課程結束後
console.log('\n場景2：課程結束後（週日 16:00）');
const afterCourse = mockCourses.map(course => ({
    ...course,
    time: '日 1330-1500 松山' // 13:30-15:00
}));

// 模擬16:00的時間計算
function mockCalculateTimeDistanceAfter(courseTime) {
    const timeMatch = courseTime.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
    if (!timeMatch) return Infinity;
    
    const endHour = parseInt(timeMatch[3].substring(0, 2));
    const endMinute = parseInt(timeMatch[3].substring(2, 4));
    const currentTimeInMinutes = 16 * 60 + 0; // 16:00
    const courseEndMinutes = endHour * 60 + endMinute;
    
    return currentTimeInMinutes - courseEndMinutes; // 1小時前結束
}

afterCourse.forEach(course => {
    const timeDistance = mockCalculateTimeDistanceAfter(course.time);
    console.log(`${course.course} (${course.time}) - 時間距離: ${timeDistance}分鐘`);
});

// 測試簽到時間限制功能
console.log('\n=== 測試簽到時間限制功能 ===');

// 模擬簽到時間檢查函數
function mockCanMarkAttendance(courseTime) {
    const timeMatch = courseTime.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
    if (!timeMatch) return { canMark: false, reason: '無法解析課程時間' };
    
    const startHour = parseInt(timeMatch[2].substring(0, 2));
    const startMinute = parseInt(timeMatch[2].substring(2, 4));
    const endHour = parseInt(timeMatch[3].substring(0, 2));
    const endMinute = parseInt(timeMatch[3].substring(2, 4));
    
    const courseStartMinutes = startHour * 60 + startMinute;
    const courseEndMinutes = endHour * 60 + endMinute;
    const currentTimeInMinutes = 13 * 60 + 20; // 13:20
    
    // 檢查是否在簽到時間範圍內（課程開始後到課程結束後2小時）
    const twoHoursAfterEnd = courseEndMinutes + 120; // 課程結束後2小時
    const isWithinAttendanceWindow = currentTimeInMinutes >= courseStartMinutes && currentTimeInMinutes <= twoHoursAfterEnd;
    
    if (!isWithinAttendanceWindow) {
        if (currentTimeInMinutes < courseStartMinutes) {
            const minutesUntilStart = courseStartMinutes - currentTimeInMinutes;
            return { 
                canMark: false, 
                reason: `課程尚未開始，還需等待 ${minutesUntilStart} 分鐘`,
                minutesUntil: minutesUntilStart
            };
        } else {
            return { canMark: false, reason: '課程結束超過2小時，無法簽到' };
        }
    }
    
    return { canMark: true, reason: '可以進行簽到' };
}

// 測試不同時間的簽到限制
const testTimes = [
    { time: '日 1330-1500 松山', description: '課程 13:30-15:00，當前 13:20（課程開始前）' },
    { time: '日 1400-1500 松山', description: '課程 14:00-15:00，當前 13:20（課程開始前）' },
    { time: '日 1200-1300 松山', description: '課程 12:00-13:00，當前 13:20（課程結束後1小時20分鐘）' },
    { time: '日 1330-1500 松山', description: '課程 13:30-15:00，當前 13:35（課程開始後）' },
    { time: '日 1200-1300 松山', description: '課程 12:00-13:00，當前 15:30（課程結束後2小時30分鐘）' },
    { time: '日 1330-1500 松山', description: '課程 13:30-15:00，當前 16:30（課程結束後1小時30分鐘）' }
];

testTimes.forEach((test, index) => {
    // 根據測試案例調整當前時間
    let currentTimeInMinutes;
    if (test.description.includes('13:35')) {
        currentTimeInMinutes = 13 * 60 + 35; // 13:35
    } else if (test.description.includes('15:30')) {
        currentTimeInMinutes = 15 * 60 + 30; // 15:30
    } else if (test.description.includes('16:30')) {
        currentTimeInMinutes = 16 * 60 + 30; // 16:30
    } else {
        currentTimeInMinutes = 13 * 60 + 20; // 13:20
    }
    
    // 重新計算結果
    const timeMatch = test.time.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
    if (timeMatch) {
        const startHour = parseInt(timeMatch[2].substring(0, 2));
        const startMinute = parseInt(timeMatch[2].substring(2, 4));
        const endHour = parseInt(timeMatch[3].substring(0, 2));
        const endMinute = parseInt(timeMatch[3].substring(2, 4));
        
        const courseStartMinutes = startHour * 60 + startMinute;
        const courseEndMinutes = endHour * 60 + endMinute;
        
        // 檢查是否在簽到時間範圍內（課程開始後到課程結束後2小時）
        const twoHoursAfterEnd = courseEndMinutes + 120; // 課程結束後2小時
        const isWithinAttendanceWindow = currentTimeInMinutes >= courseStartMinutes && currentTimeInMinutes <= twoHoursAfterEnd;
        
        let result;
        if (!isWithinAttendanceWindow) {
            if (currentTimeInMinutes < courseStartMinutes) {
                const minutesUntilStart = courseStartMinutes - currentTimeInMinutes;
                result = { 
                    canMark: false, 
                    reason: `課程尚未開始，還需等待 ${minutesUntilStart} 分鐘`,
                    minutesUntil: minutesUntilStart
                };
            } else {
                result = { canMark: false, reason: '課程結束超過2小時，無法簽到' };
            }
        } else {
            result = { canMark: true, reason: '可以進行簽到' };
        }
        
        console.log(`\n測試 ${index + 1}: ${test.description}`);
        console.log(`結果: ${result.canMark ? '✅ 可以簽到' : '❌ 不能簽到'}`);
        console.log(`原因: ${result.reason}`);
    }
});

console.log('\n=== 測試完成 ===');
