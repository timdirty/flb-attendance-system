const axios = require('axios');

// 測試管理員API
async function testAdminAPI() {
    const baseUrl = 'https://your-railway-url.railway.app'; // 請替換為實際的Railway URL
    
    console.log('🧪 開始測試管理員API...');
    console.log('');

    const apis = [
        { name: '統計資料', url: '/api/admin/stats', method: 'GET' },
        { name: '所有使用者', url: '/api/admin/users', method: 'GET' },
        { name: '所有綁定', url: '/api/admin/bindings', method: 'GET' },
        { name: '同步Google Sheets', url: '/api/admin/sync-google-sheets', method: 'POST' }
    ];

    for (const api of apis) {
        try {
            console.log(`📡 測試 ${api.name}...`);
            
            let response;
            if (api.method === 'GET') {
                response = await axios.get(`${baseUrl}${api.url}`, {
                    timeout: 10000
                });
            } else {
                response = await axios.post(`${baseUrl}${api.url}`, {}, {
                    timeout: 10000
                });
            }
            
            console.log(`✅ ${api.name} 成功!`);
            console.log(`📄 狀態碼: ${response.status}`);
            console.log(`📊 回應資料:`, JSON.stringify(response.data, null, 2));
            console.log('');
            
        } catch (error) {
            console.log(`❌ ${api.name} 失敗!`);
            console.log(`📄 錯誤:`, error.response?.data || error.message);
            console.log(`🔢 狀態碼:`, error.response?.status);
            console.log('');
        }
    }
    
    console.log('🎉 測試完成!');
}

// 執行測試
testAdminAPI().catch(console.error);
