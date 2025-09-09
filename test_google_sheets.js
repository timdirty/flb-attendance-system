const axios = require('axios');

// 測試Google Sheets上傳功能
async function testGoogleSheetsUpload() {
    const testUserId = 'Udb51363eb6fdc605a6a9816379a38103';
    const testDisplayName = '測試使用者';
    
    console.log('🧪 開始測試Google Sheets上傳功能...');
    console.log(`📱 測試使用者ID: ${testUserId}`);
    console.log(`👤 測試顯示名稱: ${testDisplayName}`);
    console.log('');

    try {
        // 測試直接上傳到Google Sheets
        console.log('1️⃣ 測試直接上傳到Google Sheets...');
        
        const payload = {
            action: "upsertUserId",
            sheetName: "user id",
            list: [
                {
                    "使用者名稱": testDisplayName,
                    "userId": testUserId
                }
            ]
        };

        const response = await axios.post('https://script.google.com/macros/s/AKfycbycZtdm2SGy07Sy06i2wM8oGNnERvEyyShUdTmHowlUmQz2kjS3I5VWdI1TszT1s2DCQA/exec', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'NID=525=IPIqwCVm1Z3C00Y2MFXoevvCftm-rj9UdMlgYFhlRAHY0MKSCbEO7I8EBlGrz-nwjYxoXSFUrDHBqGrYNUotcoSE3v2npcVn-j3QZsc6SAKkZcMLR6y1MkF5dZlXnbBIqWgw9cJLT3SvAvmpXUZa6RADuBXFDZpvSM85zYAoym0yXcBn3C4ayGgOookqVJaH'
            },
            timeout: 10000
        });
        
        console.log('✅ 直接上傳成功!');
        console.log('📄 回應:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ 直接上傳失敗!');
        console.log('📄 錯誤:', error.response?.data || error.message);
        console.log('🔢 狀態碼:', error.response?.status);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 測試通過API端點上傳
    console.log('2️⃣ 測試通過API端點上傳...');
    try {
        const apiResponse = await axios.post('http://localhost:3000/api/test-google-sheets', {
            userId: testUserId,
            displayName: testDisplayName + ' (API測試)'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ API端點上傳成功!');
        console.log('📄 回應:', JSON.stringify(apiResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ API端點上傳失敗!');
        console.log('📄 錯誤:', error.response?.data || error.message);
        console.log('🔢 狀態碼:', error.response?.status);
    }
    
    console.log('\n🎉 測試完成!');
}

// 執行測試
testGoogleSheetsUpload().catch(console.error);
