// 測試補簽到 API 調用
const testMakeupAPI = async () => {
    console.log('🧪 測試補簽到 API...');
    
    const testData = {
        action: "update",
        name: "測試學生",
        date: "2025-01-20",
        present: true
    };
    
    try {
        console.log('📤 發送請求:', testData);
        
        const response = await fetch('http://localhost:3000/api/makeup-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📥 回應狀態:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API 回應:', data);
        } else {
            console.log('❌ API 錯誤:', response.statusText);
        }
        
    } catch (error) {
        console.error('💥 網路錯誤:', error.message);
    }
};

// 測試多個學生
const testMultipleStudents = async () => {
    console.log('\n🧪 測試多個學生補簽到...');
    
    const students = [
        { name: "世韋浩俞", present: true },
        { name: "Raily", present: false },
        { name: "王琮天", present: true }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const student of students) {
        try {
            const testData = {
                action: "update",
                name: student.name,
                date: "2025-01-20",
                present: student.present
            };
            
            console.log(`📤 發送 ${student.name} 的請求:`, testData);
            
            const response = await fetch('http://localhost:3000/api/makeup-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    successCount++;
                    console.log(`✅ ${student.name} 補簽到成功`);
                } else {
                    errorCount++;
                    console.log(`❌ ${student.name} 補簽到失敗:`, data.error);
                }
            } else {
                errorCount++;
                console.log(`❌ ${student.name} 請求失敗:`, response.statusText);
            }
            
            // 等待一下再發送下一個請求
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            errorCount++;
            console.error(`💥 ${student.name} 網路錯誤:`, error.message);
        }
    }
    
    console.log(`\n📊 測試結果: 成功 ${successCount} 人, 失敗 ${errorCount} 人`);
};

// 執行測試
const runTests = async () => {
    console.log('🚀 開始執行補簽到 API 測試...\n');
    
    await testMakeupAPI();
    await testMultipleStudents();
    
    console.log('\n✨ 測試完成！');
};

// 如果直接執行此腳本
if (typeof window === 'undefined') {
    // Node.js 環境
    const fetch = require('node-fetch');
    runTests();
} else {
    // 瀏覽器環境
    console.log('🌐 在瀏覽器中運行測試...');
    runTests();
}
