/**
 * Google Sheets API 測試腳本
 * 測試第三步驟相關的所有 Google Sheets API 調用
 */

const axios = require('axios');

// API 端點配置
const API_ENDPOINTS = {
    FLB_API: 'https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec',
    ATTENDANCE_API: 'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec',
    LINK_CALENDAR_API: 'https://script.google.com/macros/s/AKfycbzFwsd8I_5WJdl8jU_gycSKFxR836GhOzIHEU1bGj9mH70ESbJPj-uTD_YC9lEbo--v_A/exec',
    REPORT_API: 'https://script.google.com/macros/s/AKfycbyfoNl1EBk5Wjv6rbAadCb0ZxZLupVl90PVGYUar-qNqVDEa0PbXzwC4t9DL39sVQ-aJQ/exec'
};

// 測試資料
const testData = {
    course: 'SPM',
    period: '日 1330-1500 松山',
    date: new Date().toISOString().split('T')[0],
    teacher: 'Tim',
    studentName: '測試學生'
};

/**
 * 1. 測試獲取學生簽到狀態
 */
async function testGetStudentAttendance() {
    console.log('🔍 測試獲取學生簽到狀態...');
    
    try {
        const response = await axios.post(API_ENDPOINTS.ATTENDANCE_API, {
            action: 'getRosterAttendance',
            course: testData.course,
            period: testData.period
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'NID=525=nsWVvbAon67C2qpyiEHQA3SUio_GqBd7RqUFU6BwB97_4LHggZxLpDgSheJ7WN4w3Z4dCQBiFPG9YKAqZgAokFYCuuQw04dkm-FX9-XHAIBIqJf1645n3RZrg86GcUVJOf3gN-5eTHXFIaovTmgRC6cXllv82SnQuKsGMq7CHH60XDSwyC99s9P2gmyXLppI'
            }
        });

        console.log('✅ 學生簽到狀態獲取成功:', {
            success: response.data.success,
            course: response.data.course,
            period: response.data.period,
            count: response.data.count,
            studentsCount: response.data.students ? response.data.students.length : 0
        });

        // 顯示學生簽到狀態
        if (response.data.students) {
            response.data.students.forEach(student => {
                console.log(`📋 學生 ${student.name}:`, student.attendance);
            });
        }

        return response.data;
    } catch (error) {
        console.error('❌ 獲取學生簽到狀態失敗:', error.message);
        throw error;
    }
}

/**
 * 2. 測試記錄學生簽到
 */
async function testMarkStudentAttendance(present = true) {
    console.log(`📝 測試記錄學生簽到: ${testData.studentName} - ${present ? '出席' : '缺席'}`);
    
    try {
        const response = await axios.post(API_ENDPOINTS.FLB_API, {
            action: 'markAttendance',
            studentName: testData.studentName,
            date: testData.date,
            present: present,
            teacherName: testData.teacher,
            courseName: testData.course
        });

        console.log('✅ 學生簽到記錄成功:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ 記錄學生簽到失敗:', error.message);
        throw error;
    }
}

/**
 * 3. 測試獲取講師列表
 */
async function testGetTeachers() {
    console.log('👨‍🏫 測試獲取講師列表...');
    
    try {
        const response = await axios.post(API_ENDPOINTS.FLB_API, {
            action: 'getTeacherList'
        });

        console.log('✅ 講師列表獲取成功:', {
            success: response.data.success,
            teachersCount: response.data.teachers ? response.data.teachers.length : 0
        });

        // 顯示講師資訊
        if (response.data.teachers) {
            response.data.teachers.forEach(teacher => {
                console.log(`👨‍🏫 講師 ${teacher.name}:`, {
                    webApi: teacher.webApi,
                    reportApi: teacher.reportApi,
                    userId: teacher.userId
                });
            });
        }

        return response.data;
    } catch (error) {
        console.error('❌ 獲取講師列表失敗:', error.message);
        throw error;
    }
}

/**
 * 4. 測試獲取講師課程
 */
