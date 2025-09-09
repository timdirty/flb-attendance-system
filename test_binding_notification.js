const axios = require('axios');

// 測試綁定通知功能
async function testBindingNotification() {
    const testUserId = 'Udb51363eb6fdc605a6a9816379a38103'; // 您的User ID
    const testDisplayName = '測試使用者';
    
    console.log('🧪 開始測試綁定通知功能...');
    console.log(`📱 測試使用者ID: ${testUserId}`);
    console.log(`👤 測試顯示名稱: ${testDisplayName}`);
    console.log('');

    try {
        // 測試綁定通知
        console.log('1️⃣ 測試綁定通知...');
        
        const response = await axios.post('https://your-railway-url.railway.app/api/test-binding-notification', {
            userId: testUserId,
            displayName: testDisplayName
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ 綁定通知測試成功!');
        console.log('📄 回應:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ 綁定通知測試失敗!');
        console.log('📄 錯誤:', error.response?.data || error.message);
        console.log('🔢 狀態碼:', error.response?.status);
    }
    
    console.log('\n🎉 測試完成!');
}

// 執行測試
testBindingNotification().catch(console.error);
