/**
 * 測試課程規劃新 API 功能
 * 用於驗證外部 API 串接是否正常運作
 */

const axios = require('axios');

// 測試資料
const testCases = [
    {
        name: '測試案例 1：ESM 六 到府',
        course: 'ESM',
        period: '六 0930-1030 到府',
        expected: 'success'
    },
    {
        name: '測試案例 2：ESM 日',
        course: 'ESM',
        period: '日 0930-1030',
        expected: 'success'
    },
    {
        name: '測試案例 3：SPIKE 五 外',
        course: 'SPIKE',
        period: '五 1015-1140 外',
        expected: 'success'
    },
    {
        name: '測試案例 4：SPM 一 到府',
        course: 'SPM',
        period: '一 1930-2030 到府',
        expected: 'success'
    },
    {
        name: '測試案例 5：帶冒號的時間格式',
        course: 'ESM',
        period: '六 9:30-10:30 到府',
        expected: 'success'
    },
    {
        name: '測試案例 6：不存在的課程（應該失敗）',
        course: 'ESM',
        period: '日 1600-1700',
        expected: 'fail'
    }
];

/**
 * 調用外部 API 查詢課程規劃連結
 */
async function fetchCoursePlanUrl(course, period) {
    try {
        const apiUrl = 'https://course-viewer.funlearnbar.synology.me/api/find-course';
        const params = new URLSearchParams({
            course: course,
            period: period,
            format: 'json'
        });
        
        console.log(`📡 調用課程規劃 API: ${apiUrl}?${params.toString()}`);
        
        const response = await axios.get(`${apiUrl}?${params.toString()}`, {
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        console.error('❌ 調用課程規劃 API 失敗:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 執行測試
 */
async function runTests() {
    console.log('\n🧪 開始測試課程規劃 API 功能\n');
    console.log('='.repeat(80));
    
    let passCount = 0;
    let failCount = 0;
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`\n📝 ${testCase.name}`);
        console.log(`   課程: ${testCase.course}`);
        console.log(`   時段: ${testCase.period}`);
        console.log(`   預期: ${testCase.expected}`);
        
        const result = await fetchCoursePlanUrl(testCase.course, testCase.period);
        
        const actualResult = result.success ? 'success' : 'fail';
        const isPassed = actualResult === testCase.expected;
        
        if (isPassed) {
            passCount++;
            console.log(`   ✅ 測試通過`);
        } else {
            failCount++;
            console.log(`   ❌ 測試失敗`);
        }
        
        if (result.success) {
            console.log(`   📄 檔案: ${result.matched_file || result.filename || 'N/A'}`);
            console.log(`   🔗 URL: ${result.url || 'N/A'}`);
        } else {
            console.log(`   ⚠️  錯誤: ${result.error || result.message || 'Unknown error'}`);
        }
        
        results.push({
            testCase,
            result,
            passed: isPassed
        });
        
        console.log('-'.repeat(80));
        
        // 延遲 500ms 避免 API 請求過快
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 測試結果總結：');
    console.log(`   ✅ 通過: ${passCount} / ${testCases.length}`);
    console.log(`   ❌ 失敗: ${failCount} / ${testCases.length}`);
    console.log(`   📈 成功率: ${((passCount / testCases.length) * 100).toFixed(2)}%`);
    
    // 顯示失敗的測試案例
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        console.log('\n❌ 失敗的測試案例：');
        failedTests.forEach((r, index) => {
            console.log(`   ${index + 1}. ${r.testCase.name}`);
            console.log(`      - 課程: ${r.testCase.course}, 時段: ${r.testCase.period}`);
            console.log(`      - 預期: ${r.testCase.expected}, 實際: ${r.result.success ? 'success' : 'fail'}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✨ 測試完成！\n');
    
    return {
        total: testCases.length,
        passed: passCount,
        failed: failCount,
        successRate: ((passCount / testCases.length) * 100).toFixed(2)
    };
}

/**
 * 測試完整的 Flex Message 創建流程
 */
async function testFlexMessageCreation() {
    console.log('\n🎨 測試 Flex Message 創建流程\n');
    console.log('='.repeat(80));
    
    const testStudent = {
        name: '測試學生',
        course: 'ESM',
        period: '六 0930-1030 到府'
    };
    
    console.log(`\n👤 測試學生資料：`);
    console.log(`   姓名: ${testStudent.name}`);
    console.log(`   課程: ${testStudent.course}`);
    console.log(`   時段: ${testStudent.period}`);
    
    const apiResult = await fetchCoursePlanUrl(testStudent.course, testStudent.period);
    
    console.log(`\n📡 API 查詢結果：`);
    console.log(JSON.stringify(apiResult, null, 2));
    
    if (apiResult.success) {
        console.log(`\n✅ Flex Message 可成功創建`);
        console.log(`   按鈕連結: https://course-viewer.funlearnbar.synology.me${apiResult.url}`);
    } else {
        console.log(`\n❌ Flex Message 將顯示錯誤訊息`);
    }
    
    console.log('\n' + '='.repeat(80));
}

// 執行測試
(async () => {
    try {
        // 執行 API 測試
        const summary = await runTests();
        
        // 執行 Flex Message 創建測試
        await testFlexMessageCreation();
        
        // 返回測試結果
        process.exit(summary.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n💥 測試執行失敗:', error);
        process.exit(1);
    }
})();

