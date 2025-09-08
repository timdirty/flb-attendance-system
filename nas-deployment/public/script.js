// 全域變數
let currentStep = 1;
let selectedTeacher = '';
let selectedCourse = '';
let selectedCourseTime = '';
let selectedCourseNote = ''; // 選中課程的備註
let isAssistantMode = false; // 助教模式狀態
let webApi = ''; // 講師的 Web API 連結
let isTeacherMakeupAssistantMode = false; // 講師補簽到助教模式狀態
let teachers = []; // 講師列表
let filtersCollapsed = false; // 篩選條件摺疊狀態
let students = [];
let allReportResults = []; // 存儲所有查詢結果
let filteredReportResults = []; // 存儲篩選後的結果
let currentMonthFilter = null; // 當前選中的月份篩選

// 補簽到功能
let selectedMakeupCourse = null;
let selectedMakeupDate = null;

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', function() {
    loadTeachers();
    updateNavigation();
    initializeModeDisplay(); // 初始化模式顯示
    initializeDateTime(); // 初始化日期時間顯示
    
    // 初始化補簽到功能
    initializeMakeupAttendance();
    
    // 初始化講師補簽到功能
    initializeTeacherMakeupAttendance();
});

// 載入講師列表
async function loadTeachers() {
    try {
        showTeacherLoading();
        
        const response = await fetch('/api/teachers');
        const data = await response.json();
        
        if (response.ok && data.success && data.teachers) {
            teachers = data.teachers;
            displayTeachers();
            showToast('講師列表載入成功！', 'success');
        } else if (data.error) {
            showError(`載入講師列表失敗：${data.error}`);
            console.error('講師列表 API 錯誤:', data);
        } else {
            showError('載入講師列表失敗：回應格式錯誤');
            console.error('講師列表回應格式錯誤:', data);
        }
    } catch (error) {
        console.error('載入講師錯誤:', error);
        showError('載入講師列表失敗：網路錯誤');
    }
}

// 清除講師資料
function clearTeacherData() {
    const teacherGrid = document.getElementById('teacher-grid');
    teacherGrid.innerHTML = '';
}

// 顯示講師載入動畫
function showTeacherLoading() {
    const loading = document.getElementById('teacher-loading');
    loading.style.display = 'flex';
}

// 顯示講師列表
// 根據名字判斷性別並返回合適的圖示
function getTeacherIcon(teacherName) {
    const name = teacherName.toLowerCase();
    
    // 女性名字特徵
    const femaleNames = [
        // 英文女性名字
        'agnes', 'bella', 'gillian', 'sarah', 'emma', 'sophia', 'olivia', 'ava', 'isabella',
        'charlotte', 'mia', 'amelia', 'harper', 'evelyn', 'abigail', 'emily',
        'elizabeth', 'sofia', 'madison', 'avery', 'ella', 'scarlett', 'grace',
        'chloe', 'victoria', 'riley', 'aria', 'lily', 'aubrey', 'zoey', 'penelope',
        'layla', 'nora', 'eleanor', 'hannah', 'lillian', 'addison', 'ellie', 
        'stella', 'natalie', 'zoe', 'leah', 'hazel', 'violet', 'aurora', 
        'savannah', 'audrey', 'brooklyn', 'claire', 'skylar', 'jennifer', 
        'jessica', 'ashley', 'amanda', 'stephanie', 'nicole', 'heather', 
        'melissa', 'michelle', 'tiffany', 'amber', 'rachel', 'danielle',
        'rebecca', 'laura', 'kimberly', 'crystal', 'megan', 'angela',
        'kayla', 'lauren', 'brittany', 'vanessa', 'samantha',
        // 日文女性名字
        'yoki', 'weinie', 'yuki', 'yumi', 'yoko', 'sakura', 'hana', 'ayumi', 
        'mika', 'nana', 'yui', 'mai', 'ai', 'kaori', 'akiko', 'yukiko', 
        'tomoko', 'naomi', 'junko', 'michiko', 'yoshiko', 'fumiko', 'keiko', 
        'masako', 'hiroko', 'kazuko', 'atsuko', 'yumiko', 'mariko', 'noriko', 'akemi'
    ];
    
    // 男性名字特徵
    const maleNames = [
        'hansen', 'eason', 'ted', 'jacky', 'daniel', 'james', 'tony', 'philip', 
        'alex', 'michael', 'david', 'john', 'robert', 'william', 'richard', 
        'joseph', 'thomas', 'christopher', 'charles', 'matthew', 'anthony', 
        'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth',
        'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 
        'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 
        'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 
        'frank', 'gregory', 'raymond', 'alexander', 'patrick', 'jack', 'dennis', 
        'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 
        'zachary', 'peter', 'kyle', 'walter', 'ethan', 'jeremy', 'harold', 
        'seth', 'christian', 'mason', 'austin', 'juan', 'keith', 'roger', 
        'lawrence', 'morris', 'marvin', 'leon', 'dale', 'allan', 'nelson', 
        'guy', 'lee', 'victor', 'evan', 'noah', 'jimmy', 'earl', 'jordan', 
        'ernest', 'terry', 'mario', 'carlos', 'randy', 'alan', 'ross', 
        'gerald', 'kurt', 'tommy', 'nick', 'francis', 'jimmie'
    ];
    
    // 智能判斷邏輯
    // 1. 先檢查完整名字匹配
    if (femaleNames.includes(name)) {
        return 'fas fa-user-graduate'; // 女性畢業生圖示
    }
    else if (maleNames.includes(name)) {
        return 'fas fa-user-tie'; // 男性西裝圖示
    }
    
    // 2. 檢查名字結尾特徵
    const femaleEndings = ['a', 'ia', 'ie', 'y', 'ey', 'ay', 'ine', 'ette', 'elle', 'i', 'ee'];
    const maleEndings = ['n', 'r', 'd', 'l', 't', 'k', 'm', 'p', 's', 'x', 'z', 'o', 'u'];
    
    // 檢查是否以女性特徵結尾
    if (femaleEndings.some(ending => name.endsWith(ending))) {
        return 'fas fa-user-graduate'; // 女性畢業生圖示
    }
    // 檢查是否以男性特徵結尾
    else if (maleEndings.some(ending => name.endsWith(ending))) {
        return 'fas fa-user-tie'; // 男性西裝圖示
    }
    
    // 3. 檢查名字長度和特徵
    if (name.length <= 4) {
        // 短名字通常是男性
        return 'fas fa-user-tie'; // 男性西裝圖示
    }
    
    // 4. 預設使用中性圖示
    return 'fas fa-user'; // 中性用戶圖示
}