async function testGetTeacherCourses() {
    console.log('📚 測試獲取講師課程...');
    
    try {
        const response = await axios.post(API_ENDPOINTS.FLB_API, {
            action: 'getCoursesByTeacher',
            teacher: testData.teacher
        });

        console.log('✅ 講師課程獲取成功:', {
            success: response.data.success,
            coursesCount: response.data.courseTimes ? response.data.courseTimes.length : 0
        });

        // 顯示課程資訊
        if (response.data.courseTimes) {
            response.data.courseTimes.forEach(course => {
                console.log(`📚 課程 ${course.course}:`, {
                    time: course.time,
                    note: course.note || '無備註'
                });
            });
        }

        return response.data;
    } catch (error) {
        console.error('❌ 獲取講師課程失敗:', error.message);
        throw error;
    }
}

/**
 * 5. 測試提交講師簽到報告
 */
async function testSubmitTeacherReport() {
    console.log('📊 測試提交講師簽到報告...');
    
    try {
        // 先獲取講師列表以獲取 webApi
        const teachersResponse = await axios.post(API_ENDPOINTS.FLB_API, {
            action: 'getTeacherList'
        });

        if (!teachersResponse.data.success || !teachersResponse.data.teachers) {
            throw new Error('無法獲取講師列表');
        }

        const teacher = teachersResponse.data.teachers.find(t => t.name === testData.teacher);
        if (!teacher || !teacher.webApi) {
            throw new Error(`找不到講師 ${testData.teacher} 的 webApi`);
        }

        const response = await axios.post(teacher.webApi, {
            action: 'submitTeacherReport',
            teacherName: testData.teacher,
            courseName: testData.course,
            courseTime: testData.period,
            date: testData.date,
            studentCount: 15,
            courseContent: '基礎動作練習',
            assistantCount: 12
        });

        console.log('✅ 講師簽到報告提交成功:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ 提交講師簽到報告失敗:', error.message);
        throw error;
    }
}

/**
 * 完整測試流程
 */
async function runFullTest() {
    console.log('🧪 開始 Google Sheets API 完整測試...');
    console.log('測試資料:', testData);
    console.log('---');

    try {
        // 1. 獲取講師列表
        const teachers = await testGetTeachers();
        console.log('---');

        // 2. 獲取講師課程
        const courses = await testGetTeacherCourses();
        console.log('---');

        // 3. 獲取學生簽到狀態
        const attendance = await testGetStudentAttendance();
        console.log('---');

        // 4. 記錄學生簽到
        await testMarkStudentAttendance(true);
        console.log('---');

        // 5. 提交講師簽到報告
        await testSubmitTeacherReport();
        console.log('---');

        console.log('🎉 所有 Google Sheets API 測試完成！');

    } catch (error) {
        console.error('💥 測試過程中發生錯誤:', error.message);
    }
}

/**
 * 單獨測試特定功能
 */
async function testSpecificFunction(functionName) {
    console.log(`🎯 測試特定功能: ${functionName}`);
    
    switch (functionName) {
        case 'attendance':
            await testGetStudentAttendance();
            break;
        case 'mark':
            await testMarkStudentAttendance();
            break;
        case 'teachers':
            await testGetTeachers();
            break;
        case 'courses':
            await testGetTeacherCourses();
            break;
        case 'report':
            await testSubmitTeacherReport();
            break;
        default:
            console.log('可用的測試功能: attendance, mark, teachers, courses, report');
    }
}

// 如果在 Node.js 環境中運行
if (typeof window === 'undefined') {
    // Node.js 環境
    console.log('🚀 在 Node.js 環境中運行 Google Sheets API 測試');
    
    // 運行完整測試
    runFullTest();
    
    // 或者測試特定功能
    // testSpecificFunction('attendance');
} else {
    // 瀏覽器環境
    console.log('在瀏覽器控制台中運行以下命令:');
    console.log('runFullTest() - 運行完整測試');
    console.log('testSpecificFunction("attendance") - 測試獲取學生簽到狀態');
    console.log('testSpecificFunction("mark") - 測試記錄學生簽到');
    console.log('testSpecificFunction("teachers") - 測試獲取講師列表');
    console.log('testSpecificFunction("courses") - 測試獲取講師課程');
    console.log('testSpecificFunction("report") - 測試提交講師簽到報告');
}

// 匯出函數供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testGetStudentAttendance,
        testMarkStudentAttendance,
        testGetTeachers,
        testGetTeacherCourses,
        testSubmitTeacherReport,
        runFullTest,
        testSpecificFunction
    };
}
