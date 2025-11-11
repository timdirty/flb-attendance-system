const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GoogleSheetsDatabaseWithLocal {
    constructor() {
        // Google Sheets API URLs - 統一使用最新的 doPost.gs 部署 URL
        // 所有 API 使用同一個 URL，透過 action 參數區分功能
        const UNIFIED_API_URL = 'https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec';
        
        this.USERS_UPSERT_URL = UNIFIED_API_URL;
        this.BINDINGS_UPSERT_URL = UNIFIED_API_URL;
        this.GROUPS_UPSERT_URL = UNIFIED_API_URL;
        this.USERS_READ_URL = UNIFIED_API_URL;
        this.BINDINGS_READ_URL = UNIFIED_API_URL;
        this.GROUPS_READ_URL = UNIFIED_API_URL;
        
        this.COOKIE = 'NID=525=IPIqwCVm1Z3C00Y2MFXoevvCftm-rj9UdMlgYFhlRAHY0MKSCbEO7I8EBlGrz-nwjYxoXSFUrDHBqGrYNUotcoSE3v2npcVn-j3QZsc6SAKZcMLR6y1MkF5dZlXnbBIqWgw9cJLT3SvAvmpXUZa6RADuBXFDZpvSM85zYAoym0yXcBn3C4ayGgOookqVJaH';
        
        // 本地持久化文件路徑
        this.localDataPath = path.join(__dirname, 'data');
        this.usersFile = path.join(this.localDataPath, 'users.json');
        this.bindingsFile = path.join(this.localDataPath, 'bindings.json');
        this.groupsFile = path.join(this.localDataPath, 'groups.json');
        this.syncFlagFile = path.join(this.localDataPath, 'sync_flag.json');
        
        // 本地快取
        this.localUsers = new Map();
        this.localBindings = new Map();
        this.localGroups = new Map();
        this.nextBindingId = 1;
        this.isInitialized = false;
    }

    // 初始化資料庫
    async init() {
        try {
            // 確保資料目錄存在
            if (!fs.existsSync(this.localDataPath)) {
                fs.mkdirSync(this.localDataPath, { recursive: true });
            }

            // 載入本地資料
            await this.loadLocalData();
            
            // 檢查是否需要從Google Sheets同步
            const needsSync = await this.checkSyncNeeded();
            if (needsSync) {
                console.log('🔄 首次啟動，從Google Sheets同步資料...');
                await this.syncFromGoogleSheets();
                await this.saveSyncFlag();
            } else {
                console.log('📁 使用本地快取資料');
            }

            console.log('Google Sheets 資料庫連線成功');
        } catch (error) {
            console.error('資料庫初始化失敗:', error);
            throw error;
        }
    }

    // 檢查是否需要同步
    async checkSyncNeeded() {
        try {
            if (!fs.existsSync(this.syncFlagFile)) {
                return true; // 沒有同步標記，需要同步
            }
            
            const syncData = JSON.parse(fs.readFileSync(this.syncFlagFile, 'utf8'));
            const lastSync = new Date(syncData.lastSync);
            const now = new Date();
            const hoursDiff = (now - lastSync) / (1000 * 60 * 60);
            
            // 如果超過24小時沒有同步，則需要同步
            return hoursDiff > 24;
        } catch (error) {
            console.error('檢查同步狀態失敗:', error);
            return true; // 出錯時預設需要同步
        }
    }

    // 保存同步標記
    async saveSyncFlag() {
        try {
            const syncData = {
                lastSync: new Date().toISOString(),
                version: '1.0'
            };
            fs.writeFileSync(this.syncFlagFile, JSON.stringify(syncData, null, 2));
        } catch (error) {
            console.error('保存同步標記失敗:', error);
        }
    }

    // 載入本地資料
    async loadLocalData() {
        try {
            // 載入使用者資料
            if (fs.existsSync(this.usersFile)) {
                const usersData = JSON.parse(fs.readFileSync(this.usersFile, 'utf8'));
                this.localUsers = new Map(usersData.map(user => [user.userId, user]));
                console.log(`📁 載入 ${this.localUsers.size} 個本地使用者資料`);
            }

            // 載入綁定資料
            if (fs.existsSync(this.bindingsFile)) {
                const bindingsData = JSON.parse(fs.readFileSync(this.bindingsFile, 'utf8'));
                this.localBindings = new Map(bindingsData.map(binding => [binding.id, binding]));
                console.log(`📁 載入 ${this.localBindings.size} 個本地綁定資料`);
                
                // 更新nextBindingId
                const maxId = Math.max(...bindingsData.map(b => {
                    const idNum = parseInt(b.id.replace('bind-', '')) || 0;
                    return idNum;
                }), 0);
                this.nextBindingId = maxId + 1;
            }

            // 載入群組資料
            if (fs.existsSync(this.groupsFile)) {
                const groupsData = JSON.parse(fs.readFileSync(this.groupsFile, 'utf8'));
                this.localGroups = new Map(groupsData.map(group => [group.groupId, group]));
                console.log(`📁 載入 ${this.localGroups.size} 個本地群組資料`);
            }
        } catch (error) {
            console.error('載入本地資料失敗:', error);
        }
    }

    // 保存本地資料
    async saveLocalData() {
        try {
            // 保存使用者資料
            const usersArray = Array.from(this.localUsers.values());
            fs.writeFileSync(this.usersFile, JSON.stringify(usersArray, null, 2));

            // 保存綁定資料
            const bindingsArray = Array.from(this.localBindings.values());
            fs.writeFileSync(this.bindingsFile, JSON.stringify(bindingsArray, null, 2));

            // 保存群組資料
            const groupsArray = Array.from(this.localGroups.values());
            fs.writeFileSync(this.groupsFile, JSON.stringify(groupsArray, null, 2));

            console.log('💾 本地資料已保存');
        } catch (error) {
            console.error('保存本地資料失敗:', error);
        }
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

    // 從Google Sheets同步資料
    async syncFromGoogleSheets() {
        try {
            console.log('🔄 開始從Google Sheets同步資料...');
            
            // 同步使用者資料
            const usersResult = await this.getAllUsersFromGoogleSheets();
            if (usersResult && usersResult.length > 0) {
                this.localUsers.clear();
                usersResult.forEach(user => {
                    this.localUsers.set(user.uid, user);
                });
                console.log(`📥 從Google Sheets獲取到 ${this.localUsers.size} 個使用者`);
            }

            // 同步綁定資料
            const bindingsResult = await this.getAllBindingsFromGoogleSheets();
            if (bindingsResult && bindingsResult.length > 0) {
                this.localBindings.clear();
                bindingsResult.forEach(binding => {
                    this.localBindings.set(binding.id, binding);
                    // 更新nextBindingId
                    const currentIdNum = parseInt(binding.id.replace('bind-', '')) || 0;
                    if (currentIdNum >= this.nextBindingId) {
                        this.nextBindingId = currentIdNum + 1;
                    }
                });
                console.log(`📥 從Google Sheets獲取到 ${this.localBindings.size} 個綁定記錄`);
            }

            // 同步群組資料
            const groupsResult = await this.getAllGroupsFromGoogleSheets();
            if (groupsResult && groupsResult.length > 0) {
                this.localGroups.clear();
                groupsResult.forEach(group => {
                    this.localGroups.set(group.groupId, group);
                });
                console.log(`📥 從Google Sheets獲取到 ${this.localGroups.size} 個群組`);
            }

            // 保存到本地
            await this.saveLocalData();

            return {
                success: true,
                users: Array.from(this.localUsers.values()),
                bindings: Array.from(this.localBindings.values()),
                groups: Array.from(this.localGroups.values())
            };
        } catch (error) {
            console.error('❌ 同步Google Sheets失敗:', error.message);
            return { success: false, error: error.message };
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
                    userId: user.userId,              // ✅ 修正：uid → userId
                    displayName: user.displayName || '',  // ✅ 修正：display_name → displayName
                    userName: user.userName || '',    // ✅ 修正：username → userName
                    pictureUrl: user.pictureUrl || '', // ✅ 修正：pictureURL → pictureUrl
                    email: user.email || '',
                    registeredAt: user.registeredAt || new Date().toISOString(),
                    lastLogin: user.lastLogin || new Date().toISOString(),
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

    // 上傳群組到Google Sheets
    async upsertGroupsToGoogleSheets(groups) {
        try {
            const payload = {
                action: "upsertGroups",
                sheetName: "群組資料表 (groups)",
                list: groups.map(group => ({
                    groupId: group.groupId,
                    groupName: group.groupName || '未知群組',
                    type: group.type || 'group',
                    firstSeenAt: group.firstSeenAt || new Date().toISOString(),
                    lastActivityAt: group.lastActivityAt || new Date().toISOString(),
                    memberCount: group.memberCount || 0,
                    description: group.description || ''
                }))
            };

            const result = await this.makeRequest(this.GROUPS_UPSERT_URL, payload);
            console.log(`📤 上傳 ${groups.length} 個群組到Google Sheets`);
            return result;
        } catch (error) {
            console.error('上傳群組到Google Sheets失敗:', error);
            throw error;
        }
    }

    // 從Google Sheets獲取所有群組
    async getAllGroupsFromGoogleSheets() {
        try {
            const url = `${this.GROUPS_READ_URL}?action=listGroups&limit=500&offset=0`;
            const result = await this.makeRequest(url, null, 'GET');
            
            if (result && result.success) {
                return result.data || [];
            } else {
                console.error('獲取群組資料失敗:', result?.error);
                return [];
            }
        } catch (error) {
            console.error('從Google Sheets獲取群組失敗:', error);
            return [];
        }
    }

    // 註冊使用者（雙向同步）
    async registerUser(userData) {
        try {
            // 更新本地快取
            this.localUsers.set(userData.userId, userData);
            
            // 上傳到Google Sheets
            await this.upsertUsersToGoogleSheets([userData]);
            
            // 保存本地資料
            await this.saveLocalData();
            
            console.log(`使用者已註冊並同步到Google Sheets: ${userData.userName} (${userData.userId})`);
            return { id: Date.now(), ...userData };
        } catch (error) {
            console.error('註冊使用者失敗:', error);
            throw error;
        }
    }

    // 獲取單一使用者
    async getUser(userId) {
        try {
            // 先從本地快取查找
            const user = this.localUsers.get(userId);
            if (user) return user;

            // 如果本地沒有，嘗試從Google Sheets獲取
            const users = await this.getAllUsersFromGoogleSheets();
            const foundUser = users.find(u => u.uid === userId);
            if (foundUser) {
                this.localUsers.set(userId, foundUser);
                await this.saveLocalData();
                return foundUser;
            }

            return null;
        } catch (error) {
            console.error('獲取使用者失敗:', error);
            return null;
        }
    }

    // 檢查講師綁定狀態
    async isTeacherBound(userId) {
        try {
            // 從本地快取查找活躍的綁定記錄
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

    // 綁定講師（雙向同步）
    async bindTeacher(userId, teacherName, teacherId) {
        try {
            const bindingId = `bind-${this.nextBindingId++}`;
            const bindingData = {
                id: bindingId,
                userId: userId,
                teacherName: teacherName,
                teacherId: teacherId,
                boundAt: new Date().toISOString(),
                isActive: true
            };

            // 更新本地快取
            this.localBindings.set(bindingId, bindingData);
            
            // 更新使用者表中的講師資訊
            const user = this.localUsers.get(userId);
            if (user) {
                user.teacherName = teacherName;
                user.teacherId = teacherId;
                user.lastLogin = new Date().toISOString();
            }

            // 上傳到Google Sheets
            await this.upsertBindingsToGoogleSheets([bindingData]);
            if (user) {
                await this.upsertUsersToGoogleSheets([user]);
            }

            // 保存本地資料
            await this.saveLocalData();

            console.log(`講師綁定成功並同步到Google Sheets: ${teacherName} (${userId}) -> ${teacherId}`);
            return true;
        } catch (error) {
            console.error('講師綁定失敗:', error);
            throw error;
        }
    }

    // 解除講師綁定（雙向同步）
    async unbindTeacher(userId) {
        try {
            // 從本地快取查找活躍的綁定記錄
            const activeBindings = Array.from(this.localBindings.values()).filter(b => 
                b.userId === userId && b.isActive
            );

            if (activeBindings.length > 0) {
                // 更新本地快取
                activeBindings.forEach(binding => {
                    binding.isActive = false;
                    this.localBindings.set(binding.id, binding);
                });

                // 清除使用者表中的講師資訊
                const user = this.localUsers.get(userId);
                if (user) {
                    user.teacherName = '';
                    user.teacherId = '';
                    user.lastLogin = new Date().toISOString();
                }

                // 上傳到Google Sheets
                await this.upsertBindingsToGoogleSheets(activeBindings);
                if (user) {
                    await this.upsertUsersToGoogleSheets([user]);
                }

                // 保存本地資料
                await this.saveLocalData();

                console.log(`講師綁定已解除並同步到Google Sheets: ${userId}`);
                return true;
            } else {
                console.log(`未找到活躍綁定記錄: ${userId}`);
                return true; // 已經沒有綁定
            }
        } catch (error) {
            console.error('解除講師綁定失敗:', error);
            throw error;
        }
    }

    // 獲取使用者總數
    async getUserCount() {
        return this.localUsers.size;
    }

    // 獲取講師總數
    async getTeacherCount() {
        const activeBindings = Array.from(this.localBindings.values()).filter(b => b.isActive);
        const uniqueTeachers = [...new Set(activeBindings.map(b => b.teacherName))];
        return uniqueTeachers.length;
    }

    // 獲取活躍綁定總數
    async getActiveBindingCount() {
        return Array.from(this.localBindings.values()).filter(b => b.isActive).length;
    }

    // 獲取所有使用者（包含綁定資訊）
    async getAllUsersWithBindings() {
        return Array.from(this.localUsers.values()).map(user => {
            const activeBinding = Array.from(this.localBindings.values()).find(b => 
                b.userId === user.userId && b.isActive
            );
            return {
                ...user,
                teacherName: activeBinding ? activeBinding.teacherName : null,
                teacherId: activeBinding ? activeBinding.teacherId : null
            };
        });
    }

    // 搜尋使用者
    async searchUsers(query) {
        const searchTerm = query.toLowerCase();
        return Array.from(this.localUsers.values()).filter(user =>
            user.userId.toLowerCase().includes(searchTerm) ||
            (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
            (user.userName && user.userName.toLowerCase().includes(searchTerm))
        );
    }

    // 獲取所有綁定
    async getAllBindings() {
        return Array.from(this.localBindings.values());
    }

    // 搜尋綁定
    async searchBindings(query) {
        const searchTerm = query.toLowerCase();
        return Array.from(this.localBindings.values()).filter(binding =>
            binding.userId.toLowerCase().includes(searchTerm) ||
            binding.teacherName.toLowerCase().includes(searchTerm) ||
            binding.teacherId.toLowerCase().includes(searchTerm)
        );
    }

    // 停用綁定
    async deactivateBinding(bindingId) {
        try {
            const binding = this.localBindings.get(bindingId);
            if (binding) {
                binding.isActive = false;
                this.localBindings.set(bindingId, binding);
                
                // 上傳到Google Sheets
                await this.upsertBindingsToGoogleSheets([binding]);
                
                // 保存本地資料
                await this.saveLocalData();
                
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

    // 更新使用者資訊
    async updateUserInfo(userId, displayName, pictureUrl) {
        try {
            const user = this.localUsers.get(userId);
            if (!user) {
                console.log(`未找到使用者: ${userId}`);
                return false;
            }

            // 更新本地快取
            user.displayName = displayName || user.displayName;
            user.pictureUrl = pictureUrl || user.pictureUrl;
            user.lastLogin = new Date().toISOString();

            // 上傳到Google Sheets
            await this.upsertUsersToGoogleSheets([user]);

            // 保存本地資料
            await this.saveLocalData();

            console.log(`使用者資訊已更新並同步到Google Sheets: ${userId}`);
            return true;
        } catch (error) {
            console.error('更新使用者資訊失敗:', error);
            return false;
        }
    }

    // 更新使用者顯示名稱
    async updateUserDisplayName(userId, newDisplayName) {
        try {
            const user = this.localUsers.get(userId);
            if (!user) {
                console.log(`未找到使用者: ${userId}`);
                return false;
            }

            // 更新本地快取
            user.displayName = newDisplayName;
            user.lastLogin = new Date().toISOString();

            // 上傳到Google Sheets
            await this.upsertUsersToGoogleSheets([user]);

            // 保存本地資料
            await this.saveLocalData();

            console.log(`使用者顯示名稱已更新並同步到Google Sheets: ${userId} -> ${newDisplayName}`);
            return true;
        } catch (error) {
            console.error('更新使用者顯示名稱失敗:', error);
            return false;
        }
    }

    // ==================== 群組管理功能 ====================

    // 註冊或更新群組資訊（雙向同步）
    async registerGroup(groupData) {
        try {
            const group = {
                groupId: groupData.groupId,
                groupName: groupData.groupName || '未知群組',
                type: groupData.type || 'group', // 'group' or 'room'
                firstSeenAt: groupData.firstSeenAt || new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
                memberCount: groupData.memberCount || 0,
                description: groupData.description || ''
            };

            // 如果群組已存在，保留 firstSeenAt
            const existingGroup = this.localGroups.get(group.groupId);
            if (existingGroup) {
                group.firstSeenAt = existingGroup.firstSeenAt;
                group.memberCount = groupData.memberCount || existingGroup.memberCount;
            }

            // 更新本地快取
            this.localGroups.set(group.groupId, group);
            
            // 上傳到Google Sheets
            await this.upsertGroupsToGoogleSheets([group]);
            
            // 保存本地資料
            await this.saveLocalData();
            
            console.log(`群組已註冊/更新並同步到Google Sheets: ${group.groupName} (${group.groupId})`);
            return group;
        } catch (error) {
            console.error('註冊群組失敗:', error);
            throw error;
        }
    }

    // 獲取單一群組
    async getGroup(groupId) {
        try {
            return this.localGroups.get(groupId) || null;
        } catch (error) {
            console.error('獲取群組失敗:', error);
            return null;
        }
    }

    // 獲取所有群組
    async getAllGroups() {
        return Array.from(this.localGroups.values());
    }

    // 更新群組活動時間（雙向同步）
    async updateGroupActivity(groupId) {
        try {
            const group = this.localGroups.get(groupId);
            if (group) {
                group.lastActivityAt = new Date().toISOString();
                this.localGroups.set(groupId, group);
                
                // 上傳到Google Sheets
                await this.upsertGroupsToGoogleSheets([group]);
                
                await this.saveLocalData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('更新群組活動時間失敗:', error);
            return false;
        }
    }

    // 更新群組名稱（雙向同步）
    async updateGroupName(groupId, newGroupName) {
        try {
            const group = this.localGroups.get(groupId);
            if (group) {
                group.groupName = newGroupName;
                group.lastActivityAt = new Date().toISOString();
                this.localGroups.set(groupId, group);
                
                // 上傳到Google Sheets
                await this.upsertGroupsToGoogleSheets([group]);
                
                await this.saveLocalData();
                console.log(`群組名稱已更新並同步到Google Sheets: ${groupId} -> ${newGroupName}`);
                return true;
            }
            console.log(`未找到群組: ${groupId}`);
            return false;
        } catch (error) {
            console.error('更新群組名稱失敗:', error);
            return false;
        }
    }

    // 獲取群組總數
    async getGroupCount() {
        return this.localGroups.size;
    }

    // 搜尋群組
    async searchGroups(query) {
        const searchTerm = query.toLowerCase();
        return Array.from(this.localGroups.values()).filter(group =>
            group.groupId.toLowerCase().includes(searchTerm) ||
            (group.groupName && group.groupName.toLowerCase().includes(searchTerm))
        );
    }

    // 記錄群組中的使用者活動
    async recordGroupUserActivity(groupId, userId, displayName) {
        try {
            // 確保群組存在
            let group = this.localGroups.get(groupId);
            if (!group) {
                group = await this.registerGroup({
                    groupId: groupId,
                    groupName: '未知群組',
                    type: 'group'
                });
            }

            // 更新群組活動時間
            await this.updateGroupActivity(groupId);

            // 記錄使用者也在此群組活動
            const user = this.localUsers.get(userId);
            if (user) {
                if (!user.groups) {
                    user.groups = [];
                }
                if (!user.groups.includes(groupId)) {
                    user.groups.push(groupId);
                    this.localUsers.set(userId, user);
                    await this.saveLocalData();
                }
            }

            console.log(`記錄群組活動: ${displayName} (${userId}) 在群組 ${groupId}`);
            return true;
        } catch (error) {
            console.error('記錄群組使用者活動失敗:', error);
            return false;
        }
    }

    // 關閉資料庫連線
    close() {
        console.log('Google Sheets 資料庫連線已關閉');
    }
}

module.exports = GoogleSheetsDatabaseWithLocal;
