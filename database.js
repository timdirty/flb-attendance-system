const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'users.db');
    }

    // 初始化資料庫
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('資料庫連線失敗:', err);
                    reject(err);
                } else {
                    console.log('資料庫連線成功');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // 建立資料表
    async createTables() {
        return new Promise((resolve, reject) => {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    userId TEXT PRIMARY KEY,
                    displayName TEXT,
                    pictureUrl TEXT,
                    userName TEXT NOT NULL,
                    email TEXT,
                    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('建立使用者表失敗:', err);
                    reject(err);
                } else {
                    console.log('資料表建立成功');
                    resolve();
                }
            });
        });
    }

    // 檢查使用者是否已註冊
    async checkUser(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE userId = ?';
            this.db.get(sql, [userId], (err, row) => {
                if (err) {
                    console.error('檢查使用者失敗:', err);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // 更新使用者登入時間
    async updateLastLogin(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE userId = ?';
            this.db.run(sql, [userId], function(err) {
                if (err) {
                    console.error('更新登入時間失敗:', err);
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 更新使用者資訊
    async updateUserInfo(userId, displayName, pictureUrl) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE users SET displayName = ?, pictureUrl = ?, lastLogin = CURRENT_TIMESTAMP WHERE userId = ?';
            this.db.run(sql, [displayName, pictureUrl, userId], function(err) {
                if (err) {
                    console.error('更新使用者資訊失敗:', err);
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 註冊新使用者
    async registerUser(userData) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO users (userId, displayName, pictureUrl, userName, email, registeredAt, lastLogin)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                userData.userId,
                userData.displayName || '',
                userData.pictureUrl || '',
                userData.userName,
                userData.email || '',
                userData.registeredAt,
                userData.lastLogin
            ];

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('註冊使用者失敗:', err);
                    reject(err);
                } else {
                    console.log(`新使用者註冊成功: ${userData.userName} (${userData.userId})`);
                    resolve({ id: this.lastID, ...userData });
                }
            });
        });
    }

    // 獲取所有使用者
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users ORDER BY registeredAt DESC';
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('獲取使用者列表失敗:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // 獲取使用者統計
    async getUserStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as totalUsers,
                    COUNT(CASE WHEN date(lastLogin) = date('now') THEN 1 END) as todayActiveUsers,
                    COUNT(CASE WHEN date(registeredAt) = date('now') THEN 1 END) as todayNewUsers
                FROM users
            `;
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    console.error('獲取使用者統計失敗:', err);
                    reject(err);
                } else {
                    resolve(row || { totalUsers: 0, todayActiveUsers: 0, todayNewUsers: 0 });
                }
            });
        });
    }

    // 關閉資料庫連線
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('關閉資料庫失敗:', err);
                } else {
                    console.log('資料庫連線已關閉');
                }
            });
        }
    }
}

module.exports = Database;
