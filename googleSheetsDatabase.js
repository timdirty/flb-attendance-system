const axios = require('axios');

class GoogleSheetsDatabase {
    constructor() {
        // Google Sheets API URLs
        this.USERS_UPSERT_URL = 'https://script.google.com/macros/s/AKfycbwOuS6rJtAHgLJFh5R-QrLix28kU-hcp3Z0aTIfWPjTp-LU1CYlYZzVKgbwTYGmbE6b/exec';
        this.BINDINGS_UPSERT_URL = 'https://script.google.com/macros/s/AKfycbx_IZWx-vrOvfzCa4msYbP1kopcaLt7dwcnIPzSR2bWJGsxh0GZuPyahMm3U_mHX_d0Fw/exec';
        this.USERS_READ_URL = 'https://script.google.com/macros/s/AKfycbyDKCdRNc7oulsTOfvb9v2xW242stGb1Ckl4TmsrZHfp8JJQU7ZP6dUmi8ty_M1WSxboQ/exec';
        this.BINDINGS_READ_URL = 'https://script.google.com/macros/s/AKfycbyDKCdRNc7oulsTOfvb9v2xW242stGb1Ckl4TmsrZHfp8JJQU7ZP6dUmi8ty_M1WSxboQ/exec';
        
        this.COOKIE = 'NID=525=IPIqwCVm1Z3C00Y2MFXoevvCftm-rj9UdMlgYFhlRAHY0MKSCbEO7I8EBlGrz-nwjYxoXSFUrDHBqGrYNUotcoSE3v2npcVn-j3QZsc6SAKkZcMLR6y1MkF5dZlXnbBIqWgw9cJLT3SvAvmpXUZa6RADuBXFDZpvSM85zYAoym0yXcBn3C4ayGgOookqVJaH';
    }

