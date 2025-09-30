// FLB 簽到系統 - 設定頁面 JavaScript

// 頁面載入時自動載入配置
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
});

/**
 * 載入配置
 */
async function loadConfig() {
    try {
        showMessage('正在載入配置...', 'info');
        
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
            throw new Error('載入配置失敗');
        }
        
        const config = await response.json();
        
        // 填充表單
        populateForm(config);
        
        showMessage('配置載入成功！', 'success');
        
        // 3秒後自動隱藏成功訊息
        setTimeout(() => {
            hideMessage();
        }, 3000);
        
    } catch (error) {
        console.error('載入配置錯誤:', error);
        showMessage('載入配置失敗: ' + error.message, 'error');
    }
}

/**
 * 填充表單
 */
function populateForm(config) {
    // LINE Bot 配置
    setValue('bot1_token', config.LINE_CHANNEL_ACCESS_TOKEN);
    setValue('bot1_secret', config.LINE_CHANNEL_SECRET);
    setValue('bot2_token', config.LINE_CHANNEL_ACCESS_TOKEN_2);
    setValue('bot2_secret', config.LINE_CHANNEL_SECRET_2);
    setChecked('bot2_enabled', config.LINE_BOT_2_ENABLED);
    setValue('admin_user_id', config.LINE_USER_ID);
    setValue('rich_menu_id', config.RICH_MENU_ID);
    setValue('internal_rich_menu_id', config.INTERNAL_RICH_MENU_ID);
    
    // 訊息發送策略
    setChecked('load_balancing_enabled', config.LINE_LOAD_BALANCING);
    setValue('load_balancing_strategy', config.LINE_LOAD_BALANCING_STRATEGY || 'round_robin');
    setChecked('fallback_to_primary', config.LINE_FALLBACK_TO_PRIMARY);
    setValue('batch_delay', config.LINE_BATCH_DELAY || 100);
    setValue('max_retries', config.LINE_MAX_RETRIES || 3);
    
    // Google Sheets API
    setValue('google_sheets_api', config.GOOGLE_SHEETS_API);
    setChecked('google_sheets_sync', config.GOOGLE_SHEETS_SYNC);
    setValue('sync_interval', config.GOOGLE_SHEETS_SYNC_INTERVAL || 3600000);
    
    // FLB API
    setValue('flb_api_url', config.FLB_API_URL);
    setValue('link_calendar_api_url', config.LINK_CALENDAR_API_URL);
    setValue('report_api_url', config.REPORT_API_URL);
    setValue('student_attendance_api_url', config.STUDENT_ATTENDANCE_API_URL);
    
    // 功能開關
    setChecked('feature_attendance_query', config.FEATURE_ATTENDANCE_QUERY);
    setChecked('feature_internal_mode', config.FEATURE_INTERNAL_MODE);
    setChecked('feature_test_mode', config.FEATURE_TEST_MODE);
    setChecked('feature_teacher_checkin', config.FEATURE_TEACHER_CHECKIN);
    setChecked('feature_student_checkin', config.FEATURE_STUDENT_CHECKIN);
    setChecked('feature_reports', config.FEATURE_REPORTS);
    
    // 關鍵字設定
    setValue('keyword_internal', config.KEYWORD_INTERNAL || '#內部人員');
    setValue('keyword_unbind', config.KEYWORD_UNBIND || '#解綁');
    setValue('keyword_test', config.KEYWORD_TEST || '#測試');
    setValue('keyword_attendance_query', config.KEYWORD_ATTENDANCE_QUERY || '#查詢出缺勤');
    
    // UI 配置
    setValue('ui_primary_color', config.UI_PRIMARY_COLOR || '#667EEA');
    setValue('ui_success_color', config.UI_SUCCESS_COLOR || '#06C755');
    setValue('ui_warning_color', config.UI_WARNING_COLOR || '#FFB400');
    setValue('ui_danger_color', config.UI_DANGER_COLOR || '#FF334B');
    
    // 安全配置
    setChecked('security_verify_signature', config.SECURITY_VERIFY_SIGNATURE);
    setChecked('security_rate_limit', config.SECURITY_RATE_LIMIT);
    setValue('rate_limit_max', config.SECURITY_RATE_LIMIT_MAX || 100);
    
    // 日誌配置
    setValue('log_level', config.LOG_LEVEL || 'info');
    setChecked('log_verbose', config.LOG_VERBOSE);
}

