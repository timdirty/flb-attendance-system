/**
 * 模糊比對功能測試文件
 * 
 * 這個文件用於測試第三步驟直接訪問 API 的模糊比對功能
 */

const API_BASE_URL = 'https://liff-sttendence-0908-production.up.railway.app';

// 測試案例
const testCases = [
    // 講師模糊比對測試
    {
        category: '講師模糊比對',
        tests: [
            { teacher: 'tim', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim' },
            { teacher: 'TIM', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim' },
            { teacher: 'Tim ', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim' },
            { teacher: '  Tim  ', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim' },
            { teacher: 't', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim' },
            { teacher: 'ti', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim' }
        ]
    },
    // 課程精確匹配測試
    {
        category: '課程精確匹配',
        tests: [
            { teacher: 'Tim', course: 'SPM', time: '日 1330-1500 松山', expected: 'success' },
            { teacher: 'Tim', course: 'spm', time: '日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: 'SPM ', time: '日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: '  SPM  ', time: '日 1330-1500 松山', expected: 'error' }
        ]
    },
    // 時間精確匹配測試
    {
        category: '時間精確匹配',
        tests: [
            { teacher: 'Tim', course: 'SPM', time: '日 1330-1500 松山', expected: 'success' },
            { teacher: 'Tim', course: 'SPM', time: '日 1330-1500 松山 ', expected: 'error' },
            { teacher: 'Tim', course: 'SPM', time: ' 日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: 'SPM', time: '日  1330-1500  松山', expected: 'error' }
        ]
    },
    // 講師模糊比對 + 課程時間精確匹配測試
    {
        category: '講師模糊比對 + 課程時間精確匹配',
        tests: [
            { teacher: 'tim', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim, SPM, 日 1330-1500 松山' },
            { teacher: 'TIM', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim, SPM, 日 1330-1500 松山' },
            { teacher: '  tim  ', course: 'SPM', time: '日 1330-1500 松山', expected: 'Tim, SPM, 日 1330-1500 松山' }
        ]
    },
    // 錯誤案例測試
    {
        category: '錯誤案例測試',
        tests: [
            { teacher: 'NonExistentTeacher', course: 'SPM', time: '日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: 'NonExistentCourse', time: '日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: 'SPM', time: 'NonExistentTime', expected: 'error' },
            { teacher: '', course: 'SPM', time: '日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: '', time: '日 1330-1500 松山', expected: 'error' },
            { teacher: 'Tim', course: 'SPM', time: '', expected: 'error' }
        ]
    }
];

/**
 * 測試單個案例
 */
async function testSingleCase(testCase, category) {
    try {
        const url = `${API_BASE_URL}/step3?teacher=${encodeURIComponent(testCase.teacher)}&course=${encodeURIComponent(testCase.course)}&time=${encodeURIComponent(testCase.time)}`;
        
        console.log(`\n🧪 測試 ${category}:`);
        console.log(`   輸入: 講師="${testCase.teacher}", 課程="${testCase.course}", 時間="${testCase.time}"`);
        console.log(`   期望: ${testCase.expected}`);
        console.log(`   URL: ${url}`);
        
        const response = await fetch(url);
        const html = await response.text();
        
        const result = {
            category: category,
            input: {
                teacher: testCase.teacher,
                course: testCase.course,
                time: testCase.time
            },
            expected: testCase.expected,
            status: response.status,
            success: response.ok,
            isErrorPage: html.includes('❌'),
            hasStudentList: html.includes('學生名單'),
            hasTeacherReport: html.includes('講師簽到'),
            actualMatch: null
        };
        
        // 嘗試從 HTML 中提取實際匹配的內容
        if (response.ok && !html.includes('❌')) {
            // 提取講師名稱
            const teacherMatch = html.match(/講師[：:]\s*([^<]+)/);
            if (teacherMatch) {
                result.actualMatch = result.actualMatch || {};
                result.actualMatch.teacher = teacherMatch[1].trim();
            }
            
            // 提取課程名稱
            const courseMatch = html.match(/課程[：:]\s*([^<]+)/);
            if (courseMatch) {
                result.actualMatch = result.actualMatch || {};
                result.actualMatch.course = courseMatch[1].trim();
            }
            
            // 提取時間
            const timeMatch = html.match(/時間[：:]\s*([^<]+)/);
            if (timeMatch) {
                result.actualMatch = result.actualMatch || {};
                result.actualMatch.time = timeMatch[1].trim();
            }
        }
        
        // 判斷測試是否成功
        if (testCase.expected === 'error') {
            result.testPassed = result.isErrorPage;
        } else if (testCase.expected === 'success') {
            result.testPassed = result.success && !result.isErrorPage;
        } else {
            // 檢查是否匹配到期望的講師、課程、時間
            result.testPassed = result.success && !result.isErrorPage && result.actualMatch;
            
            if (result.actualMatch && testCase.expected.includes(',')) {
                const expectedParts = testCase.expected.split(',').map(p => p.trim());
                const actualParts = [
                    result.actualMatch.teacher,
                    result.actualMatch.course,
                    result.actualMatch.time
                ];
                
                result.testPassed = expectedParts.every((expected, index) => 
                    actualParts[index] && actualParts[index].includes(expected)
                );
            }
        }
        
        console.log(`   結果: ${result.testPassed ? '✅ 通過' : '❌ 失敗'}`);
        console.log(`   狀態: ${result.status} ${result.success ? '成功' : '失敗'}`);
        if (result.actualMatch) {
            console.log(`   實際匹配: 講師="${result.actualMatch.teacher}", 課程="${result.actualMatch.course}", 時間="${result.actualMatch.time}"`);
        }
        
        return result;
        
    } catch (error) {
        console.error(`   錯誤: ${error.message}`);
        return {
            category: category,
            input: testCase,
            expected: testCase.expected,
            error: error.message,
            testPassed: false
        };
    }
}

/**
 * 執行所有測試
 */
async function runAllTests() {
    console.log('🚀 開始執行模糊比對功能測試...\n');
    
    const allResults = [];
    let totalTests = 0;
    let passedTests = 0;
    
    for (const category of testCases) {
        console.log(`\n📋 ${category.category}:`);
        console.log('='.repeat(50));
        
        const categoryResults = [];
        
        for (const testCase of category.tests) {
            const result = await testSingleCase(testCase, category.category);
            categoryResults.push(result);
            allResults.push(result);
            
            totalTests++;
            if (result.testPassed) {
                passedTests++;
            }
            
            // 添加延遲避免請求過於頻繁
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 計算類別統計
        const categoryPassed = categoryResults.filter(r => r.testPassed).length;
        const categoryTotal = categoryResults.length;
        console.log(`\n📊 ${category.category} 統計: ${categoryPassed}/${categoryTotal} 通過`);
    }
    
    // 總體統計
    console.log('\n' + '='.repeat(60));
    console.log('📊 總體測試結果:');
    console.log(`   總測試數: ${totalTests}`);
    console.log(`   通過數: ${passedTests}`);
    console.log(`   失敗數: ${totalTests - passedTests}`);
    console.log(`   通過率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    return {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        passRate: (passedTests / totalTests) * 100,
        results: allResults
    };
}

/**
 * 生成測試報告
 */
function generateTestReport(results) {
    const report = {
        summary: {
            totalTests: results.totalTests,
            passedTests: results.passedTests,
            failedTests: results.failedTests,
            passRate: results.passRate
        },
        details: results.results
    };
    
    console.log('\n📄 詳細測試報告:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
}

/**
 * 創建測試按鈕（瀏覽器環境）
 */
function createTestButtons() {
    if (typeof window === 'undefined') return;
    
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px; border: 1px solid #ccc; margin: 20px; border-radius: 5px; font-family: Arial, sans-serif;">
            <h3>🔍 模糊比對功能測試</h3>
            <div id="test-buttons"></div>
            <div id="test-results" style="margin-top: 20px;"></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    const buttonsContainer = document.getElementById('test-buttons');
    const resultsContainer = document.getElementById('test-results');
    
    // 添加測試按鈕
    const runTestsButton = document.createElement('button');
    runTestsButton.textContent = '執行所有測試';
    runTestsButton.style.padding = '10px 20px';
    runTestsButton.style.margin = '5px';
    runTestsButton.style.backgroundColor = '#007bff';
    runTestsButton.style.color = 'white';
    runTestsButton.style.border = 'none';
    runTestsButton.style.borderRadius = '5px';
    runTestsButton.style.cursor = 'pointer';
    
    runTestsButton.onclick = async () => {
        resultsContainer.innerHTML = '<p>正在執行測試...</p>';
        const results = await runAllTests();
        generateTestReport(results);
        
        resultsContainer.innerHTML = `
            <h4>測試結果摘要:</h4>
            <p>總測試數: ${results.totalTests}</p>
            <p>通過數: ${results.passedTests}</p>
            <p>失敗數: ${results.failedTests}</p>
            <p>通過率: ${results.passRate.toFixed(1)}%</p>
        `;
    };
    
    buttonsContainer.appendChild(runTestsButton);
    
    // 添加單個測試按鈕
    const singleTestButton = document.createElement('button');
    singleTestButton.textContent = '測試單個案例';
    singleTestButton.style.padding = '10px 20px';
    singleTestButton.style.margin = '5px';
    singleTestButton.style.backgroundColor = '#28a745';
    singleTestButton.style.color = 'white';
    singleTestButton.style.border = 'none';
    singleTestButton.style.borderRadius = '5px';
    singleTestButton.style.cursor = 'pointer';
    
    singleTestButton.onclick = async () => {
        const teacher = prompt('輸入講師名稱:', 'tim');
        const course = prompt('輸入課程名稱:', 'spm');
        const time = prompt('輸入時間:', '日 1330-1500 松山');
        
        if (teacher && course && time) {
            const result = await testSingleCase({ teacher, course, time, expected: 'success' }, '單個測試');
            resultsContainer.innerHTML = `
                <h4>單個測試結果:</h4>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            `;
        }
    };
    
    buttonsContainer.appendChild(singleTestButton);
}

// 如果是在瀏覽器環境中，自動創建測試按鈕
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createTestButtons);
    } else {
        createTestButtons();
    }
}

// 導出函數供 Node.js 環境使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testSingleCase,
        runAllTests,
        generateTestReport,
        testCases
    };
}

// 如果直接執行此文件，則運行測試
if (typeof require !== 'undefined' && require.main === module) {
    runAllTests().then(results => {
        generateTestReport(results);
        process.exit(results.passedTests === results.totalTests ? 0 : 1);
    });
}

console.log('🔍 模糊比對功能測試文件已載入');
console.log('可用的函數:');
console.log('- testSingleCase(testCase, category)');
console.log('- runAllTests()');
console.log('- generateTestReport(results)');
