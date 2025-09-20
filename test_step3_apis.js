/**
 * 第三步驟 API 測試腳本
 * 展示如何調用所有相關的 API 端點
 */

const API_BASE_URL = 'https://liff-sttendence-0908-production.up.railway.app';

// 測試資料
const testData = {
    teacher: 'Tim',
    course: 'SPM 南京復興教室',
    time: '日 1330-1500 松山',
    date: new Date().toISOString().split('T')[0] // 今天的日期
};

/**
 * 1. 獲取課程學生列表
 */
async function testGetStudents() {
    console.log('🔍 測試獲取學生列表...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/course-students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course: testData.course,
                time: testData.time,
                date: testData.date
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 學生列表獲取成功:', data);
        return data;
    } catch (error) {
        console.error('❌ 獲取學生列表失敗:', error);
        throw error;
    }
}

/**
 * 2. 學生簽到
 */
async function testStudentAttendance(studentName, status = 'present') {
    console.log(`📝 測試學生簽到: ${studentName} - ${status}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/student-attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course: testData.course,
                time: testData.time,
                date: testData.date,
                studentName: studentName,
                status: status
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 學生簽到成功:', data);
        return data;
    } catch (error) {
        console.error('❌ 學生簽到失敗:', error);
        throw error;
    }
}

/**
 * 3. 講師簽到
 */
async function testTeacherReport() {
    console.log('👨‍🏫 測試講師簽到...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/teacher-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacher: testData.teacher,
                course: testData.course,
                time: testData.time,
                date: testData.date,
                courseContent: '基礎動作練習',
                studentCount: 15,
                attendanceCount: 12
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 講師簽到成功:', data);
        return data;
    } catch (error) {
        console.error('❌ 講師簽到失敗:', error);
        throw error;
    }
}

/**
 * 4. 直接跳轉到第三步驟
 */
async function testDirectStep3() {
    console.log('🚀 測試直接跳轉到第三步驟...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/direct-step3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacher: testData.teacher,
                course: testData.course,
                time: testData.time
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 直接跳轉成功:', data);
        return data;
    } catch (error) {
        console.error('❌ 直接跳轉失敗:', error);
        throw error;
    }
}

/**
 * 5. 獲取第三步驟頁面
 */
async function testGetStep3Page() {
    console.log('📄 測試獲取第三步驟頁面...');
    
    try {
        const url = new URL(`${API_BASE_URL}/step3`);
        url.searchParams.append('teacher', testData.teacher);
        url.searchParams.append('course', testData.course);
        url.searchParams.append('time', testData.time);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        console.log('✅ 第三步驟頁面獲取成功，HTML 長度:', html.length);
        return html;
    } catch (error) {
        console.error('❌ 獲取第三步驟頁面失敗:', error);
        throw error;
    }
}

/**
 * 完整測試流程
 */
async function runFullTest() {
    console.log('🧪 開始第三步驟 API 完整測試...');
    console.log('測試資料:', testData);
    console.log('---');

    try {
        // 1. 獲取學生列表
        const students = await testGetStudents();
        console.log('---');

        // 2. 如果有學生，測試學生簽到
        if (students.success && students.students && students.students.length > 0) {
            const firstStudent = students.students[0];
            await testStudentAttendance(firstStudent.name, 'present');
            console.log('---');
        }

        // 3. 測試講師簽到
        await testTeacherReport();
        console.log('---');

        // 4. 測試直接跳轉
        const directResult = await testDirectStep3();
        console.log('---');

        // 5. 測試獲取頁面
        await testGetStep3Page();
        console.log('---');

        console.log('🎉 所有測試完成！');
        
        // 顯示重定向 URL
        if (directResult.success && directResult.redirectUrl) {
            console.log('🔗 重定向 URL:', directResult.redirectUrl);
        }

    } catch (error) {
        console.error('💥 測試過程中發生錯誤:', error);
    }
}

/**
 * 單獨測試特定功能
 */
async function testSpecificFunction(functionName) {
    console.log(`🎯 測試特定功能: ${functionName}`);
    
    switch (functionName) {
        case 'students':
            await testGetStudents();
            break;
        case 'attendance':
            await testStudentAttendance('測試學生', 'present');
            break;
        case 'teacher':
            await testTeacherReport();
            break;
        case 'direct':
            await testDirectStep3();
            break;
        case 'page':
            await testGetStep3Page();
            break;
        default:
            console.log('可用的測試功能: students, attendance, teacher, direct, page');
    }
}

// 如果在 Node.js 環境中運行
if (typeof window === 'undefined') {
    // Node.js 環境
    const fetch = require('node-fetch');
    
    // 運行完整測試
    runFullTest();
    
    // 或者測試特定功能
    // testSpecificFunction('students');
} else {
    // 瀏覽器環境
    console.log('在瀏覽器控制台中運行以下命令:');
    console.log('runFullTest() - 運行完整測試');
    console.log('testSpecificFunction("students") - 測試獲取學生列表');
    console.log('testSpecificFunction("attendance") - 測試學生簽到');
    console.log('testSpecificFunction("teacher") - 測試講師簽到');
    console.log('testSpecificFunction("direct") - 測試直接跳轉');
    console.log('testSpecificFunction("page") - 測試獲取頁面');
}

// 匯出函數供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testGetStudents,
        testStudentAttendance,
        testTeacherReport,
        testDirectStep3,
        testGetStep3Page,
        runFullTest,
        testSpecificFunction
    };
}
