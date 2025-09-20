/**
 * 第三步驟直接訪問 API 測試文件
 * 
 * 這個文件包含各種測試範例，幫助您了解如何使用第三步驟直接訪問 API
 */

// 基本配置
const API_BASE_URL = 'https://liff-sttendence-0908-production.up.railway.app';
const STEP3_ENDPOINT = '/step3';

// 測試資料
const testCases = [
    {
        name: 'Tim 的 SPM 課程',
        teacher: 'Tim',
        course: 'SPM',
        time: '日 1330-1500 松山'
    },
    {
        name: 'John 的數學課程',
        teacher: 'John',
        course: '數學',
        time: '一 0900-1000 台北'
    }
];

/**
 * 構建第三步驟 URL
 * @param {string} teacher - 講師姓名
 * @param {string} course - 課程名稱
 * @param {string} time - 課程時間
 * @returns {string} 完整的 URL
 */
function buildStep3URL(teacher, course, time) {
    const params = new URLSearchParams({
        teacher: teacher,
        course: course,
        time: time
    });
    
    return `${API_BASE_URL}${STEP3_ENDPOINT}?${params.toString()}`;
}

/**
 * 在新視窗中開啟第三步驟頁面
 * @param {string} teacher - 講師姓名
 * @param {string} course - 課程名稱
 * @param {string} time - 課程時間
 */
function openStep3InNewWindow(teacher, course, time) {
    const url = buildStep3URL(teacher, course, time);
    console.log('開啟 URL:', url);
    
    const popup = window.open(url, 'step3', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!popup) {
        alert('無法開啟彈出視窗，請檢查瀏覽器設定');
        return;
    }
    
    // 監聽視窗關閉
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            console.log('第三步驟視窗已關閉');
        }
    }, 1000);
}

/**
 * 在當前視窗中跳轉到第三步驟
 * @param {string} teacher - 講師姓名
 * @param {string} course - 課程名稱
 * @param {string} time - 課程時間
 */
function redirectToStep3(teacher, course, time) {
    const url = buildStep3URL(teacher, course, time);
    console.log('跳轉到 URL:', url);
    window.location.href = url;
}

/**
 * 載入第三步驟頁面到指定容器
 * @param {string} teacher - 講師姓名
 * @param {string} course - 課程名稱
 * @param {string} time - 課程時間
 * @param {string} containerId - 容器元素 ID
 */
async function loadStep3ToContainer(teacher, course, time, containerId) {
    try {
        const url = buildStep3URL(teacher, course, time);
        console.log('載入 URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // 檢查是否為錯誤頁面
        if (html.includes('❌')) {
            throw new Error('API 返回錯誤頁面');
        }
        
        // 將 HTML 插入到指定容器中
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
            
            // 重新執行頁面中的 JavaScript
            const scripts = container.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                newScript.textContent = script.textContent;
                document.head.appendChild(newScript);
            });
            
            console.log('第三步驟頁面載入成功');
        } else {
            throw new Error(`找不到容器元素: ${containerId}`);
        }
        
    } catch (error) {
        console.error('載入第三步驟頁面失敗:', error);
        alert('無法載入簽到頁面，請檢查參數是否正確');
    }
}

/**
 * 測試 API 回應
 * @param {string} teacher - 講師姓名
 * @param {string} course - 課程名稱
 * @param {string} time - 課程時間
 */
