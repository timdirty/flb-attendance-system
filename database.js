const Database = require('better-sqlite3');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'users.db');
    }

    // 初始化資料庫
    async init() {
        try {
            this.db = new Database(this.dbPath);
            console.log('資料庫連線成功');
            this.createTables();
        } catch (error) {
            console.error('資料庫連線失敗:', error);
            throw error;
        }
    }

    // 建立資料表
    createTables() {
        try {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    userId TEXT PRIMARY KEY,
                    displayName TEXT,
                    pictureUrl TEXT,
                    userName TEXT NOT NULL,
                    email TEXT,
                    teacherName TEXT,
                    teacherId TEXT,
                    isTeacherBound BOOLEAN DEFAULT 0,
                    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.exec(createUsersTable);

            // 建立講師綁定表
            const createTeacherBindingsTable = `
                CREATE TABLE IF NOT EXISTS teacher_bindings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId TEXT NOT NULL,
                    teacherName TEXT NOT NULL,
                    teacherId TEXT NOT NULL,
                    boundAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    isActive BOOLEAN DEFAULT 1,
                    UNIQUE(userId, teacherName)
                )
            `;
            this.db.exec(createTeacherBindingsTable);
            console.log('資料表建立成功');
        } catch (error) {
            console.error('建立使用者表失敗:', error);
            throw error;
        }
    }

    // 檢查使用者是否已註冊
    checkUser(userId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE userId = ?');
            const row = stmt.get(userId);
            return row || null;
        } catch (error) {
            console.error('檢查使用者失敗:', error);
            throw error;
        }
    }

    // 更新使用者登入時間
    updateLastLogin(userId) {
        try {
            const stmt = this.db.prepare('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE userId = ?');
            const result = stmt.run(userId);
            return result.changes > 0;
        } catch (error) {
            console.error('更新登入時間失敗:', error);
            throw error;
        }
    }

    // 更新使用者資訊
    updateUserInfo(userId, displayName, pictureUrl) {
        try {
            const stmt = this.db.prepare('UPDATE users SET displayName = ?, pictureUrl = ?, lastLogin = CURRENT_TIMESTAMP WHERE userId = ?');
            const result = stmt.run(displayName, pictureUrl, userId);
            return result.changes > 0;
        } catch (error) {
            console.error('更新使用者資訊失敗:', error);
            throw error;
        }
    }

    // 註冊新使用者
    registerUser(userData) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO users (userId, displayName, pictureUrl, userName, email, registeredAt, lastLogin)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                userData.userId,
                userData.displayName || '',
                userData.pictureUrl || '',
                userData.userName,
                userData.email || '',
                userData.registeredAt,
                userData.lastLogin
            );

            console.log(`新使用者註冊成功: ${userData.userName} (${userData.userId})`);
            return { id: result.lastInsertRowid, ...userData };
        } catch (error) {
            console.error('註冊使用者失敗:', error);
            throw error;
        }
    }

    // 獲取所有使用者
    getAllUsers() {
        try {
            const stmt = this.db.prepare('SELECT * FROM users ORDER BY registeredAt DESC');
            const rows = stmt.all();
            return rows || [];
        } catch (error) {
            console.error('獲取使用者列表失敗:', error);
            throw error;
        }
    }

    // 獲取使用者統計
    getUserStats() {
        try {
            const stmt = this.db.prepare(`
                SELECT 
                    COUNT(*) as totalUsers,
                    COUNT(CASE WHEN date(lastLogin) = date('now') THEN 1 END) as todayActiveUsers,
                    COUNT(CASE WHEN date(registeredAt) = date('now') THEN 1 END) as todayNewUsers
                FROM users
            `);
            const row = stmt.get();
            return row || { totalUsers: 0, todayActiveUsers: 0, todayNewUsers: 0 };
        } catch (error) {
            console.error('獲取使用者統計失敗:', error);
            throw error;
        }
    }

    // 綁定講師身份
    bindTeacher(userId, teacherName, teacherId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE users 
                SET teacherName = ?, teacherId = ?, isTeacherBound = 1 
                WHERE userId = ?
            `);
            
            const result = stmt.run(teacherName, teacherId, userId);
            console.log(`講師綁定成功: ${teacherName} (${teacherId}) -> ${userId}`);
            return result.changes > 0;
        } catch (error) {
            console.error('綁定講師失敗:', error);
            throw error;
        }
    }

    // 檢查講師是否已綁定
    isTeacherBound(userId) {
        try {
            const stmt = this.db.prepare('SELECT isTeacherBound, teacherName, teacherId FROM users WHERE userId = ?');
            const row = stmt.get(userId);
            return row ? {
                isBound: row.isTeacherBound === 1,
                teacherName: row.teacherName,
                teacherId: row.teacherId
            } : { isBound: false, teacherName: null, teacherId: null };
        } catch (error) {
            console.error('檢查講師綁定狀態失敗:', error);
            throw error;
        }
    }

    // 新增講師綁定記錄
    addTeacherBinding(userId, teacherName, teacherId) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO teacher_bindings (userId, teacherName, teacherId, boundAt, isActive)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
            `);
            stmt.run(userId, teacherName, teacherId);
            console.log(`講師綁定記錄已新增: ${userId} -> ${teacherName}`);
            return true;
        } catch (error) {
            console.error('新增講師綁定記錄失敗:', error);
            throw error;
        }
    }

    // 取得使用者的講師綁定記錄
    getTeacherBindings(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM teacher_bindings 
                WHERE userId = ? AND isActive = 1 
                ORDER BY boundAt DESC
            `);
            const results = stmt.all(userId);
            return results;
        } catch (error) {
            console.error('取得講師綁定記錄失敗:', error);
            throw error;
        }
    }

    // 解除講師綁定
    unbindTeacher(userId, teacherName = null) {
        try {
            if (teacherName) {
                // 解除特定講師綁定
                const stmt = this.db.prepare(`
                    UPDATE teacher_bindings 
                    SET isActive = 0 
                    WHERE userId = ? AND teacherName = ?
                `);
                stmt.run(userId, teacherName);
            } else {
                // 解除所有講師綁定
                const stmt = this.db.prepare(`
                    UPDATE teacher_bindings 
                    SET isActive = 0 
                    WHERE userId = ?
                `);
                stmt.run(userId);
            }
            
            // 同時更新users表
            const updateStmt = this.db.prepare(`
                UPDATE users 
                SET isTeacherBound = 0, teacherName = NULL, teacherId = NULL 
                WHERE userId = ?
            `);
            updateStmt.run(userId);
            
            console.log(`講師綁定已解除: ${userId}`);
            return true;
        } catch (error) {
            console.error('解除講師綁定失敗:', error);
            throw error;
        }
    }

    // 關閉資料庫連線
    close() {
        if (this.db) {
            try {
                this.db.close();
                console.log('資料庫連線已關閉');
            } catch (error) {
                console.error('關閉資料庫失敗:', error);
            }
        }
    }
}

module.exports = DatabaseManager;