    // 發送請求到Google Sheets API
    async makeRequest(url, data = null, method = 'POST') {
        try {
            const config = {
                method: method,
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.COOKIE
                },
                timeout: 15000
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Google Sheets API 請求失敗:`, error.response?.data || error.message);
            throw error;
        }
    }

    // 初始化資料庫
    async init() {
        try {
            console.log('Google Sheets 資料庫連線成功');
            return true;
        } catch (error) {
            console.error('Google Sheets 資料庫初始化失敗:', error);
            throw error;
        }
    }

    // 從Google Sheets同步所有資料到本地
    async syncFromGoogleSheets() {
        try {
            console.log('🔄 開始從Google Sheets同步資料...');
            
            // 同步使用者資料
            const users = await this.getAllUsersFromGoogleSheets();
            console.log(`📥 從Google Sheets獲取到 ${users.length} 個使用者`);
            
            // 同步講師綁定資料
            const bindings = await this.getAllBindingsFromGoogleSheets();
            console.log(`📥 從Google Sheets獲取到 ${bindings.length} 個綁定記錄`);
            
            return {
                users: users,
                bindings: bindings,
                success: true
            };
        } catch (error) {
            console.error('從Google Sheets同步失敗:', error);
            return {
                users: [],
                bindings: [],
                success: false,
                error: error.message
            };
        }
    }

    // 從Google Sheets獲取所有使用者
    async getAllUsersFromGoogleSheets() {
        try {
            const url = `${this.USERS_READ_URL}?action=listUsers&limit=500&offset=0`;
            const result = await this.makeRequest(url, null, 'GET');
            
            if (result && result.success) {
                return result.data || [];
            } else {
                console.error('獲取使用者資料失敗:', result?.error);
                return [];
            }
        } catch (error) {
            console.error('從Google Sheets獲取使用者失敗:', error);
            return [];
        }
    }

    // 從Google Sheets獲取所有綁定
    async getAllBindingsFromGoogleSheets() {
        try {
            const url = `${this.BINDINGS_READ_URL}?action=listBindings&limit=500&offset=0`;
            const result = await this.makeRequest(url, null, 'GET');
            
            if (result && result.success) {
                return result.data || [];
            } else {
                console.error('獲取綁定資料失敗:', result?.error);
                return [];
            }
        } catch (error) {
            console.error('從Google Sheets獲取綁定失敗:', error);
            return [];
        }
    }

    // 上傳使用者到Google Sheets
    async upsertUsersToGoogleSheets(users) {
        try {
            const payload = {
                action: "upsertUsers",
                sheetName: "使用者資料表 (users)",
                list: users.map(user => ({
                    uid: user.userId,
                    display_name: user.displayName || '',
                    username: user.userName || '',
                    pictureURL: user.pictureUrl || '',
                    registeredAt: user.registeredAt || new Date().toISOString(),
                    teacherName: user.teacherName || '',
                    teacherId: user.teacherId || ''
                }))
            };

            const result = await this.makeRequest(this.USERS_UPSERT_URL, payload);
            console.log(`📤 上傳 ${users.length} 個使用者到Google Sheets`);
            return result;
        } catch (error) {
            console.error('上傳使用者到Google Sheets失敗:', error);
            throw error;
        }
    }

    // 上傳綁定到Google Sheets
    async upsertBindingsToGoogleSheets(bindings) {
        try {
            const payload = {
                action: "upsertTeacherBindings",
                list: bindings.map(binding => ({
                    id: binding.id || `bind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    userId: binding.userId,
                    teacherId: binding.teacherId || '',
                    teacherName: binding.teacherName || '',
                    isActive: binding.isActive !== false,
                    boundAt: binding.boundAt || new Date().toISOString()
                }))
            };

            const result = await this.makeRequest(this.BINDINGS_UPSERT_URL, payload);
            console.log(`📤 上傳 ${bindings.length} 個綁定到Google Sheets`);
            return result;
        } catch (error) {
            console.error('上傳綁定到Google Sheets失敗:', error);
            throw error;
        }
    }

    // 註冊使用者（雙向同步）
    async registerUser(userData) {
        try {
            // 先上傳到Google Sheets
            await this.upsertUsersToGoogleSheets([userData]);
            
            console.log(`使用者已註冊並同步到Google Sheets: ${userData.userName} (${userData.userId})`);
            return { id: Date.now(), ...userData };
        } catch (error) {
            console.error('註冊使用者失敗:', error);
            throw error;
        }
    }

    // 更新使用者（雙向同步）
    async updateUser(userId, updateData) {
        try {
            // 先從Google Sheets獲取現有資料
            const users = await this.getAllUsersFromGoogleSheets();
            const existingUser = users.find(u => u.uid === userId);
            
            if (existingUser) {
                const updatedUser = { ...existingUser, ...updateData };
                await this.upsertUsersToGoogleSheets([updatedUser]);
                console.log(`使用者已更新並同步到Google Sheets: ${userId}`);
                return true;
            } else {
                console.log(`未找到使用者: ${userId}`);
                return false;
            }
        } catch (error) {
            console.error('更新使用者失敗:', error);
            throw error;
        }
    }

    // 綁定講師（雙向同步）
    async bindTeacher(userId, teacherName, teacherId) {
        try {
            const bindingData = {
                userId: userId,
                teacherName: teacherName,
                teacherId: teacherId,
                boundAt: new Date().toISOString(),
                isActive: true
            };

            // 上傳綁定到Google Sheets
            await this.upsertBindingsToGoogleSheets([bindingData]);

            // 更新使用者表中的講師資訊
            await this.updateUser(userId, { 
                teacherName: teacherName, 
                teacherId: teacherId 
            });

            console.log(`講師綁定成功並同步到Google Sheets: ${teacherName} (${userId}) -> ${teacherId}`);
            return true;
        } catch (error) {
            console.error('講師綁定失敗:', error);
            throw error;
        }
    }

    // 解除講師綁定（雙向同步）
    async unbindTeacher(userId, teacherName = null) {
        try {
            // 從Google Sheets獲取現有綁定
            const bindings = await this.getAllBindingsFromGoogleSheets();
            const activeBindings = bindings.filter(b => b.userId === userId && b.isActive);

            // 停用所有相關綁定
            const deactivatedBindings = activeBindings.map(binding => ({
                ...binding,
                isActive: false
            }));

            if (deactivatedBindings.length > 0) {
                await this.upsertBindingsToGoogleSheets(deactivatedBindings);
            }

            // 清除使用者表中的講師資訊
            await this.updateUser(userId, { 
                teacherName: '', 
                teacherId: '' 
            });

            console.log(`講師綁定已解除並同步到Google Sheets: ${userId}${teacherName ? ` (${teacherName})` : ''}`);
            return true;
        } catch (error) {
            console.error('解除講師綁定失敗:', error);
            throw error;
        }
    }

    // 獲取所有使用者（從Google Sheets）
    async getAllUsersWithBindings() {
        try {
            return await this.getAllUsersFromGoogleSheets();
        } catch (error) {
            console.error('獲取所有使用者失敗:', error);
            return [];
        }
    }

    // 獲取所有綁定（從Google Sheets）
    async getAllBindings() {
        try {
            return await this.getAllBindingsFromGoogleSheets();
        } catch (error) {
            console.error('獲取所有綁定失敗:', error);
            return [];
        }
    }

    // 獲取單一使用者
    async getUser(userId) {
        try {
            // Try local cache first
            const user = this.localUsers.get(userId);
            if (user) return user;

            // If not in cache, fetch from Google Sheets (or refresh cache)
            await this.syncFromGoogleSheets();
            return this.localUsers.get(userId);
        } catch (error) {
            console.error('獲取使用者失敗:', error);
            return null;
        }
    }

    // 檢查講師綁定狀態
    async isTeacherBound(userId) {
        try {
            await this.syncFromGoogleSheets(); // Ensure cache is fresh
            
            // 查找活躍的綁定記錄
            const activeBindings = Array.from(this.localBindings.values()).filter(b => 
                b.userId === userId && b.isActive
            );
            
            if (activeBindings.length > 0) {
                const binding = activeBindings[0]; // 取第一個活躍綁定
                return {
                    isBound: true,
                    teacherName: binding.teacherName,
                    teacherId: binding.teacherId
                };
            } else {
                return {
                    isBound: false,
                    teacherName: null,
                    teacherId: null
                };
            }
        } catch (error) {
            console.error('檢查講師綁定狀態失敗:', error);
            return {
                isBound: false,
                teacherName: null,
                teacherId: null
            };
        }
    }

    // 獲取使用者總數
    async getUserCount() {
        try {
            const users = await this.getAllUsersFromGoogleSheets();
            return users.length;
        } catch (error) {
            console.error('獲取使用者總數失敗:', error);
            return 0;
        }
    }

    // 獲取講師總數
    async getTeacherCount() {
        try {
            const bindings = await this.getAllBindingsFromGoogleSheets();
            const activeBindings = bindings.filter(b => b.isActive);
            const uniqueTeachers = [...new Set(activeBindings.map(b => b.teacherName))];
            return uniqueTeachers.length;
        } catch (error) {
            console.error('獲取講師總數失敗:', error);
            return 0;
        }
    }

    // 獲取活躍綁定總數
    async getActiveBindingCount() {
        try {
            const bindings = await this.getAllBindingsFromGoogleSheets();
            return bindings.filter(b => b.isActive).length;
        } catch (error) {
            console.error('獲取活躍綁定總數失敗:', error);
            return 0;
        }
    }

    // 搜尋使用者
    async searchUsers(query) {
        try {
            const users = await this.getAllUsersFromGoogleSheets();
            const searchTerm = query.toLowerCase();
            
            return users.filter(user => 
                user.uid.toLowerCase().includes(searchTerm) ||
                (user.display_name && user.display_name.toLowerCase().includes(searchTerm)) ||
                (user.username && user.username.toLowerCase().includes(searchTerm))
            );
        } catch (error) {
            console.error('搜尋使用者失敗:', error);
            return [];
        }
    }

    // 搜尋綁定
    async searchBindings(query) {
        try {
            const bindings = await this.getAllBindingsFromGoogleSheets();
            const searchTerm = query.toLowerCase();
            
            return bindings.filter(binding => 
                binding.userId.toLowerCase().includes(searchTerm) ||
                binding.teacherName.toLowerCase().includes(searchTerm)
            );
        } catch (error) {
            console.error('搜尋綁定失敗:', error);
            return [];
        }
    }

    // 停用特定綁定
    async deactivateBinding(bindingId) {
        try {
            const bindings = await this.getAllBindingsFromGoogleSheets();
            const binding = bindings.find(b => b.id == bindingId);
            
            if (binding) {
                const deactivatedBinding = { ...binding, isActive: false };
                await this.upsertBindingsToGoogleSheets([deactivatedBinding]);
                console.log(`綁定已停用並同步到Google Sheets: ID ${bindingId}`);
                return true;
            } else {
                console.log(`未找到綁定記錄: ID ${bindingId}`);
                return false;
            }
        } catch (error) {
            console.error('停用綁定失敗:', error);
            return false;
        }
    }

    // 更新使用者顯示名稱
    async updateUserDisplayName(userId, newDisplayName) {
        try {
            const result = await this.updateUser(userId, { 
                display_name: newDisplayName,
                lastLogin: new Date().toISOString()
            });
            
            if (result) {
                console.log(`使用者顯示名稱已更新並同步到Google Sheets: ${userId} -> ${newDisplayName}`);
                return true;
            } else {
                console.log(`未找到使用者: ${userId}`);
                return false;
            }
        } catch (error) {
            console.error('更新使用者顯示名稱失敗:', error);
            return false;
        }
    }

    // 同步所有使用者名稱
    async syncAllUserNames() {
        try {
            const users = await this.getAllUsersFromGoogleSheets();
            const results = [];
            
            for (const user of users) {
                try {
                    results.push({
                        userId: user.uid,
                        currentName: user.display_name,
                        needsUpdate: true
                    });
                } catch (error) {
                    console.error(`同步使用者 ${user.uid} 失敗:`, error);
                    results.push({
                        userId: user.uid,
                        currentName: user.display_name,
                        needsUpdate: false,
                        error: error.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error('同步所有使用者名稱失敗:', error);
            return [];
        }
    }

    // 備份資料庫
    async backup() {
        try {
            const users = await this.getAllUsersFromGoogleSheets();
            const bindings = await this.getAllBindingsFromGoogleSheets();
            
            const backupData = {
                timestamp: new Date().toISOString(),
                users: users,
                bindings: bindings
            };
            
            console.log('Google Sheets 資料已備份');
            return backupData;
        } catch (error) {
            console.error('備份資料失敗:', error);
            return null;
        }
    }

    // 導出資料為JSON
    async exportData() {
        try {
            const users = await this.getAllUsersFromGoogleSheets();
            const bindings = await this.getAllBindingsFromGoogleSheets();
            
            const exportData = {
                timestamp: new Date().toISOString(),
                users: users,
                bindings: bindings,
                stats: {
                    totalUsers: users.length,
                    totalTeachers: await this.getTeacherCount(),
                    activeBindings: await this.getActiveBindingCount()
                }
            };
            
            return exportData;
        } catch (error) {
            console.error('導出資料失敗:', error);
            return null;
        }
    }

    // 更新使用者資訊
    async updateUserInfo(userId, displayName, pictureUrl) {
        try {
            const user = this.localUsers.get(userId);
            if (!user) {
                console.log(`未找到使用者: ${userId}`);
                return false;
            }

            const result = await this.updateUser(userId, { 
                display_name: displayName || user.displayName,
                pictureURL: pictureUrl || user.pictureUrl,
                lastLogin: new Date().toISOString()
            });
            
            if (result) {
                console.log(`使用者資訊已更新並同步到Google Sheets: ${userId}`);
                return true;
            } else {
                console.log(`未找到使用者: ${userId}`);
                return false;
            }
        } catch (error) {
            console.error('更新使用者資訊失敗:', error);
            return false;
        }
    }

    // 關閉資料庫連線
    close() {
        console.log('Google Sheets 資料庫連線已關閉');
    }
}

module.exports = GoogleSheetsDatabase;