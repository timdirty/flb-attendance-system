/**
 * FLB 簽到系統 Node.js SDK
 * 版本: 1.0.0
 * 作者: FLB 開發團隊
 */

const axios = require('axios');

class FLBAttendanceSDK {
    /**
     * 初始化 SDK
     * @param {Object} options - 配置選項
     * @param {string} options.baseURL - API 基礎 URL
     * @param {number} options.timeout - 請求超時時間（毫秒）
     * @param {number} options.retryAttempts - 重試次數
     * @param {number} options.retryDelay - 重試延遲時間（毫秒）
     */
    constructor(options = {}) {
        this.baseURL = (options.baseURL || 'https://liff-sttendence-0908-production.up.railway.app').replace(/\/$/, '');
        this.timeout = options.timeout || 30000;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.apiKey = options.apiKey || null;
        
        // 創建 axios 實例
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'FLB-Attendance-SDK-Node.js/1.0.0'
            }
        });
        
        // 設置 API 金鑰
        if (this.apiKey) {
            this.client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        }
    }

    /**
     * 設置 API 金鑰
     * @param {string} apiKey - API 金鑰
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        if (apiKey) {
            this.client.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
        } else {
            delete this.client.defaults.headers.common['Authorization'];
        }
    }

    /**
     * 執行 API 請求（包含重試機制）
     * @param {string} method - HTTP 方法
     * @param {string} endpoint - API 端點
     * @param {Object} data - 請求數據
     * @returns {Promise<Object>} API 回應數據
     */
    async makeRequest(method, endpoint, data = null) {
        const requestConfig = {
            method: method.toLowerCase(),
            url: endpoint
        };

        if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
            requestConfig.data = data;
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await this.client(requestConfig);
                return response.data;
            } catch (error) {
                console.warn(`API 請求失敗 (嘗試 ${attempt}/${this.retryAttempts}):`, error.message);
                
                if (attempt === this.retryAttempts) {
                    throw new Error(`API 請求失敗，已重試 ${this.retryAttempts} 次: ${error.message}`);
                }
                
                // 等待後重試
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }

    /**
     * 獲取講師列表
     * @returns {Promise<Object>} 講師列表
     */
    async getTeachers() {
        return await this.makeRequest('GET', '/api/teachers');
    }

    /**
     * 獲取講師課程
     * @param {string} teacher - 講師名稱
     * @returns {Promise<Object>} 課程列表
     */
    async getCourses(teacher) {
        return await this.makeRequest('POST', '/api/courses', { teacher });
    }

    /**
     * 獲取課程學生
     * @param {string} course - 課程名稱
     * @param {string} time - 課程時間
     * @param {string} date - 日期 (YYYY-MM-DD 格式，預設為今天)
     * @returns {Promise<Object>} 學生列表
     */
    async getStudents(course, time, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }
        return await this.makeRequest('POST', '/api/course-students', { course, time, date });
    }

    /**
     * 學生簽到
     * @param {string} studentName - 學生姓名
     * @param {boolean} present - 是否出席
     * @param {string} teacherName - 講師姓名
     * @param {string} courseName - 課程名稱
     * @param {string} date - 日期 (YYYY-MM-DD 格式，預設為今天)
     * @returns {Promise<Object>} 簽到結果
     */
    async markStudentAttendance(studentName, present, teacherName, courseName, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }
        return await this.makeRequest('POST', '/api/student-attendance', {
            studentName,
            date,
            present,
            teacherName,
            courseName
        });
    }

    /**
     * 講師簽到
     * @param {string} teacherName - 講師姓名
     * @param {string} courseName - 課程名稱
     * @param {string} courseTime - 課程時間
     * @param {number} studentCount - 學生人數
     * @param {string} courseContent - 課程內容
     * @param {string} date - 日期 (YYYY/MM/DD 格式，預設為今天)
     * @param {string} webApi - 講師專屬 API (可選)
     * @returns {Promise<Object>} 簽到結果
     */
    async teacherCheckin(teacherName, courseName, courseTime, studentCount, courseContent, date = null, webApi = '') {
        if (!date) {
            const today = new Date();
            date = today.getFullYear() + '/' + 
                String(today.getMonth() + 1).padStart(2, '0') + '/' + 
                String(today.getDate()).padStart(2, '0');
        }
        return await this.makeRequest('POST', '/api/teacher-report', {
            teacherName,
            courseName,
            courseTime,
            date,
            studentCount,
            courseContent,
            webApi
        });
    }

    /**
     * 獲取直接跳轉 URL
     * @param {string} teacher - 講師名稱
     * @param {string} course - 課程名稱
     * @param {string} time - 課程時間
     * @returns {Promise<Object>} 跳轉資料
     */
    async getDirectStep3Url(teacher, course, time) {
        return await this.makeRequest('POST', '/api/direct-step3', { teacher, course, time });
    }

    /**
     * 獲取直接步驟三頁面 URL
     * @param {string} teacher - 講師名稱
     * @param {string} course - 課程名稱
     * @param {string} time - 課程時間
     * @returns {string} 頁面 URL
     */
    getDirectStep3PageUrl(teacher, course, time) {
        const params = new URLSearchParams({
            teacher: teacher,
            course: course,
            time: time
        });
        return `${this.baseURL}/step3?${params.toString()}`;
    }

    /**
     * 批量學生簽到
     * @param {Array} attendanceList - 簽到列表
     * @param {string} teacherName - 講師姓名
     * @param {string} courseName - 課程名稱
     * @param {string} date - 日期 (YYYY-MM-DD 格式，預設為今天)
     * @returns {Promise<Array>} 批量簽到結果
     */
    async batchMarkAttendance(attendanceList, teacherName, courseName, date = null) {
        const results = [];
        
        for (const attendance of attendanceList) {
            try {
                const result = await this.markStudentAttendance(
                    attendance.studentName,
                    attendance.present,
                    teacherName,
                    courseName,
                    date
                );
                results.push({
                    studentName: attendance.studentName,
                    success: result.success,
                    error: result.error || null
                });
            } catch (error) {
                results.push({
                    studentName: attendance.studentName,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * 驗證講師是否存在
     * @param {string} teacherName - 講師名稱
     * @returns {Promise<boolean>} 是否存在
     */
    async validateTeacher(teacherName) {
        try {
            const teachers = await this.getTeachers();
            return teachers.success && teachers.teachers.some(t => t.name === teacherName);
        } catch (error) {
            console.error('驗證講師失敗:', error);
            return false;
        }
    }

    /**
     * 驗證課程是否存在
     * @param {string} teacherName - 講師名稱
     * @param {string} courseName - 課程名稱
     * @param {string} courseTime - 課程時間
     * @returns {Promise<boolean>} 是否存在
     */
    async validateCourse(teacherName, courseName, courseTime) {
        try {
            const courses = await this.getCourses(teacherName);
            return courses.success && courses.courseTimes.some(c => 
                c.course === courseName && c.time === courseTime
            );
        } catch (error) {
            console.error('驗證課程失敗:', error);
            return false;
        }
    }

    /**
     * 獲取課程統計
     * @param {string} course - 課程名稱
     * @param {string} time - 課程時間
     * @param {string} date - 日期 (YYYY-MM-DD 格式，預設為今天)
     * @returns {Promise<Object>} 課程統計
     */
    async getCourseStats(course, time, date = null) {
        try {
            const students = await this.getStudents(course, time, date);
            
            if (!students.success) {
                return { success: false, error: students.error };
            }

            const stats = {
                total: students.students.length,
                present: 0,
                absent: 0,
                leave: 0,
                notSignedIn: 0
            };

            students.students.forEach(student => {
                switch (student.hasAttendanceToday) {
                    case true:
                        stats.present++;
                        break;
                    case false:
                        stats.absent++;
                        break;
                    case 'leave':
                        stats.leave++;
                        break;
                    default:
                        stats.notSignedIn++;
                        break;
                }
            });

            return {
                success: true,
                stats: stats,
                students: students.students
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 獲取講師詳細資訊
     * @param {string} teacherName - 講師名稱
     * @returns {Promise<Object|null>} 講師資訊
     */
    async getTeacherInfo(teacherName) {
        try {
            const teachers = await this.getTeachers();
            if (teachers.success) {
                return teachers.teachers.find(t => t.name === teacherName) || null;
            }
            return null;
        } catch (error) {
            console.error('獲取講師資訊失敗:', error);
            return null;
        }
    }
}

module.exports = FLBAttendanceSDK;

// 使用範例
if (require.main === module) {
    async function example() {
        // 初始化 SDK
        const sdk = new FLBAttendanceSDK({
            baseURL: 'https://liff-sttendence-0908-production.up.railway.app',
            timeout: 30000,
            retryAttempts: 3
        });
        
        // 設置 API 金鑰（如果有的話）
        // sdk.setApiKey('your-api-key');
        
        try {
            // 獲取講師列表
            console.log('=== 獲取講師列表 ===');
            const teachers = await sdk.getTeachers();
            console.log('講師列表:', JSON.stringify(teachers, null, 2));
            
            // 驗證講師
            console.log('\n=== 驗證講師 ===');
            const isValid = await sdk.validateTeacher('Tim');
            console.log('講師 Tim 是否存在:', isValid);
            
            // 獲取課程
            console.log('\n=== 獲取課程 ===');
            const courses = await sdk.getCourses('Tim');
            console.log('課程列表:', JSON.stringify(courses, null, 2));
            
            // 獲取學生
            console.log('\n=== 獲取學生 ===');
            const students = await sdk.getStudents('SPM 南京復興教室', '日 1330-1500 松山');
            console.log('學生列表:', JSON.stringify(students, null, 2));
            
            // 獲取課程統計
            console.log('\n=== 獲取課程統計 ===');
            const stats = await sdk.getCourseStats('SPM 南京復興教室', '日 1330-1500 松山');
            console.log('課程統計:', JSON.stringify(stats, null, 2));
            
            // 學生簽到
            console.log('\n=== 學生簽到 ===');
            const attendanceResult = await sdk.markStudentAttendance('張小明', true, 'Tim', 'SPM 南京復興教室');
            console.log('簽到結果:', JSON.stringify(attendanceResult, null, 2));
            
            // 講師簽到
            console.log('\n=== 講師簽到 ===');
            const teacherResult = await sdk.teacherCheckin('Tim', 'SPM 南京復興教室', '日 1330-1500 松山', 5, '數學課程內容');
            console.log('講師簽到結果:', JSON.stringify(teacherResult, null, 2));
            
            // 批量簽到
            console.log('\n=== 批量簽到 ===');
            const attendanceList = [
                { studentName: '張小明', present: true },
                { studentName: '李小花', present: false },
                { studentName: '王大華', present: true }
            ];
            const batchResult = await sdk.batchMarkAttendance(attendanceList, 'Tim', 'SPM 南京復興教室');
            console.log('批量簽到結果:', JSON.stringify(batchResult, null, 2));
            
        } catch (error) {
            console.error('錯誤:', error);
        }
    }
    
    example();
}
