/**
 * FLB 簽到系統 JavaScript SDK
 * 版本: 1.0.0
 * 作者: FLB 開發團隊
 */

class FLBAttendanceSDK {
    constructor(options = {}) {
        this.baseURL = options.baseURL || 'https://liff-sttendence-0908-production.up.railway.app';
        this.timeout = options.timeout || 30000;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.apiKey = options.apiKey || null;
    }

    /**
     * 設置 API 金鑰
     * @param {string} apiKey - API 金鑰
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * 獲取請求 headers
     * @returns {Object} headers 物件
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        
        return headers;
    }

    /**
     * 執行 API 請求（包含重試機制）
     * @param {string} url - 請求 URL
     * @param {Object} options - 請求選項
     * @returns {Promise} API 回應
     */
    async makeRequest(url, options = {}) {
        const requestOptions = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            },
            timeout: this.timeout
        };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                return data;
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
        return await this.makeRequest(`${this.baseURL}/api/teachers`);
    }

    /**
     * 獲取講師課程
     * @param {string} teacher - 講師名稱
     * @returns {Promise<Object>} 課程列表
     */
    async getCourses(teacher) {
        return await this.makeRequest(`${this.baseURL}/api/courses`, {
            method: 'POST',
            body: JSON.stringify({ teacher })
        });
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

        return await this.makeRequest(`${this.baseURL}/api/course-students`, {
            method: 'POST',
            body: JSON.stringify({ course, time, date })
        });
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

        return await this.makeRequest(`${this.baseURL}/api/student-attendance`, {
            method: 'POST',
            body: JSON.stringify({
                studentName,
                date,
                present,
                teacherName,
                courseName
            })
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

        return await this.makeRequest(`${this.baseURL}/api/teacher-report`, {
            method: 'POST',
            body: JSON.stringify({
                teacherName,
                courseName,
                courseTime,
                date,
                studentCount,
                courseContent,
                webApi
            })
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
        return await this.makeRequest(`${this.baseURL}/api/direct-step3`, {
            method: 'POST',
            body: JSON.stringify({ teacher, course, time })
        });
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
}

// 導出 SDK
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FLBAttendanceSDK;
} else if (typeof window !== 'undefined') {
    window.FLBAttendanceSDK = FLBAttendanceSDK;
}

// 使用範例
/*
// 初始化 SDK
const sdk = new FLBAttendanceSDK({
    baseURL: 'https://liff-sttendence-0908-production.up.railway.app',
    timeout: 30000,
    retryAttempts: 3
});

// 設置 API 金鑰（如果有的話）
sdk.setApiKey('your-api-key');

// 獲取講師列表
async function loadTeachers() {
    try {
        const result = await sdk.getTeachers();
        console.log('講師列表:', result.teachers);
    } catch (error) {
        console.error('載入講師失敗:', error);
    }
}

// 學生簽到
async function markAttendance() {
    try {
        const result = await sdk.markStudentAttendance('張小明', true, 'Tim', 'SPM 南京復興教室');
        if (result.success) {
            console.log('簽到成功');
        } else {
            console.error('簽到失敗:', result.error);
        }
    } catch (error) {
        console.error('簽到錯誤:', error);
    }
}

// 講師簽到
async function teacherCheckin() {
    try {
        const result = await sdk.teacherCheckin(
            'Tim',
            'SPM 南京復興教室',
            '日 1330-1500 松山',
            5,
            '數學課程內容'
        );
        if (result.success) {
            console.log('講師簽到成功');
        } else {
            console.error('講師簽到失敗:', result.error);
        }
    } catch (error) {
        console.error('講師簽到錯誤:', error);
    }
}

// 批量學生簽到
async function batchAttendance() {
    const attendanceList = [
        { studentName: '張小明', present: true },
        { studentName: '李小花', present: false },
        { studentName: '王大華', present: true }
    ];
    
    try {
        const results = await sdk.batchMarkAttendance(attendanceList, 'Tim', 'SPM 南京復興教室');
        console.log('批量簽到結果:', results);
    } catch (error) {
        console.error('批量簽到錯誤:', error);
    }
}

// 獲取課程統計
async function getStats() {
    try {
        const stats = await sdk.getCourseStats('SPM 南京復興教室', '日 1330-1500 松山');
        if (stats.success) {
            console.log('課程統計:', stats.stats);
        } else {
            console.error('獲取統計失敗:', stats.error);
        }
    } catch (error) {
        console.error('獲取統計錯誤:', error);
    }
}
*/