/**
 * 儲存配置
 */
async function saveConfig() {
    try {
        showMessage('正在儲存配置...', 'info');
        
        // 收集表單資料
        const formData = collectFormData();
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '儲存配置失敗');
        }
        
        const result = await response.json();
        
        // 根據環境顯示不同訊息
        if (result.environment === 'Railway') {
            showMessage(
                '⚠️ Railway 環境偵測\n\n' +
                '配置已更新到當前實例（臨時生效）。\n\n' +
                '要永久保存配置，請前往：\n' +
                'Railway → Settings → Variables\n' +
                '手動添加環境變數。\n\n' +
                '點擊「測試連線」可驗證當前配置是否正確。',
                'info'
            );
            
            // 如果有 Railway URL，可以提供連結
            if (result.railwayUrl) {
                console.log('Railway Variables 設定頁面:', result.railwayUrl);
            }
        } else {
            showMessage(
                '✅ 配置已成功儲存！\n\n' +
                (result.note || '部分設定需要重新啟動才能完全生效'),
                'success'
            );
            
            // 本地/NAS 環境：3秒後重新載入頁面
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
        
    } catch (error) {
        console.error('儲存配置錯誤:', error);
        showMessage('儲存配置失敗: ' + error.message, 'error');
    }
}

/**
 * 收集表單資料
 */
function collectFormData() {
    const data = {};
    const form = document.getElementById('settingsForm');
    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        const name = input.name;
        if (!name) return;
        
        if (input.type === 'checkbox') {
            data[name] = input.checked ? 'true' : 'false';
        } else {
            data[name] = input.value;
        }
    });
    
    return data;
}

/**
 * 測試連線
 */
async function testConnection() {
    try {
        showMessage('正在測試連線...', 'info');
        
        const response = await fetch('/api/settings/test');
        
        if (!response.ok) {
            throw new Error('連線測試失敗');
        }
        
        const result = await response.json();
        
        let message = '連線測試結果:\n';
        message += `✅ Bot 1: ${result.bot1 ? '成功' : '失敗'}\n`;
        if (result.bot2Enabled) {
            message += `✅ Bot 2: ${result.bot2 ? '成功' : '失敗'}\n`;
        }
        message += `✅ Google Sheets: ${result.googleSheets ? '成功' : '失敗'}`;
        
        showMessage(message, result.success ? 'success' : 'error');
        
    } catch (error) {
        console.error('連線測試錯誤:', error);
        showMessage('連線測試失敗: ' + error.message, 'error');
    }
}

/**
 * 切換密碼可見性
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

/**
 * 顯示訊息
 */
function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
    
    // 平滑滾動到訊息框
    messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 隱藏訊息
 */
function hideMessage() {
    const messageBox = document.getElementById('messageBox');
    messageBox.style.display = 'none';
}

/**
 * 設定輸入框的值
 */
function setValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined && value !== null) {
        element.value = value;
    }
}

/**
 * 設定複選框的狀態
 */
function setChecked(id, value) {
    const element = document.getElementById(id);
    if (element) {
        // 處理字串和布林值
        if (typeof value === 'string') {
            element.checked = value === 'true' || value === '1';
        } else {
            element.checked = value !== false && value !== 'false';
        }
    }
}

/**
 * 格式化數字輸入
 */
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', function() {
        const min = parseFloat(this.min);
        const max = parseFloat(this.max);
        const value = parseFloat(this.value);
        
        if (!isNaN(min) && value < min) {
            this.value = min;
        }
        if (!isNaN(max) && value > max) {
            this.value = max;
        }
    });
});

/**
 * 表單變更監聽
 */
let formChanged = false;

document.getElementById('settingsForm').addEventListener('change', function() {
    formChanged = true;
});

// 防止未儲存就離開
window.addEventListener('beforeunload', function(e) {
    if (formChanged) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});


