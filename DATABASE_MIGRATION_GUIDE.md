# 資料庫持久化遷移指南

## 🚨 當前問題
- SQLite資料庫儲存在容器內部
- 每次重新部署都會遺失所有資料
- 使用者註冊、講師綁定等資料無法持久保存

## 💡 解決方案

### 方案1：Railway PostgreSQL（推薦）

#### 步驟1：在Railway添加PostgreSQL
1. 進入Railway專案
2. 點擊 "New" → "Database" → "Add PostgreSQL"
3. 等待資料庫建立完成

#### 步驟2：獲取連線資訊
- 複製 `DATABASE_URL` 環境變數
- 格式：`postgresql://username:password@host:port/database`

#### 步驟3：安裝PostgreSQL驅動
```bash
npm install pg
```

#### 步驟4：修改資料庫代碼
將 `database.js` 改為使用PostgreSQL

### 方案2：使用Railway Volume（臨時方案）

#### 步驟1：添加Volume
1. 在Railway專案中添加Volume
2. 掛載到 `/app/data`

#### 步驟2：修改資料庫路徑
```javascript
this.dbPath = '/app/data/users.db';
```

### 方案3：外部資料庫服務

#### 選項：
- **Supabase**：免費PostgreSQL
- **PlanetScale**：免費MySQL
- **MongoDB Atlas**：免費MongoDB

## 🔄 資料遷移

### 從SQLite遷移到PostgreSQL
1. 導出SQLite資料
2. 轉換為PostgreSQL格式
3. 導入到新資料庫

## 📋 建議行動

1. **立即**：使用方案2（Volume）保護現有資料
2. **長期**：遷移到PostgreSQL獲得更好的效能和可靠性
3. **備份**：定期備份重要資料

## ⚠️ 注意事項

- 資料庫遷移需要停機時間
- 建議在低峰期進行遷移
- 遷移前務必備份現有資料
