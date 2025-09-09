const axios = require('axios');

// 測試綁定API
async function testBindingAPI() {
    const baseUrl = 'https://your-railway-url.railway.app'; // 請替換為實際的Railway URL
    
    console.log('🧪 開始測試綁定API...');
    console.log('');

    const testData = {
        userId: 'test-user-' + Date.now(),
        teacherName: '測試講師',
        teacherId: 'test-teacher-001'
    };

    try {
        console.log('📡 測試講師綁定API...');
        console.log('📄 測試資料:', testData);
        
        const response = await axios.post(`${baseUrl}/api/bind-teacher`, testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        console.log('✅ 綁定API測試成功!');
        console.log('📄 狀態碼:', response.status);
        console.log('📊 回應資料:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ 綁定API測試失敗!');
        console.log('📄 錯誤:', error.response?.data || error.message);
        console.log('🔢 狀態碼:', error.response?.status);
        
        if (error.response?.data) {
            console.log('📋 詳細錯誤:', JSON.stringify(error.response.data, null, 2));
        }
    }
    
    console.log('\n🎉 測試完成!');
}

// 執行測試
testBindingAPI().catch(console.error);
