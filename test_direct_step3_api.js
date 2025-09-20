// 測試直接跳轉到第三步驟的 API
// 這個文件展示如何在其他程式中調用 API

const API_BASE_URL = 'https://your-railway-domain.railway.app'; // 替換為您的 Railway 網址

// 方法一：直接調用 API 並獲取跳轉 URL
async function callDirectStep3API(teacher, course, time) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/direct-step3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacher: teacher,
                course: course,
                time: time
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ API 調用成功:', data.data);
            
            // 方法 1: 使用返回的 redirectUrl
            window.open(data.data.redirectUrl, '_blank');
            
            // 方法 2: 直接跳轉到當前視窗
            // window.location.href = data.data.redirectUrl;
            
            return data.data;
        } else {
            console.error('❌ API 調用失敗:', data.error);
            alert(`跳轉失敗：${data.error}`);
        }
    } catch (error) {
        console.error('❌ 網路錯誤:', error);
        alert('網路連線失敗');
    }
}

// 方法二：使用 URL 參數直接跳轉（不需要 API 調用）
function directRedirectWithURL(teacher, course, time) {
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/?step=3&teacher=${encodeURIComponent(teacher)}&course=${encodeURIComponent(course)}&time=${encodeURIComponent(time)}`;
    
    console.log('🔗 直接跳轉 URL:', redirectUrl);
    
    // 在新視窗中打開
    window.open(redirectUrl, '_blank');
    
    // 或在當前視窗中跳轉
    // window.location.href = redirectUrl;
}

// 使用範例
function exampleUsage() {
    // 範例 1: 調用 API 方式
    callDirectStep3API('張老師', '數學課', '09:00-10:00');
    
    // 範例 2: 直接 URL 跳轉方式
    // directRedirectWithURL('張老師', '數學課', '09:00-10:00');
}

// 在 HTML 中的使用範例
/*
<button onclick="callDirectStep3API('張老師', '數學課', '09:00-10:00')">
    跳轉到數學課簽到
</button>

<button onclick="directRedirectWithURL('李老師', '英文課', '14:00-15:00')">
    跳轉到英文課簽到
</button>
*/

// 在 React 中的使用範例
/*
import React from 'react';

function AttendanceButton({ teacher, course, time }) {
    const handleRedirect = async () => {
        await callDirectStep3API(teacher, course, time);
    };
    
    return (
        <button onClick={handleRedirect}>
            跳轉到 {course} 簽到
        </button>
    );
}
*/

// 在 Vue 中的使用範例
/*
<template>
    <button @click="handleRedirect">
        跳轉到 {{ course }} 簽到
    </button>
</template>

<script>
export default {
    methods: {
        async handleRedirect() {
            await callDirectStep3API(this.teacher, this.course, this.time);
        }
    }
}
</script>
*/

// 在 Node.js 後端中的使用範例
/*
const axios = require('axios');

async function redirectToStep3(teacher, course, time) {
    try {
        const response = await axios.post('https://your-railway-domain.railway.app/api/direct-step3', {
            teacher: teacher,
            course: course,
            time: time
        });
        
        if (response.data.success) {
            return response.data.data.redirectUrl;
        } else {
            throw new Error(response.data.error);
        }
    } catch (error) {
        console.error('跳轉失敗:', error.message);
        throw error;
    }
}
*/

// 匯出函數供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        callDirectStep3API,
        directRedirectWithURL
    };
}