// 顯示講師列表
function displayTeachers() {
    const container = document.getElementById('teacher-grid');
    container.innerHTML = '';
    
    // 隱藏載入動畫
    const loading = document.getElementById('teacher-loading');
    if (loading) {
        loading.style.display = 'none';
    }
    
    teachers.forEach(teacher => {
        const teacherCard = document.createElement('div');
        teacherCard.className = 'teacher-card';
        
        // 單擊選擇講師
        teacherCard.onclick = () => selectTeacher(teacher.name, teacher.webApi);
        
        // 雙擊直接進入下一步
        let clickCount = 0;
        let clickTimer = null;
        
        teacherCard.onclick = () => {
            clickCount++;
            
            if (clickCount === 1) {
                // 單擊：選擇講師
                clickTimer = setTimeout(() => {
                    selectTeacher(teacher.name, teacher.webApi);
                    clickCount = 0;
                }, 200);
            } else if (clickCount === 2) {
                // 雙擊：選擇講師並進入下一步
                clearTimeout(clickTimer);
                selectTeacher(teacher.name, teacher.webApi);
                clickCount = 0;
                
                // 延遲一下確保講師選擇完成，然後自動進入下一步
                setTimeout(() => {
                    nextStep();
                }, 300);
            }
        };
        
        const iconClass = getTeacherIcon(teacher.name);
        
        teacherCard.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${teacher.name}</span>
        `;
        
        container.appendChild(teacherCard);
    });
}

// 選擇講師
function selectTeacher(teacherName, teacherWebApi) {
    selectedTeacher = teacherName;
    webApi = teacherWebApi || ''; // 儲存講師的 Web API 連結
    
    // 清除之前的選擇
    document.querySelectorAll('.teacher-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 標記選中的講師
    event.target.closest('.teacher-card').classList.add('selected');
    
    // 更新顯示的講師名稱
    const selectedTeacherNameElement = document.getElementById('selected-teacher-name');
    if (selectedTeacherNameElement) {
        selectedTeacherNameElement.textContent = teacherName;
    }
    
    // 清除課程和學生資料
    clearCourseData();
    clearStudentData();
    
    // 載入該講師的課程
    loadTeacherCourses();
    
    // 更新導航
    updateNavigation();
    
    // 如果補簽到功能已經展開，自動初始化
    const makeupForm = document.getElementById('makeup-form');
    if (makeupForm && makeupForm.style.display !== 'none') {
        initializeMakeupForSelectedTeacher();
    }
    
    // 顯示選擇講師的訊息，包含 API 資訊
    if (webApi && webApi.trim() !== '') {
        showToast(`已選擇講師：${teacherName} (使用專屬 API)`, 'success');
    } else {
        showToast(`已選擇講師：${teacherName} (使用預設 API)`, 'info');
    }
}

// 載入講師的課程
async function loadTeacherCourses() {
    if (!selectedTeacher) return;
    
    // 清除之前的資料並顯示載入動畫
    clearCourseData();
    showCourseLoading();
    
    try {
        const response = await fetch('/api/teacher-courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teacher: selectedTeacher })
        });
        
        const data = await response.json();
        
        if (data.success && data.courseTimes) {
            displayCourses(data.courseTimes);
        } else {
            showError('無法載入課程列表');
        }
    } catch (error) {
        console.error('載入課程錯誤:', error);
        showError('載入課程列表失敗');
    }
}

// 清除課程資料
function clearCourseData() {
    const courseGrid = document.getElementById('course-grid');
    courseGrid.innerHTML = '';
}

// 顯示課程載入動畫
function showCourseLoading() {
    const loading = document.getElementById('course-loading');
    loading.style.display = 'flex';
}

// 計算課程時間與當前時間的距離（分鐘）
function calculateTimeDistance(courseTime) {
    try {
        // 解析課程時間，支援多個星期，例如："一四 1930-2030 到府"、"二五 1600-1700 外"
        const timeMatch = courseTime.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
        if (!timeMatch) return Infinity; // 無法解析的時間返回無限大
        
        const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7 };
        const weekdays = timeMatch[1].split(''); // 分割多個星期
        const startHour = parseInt(timeMatch[2].substring(0, 2));
        const startMinute = parseInt(timeMatch[2].substring(2, 4));
        const endHour = parseInt(timeMatch[3].substring(0, 2));
        const endMinute = parseInt(timeMatch[3].substring(2, 4));
        
        // 獲取台灣時間（中原標準時間 UTC+8）
        const now = new Date();
        
        // 使用 Intl.DateTimeFormat 確保獲取台灣時區的時間
        const taiwanTime = new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(now);
        
        // 解析台灣時間的各個部分
        const taiwanDate = {
            year: parseInt(taiwanTime.find(p => p.type === 'year').value),
            month: parseInt(taiwanTime.find(p => p.type === 'month').value),
            day: parseInt(taiwanTime.find(p => p.type === 'day').value),
            hour: parseInt(taiwanTime.find(p => p.type === 'hour').value),
            minute: parseInt(taiwanTime.find(p => p.type === 'minute').value),
            second: parseInt(taiwanTime.find(p => p.type === 'second').value)
        };
        
        // 創建台灣時間的 Date 物件
        const taiwanNow = new Date(
            taiwanDate.year,
            taiwanDate.month - 1, // month 是 0-based
            taiwanDate.day,
            taiwanDate.hour,
            taiwanDate.minute,
            taiwanDate.second
        );
        
        // 使用 getDay() 獲取星期幾 (0=日, 1=一, 2=二, ..., 6=六)
        const currentWeekday = taiwanNow.getDay() === 0 ? 7 : taiwanNow.getDay(); // 轉換為 1=一, 2=二, ..., 7=日
        
        const currentHour = taiwanNow.getHours();
        const currentMinute = taiwanNow.getMinutes();
        
        // 將時間轉換為當天分鐘數
        const courseStartMinutes = startHour * 60 + startMinute;
        const courseEndMinutes = endHour * 60 + endMinute;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        
        // 調試資訊
        console.log(`課程時間: ${courseTime}, 課程星期: ${weekdays.join(',')}, 開始分鐘: ${courseStartMinutes}, 結束分鐘: ${courseEndMinutes}`);
        console.log(`當前台灣時間: ${taiwanDate.year}/${taiwanDate.month}/${taiwanDate.day} ${currentHour}:${currentMinute}, 星期: ${currentWeekday}, 當前分鐘: ${currentTimeInMinutes}`);
        
        // 計算每個星期的分數，選擇最低分數（最高優先級）
        let bestScore = Infinity;
        
        for (const weekdayChar of weekdays) {
            const courseWeekday = weekdayMap[weekdayChar];
            let score = 0;
            
            if (courseWeekday === currentWeekday) {
                // 情況1: 課程在今天
                if (courseStartMinutes > currentTimeInMinutes) {
                    // 課程在今天且尚未開始 (未來)
                    score = courseStartMinutes - currentTimeInMinutes;
                    console.log(`今天未來課程 (${weekdayChar})，分數: ${score}`);
                } else if (courseEndMinutes > currentTimeInMinutes) {
                    // 課程正在進行中
                    score = 0; // 最高優先級
                    console.log(`今天進行中課程 (${weekdayChar})，分數: ${score}`);
                } else {
                    // 課程在今天但已結束 (過去)
                    score = (24 * 60) + (currentTimeInMinutes - courseEndMinutes);
                    console.log(`今天已結束課程 (${weekdayChar})，分數: ${score}`);
                }
            } else {
                // 情況2: 課程在未來日期
                let daysUntilCourse = courseWeekday - currentWeekday;
                if (daysUntilCourse < 0) {
                    // 如果課程日期在過去的星期，則計算到下週
                    daysUntilCourse += 7;
                }
                // 分數基於天數，然後是當天的時間
                score = (daysUntilCourse * 24 * 60) + courseStartMinutes;
                console.log(`未來日期課程 (${weekdayChar})，天數差: ${daysUntilCourse}, 分數: ${score}`);
            }
            
            // 更新最佳分數
            if (score < bestScore) {
                bestScore = score;
            }
        }
        
        console.log(`最終最佳分數: ${bestScore}`);
        return bestScore;
        
    } catch (error) {
        console.error('計算時間距離錯誤:', error);
        return Infinity;
    }
}

// 對課程按時間排序
function sortCoursesByTime(courses) {
    return courses.sort((a, b) => {
        const distanceA = calculateTimeDistance(a.time);
        const distanceB = calculateTimeDistance(b.time);
        return distanceA - distanceB; // 升序排列，距離最近的在前
    });
}

// 顯示課程列表
function displayCourses(courses) {
    const coursesContainer = document.getElementById('course-grid');
    if (!coursesContainer) return;
    
    // 隱藏載入動畫
    const loading = document.getElementById('course-loading');
    if (loading) {
        loading.style.display = 'none';
    }
    
    // 清空容器
    coursesContainer.innerHTML = '';
    
    // 按時間排序課程
    const sortedCourses = sortCoursesByTime(courses);
    
    // 添加排序說明
    const sortInfo = document.createElement('div');
    sortInfo.className = 'sort-info';
    sortInfo.innerHTML = '<i class="fas fa-clock"></i> 課程已按時間順序排列 (最接近當前時間的課程在前)';
    coursesContainer.appendChild(sortInfo);
    
    // 添加點兩下提示
    const doubleClickHint = document.createElement('div');
    doubleClickHint.className = 'double-click-hint';
    doubleClickHint.innerHTML = '<i class="fas fa-mouse-pointer"></i><span>點兩下課程卡片快速進入下一步</span>';
    coursesContainer.appendChild(doubleClickHint);
    
    // 顯示課程
    sortedCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        // 點擊處理：單擊選擇課程，雙擊快速進入下一步
        let clickCount = 0;
        let clickTimer = null;
        
        courseCard.onclick = () => {
            clickCount++;
            
            if (clickCount === 1) {
                // 單擊：選擇課程
                clickTimer = setTimeout(() => {
                    selectCourse(course.course, course.time, course.note || '');
                    clickCount = 0;
                }, 200);
            } else if (clickCount === 2) {
                // 雙擊：選擇課程並進入下一步
                clearTimeout(clickTimer);
                selectCourse(course.course, course.time, course.note || '');
                clickCount = 0;
                
                // 延遲一下確保課程選擇完成，然後自動進入下一步
                setTimeout(() => {
                    nextStep();
                }, 300);
            }
        };
        
        // 計算時間距離並決定樣式
        const timeDistance = formatTimeDistance(course.time);
        console.log(`課程 ${course.course} (${course.time}) 的時間距離: "${timeDistance}"`);
        
        let timeClass = 'time-indicator';
        
        if (timeDistance === '進行中') {
            timeClass += ' time-ongoing';
        } else if (timeDistance.includes('前')) {
            timeClass += ' time-past';
        } else if (timeDistance.includes('分鐘後') || timeDistance.includes('小時')) {
            timeClass += ' time-soon';
        } else {
            timeClass += ' time-later';
        }
        
        courseCard.innerHTML = `
            <div class="course-header">
                <h3>${course.course}${course.note ? `<span class="course-note-inline"><i class="fas fa-sticky-note"></i> ${course.note}</span>` : ''}</h3>
                <span class="${timeClass}">${timeDistance}</span>
            </div>
            <div class="course-time">${course.time}</div>
            <div class="course-students">學生: ${course.students || '無'}</div>
        `;
        
        coursesContainer.appendChild(courseCard);
    });
    
    // 更新導航
    updateNavigation();
}

// 選擇課程
function selectCourse(course, time, note = '') {
    // 移除之前的選擇
    document.querySelectorAll('.course-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 標記當前選擇
    event.target.closest('.course-card').classList.add('selected');
    
    selectedCourse = course;
    selectedCourseTime = time;
    selectedCourseNote = note; // 保存備註資訊
    showToast(`已選擇課程：${course} - ${time}`);
    
    // 顯示下一步按鈕
    document.getElementById('next-btn').style.display = 'inline-flex';
}

// 載入學生列表
async function loadStudents() {
    if (!selectedCourse || !selectedCourseTime) return;
    
    // 清除之前的資料並顯示載入動畫
    clearStudentData();
    clearCourseInfo();
    showStudentLoading();
    
    try {
        const response = await fetch('/api/course-students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                course: selectedCourse, 
                time: selectedCourseTime 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            students = data.students || []; // 確保 students 是陣列
            displayStudents(students);
        } else {
            showError('無法載入學生列表');
        }
    } catch (error) {
        console.error('載入學生錯誤:', error);
        showError('載入學生列表失敗');
    }
}

// 清除課程資訊
function clearCourseInfo() {
    const courseName = document.getElementById('selected-course-name');
    const courseTime = document.getElementById('selected-course-time');
    
    if (courseName) courseName.textContent = '';
    if (courseTime) courseTime.textContent = '';
}

// 清除學生資料
function clearStudentData() {
    const studentList = document.getElementById('student-list');
    const studentSection = document.querySelector('.student-section');
    const makeupSection = document.querySelector('.makeup-attendance-section');
    
    if (studentList) {
    studentList.innerHTML = '';
    }
    
    // 隱藏學生名單區塊
    if (studentSection) {
        studentSection.style.display = 'none';
    }
    
    // 隱藏學生補簽到功能
    if (makeupSection) {
        makeupSection.style.display = 'none';
    }
}

// 顯示學生載入動畫
function showStudentLoading() {
    const loading = document.getElementById('student-loading');
    const studentSection = document.querySelector('.student-section');
    
    // 顯示學生名單區塊
    if (studentSection) {
        studentSection.style.display = 'block';
    }
    
    if (loading) {
    loading.style.display = 'flex';
    }
}

// 顯示學生列表
function displayStudents(studentList) {
    const studentListElement = document.getElementById('student-list');
    const loading = document.getElementById('student-loading');
    const courseName = document.getElementById('selected-course-name');
    const courseTime = document.getElementById('selected-course-time');
    const studentSection = document.querySelector('.student-section'); // 獲取整個學生名單區塊
    const step3Title = document.querySelector('#step3-content h2'); // 獲取步驟3的標題
    
    loading.style.display = 'none';
    // 顯示課程名稱，如果有備註則包含備註
    const courseDisplayName = selectedCourseNote ? 
        `${selectedCourse} ${selectedCourseNote}` : 
        selectedCourse;
    courseName.textContent = courseDisplayName;
    courseTime.textContent = selectedCourseTime;
    
    if (studentList.length === 0) {
        // 當沒有學生時，隱藏整個學生名單區塊
        if (studentSection) {
            studentSection.style.display = 'none';
        }
        
        // 同時隱藏學生補簽到功能
        const makeupSection = document.querySelector('.makeup-attendance-section');
        if (makeupSection) {
            makeupSection.style.display = 'none';
        }
        
        // 隱藏「學生簽到」標題
        if (step3Title) {
            step3Title.style.display = 'none';
        }
        return;
    }
    
    // 當有學生時，顯示學生名單區塊
    if (studentSection) {
        studentSection.style.display = 'block';
    }
    
    // 同時顯示學生補簽到功能
    const makeupSection = document.querySelector('.makeup-attendance-section');
    if (makeupSection) {
        makeupSection.style.display = 'block';
    }
    
    // 顯示「學生簽到」標題
    if (step3Title) {
        step3Title.style.display = 'block';
    }
    
    // 重置學生簽到狀態
    studentAttendanceStatus = {};
    
    // 當重新進入學生簽到區塊時，重置通知狀態以允許重新發送
    onReenterAttendanceArea();
    
    studentListElement.innerHTML = studentList.map(student => `
        <div class="student-item">
            <div class="student-name">${student}</div>
            <div class="attendance-buttons">
                <button class="btn-attendance btn-present" onclick="markAttendance('${student}', true)">
                    <i class="fas fa-check"></i> 出席
                </button>
                <button class="btn-attendance btn-absent" onclick="markAttendance('${student}', false)">
                    <i class="fas fa-times"></i> 缺席
                </button>
            </div>
        </div>
    `).join('');
    
    // 移除手動按鈕，使用全自動機制
    
    // 添加焦點離開事件監聽器
    addAttendanceFocusListeners();
}

// 學生簽到狀態追蹤
let studentAttendanceStatus = {};
let attendanceNotificationSent = false;
let attendanceCheckTimer = null;

// 標記學生出勤
async function markAttendance(studentName, present) {
    // 獲取按鈕元素
    const clickedButton = event.target.closest('.btn-attendance');
    const studentItem = clickedButton.closest('.student-item');
    const buttons = studentItem.querySelectorAll('.btn-attendance');
    
    // 顯示等待狀態
    showAttendanceLoading(clickedButton);
    
    try {
        // 取得今天的日期
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 格式
        
        // 調用 API 更新學生簽到狀態
        const response = await fetch('/api/student-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentName: studentName,
                date: today,
                present: present,
                teacherName: selectedTeacher || '未知講師',
                courseName: selectedCourse || '未知課程'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 更新本地狀態
            studentAttendanceStatus[studentName] = present;
            
            // 更新按鈕狀態
            buttons.forEach(btn => {
                btn.classList.remove('marked', 'loading');
                btn.disabled = false;
                btn.innerHTML = btn.classList.contains('btn-present') ? 
                    '<i class="fas fa-check"></i> 出席' : 
                    '<i class="fas fa-times"></i> 缺席';
            });
            
            clickedButton.classList.add('marked');
            clickedButton.disabled = true;
            
            const statusText = present ? '出席' : '缺席';
            showToast(`✅ ${studentName} 已標記為 ${statusText}`);
            
            // 如果已經發送過通知，重置狀態以允許重新發送
            if (attendanceNotificationSent) {
                attendanceNotificationSent = false;
                console.log('檢測到簽到狀態變更，重置通知狀態，允許重新發送通知');
            }
            
            // 啟動定時器，3秒後自動檢查並發送通知
            startAttendanceCheckTimer();
        } else {
            // 恢復按鈕狀態
            buttons.forEach(btn => {
                btn.classList.remove('loading');
                btn.disabled = false;
                btn.innerHTML = btn.classList.contains('btn-present') ? 
                    '<i class="fas fa-check"></i> 出席' : 
                    '<i class="fas fa-times"></i> 缺席';
            });
            showError('簽到失敗');
        }
    } catch (error) {
        console.error('簽到錯誤:', error);
        
        // 恢復按鈕狀態
        buttons.forEach(btn => {
            btn.classList.remove('loading');
            btn.disabled = false;
            btn.innerHTML = btn.classList.contains('btn-present') ? 
                '<i class="fas fa-check"></i> 出席' : 
                '<i class="fas fa-times"></i> 缺席';
        });
        showError('簽到失敗');
    }
}

// 顯示簽到等待狀態
function showAttendanceLoading(button) {
    // 禁用所有按鈕
    const studentItem = button.closest('.student-item');
    const buttons = studentItem.querySelectorAll('.btn-attendance');
    
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
    });
}



// 下一步
function nextStep() {
    if (currentStep === 1) {
        if (!selectedTeacher) {
            showError('請先選擇講師');
            return;
        }
        goToStep(2);
        loadTeacherCourses();
    } else if (currentStep === 2) {
        if (!selectedCourse) {
            showError('請先選擇課程');
            return;
        }
        goToStep(3);
        loadStudents();
    }
}

// 上一步
function previousStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

// 回到步驟1
function backToStep1() {
    selectedTeacher = null;
    selectedCourse = null;
    selectedCourseTime = null;
    selectedCourseNote = ''; // 清除備註資訊
    students = [];
    goToStep(1);
    loadTeachers();
}

// 回到步驟2
function backToStep2() {
    selectedCourse = null;
    selectedCourseTime = null;
    selectedCourseNote = ''; // 清除備註資訊
    students = [];
    resetAttendanceNotification(); // 重置簽到通知狀態
    goToStep(2);
    loadTeacherCourses();
}

// 切換步驟
function goToStep(step) {
    // 隱藏所有步驟內容
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 顯示當前步驟內容
    document.getElementById(`step${step}-content`).classList.add('active');
    
    // 更新步驟指示器
    document.querySelectorAll('.step').forEach((stepElement, index) => {
        stepElement.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepElement.classList.add('completed');
        } else if (index + 1 === step) {
            stepElement.classList.add('active');
        }
    });
    
    currentStep = step;
    updateNavigation();
}

// 完成流程
function completeProcess() {
    showToast('✅ 簽到流程已完成！');
    // 可以選擇重置到第一步或保持當前狀態
    setTimeout(() => {
        // 重置到第一步
        backToStep1();
    }, 2000);
}

// 更新導航按鈕
function updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // 顯示/隱藏上一步按鈕
    if (currentStep > 1) {
        prevBtn.style.display = 'inline-flex';
    } else {
        prevBtn.style.display = 'none';
    }
    
    // 更新下一步按鈕
    if (currentStep < 3) {
        nextBtn.style.display = 'inline-flex';
        nextBtn.innerHTML = '下一步 <i class="fas fa-arrow-right"></i>';
        nextBtn.onclick = nextStep;
        nextBtn.classList.remove('complete');
    } else {
        // 最後一步顯示完成按鈕
        nextBtn.style.display = 'inline-flex';
        nextBtn.innerHTML = '<i class="fas fa-check"></i> 完成';
        nextBtn.onclick = completeProcess;
        nextBtn.classList.add('complete');
    }
}

// 顯示成功提示
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('i');
    
    // 處理多行文字，將 \n 轉換為 <br>
    const formattedMessage = message.replace(/\n/g, '<br>');
    toastMessage.innerHTML = formattedMessage;
    
    // 根據類型設定圖示
    toastIcon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle';
    toast.className = `toast ${type} show`;
    
    // 根據訊息長度調整顯示時間
    const messageLength = message.length;
    const displayTime = Math.max(3000, Math.min(8000, messageLength * 100)); // 最少3秒，最多8秒
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, displayTime);
}

// 顯示錯誤提示
function showError(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    toastIcon.className = 'fas fa-exclamation-circle';
    toast.className = 'toast error show';
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// 字數統計
document.addEventListener('DOMContentLoaded', function() {
    const courseContent = document.getElementById('course-content');
    const charCount = document.getElementById('char-count');
    
    if (courseContent && charCount) {
        courseContent.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }
});



// 設定講師模式
function setTeacherMode() {
    isAssistantMode = false;
    updateModeDisplay();
    showToast('已切換到講師模式，人數將根據學生數量計算', 'info');
}

// 設定助教模式
function setAssistantMode() {
    isAssistantMode = true;
    updateModeDisplay();
    showToast('已切換到助教模式，人數將自動設為 0', 'info');
}

// 更新模式顯示
function updateModeDisplay() {
    const teacherBtn = document.getElementById('teacher-mode-btn');
    const assistantBtn = document.getElementById('assistant-mode-btn');
    const modeDisplay = document.getElementById('current-mode-display');
    
    if (isAssistantMode) {
        // 助教模式
        teacherBtn.classList.remove('active');
        assistantBtn.classList.add('active');
        modeDisplay.textContent = '助教模式';
        modeDisplay.className = 'mode-value assistant';
    } else {
        // 講師模式
        teacherBtn.classList.add('active');
        assistantBtn.classList.remove('active');
        modeDisplay.textContent = '講師模式';
        modeDisplay.className = 'mode-value teacher';
    }
}

// 初始化模式顯示
function initializeModeDisplay() {
    updateModeDisplay();
}

// 提交講師報表
async function submitTeacherReport() {
    const courseContent = document.getElementById('course-content').value.trim();
    
    if (!courseContent) {
        showError('請填寫課程內容');
        return;
    }
    
    // 檢查是否有選擇講師
    if (!selectedTeacher) {
        showError('請先選擇講師');
        return;
    }
    
    // 檢查 webApi 是否有效
    if (!webApi || webApi.trim() === '') {
        showToast('注意：此講師沒有專屬的 Web API，將使用預設的 FLB API 提交報表', 'info');
        // 不阻擋提交，讓後端處理
    } else {
        showToast(`將使用講師 ${selectedTeacher} 的專屬 API 提交報表`, 'info');
    }
    
    // 計算學生人數
    let studentCount = students.length;
    
    // 助教模式：人數自動設為 0（不管課程時間是否包含「到府」或「客製化」）
    if (isAssistantMode) {
        studentCount = 0;
    } else {
        // 講師模式：根據課程時間判斷人數
        if (selectedCourseTime.includes('到府') || selectedCourseTime.includes('客製化')) {
            studentCount = 99;
        }
    }
    
    const submitBtn = document.getElementById('submit-report-btn');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
        
        const date = new Date();
        const dateString = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        const response = await fetch('/api/teacher-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherName: selectedTeacher,
                courseName: (selectedCourseNote ? `${selectedCourse} ${selectedCourseNote}` : selectedCourse) + '（系統簽到）',
                courseTime: selectedCourseTime,
                date: dateString,
                studentCount: studentCount,
                courseContent: courseContent,
                webApi: webApi
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // 處理成功的回應，顯示比對結果
            let successMessage = `報表提交成功！`;
            
            if (result.action === 'update' && result.differences) {
                // 顯示更新比對結果
                successMessage += `\n\n📊 更新摘要：`;
                result.differences.forEach(diff => {
                    successMessage += `\n• ${diff.field}: ${diff.old || '(空白)'} → ${diff.new}`;
                });
                
                if (result.message) {
                    successMessage += `\n\n💡 ${result.message}`;
                }
            }
            
            const modeText = isAssistantMode ? '助教模式：人數 0' : `講師模式：人數 ${studentCount}`;
            successMessage += `\n\n${modeText}`;
            
            showToast(successMessage, 'success');
            
            // 清空課程內容
            document.getElementById('course-content').value = '';
            document.getElementById('char-count').textContent = '0';
            
        } else {
            // 處理錯誤回應
            const errorMessage = result.error || '報表提交失敗：未知錯誤';
            showError(errorMessage);
        }
        
    } catch (error) {
        console.error('提交報表錯誤:', error);
        showError('報表提交失敗：網路錯誤');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
} 

// 計算並格式化時間距離顯示
function formatTimeDistance(courseTime) {
    try {
        console.log(`formatTimeDistance 被調用，參數: ${courseTime}`);
        
        // 支援多個星期，例如："一四 1730-1830 到府"
        const timeMatch = courseTime.match(/([一二三四五六日]+) (\d{4})-(\d{4})/);
        if (!timeMatch) {
            console.log(`時間格式不匹配: ${courseTime}`);
            return '';
        }
        
        console.log(`時間匹配結果:`, timeMatch);
        
        const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7 };
        const weekdays = timeMatch[1].split(''); // 分割多個星期
        const startHour = parseInt(timeMatch[2].substring(0, 2));
        const startMinute = parseInt(timeMatch[2].substring(2, 4));
        const endHour = parseInt(timeMatch[3].substring(0, 2));
        const endMinute = parseInt(timeMatch[3].substring(2, 4));
        
        console.log(`解析結果: 星期=${weekdays}, 開始=${startHour}:${startMinute}, 結束=${endHour}:${endMinute}`);
        
        // 獲取台灣時間
        const now = new Date();
        const taiwanTime = new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(now);
        
        // 使用更兼容的方式獲取星期幾
        const taiwanDate = {
            year: parseInt(taiwanTime.find(p => p.type === 'year').value),
            month: parseInt(taiwanTime.find(p => p.type === 'month').value),
            day: parseInt(taiwanTime.find(p => p.type === 'day').value),
            hour: parseInt(taiwanTime.find(p => p.type === 'hour').value),
            minute: parseInt(taiwanTime.find(p => p.type === 'minute').value),
            second: parseInt(taiwanTime.find(p => p.type === 'second').value)
        };
        
        const taiwanNow = new Date(
            taiwanDate.year,
            taiwanDate.month - 1,
            taiwanDate.day,
            taiwanDate.hour,
            taiwanDate.minute,
            taiwanDate.second
        );
        
        // 使用 getDay() 獲取星期幾 (0=日, 1=一, 2=二, ..., 6=六)
        const currentWeekday = taiwanNow.getDay() === 0 ? 7 : taiwanNow.getDay(); // 轉換為 1=一, 2=二, ..., 7=日
        
        const currentHour = taiwanNow.getHours();
        const currentMinute = taiwanNow.getMinutes();
        
        const courseStartMinutes = startHour * 60 + startMinute;
        const courseEndMinutes = endHour * 60 + endMinute;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        
        console.log(`當前時間: 星期${currentWeekday}, ${currentHour}:${currentMinute} (${currentTimeInMinutes}分鐘)`);
        console.log(`課程時間: 開始${courseStartMinutes}分鐘, 結束${courseEndMinutes}分鐘`);
        
        // 檢查是否有今天的課程
        let hasTodayCourse = false;
        let todayCourseStart = null;
        let todayCourseEnd = null;
        
        for (const weekdayChar of weekdays) {
            const courseWeekday = weekdayMap[weekdayChar];
            if (courseWeekday === currentWeekday) {
                hasTodayCourse = true;
                todayCourseStart = courseStartMinutes;
                todayCourseEnd = courseEndMinutes;
                break;
            }
        }
        
        if (hasTodayCourse) {
            console.log(`課程在今天，開始時間: ${todayCourseStart}分鐘`);
            // 課程在今天
            if (todayCourseStart > currentTimeInMinutes) {
                // 課程尚未開始
                const minutesUntilStart = todayCourseStart - currentTimeInMinutes;
                if (minutesUntilStart < 60) {
                    const result = `${minutesUntilStart}分鐘後`;
                    console.log(`返回: ${result}`);
                    return result;
                } else {
                    const hours = Math.floor(minutesUntilStart / 60);
                    const minutes = minutesUntilStart % 60;
                    const result = `${hours}小時${minutes}分鐘後`;
                    console.log(`返回: ${result}`);
                    return result;
                }
            } else if (todayCourseEnd > currentTimeInMinutes) {
                // 課程正在進行中
                console.log(`返回: 進行中`);
                return '進行中';
            } else {
                // 課程已結束
                const minutesSinceEnd = currentTimeInMinutes - todayCourseEnd;
                if (minutesSinceEnd < 60) {
                    const result = `${minutesSinceEnd}分鐘前`;
                    console.log(`返回: ${result}`);
                    return result;
                } else {
                    const hours = Math.floor(minutesSinceEnd / 60);
                    const minutes = minutesSinceEnd % 60;
                    const result = `${hours}小時${minutes}分鐘前`;
                    console.log(`返回: ${result}`);
                    return result;
                }
            }
        } else {
            console.log(`課程不在今天`);
            // 課程在未來日期，找到最近的
            let minDays = Infinity;
            for (const weekdayChar of weekdays) {
                const courseWeekday = weekdayMap[weekdayChar];
                let daysUntilCourse = courseWeekday - currentWeekday;
                if (daysUntilCourse < 0) {
                    daysUntilCourse += 7;
                }
                if (daysUntilCourse < minDays) {
                    minDays = daysUntilCourse;
                }
            }
            
            let result;
            if (minDays === 1) {
                result = '明天';
            } else if (minDays === 2) {
                result = '後天';
            } else {
                result = `${minDays}天後`;
            }
            console.log(`返回: ${result}`);
            return result;
        }
    } catch (error) {
        console.error('格式化時間距離錯誤:', error);
        return '';
    }
}

// 初始化補簽到功能
function initializeMakeupAttendance() {
    const makeupDateInput = document.getElementById('makeup-date');
    if (makeupDateInput) {
        // 設定最大日期為今天
        const today = new Date().toISOString().split('T')[0];
        makeupDateInput.max = today;
        // 不設定預設值，讓使用者自己選擇
    }
    
    // 設定初始收合狀態
    const section = document.querySelector('.makeup-attendance-section');
    if (section) {
        section.classList.add('collapsed');
    }
}

// 初始化講師補簽到功能
function initializeTeacherMakeupAttendance() {
    const teacherMakeupDateInput = document.getElementById('teacher-makeup-date');
    if (teacherMakeupDateInput) {
        // 設定最大日期為今天
        const today = new Date().toISOString().split('T')[0];
        teacherMakeupDateInput.max = today;
        // 不設定預設值，讓使用者自己選擇
    }
    
    // 初始化身份選擇顯示
    updateTeacherMakeupIdentityDisplay();
    
    // 初始化課程內容字數統計
    initializeTeacherMakeupCharCount();
    
    // 設定初始收合狀態
    const section = document.querySelector('.makeup-report-section');
    if (section) {
        section.classList.add('collapsed');
    }
}

// 切換補簽到報表介面的收合狀態
function toggleMakeupReport() {
    const form = document.getElementById('makeup-report-form');
    const icon = document.getElementById('makeup-report-toggle-icon');
    const section = document.querySelector('.makeup-report-section');
    
    if (form.style.display === 'none') {
        form.style.display = 'block';
        icon.classList.add('rotated');
        section.classList.remove('collapsed');
        section.classList.add('expanded');
    } else {
        form.style.display = 'none';
        icon.classList.remove('rotated');
        section.classList.remove('expanded');
        section.classList.add('collapsed');
    }
}

// 設定講師補簽到身份
function setTeacherMakeupIdentity(isAssistant) {
    console.log('設定講師補簽到身份:', isAssistant ? '助教模式' : '講師模式');
    isTeacherMakeupAssistantMode = isAssistant;
    updateTeacherMakeupIdentityDisplay();
    
    // 如果已經有課程列表，重新載入以更新身份顯示
    const teacherMakeupCoursesDiv = document.getElementById('teacher-makeup-courses');
    if (teacherMakeupCoursesDiv && teacherMakeupCoursesDiv.style.display !== 'none') {
        loadTeacherMakeupCourses();
    }
}

// 更新講師補簽到身份顯示
function updateTeacherMakeupIdentityDisplay() {
    const teacherBtn = document.getElementById('teacher-identity-btn');
    const assistantBtn = document.getElementById('assistant-identity-btn');
    const identityDisplay = document.getElementById('current-identity-display');
    
    console.log('更新講師補簽到身份顯示，當前模式:', isTeacherMakeupAssistantMode ? '助教模式' : '講師模式');
    console.log('找到的元素:', { teacherBtn, assistantBtn, identityDisplay });
    
    if (!teacherBtn || !assistantBtn || !identityDisplay) {
        console.error('找不到身份選擇相關的元素');
        return;
    }
    
    if (isTeacherMakeupAssistantMode) {
        // 助教模式
        teacherBtn.classList.remove('active');
        assistantBtn.classList.add('active');
        identityDisplay.textContent = '助教模式';
        identityDisplay.className = 'identity-value assistant';
        console.log('已設定為助教模式');
    } else {
        // 講師模式
        teacherBtn.classList.add('active');
        assistantBtn.classList.remove('active');
        identityDisplay.textContent = '講師模式';
        identityDisplay.className = 'identity-value teacher';
        console.log('已設定為講師模式');
    }
}

// 初始化講師補簽到字數統計
function initializeTeacherMakeupCharCount() {
    const contentTextarea = document.getElementById('teacher-makeup-content');
    const charCountElement = document.getElementById('teacher-makeup-char-count');
    
    if (contentTextarea && charCountElement) {
        // 設定初始字數
        charCountElement.textContent = contentTextarea.value.length;
        
        // 監聽輸入事件
        contentTextarea.addEventListener('input', function() {
            charCountElement.textContent = this.value.length;
        });
    }
}





// 切換補簽到功能區域
function toggleMakeupSection() {
    const makeupForm = document.getElementById('makeup-form');
    const toggleIcon = document.getElementById('makeup-toggle-icon');
    const section = document.querySelector('.makeup-attendance-section');
    
    if (makeupForm.style.display === 'none') {
        // 展開
        makeupForm.style.display = 'block';
        toggleIcon.classList.add('rotated');
        section.classList.remove('collapsed');
        section.classList.add('expanded');
        
        // 如果已經選擇了講師，自動展開補簽到功能並初始化
        if (selectedTeacher) {
            initializeMakeupForSelectedTeacher();
        } else {
            // 提示用戶需要先選擇講師
            showToast('請先選擇講師，然後就可以使用補簽到功能', 'info');
        }
    } else {
        // 摺疊
        makeupForm.style.display = 'none';
        toggleIcon.classList.remove('rotated');
        section.classList.remove('expanded');
        section.classList.add('collapsed');
        
        // 清除補簽到相關的內容
        clearMakeupContent();
    }
}

// 為已選擇的講師初始化補簽到功能
async function initializeMakeupForSelectedTeacher() {
    showToast(`已選擇講師：${selectedTeacher}，正在載入可補簽到的日期...`, 'info');
    
    // 載入有課程的日期
    await loadAvailableDatesForMakeup();
    
    // 如果已經有選擇日期，載入該日期的課程
    const makeupDateInput = document.getElementById('makeup-date');
    if (makeupDateInput && makeupDateInput.value) {
        loadMakeupCourses();
    }
}

// 載入有課程的日期
async function loadAvailableDatesForMakeup() {
    if (!selectedTeacher) return;
    
    try {
        // 獲取過去 30 天的日期範圍
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        // 創建日期助手文字
        const helpText = document.querySelector('.form-help');
        if (helpText) {
            helpText.innerHTML = '正在載入有課程的日期...';
        }
        
        // 這裡可以調用 API 來獲取有課程的日期
        // 暫時使用模擬數據
        const availableDates = await getAvailableDatesFromAPI();
        
        // 更新日期輸入框的樣式來標記有課程的日期
        highlightAvailableDates(availableDates);
        
        // 更新助手文字
        if (helpText) {
            helpText.innerHTML = `選擇需要補簽到的日期 (✨ 表示有課程可補簽)`;
        }
        
    } catch (error) {
        console.error('載入可用日期錯誤:', error);
        const helpText = document.querySelector('.form-help');
        if (helpText) {
            helpText.innerHTML = '載入日期失敗，請稍後再試';
        }
    }
}

// 從 API 獲取有課程的日期 (模擬)
async function getAvailableDatesFromAPI() {
    // 模擬有課程的日期
    const today = new Date();
    const availableDates = [];
    
    // 添加過去幾天作為示例
    for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        availableDates.push(date.toISOString().split('T')[0]);
    }
    
    return availableDates;
}

// 標記有課程的日期
function highlightAvailableDates(availableDates) {
    const makeupDateInput = document.getElementById('makeup-date');
    if (!makeupDateInput) return;
    
    // 創建樣式來標記有課程的日期
    let styleSheet = document.getElementById('makeup-date-styles');
    if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'makeup-date-styles';
        document.head.appendChild(styleSheet);
    }
    
    // 生成 CSS 來標記特定日期
    let css = '';
    availableDates.forEach(date => {
        css += `
            input[type="date"][value="${date}"] {
                background: linear-gradient(45deg, #d4edda 0%, #c3e6cb 100%);
                border-color: #28a745;
            }
        `;
    });
    
    styleSheet.textContent = css;
    
    // 添加視覺提示
    const dateContainer = makeupDateInput.parentElement;
    if (!dateContainer.querySelector('.date-legend')) {
        const legend = document.createElement('div');
        legend.className = 'date-legend';
        legend.innerHTML = `
            <small style="color: #28a745; font-weight: 500;">
                <i class="fas fa-star" style="color: #ffd700;"></i> 
                有 ${availableDates.length} 個日期有課程可補簽
            </small>
        `;
        dateContainer.appendChild(legend);
    }
}

// 清除補簽到內容
function clearMakeupContent() {
    const makeupCourses = document.getElementById('makeup-courses');
    if (makeupCourses) {
        makeupCourses.style.display = 'none';
    }
    
    const makeupCourseList = document.getElementById('makeup-course-list');
    if (makeupCourseList) {
        makeupCourseList.innerHTML = '';
    }
    
    // 清除日期樣式
    const styleSheet = document.getElementById('makeup-date-styles');
    if (styleSheet) {
        styleSheet.remove();
    }
    
    // 清除日期圖例
    const legend = document.querySelector('.date-legend');
    if (legend) {
        legend.remove();
    }
    
    // 重置助手文字
    const helpText = document.querySelector('.form-help');
    if (helpText) {
        helpText.innerHTML = '選擇需要補簽到的日期';
    }
}

// 載入補簽到課程
async function loadMakeupCourses() {
    const makeupDateInput = document.getElementById('makeup-date');
    const makeupCoursesDiv = document.getElementById('makeup-courses');
    const makeupCourseList = document.getElementById('makeup-course-list');
    
    if (!makeupDateInput || !makeupCoursesDiv || !makeupCourseList) return;
    
    const selectedDate = makeupDateInput.value;
    if (!selectedDate) {
        makeupCoursesDiv.style.display = 'none';
        return;
    }
    
    // 檢查是否已選擇講師
    if (!selectedTeacher) {
        makeupCourseList.innerHTML = '<div class="error">請先選擇講師</div>';
        makeupCoursesDiv.style.display = 'block';
        return;
    }
    
    selectedMakeupDate = selectedDate;
    
    try {
        // 顯示載入狀態
        makeupCourseList.innerHTML = '<div class="loading">載入課程中...</div>';
        makeupCoursesDiv.style.display = 'block';
        
        // 呼叫 API 獲取該日期的課程
        const response = await fetch('/api/teacher-courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                teacher: selectedTeacher,
                date: selectedDate 
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.courseTimes) {
            displayMakeupCourses(data.courseTimes);
        } else {
            makeupCourseList.innerHTML = '<div class="no-courses">該日期沒有課程</div>';
        }
    } catch (error) {
        console.error('載入補簽到課程錯誤:', error);
        makeupCourseList.innerHTML = '<div class="error">載入課程失敗</div>';
    }
}

// 載入講師補簽到課程
async function loadTeacherMakeupCourses() {
    const teacherMakeupDateInput = document.getElementById('teacher-makeup-date');
    const teacherMakeupCoursesDiv = document.getElementById('teacher-makeup-courses');
    const teacherMakeupCourseList = document.getElementById('teacher-makeup-course-list');
    
    if (!teacherMakeupDateInput || !teacherMakeupCoursesDiv || !teacherMakeupCourseList) return;
    
    const selectedDate = teacherMakeupDateInput.value;
    if (!selectedDate) {
        teacherMakeupCoursesDiv.style.display = 'none';
        return;
    }
    
    // 檢查是否已選擇講師和課程
    if (!selectedTeacher) {
        teacherMakeupCourseList.innerHTML = '<div class="error">請先選擇講師</div>';
        teacherMakeupCoursesDiv.style.display = 'block';
        return;
    }
    
    if (!selectedCourse) {
        teacherMakeupCourseList.innerHTML = '<div class="error">請先選擇課程</div>';
        teacherMakeupCoursesDiv.style.display = 'block';
        return;
    }
    
    try {
        // 顯示載入狀態
        teacherMakeupCourseList.innerHTML = '<div class="loading">載入課程中...</div>';
        teacherMakeupCoursesDiv.style.display = 'block';
        
        // 使用已選擇的講師和課程信息
        const currentCourseInfo = {
            course: selectedCourse,
            time: selectedCourseTime,
            date: selectedDate
        };
        
        // 直接顯示當前課程的補簽到選項
        displayTeacherMakeupCourses([currentCourseInfo]);
    } catch (error) {
        console.error('載入講師補簽到課程錯誤:', error);
        teacherMakeupCourseList.innerHTML = '<div class="error">載入課程失敗</div>';
    }
}

// 顯示補簽到課程
function displayMakeupCourses(courses) {
    const makeupCourseList = document.getElementById('makeup-course-list');
    
    if (!courses || courses.length === 0) {
        makeupCourseList.innerHTML = '<div class="no-courses">該日期沒有課程</div>';
        return;
    }
    
    makeupCourseList.innerHTML = courses.map(course => `
        <div class="makeup-course-item" data-course="${course.course}" data-time="${course.time}" data-students="${course.students || ''}">
            <div class="makeup-course-header">
                <span class="makeup-course-name">${course.course}</span>
                <span class="makeup-course-time">${course.time}</span>
            </div>
            <div class="makeup-course-students">
                <strong>學生：</strong>${course.students || '無學生資料'}
            </div>
            <div class="makeup-course-actions">
                <button class="btn-secondary btn-select-course" onclick="selectMakeupCourse('${course.course}', '${course.time}', '${course.students || ''}')">
                    <i class="fas fa-check"></i> 選擇課程
                </button>
            </div>
        </div>
    `).join('');
}

// 顯示講師補簽到課程
function displayTeacherMakeupCourses(courses) {
    const teacherMakeupCourseList = document.getElementById('teacher-makeup-course-list');
    
    if (!courses || courses.length === 0) {
        teacherMakeupCourseList.innerHTML = '<div class="no-courses">該日期沒有課程</div>';
        return;
    }
    
    // 獲取當前身份模式
    const currentMode = isTeacherMakeupAssistantMode ? '助教模式' : '講師模式';
    const modeClass = isTeacherMakeupAssistantMode ? 'assistant' : 'teacher';
    
    teacherMakeupCourseList.innerHTML = courses.map(course => `
        <div class="teacher-makeup-course-item" data-course="${course.course}" data-time="${course.time}">
            <div class="teacher-makeup-course-header">
                <span class="teacher-makeup-course-name">${course.course}</span>
                <span class="teacher-makeup-course-time">${course.time}</span>
            </div>
            <div class="teacher-makeup-course-info">
                <div class="info-item">
                    <strong>講師：</strong>${selectedTeacher}
                </div>
                <div class="info-item">
                    <strong>日期：</strong>${course.date}
                </div>
                <div class="info-item">
                    <strong>身份：</strong><span class="mode-badge ${modeClass}">${currentMode}</span>
                </div>
                <div class="info-item">
                    <strong>課程名稱：</strong>${selectedCourseNote ? `${selectedCourse} ${selectedCourseNote}` : selectedCourse}
                </div>
                <div class="info-item">
                    <strong>課程時段：</strong>${selectedCourseTime}
                </div>
            </div>
            <div class="teacher-makeup-course-actions">
                <button class="btn-primary btn-teacher-checkin ${isTeacherMakeupAssistantMode ? 'assistant-mode' : 'teacher-mode'}" onclick="submitTeacherCheckin('${course.course}', '${course.time}')">
                    <i class="fas fa-check-circle"></i> ${isTeacherMakeupAssistantMode ? '助教補簽到' : '講師補簽到'}
                </button>
            </div>
        </div>
    `).join('');
}

// 選擇補簽到課程
function selectMakeupCourse(courseName, courseTime, students) {
    // 清除之前的選擇
    document.querySelectorAll('.makeup-course-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 標記選中的課程
    event.target.closest('.makeup-course-item').classList.add('selected');
    
    selectedMakeupCourse = {
        course: courseName,
        time: courseTime,
        students: students
    };
    
    // 顯示學生出勤狀態選擇
    showStudentAttendanceSelection();
}



// 提交講師補簽到
async function submitTeacherCheckin(courseName, courseTime) {
    const teacherMakeupDateInput = document.getElementById('teacher-makeup-date');
    const selectedDate = teacherMakeupDateInput.value;
    
    if (!selectedDate) {
        showToast('請選擇日期', 'error');
        return;
    }
    
    // 檢查是否已選擇講師
    if (!selectedTeacher) {
        showToast('請先選擇講師', 'error');
        return;
    }
    
    // 檢查是否已選擇課程
    if (!selectedCourse) {
        showToast('請先選擇課程', 'error');
        return;
    }
    
    // 檢查 webApi 是否有效
    if (!webApi || webApi.trim() === '') {
        showToast('注意：此講師沒有專屬的 Web API，將使用預設的 FLB API 提交補簽到', 'info');
    } else {
        showToast(`將使用講師 ${selectedTeacher} 的專屬 API 提交補簽到`, 'info');
    }
    
    // 獲取課程內容
    const courseContent = document.getElementById('teacher-makeup-content').value.trim();
    
    if (!courseContent) {
        showToast('請填寫課程內容', 'error');
        return;
    }
    
    // 計算學生人數
    let studentCount = 0; // 補簽到時人數設為 0
    
    // 使用講師補簽到的身份模式
    if (isTeacherMakeupAssistantMode) {
        studentCount = 0; // 助教模式：人數自動設為 0
    } else {
        // 講師模式：根據課程時間判斷人數
        if (selectedCourseTime.includes('到府') || selectedCourseTime.includes('客製化')) {
            studentCount = 99;
        }
    }
    
    // 找到對應的按鈕並顯示載入狀態
    const button = document.querySelector(`button[onclick="submitTeacherCheckin('${courseName}', '${courseTime}')"]`);
    if (button) {
        const originalContent = button.innerHTML;
        const originalDisabled = button.disabled;
        
        // 顯示載入狀態
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
        button.disabled = true;
        
        try {
            // 顯示載入狀態
            showToast('正在提交講師補簽到...', 'info');
            
            // 格式化日期為 YYYY/MM/DD 格式
            const dateParts = selectedDate.split('-');
            const formattedDate = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
            
            // 呼叫講師報表 API，使用已選擇的所有參數
            const response = await fetch('/api/teacher-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teacherName: selectedTeacher,
                    courseName: (selectedCourseNote ? `${selectedCourse} ${selectedCourseNote}` : selectedCourse) + '（補簽到）',
                    courseTime: selectedCourseTime,
                    date: formattedDate,
                    studentCount: studentCount,
                    courseContent: courseContent, // 使用用戶輸入的課程內容
                    webApi: webApi
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // 處理成功的回應
                let successMessage = `講師補簽到成功！`;
                
                if (result.action === 'update' && result.differences) {
                    // 顯示更新比對結果
                    successMessage += `\n\n📊 更新摘要：`;
                    result.differences.forEach(diff => {
                        successMessage += `\n• ${diff.field}: ${diff.old || '(空白)'} → ${diff.new}`;
                    });
                    
                    if (result.message) {
                        successMessage += `\n\n💡 ${result.message}`;
                    }
                }
                
                const modeText = isTeacherMakeupAssistantMode ? '助教模式：人數 0' : `講師模式：人數 ${studentCount}`;
                successMessage += `\n\n${modeText}`;
                
                showToast(successMessage, 'success');
                
                // 重新載入課程列表
                loadTeacherMakeupCourses();
            } else {
                // 處理錯誤回應
                const errorMessage = result.error || '講師補簽到失敗：未知錯誤';
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('提交講師補簽到錯誤:', error);
            showToast('提交講師補簽到失敗：網路錯誤', 'error');
        } finally {
            // 恢復按鈕原始狀態
            button.innerHTML = originalContent;
            button.disabled = originalDisabled;
        }
    } else {
        // 如果找不到按鈕，使用原本的邏輯
        try {
            // 顯示載入狀態
            showToast('正在提交講師補簽到...', 'info');
            
            // 格式化日期為 YYYY/MM/DD 格式
            const dateParts = selectedDate.split('-');
            const formattedDate = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
            
            // 呼叫講師報表 API，使用已選擇的所有參數
            const response = await fetch('/api/teacher-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teacherName: selectedTeacher,
                    courseName: (selectedCourseNote ? `${selectedCourse} ${selectedCourseNote}` : selectedCourse) + '（補簽到）',
                    courseTime: selectedCourseTime,
                    date: formattedDate,
                    studentCount: studentCount,
                    courseContent: courseContent, // 使用用戶輸入的課程內容
                    webApi: webApi
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // 處理成功的回應
                let successMessage = `講師補簽到成功！`;
                
                if (result.action === 'update' && result.differences) {
                    // 顯示更新比對結果
                    successMessage += `\n\n📊 更新摘要：`;
                    result.differences.forEach(diff => {
                        successMessage += `\n• ${diff.field}: ${diff.old || '(空白)'} → ${diff.new}`;
                    });
                    
                    if (result.message) {
                        successMessage += `\n\n💡 ${result.message}`;
                    }
                }
                
                const modeText = isTeacherMakeupAssistantMode ? '助教模式：人數 0' : `講師模式：人數 ${studentCount}`;
                successMessage += `\n\n${modeText}`;
                
                showToast(successMessage, 'success');
                
                // 重新載入課程列表
                loadTeacherMakeupCourses();
            } else {
                // 處理錯誤回應
                const errorMessage = result.error || '講師補簽到失敗：未知錯誤';
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('提交講師補簽到錯誤:', error);
            showToast('提交講師補簽到失敗：網路錯誤', 'error');
        }
    }
}

// 顯示學生出勤狀態選擇
function showStudentAttendanceSelection() {
    const makeupCoursesDiv = document.getElementById('makeup-courses');
    
    // 移除舊的內容
    const oldContent = makeupCoursesDiv.querySelector('.student-attendance-selection');
    if (oldContent) oldContent.remove();
    
    // 創建學生出勤狀態選擇區域
    const attendanceSelection = document.createElement('div');
    attendanceSelection.className = 'student-attendance-selection';
    
    if (!selectedMakeupCourse || !selectedMakeupCourse.students) {
        attendanceSelection.innerHTML = '<div class="no-students">此課程沒有學生資料</div>';
        makeupCoursesDiv.appendChild(attendanceSelection);
        return;
    }
    
    // 解析學生資料
    const studentList = selectedMakeupCourse.students.split(',').map(s => s.trim()).filter(s => s);
    
    if (studentList.length === 0) {
        attendanceSelection.innerHTML = '<div class="no-students">此課程沒有學生資料</div>';
        makeupCoursesDiv.appendChild(attendanceSelection);
        return;
    }
    
    // 創建學生出勤狀態選擇表單
    attendanceSelection.innerHTML = `
        <h4><i class="fas fa-users"></i> 選擇學生出勤狀態</h4>
        <div class="student-attendance-list">
            ${studentList.map(student => {
                const safeStudentName = student.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '_');
                return `
                    <div class="student-attendance-item">
                        <div class="student-name">${student}</div>
                        <div class="attendance-options">
                            <label class="attendance-option">
                                <input type="radio" name="attendance_${safeStudentName}" value="present" checked onchange="updateAttendanceSelection(this, '${student}')">
                                <span class="attendance-label present">出席</span>
                            </label>
                            <label class="attendance-option">
                                <input type="radio" name="attendance_${safeStudentName}" value="absent" onchange="updateAttendanceSelection(this, '${student}')">
                                <span class="attendance-label absent">缺席</span>
                            </label>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="attendance-actions">
            <button class="btn-secondary" onclick="cancelMakeupSelection()">
                <i class="fas fa-times"></i> 取消
            </button>
            <button class="btn-primary" onclick="confirmMakeupAttendance()">
                <i class="fas fa-check"></i> 確認補簽到
            </button>
        </div>
    `;
    
    makeupCoursesDiv.appendChild(attendanceSelection);
}

// 取消補簽到選擇
function cancelMakeupSelection() {
    // 清除選擇
    selectedMakeupCourse = null;
    
    // 移除選中狀態
    document.querySelectorAll('.makeup-course-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 移除學生出勤狀態選擇區域
    const attendanceSelection = document.querySelector('.student-attendance-selection');
    if (attendanceSelection) attendanceSelection.remove();
}

// 確認補簽到
async function confirmMakeupAttendance() {
    if (!selectedMakeupCourse || !selectedMakeupDate) {
        showToast('請選擇課程和日期', 'error');
        return;
    }
    
    // 收集學生出勤狀態
    const studentAttendance = {};
    const studentList = selectedMakeupCourse.students.split(',').map(s => s.trim()).filter(s => s);
    
    for (const student of studentList) {
        const safeStudentName = student.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '_');
        const radioName = `attendance_${safeStudentName}`;
        const selectedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (selectedRadio) {
            studentAttendance[student] = selectedRadio.value;
        }
    }
    
    if (Object.keys(studentAttendance).length === 0) {
        showToast('請選擇學生出勤狀態', 'error');
        return;
    }
    
    // 顯示載入動畫
    showMakeupLoadingOverlay(studentList.length);
    
    try {
        // 為每個學生呼叫補簽到 API
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < Object.entries(studentAttendance).length; i++) {
            const [student, status] = Object.entries(studentAttendance)[i];
            
            // 更新進度
            updateMakeupLoadingProgress(i + 1, studentList.length, student);
            
            try {
                // 通過伺服器 API 調用補簽到功能
        const response = await fetch('/api/makeup-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: student,
                date: selectedMakeupDate,
                present: status === 'present',
                teacherName: selectedTeacher || '未知講師',
                courseName: selectedMakeupCourse?.course || '未知課程'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`學生 ${student} 補簽到失敗:`, data.error);
                }
            } catch (error) {
                errorCount++;
                console.error(`學生 ${student} 補簽到錯誤:`, error);
            }
            
            // 添加小延遲讓用戶看到進度
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 隱藏載入動畫
        hideMakeupLoadingOverlay();
        
        // 顯示結果
        if (errorCount === 0) {
            // 全部成功
            const attendanceSummary = Object.entries(studentAttendance)
                .map(([student, status]) => `${student}: ${getAttendanceStatusText(status)}`)
                .join(', ');
            
            showToast(`補簽到成功！\n課程：${selectedMakeupCourse.course}\n日期：${selectedMakeupDate}\n學生狀態：${attendanceSummary}`, 'success');
        } else if (successCount > 0) {
            // 部分成功
            showToast(`補簽到部分成功！\n成功：${successCount} 人\n失敗：${errorCount} 人`, 'info');
        } else {
            // 全部失敗
            showToast(`補簽到失敗！請檢查網路連線或稍後再試`, 'error');
        }
            
            // 重置選擇
            selectedMakeupCourse = null;
            document.querySelectorAll('.makeup-course-item').forEach(item => {
                item.classList.remove('selected');
            });
            
        // 移除學生出勤狀態選擇區域
        const attendanceSelection = document.querySelector('.student-attendance-selection');
        if (attendanceSelection) attendanceSelection.remove();
        
    } catch (error) {
        // 隱藏載入動畫
        hideMakeupLoadingOverlay();
        
        console.error('補簽到錯誤:', error);
        showToast('補簽到失敗：網路錯誤', 'error');
    }
}

// 獲取出勤狀態文字
function getAttendanceStatusText(status) {
    switch (status) {
        case 'present': return '出席';
        case 'absent': return '缺席';
        default: return '未知';
    }
}

// 顯示補簽到載入動畫
function showMakeupLoadingOverlay(totalStudents) {
    // 移除舊的載入動畫
    const oldOverlay = document.querySelector('.makeup-loading-overlay');
    if (oldOverlay) oldOverlay.remove();
    
    // 創建載入動畫
    const overlay = document.createElement('div');
    overlay.className = 'makeup-loading-overlay';
    overlay.innerHTML = `
        <div class="makeup-loading-content">
            <div class="makeup-loading-spinner"></div>
            <div class="makeup-loading-text">正在處理補簽到...</div>
            <div class="makeup-loading-progress">準備中...</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// 更新載入進度
function updateMakeupLoadingProgress(current, total, studentName) {
    const progressElement = document.querySelector('.makeup-loading-progress');
    if (progressElement) {
        progressElement.textContent = `處理中... ${current}/${total} - ${studentName}`;
    }
}

// 隱藏補簽到載入動畫
function hideMakeupLoadingOverlay() {
    const overlay = document.querySelector('.makeup-loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// 更新出勤選擇狀態
function updateAttendanceSelection(radioButton, studentName) {
    // 獲取選中的值
    const selectedValue = radioButton.value;
    const statusText = getAttendanceStatusText(selectedValue);
    
    // 顯示即時反饋
    showToast(`${studentName}: 已選擇 ${statusText}`, 'info');
    
    // 添加視覺反饋動畫
    const label = radioButton.nextElementSibling;
    label.style.transform = 'scale(1.1)';
    setTimeout(() => {
        label.style.transform = 'scale(1.05)';
    }, 150);
}

// 日期時間相關函數
function initializeDateTime() {
    updateDateTime();
    // 每秒更新一次時間
    setInterval(updateDateTime, 1000);
}

function updateDateTime() {
    const now = new Date();
    
    // 更新日期
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const dateString = now.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'long'
        });
        dateElement.textContent = dateString;
    }
    
    // 更新時間
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const timeString = now.toLocaleTimeString('zh-TW', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        timeElement.textContent = timeString;
    }
    
    // 更新週次
    const weekElement = document.getElementById('current-week');
    if (weekElement) {
        const weekNumber = getWeekNumber(now);
        const year = now.getFullYear();
        weekElement.textContent = `${year}年第${weekNumber}週`;
    }
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// 報表查詢功能
function openReportQueryModal() {
    const modal = document.getElementById('report-query-modal');
    modal.style.display = 'block';
    
    // 重置到第一步驟
    showQueryStep('step-select-teacher');
    
    // 清空之前的查詢結果
    document.getElementById('report-query-results').style.display = 'none';
    
    // 確保講師列表已載入，如果沒有則重新載入
    if (teachers.length === 0) {
        loadTeachers().then(() => {
            loadTeachersForReportQuery();
        });
    } else {
        loadTeachersForReportQuery();
    }
    
    // 清空所有輸入欄位
    clearReportQueryInputs();
}

function showQueryStep(stepId) {
    // 隱藏所有步驟
    document.getElementById('step-select-teacher').style.display = 'none';
    
    // 顯示指定步驟
    document.getElementById(stepId).style.display = 'block';
}

function loadTeachersForReportQuery() {
    console.log('載入講師列表到查詢報表:', teachers);
    const select = document.getElementById('report-teacher-select');
    
    if (!select) {
        console.error('找不到 report-teacher-select 元素');
        return;
    }
    
    // 清空現有選項（保留第一個預設選項）
    select.innerHTML = '<option value="">請選擇講師</option>';
    
    // 添加講師選項
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.name;
        option.textContent = teacher.name;
        option.disabled = !teacher.reportApi || teacher.reportApi.trim() === '';
        if (option.disabled) {
            option.textContent += ' (無報表API)';
        }
        select.appendChild(option);
    });
    
    console.log('講師選項已載入，共', teachers.length, '個講師');
}

function clearReportQueryInputs() {
    const elements = [
        'report-teacher-select',
        'name-contains',
        'topic-contains', 
        'query-date',
        'date-range-start',
        'date-range-end',
        'course-time',
        'query-limit',
        'query-offset'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
}

// 切換篩選條件摺疊狀態
function toggleFilters() {
    // 這個函數在新的簡化流程中不再需要，但保留以避免錯誤
    console.log('toggleFilters 被調用，但在新流程中不需要');
}

function onTeacherSelectChange() {
    const select = document.getElementById('report-teacher-select');
    const queryBtn = document.getElementById('query-report-btn');
    const advancedFilters = document.getElementById('advanced-filters');
    
    if (select.value) {
        queryBtn.disabled = false;
        // 顯示進階篩選選項
        if (advancedFilters) {
            advancedFilters.style.display = 'block';
        }
    } else {
        queryBtn.disabled = true;
        // 隱藏進階篩選選項
        if (advancedFilters) {
            advancedFilters.style.display = 'none';
        }
    }
}

// 切換進階篩選選項顯示
function toggleAdvancedFilters() {
    const filters = document.getElementById('query-filters');
    const btn = document.querySelector('.btn-toggle-filters');
    const icon = btn.querySelector('i');
    
    if (filters.style.display === 'none' || filters.style.display === '') {
        filters.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> 摺疊篩選選項';
    } else {
        filters.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> 進階篩選選項';
    }
}

function closeReportQueryModal() {
    const modal = document.getElementById('report-query-modal');
    modal.style.display = 'none';
}

// 點擊彈窗外部關閉
window.onclick = function(event) {
    const modal = document.getElementById('report-query-modal');
    if (event.target === modal) {
        closeReportQueryModal();
    }
}

// 按Enter鍵查詢（在查詢參數步驟）
document.addEventListener('DOMContentLoaded', function() {
    const inputs = ['name-contains', 'topic-contains', 'course-time'];
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    queryReport();
                }
            });
        }
    });
});

async function queryReport() {
    const selectedTeacher = document.getElementById('report-teacher-select').value;
    
    if (!selectedTeacher) {
        showToast('請先選擇講師', 'error');
        return;
    }
    
    // 收集查詢參數
    const queryParams = {};
    
    const nameContains = document.getElementById('name-contains')?.value.trim();
    if (nameContains) queryParams.name_contains = nameContains;
    
    const topicContains = document.getElementById('topic-contains')?.value.trim();
    if (topicContains) queryParams.topic_contains = topicContains;
    
    // 處理日期參數（單一日期和日期區間）
    const queryDate = document.getElementById('query-date')?.value;
    const dateRangeStart = document.getElementById('date-range-start')?.value;
    const dateRangeEnd = document.getElementById('date-range-end')?.value;
    
    // 優先級：日期區間 > 單一日期
    if (dateRangeStart && dateRangeEnd) {
        // 檢查日期區間是否有效
        const startDate = new Date(dateRangeStart);
        const endDate = new Date(dateRangeEnd);
        
        if (startDate <= endDate) {
            queryParams.date_from = dateRangeStart.replace(/-/g, '/');
            queryParams.date_to = dateRangeEnd.replace(/-/g, '/');
            // 如果有單一日期，則忽略（以區間為優先）
        } else {
            showToast('開始日期不能晚於結束日期', 'error');
            return;
        }
    } else if (dateRangeStart || dateRangeEnd) {
        showToast('請同時選擇開始日期和結束日期', 'error');
        return;
    } else if (queryDate) {
        // 只有在沒有日期區間時才使用單一日期
        queryParams.date = queryDate.replace(/-/g, '/');
    }
    
    const courseTime = document.getElementById('course-time')?.value.trim();
    if (courseTime) queryParams['上課時間'] = courseTime;
    
    const limit = document.getElementById('query-limit')?.value;
    if (limit && limit !== '0') queryParams.limit = parseInt(limit);
    
    const offset = document.getElementById('query-offset')?.value;
    if (offset && offset !== '0') queryParams.offset = parseInt(offset);
    
    // 如果沒有任何查詢條件，則搜尋全部
    if (Object.keys(queryParams).length === 0) {
        queryParams.all = true;
    }
    
    // 清除之前的錯誤訊息
    const modalBody = document.querySelector('#report-query-modal .modal-body');
    const existingError = modalBody.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 顯示載入狀態
    const queryBtn = document.getElementById('query-report-btn');
    const originalText = queryBtn.innerHTML;
    queryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 查詢中...';
    queryBtn.disabled = true;
    
    try {
        // 找到對應的講師
        const teacher = teachers.find(t => t.name === selectedTeacher);
        if (!teacher) {
            throw new Error('找不到選中的講師');
        }
        
        if (!teacher.reportApi) {
            throw new Error('該講師沒有報表查詢 API');
        }
        
        console.log('找到講師:', teacher.name, 'reportApi:', teacher.reportApi);
        console.log('查詢參數:', queryParams);
        
        // 呼叫本地服務器代理 API
        const response = await fetch('/api/query-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teacherName: selectedTeacher,
                queryParams: queryParams
            })
        });
        
        console.log('報表查詢 API 回應狀態:', response.status);
        
        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('報表查詢 API 回應資料:', data);
        
        if (data.success === false) {
            throw new Error(data.message || '查詢失敗');
        }
        
        // 顯示查詢結果
        if (data.data || data.count !== undefined) {
            displayReportResults(data.data || data);
        } else {
            displayReportResults([]);
        }
        
    } catch (error) {
        console.error('查詢報表時發生錯誤:', error);
        showToast(`查詢報表失敗: ${error.message}`, 'error');
    } finally {
        // 恢復按鈕狀態
        queryBtn.innerHTML = originalText;
        queryBtn.disabled = false;
    }
}

function displayReportResults(results) {
    const resultsContainer = document.getElementById('report-results-content');
    const resultsSection = document.getElementById('report-query-results');
    
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> 沒有找到相關的報表資料</div>';
        allReportResults = [];
        filteredReportResults = [];
        generateMonthButtons([]);
    } else {
        // 按日期排序（最近的在前）
        const sortedResults = results.sort((a, b) => {
            // 提取日期字串
            const dateA = a.date || a.日期 || a['課程日期'] || a['日期'] || '';
            const dateB = b.date || b.日期 || b['課程日期'] || b['日期'] || '';
            
            // 如果沒有日期，放在最後
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            
            // 轉換為 Date 物件進行比較
            const dateObjA = new Date(dateA.replace(/\//g, '-'));
            const dateObjB = new Date(dateB.replace(/\//g, '-'));
            
            // 最近的日期在前（降序）
            return dateObjB - dateObjA;
        });
        
        // 存儲原始結果
        allReportResults = [...sortedResults];
        filteredReportResults = [...sortedResults];
        
        // 生成月份按鈕
        generateMonthButtons(sortedResults);
        
        // 顯示結果
        renderReportResults(sortedResults);
    }
    
    resultsSection.style.display = 'block';
    
    // 滾動到結果區域
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// 生成月份按鈕
function generateMonthButtons(results) {
    const monthButtonsContainer = document.getElementById('month-buttons');
    if (!monthButtonsContainer) return;
    
    // 提取所有唯一的月份
    const months = new Set();
    results.forEach(item => {
        const dateStr = item.date || item.日期 || item['課程日期'] || item['日期'] || '';
        if (dateStr) {
            // 解析日期字串，提取年月
            const dateMatch = dateStr.match(/(\d{4})\/(\d{1,2})/);
            if (dateMatch) {
                const year = dateMatch[1];
                const month = dateMatch[2].padStart(2, '0');
                months.add(`${year}/${month}`);
            }
        }
    });
    
    // 轉換為陣列並排序（最新的在前）
    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
    
    // 生成按鈕 HTML
    let buttonsHtml = '';
    sortedMonths.forEach(month => {
        const [year, monthNum] = month.split('/');
        const monthName = getMonthName(parseInt(monthNum));
        const count = results.filter(item => {
            const dateStr = item.date || item.日期 || item['課程日期'] || item['日期'] || '';
            return dateStr.includes(month);
        }).length;
        
        buttonsHtml += `
            <button class="month-btn" onclick="filterByMonth('${month}')" data-month="${month}">
                ${year}年${monthName} (${count})
            </button>
        `;
    });
    
    monthButtonsContainer.innerHTML = buttonsHtml;
}

// 獲取月份名稱
function getMonthName(monthNum) {
    const monthNames = [
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    return monthNames[monthNum - 1] || `${monthNum}月`;
}

// 根據月份篩選結果
function filterByMonth(month) {
    // 更新當前篩選狀態
    currentMonthFilter = month;
    
    // 更新按鈕狀態
    document.querySelectorAll('.month-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.month === month) {
            btn.classList.add('active');
        }
    });
    
    // 篩選結果
    filteredReportResults = allReportResults.filter(item => {
        const dateStr = item.date || item.日期 || item['課程日期'] || item['日期'] || '';
        return dateStr.includes(month);
    });
    
    // 重新渲染結果
    renderReportResults(filteredReportResults);
    
    // 顯示篩選提示
    const monthName = getMonthName(parseInt(month.split('/')[1]));
    showToast(`已篩選 ${month} 的資料，共 ${filteredReportResults.length} 筆`, 'info');
}

// 清除月份篩選
function clearMonthFilter() {
    currentMonthFilter = null;
    
    // 清除按鈕狀態
    document.querySelectorAll('.month-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 顯示所有結果
    filteredReportResults = [...allReportResults];
    renderReportResults(filteredReportResults);
    
    showToast('已清除月份篩選', 'info');
}

// 顯示所有結果
function showAllResults() {
    clearMonthFilter();
}

// 渲染報表結果
function renderReportResults(results) {
    const resultsContainer = document.getElementById('report-results-content');
    
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> 沒有找到相關的報表資料</div>';
    } else {
        let html = '';
        results.forEach((item, index) => {
            // 處理不同的欄位名稱
            const courseName = item.course || item.課程名稱 || item['課程名稱'] || '未知課程';
            let courseDate = item.date || item.日期 || item['課程日期'] || item['日期'] || '';
            // 移除日期後面的 "00:00" 時間部分
            if (courseDate && courseDate.includes(' 00:00')) {
                courseDate = courseDate.replace(' 00:00', '');
            }
            const courseTime = item.time || item.上課時間 || item['上課時間'] || '';
            const courseContent = item.content || item.課程內容 || item['課程內容'] || '';
            const studentCount = item.students || item.人數_助教 || item['人數_助教'] || '';
            
            html += `
                <div class="report-item">
                    <div class="report-item-info">
                        <div class="report-item-name">${courseName}</div>
                        <div class="report-item-details">
                            <div><strong>日期：</strong>${courseDate}</div>
                            ${courseTime ? `<div><strong>時間：</strong>${courseTime}</div>` : ''}
                            ${courseContent ? `<div><strong>內容：</strong>${courseContent}</div>` : ''}
                            ${studentCount ? `<div><strong>人數：</strong>${studentCount}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        resultsContainer.innerHTML = html;
    }
}

// 添加自動觸發機制
function addAttendanceFocusListeners() {
    const step3Content = document.getElementById('step3-content');
    if (!step3Content) return;
    
    // 移除舊的監聽器
    step3Content.removeEventListener('blur', handleAttendanceFocusLeave);
    step3Content.removeEventListener('click', handleAttendanceClick);
    
    // 添加焦點離開監聽器
    step3Content.addEventListener('blur', handleAttendanceFocusLeave, true);
    
    // 添加點擊監聽器，當點擊重新選擇按鈕時觸發
    step3Content.addEventListener('click', handleAttendanceClick, true);
}

// 處理點擊事件
function handleAttendanceClick(event) {
    // 如果點擊的是重新選擇按鈕
    if (event.target.closest('button[onclick*="backToStep2"]')) {
        setTimeout(() => {
            sendBatchAttendanceNotification();
        }, 100);
    }
}

// 處理焦點離開事件
function handleAttendanceFocusLeave(event) {
    // 檢查是否真的離開了學生簽到區塊
    const step3Content = document.getElementById('step3-content');
    const studentSection = document.querySelector('.student-section');
    
    if (!step3Content || !studentSection) return;
    
    // 延遲檢查，避免快速切換時誤觸發
    setTimeout(() => {
        if (!step3Content.contains(document.activeElement)) {
            sendBatchAttendanceNotification();
        }
    }, 200);
}

// 批量發送學生簽到通知
async function sendBatchAttendanceNotification() {
    // 如果已經發送過通知，不再重複發送
    if (attendanceNotificationSent) return;
    
    // 檢查是否有任何學生被標記
    const hasMarkedStudents = Object.keys(studentAttendanceStatus).length > 0;
    if (!hasMarkedStudents) return;
    
    // 獲取所有學生名單
    const studentListElement = document.getElementById('student-list');
    if (!studentListElement) return;
    
    const allStudents = Array.from(studentListElement.querySelectorAll('.student-name'))
        .map(el => el.textContent.trim());
    
    if (allStudents.length === 0) return;
    
    // 分類學生狀態
    const presentStudents = [];
    const absentStudents = [];
    const unmarkedStudents = [];
    
    allStudents.forEach(student => {
        if (studentAttendanceStatus[student] === true) {
            presentStudents.push(student);
        } else if (studentAttendanceStatus[student] === false) {
            absentStudents.push(student);
        } else {
            unmarkedStudents.push(student);
        }
    });
    
    // 構建通知訊息
    let message = `📚 學生簽到通知\n\n`;
    message += `👨‍🏫 講師：${selectedTeacher || '未知講師'}\n`;
    message += `📖 課程：${selectedCourse || '未知課程'}\n`;
    message += `📅 日期：${new Date().toLocaleDateString('zh-TW')}\n\n`;
    
    if (presentStudents.length > 0) {
        message += `✅ 出席 (${presentStudents.length}人)：\n${presentStudents.join('、')}\n\n`;
    }
    
    if (absentStudents.length > 0) {
        message += `❌ 缺席 (${absentStudents.length}人)：\n${absentStudents.join('、')}\n\n`;
    }
    
    if (unmarkedStudents.length > 0) {
        message += `⏳ 未選擇 (${unmarkedStudents.length}人)：\n${unmarkedStudents.join('、')}\n\n`;
    }
    
    message += `⏰ 簽到時間：${new Date().toLocaleString('zh-TW')}`;
    
    try {
        // 發送通知
        const response = await fetch('/api/student-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                teacherName: selectedTeacher || '未知講師',
                courseName: selectedCourse || '未知課程',
                batchNotification: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            attendanceNotificationSent = true;
            showToast('✅ 學生簽到通知已發送！');
        } else {
            showError('通知發送失敗');
        }
    } catch (error) {
        console.error('發送通知錯誤:', error);
        showError('通知發送失敗');
    }
}

// 啟動簽到檢查定時器
function startAttendanceCheckTimer() {
    // 清除舊的定時器
    if (attendanceCheckTimer) {
        clearTimeout(attendanceCheckTimer);
    }
    
    // 設置新的定時器，3秒後檢查並發送通知
    attendanceCheckTimer = setTimeout(() => {
        sendBatchAttendanceNotification();
    }, 3000);
}

// 重置簽到通知狀態（當開始新的簽到時）
function resetAttendanceNotification() {
    attendanceNotificationSent = false;
    studentAttendanceStatus = {};
    
    // 清除定時器
    if (attendanceCheckTimer) {
        clearTimeout(attendanceCheckTimer);
        attendanceCheckTimer = null;
    }
}

// 當重新進入學生簽到區塊時重置通知狀態
function onReenterAttendanceArea() {
    // 如果已經發送過通知，重置狀態以允許重新發送
    if (attendanceNotificationSent) {
        attendanceNotificationSent = false;
        console.log('重新進入學生簽到區塊，重置通知狀態，允許重新發送通知');
    }
} 