async function testStep3API(teacher, course, time) {
    try {
        const url = buildStep3URL(teacher, course, time);
        console.log('測試 URL:', url);
        
        const response = await fetch(url);
        const html = await response.text();
        
        console.log(`測試結果 - ${teacher}:`, {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            isErrorPage: html.includes('❌'),
            hasStudentList: html.includes('學生名單'),
            hasTeacherReport: html.includes('講師簽到')
        });
        
        return {
            success: response.ok && !html.includes('❌'),
            status: response.status,
            html: html
        };
        
    } catch (error) {
        console.error(`測試 ${teacher} 失敗:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 執行所有測試案例
 */
async function runAllTests() {
    console.log('開始執行所有測試案例...');
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`測試: ${testCase.name}`);
        const result = await testStep3API(testCase.teacher, testCase.course, testCase.time);
        results.push({
            ...testCase,
            ...result
        });
    }
    
    console.log('測試結果摘要:', results);
    return results;
}

/**
 * 創建測試按鈕
 */
function createTestButtons() {
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px; border: 1px solid #ccc; margin: 20px; border-radius: 5px;">
            <h3>第三步驟 API 測試</h3>
            <div id="test-buttons"></div>
            <div id="test-results" style="margin-top: 20px;"></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    const buttonsContainer = document.getElementById('test-buttons');
    const resultsContainer = document.getElementById('test-results');
    
    // 為每個測試案例創建按鈕
    testCases.forEach((testCase, index) => {
        const buttonGroup = document.createElement('div');
        buttonGroup.style.marginBottom = '10px';
        buttonGroup.innerHTML = `
            <strong>${testCase.name}</strong><br>
            <button onclick="openStep3InNewWindow('${testCase.teacher}', '${testCase.course}', '${testCase.time}')">
                新視窗開啟
            </button>
            <button onclick="redirectToStep3('${testCase.teacher}', '${testCase.course}', '${testCase.time}')">
                當前視窗跳轉
            </button>
            <button onclick="loadStep3ToContainer('${testCase.teacher}', '${testCase.course}', '${testCase.time}', 'step3-container')">
                載入到容器
            </button>
            <button onclick="testSingleCase('${testCase.teacher}', '${testCase.course}', '${testCase.time}', '${index}')">
                測試 API
            </button>
        `;
        buttonsContainer.appendChild(buttonGroup);
    });
    
    // 添加全部測試按鈕
    const allTestsButton = document.createElement('button');
    allTestsButton.textContent = '執行所有測試';
    allTestsButton.onclick = async () => {
        const results = await runAllTests();
        resultsContainer.innerHTML = '<h4>測試結果:</h4><pre>' + JSON.stringify(results, null, 2) + '</pre>';
    };
    buttonsContainer.appendChild(allTestsButton);
    
    // 添加容器
    const containerDiv = document.createElement('div');
    containerDiv.id = 'step3-container';
    containerDiv.style.border = '1px solid #ddd';
    containerDiv.style.padding = '10px';
    containerDiv.style.marginTop = '20px';
    containerDiv.innerHTML = '<p>第三步驟頁面將載入到這裡...</p>';
    container.appendChild(containerDiv);
}

/**
 * 測試單個案例
 */
async function testSingleCase(teacher, course, time, index) {
    const result = await testStep3API(teacher, course, time);
    const resultsContainer = document.getElementById('test-results');
    
    const resultDiv = document.createElement('div');
    resultDiv.innerHTML = `
        <h4>測試結果 ${index + 1}:</h4>
        <p><strong>講師:</strong> ${teacher}</p>
        <p><strong>課程:</strong> ${course}</p>
        <p><strong>時間:</strong> ${time}</p>
        <p><strong>狀態:</strong> ${result.success ? '✅ 成功' : '❌ 失敗'}</p>
        <p><strong>HTTP 狀態:</strong> ${result.status || 'N/A'}</p>
        ${result.error ? `<p><strong>錯誤:</strong> ${result.error}</p>` : ''}
        <hr>
    `;
    
    resultsContainer.appendChild(resultDiv);
}

// 如果是在瀏覽器環境中，自動創建測試按鈕
if (typeof window !== 'undefined') {
    // 等待頁面載入完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createTestButtons);
    } else {
        createTestButtons();
    }
}

// 導出函數供 Node.js 環境使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildStep3URL,
        openStep3InNewWindow,
        redirectToStep3,
        loadStep3ToContainer,
        testStep3API,
        runAllTests,
        testCases
    };
}

// 使用範例
console.log('第三步驟 API 測試文件已載入');
console.log('可用的函數:');
console.log('- buildStep3URL(teacher, course, time)');
console.log('- openStep3InNewWindow(teacher, course, time)');
console.log('- redirectToStep3(teacher, course, time)');
console.log('- loadStep3ToContainer(teacher, course, time, containerId)');
console.log('- testStep3API(teacher, course, time)');
console.log('- runAllTests()');
