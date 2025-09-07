# FLB 講師簽到系統

一個基於QR Code的學生簽到管理系統，專為FLB教育機構設計。

## 功能特色

### 📱 手機友善介面
- 響應式設計，完美支援手機操作
- 直觀的三步驟流程
- 現代化UI設計

### 🔄 完整工作流程
1. **選擇講師** - 從現有講師列表中選擇
2. **選擇課程** - 顯示該講師的所有課程時段
3. **學生簽到** - 管理學生出勤狀況

### 📊 簽到管理
- 即時學生名單顯示
- 一鍵標記出席/缺席
- QR Code生成功能
- 即時狀態更新

## 技術架構

### 後端
- **Node.js** + **Express.js**
- **QRCode** 套件生成QR Code
- **Axios** 處理API請求

### 前端
- **原生JavaScript** (無框架依賴)
- **CSS3** 響應式設計
- **Font Awesome** 圖示

### API整合
- 整合FLB Google Apps Script API
- 支援講師、課程、學生資料查詢
- 學生簽到記錄功能

## 安裝與執行

### 1. 安裝依賴
```bash
npm install
```

### 2. 啟動伺服器
```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

### 3. 開啟瀏覽器
訪問 `http://localhost:3000`

## API端點

### 講師相關
- `GET /api/teachers` - 獲取講師列表
- `POST /api/teacher-courses` - 獲取講師課程

### 課程相關
- `POST /api/course-students` - 獲取課程學生

### 簽到相關
- `POST /api/student-attendance` - 學生簽到
- `POST /api/generate-qr` - 生成QR Code

## 使用流程

### 講師操作
1. 開啟系統首頁
2. 選擇自己的講師身份
3. 選擇要進行簽到的課程時段
4. 查看學生名單並進行簽到管理
5. 可選擇生成QR Code供學生掃描

### 學生操作
1. 掃描講師提供的QR Code
2. 自動記錄簽到狀態
3. 即時更新出勤記錄

## 檔案結構

```
學生簽到/
├── server.js          # Express伺服器
├── package.json       # 專案配置
├── README.md         # 說明文件
└── public/           # 前端檔案
    ├── index.html    # 主頁面
    ├── style.css     # 樣式檔案
    └── script.js     # JavaScript邏輯
```

## 環境需求

- Node.js 14.0+
- npm 6.0+
- 現代瀏覽器 (支援ES6+)

## 開發說明

### 本地開發
```bash
# 安裝nodemon (開發用)
npm install -g nodemon

# 啟動開發伺服器
npm run dev
```

### 部署
```bash
# 安裝生產依賴
npm install --production

# 啟動生產伺服器
npm start
```

## 注意事項

1. 確保FLB API端點可正常訪問
2. 網路連線穩定以確保API調用成功
3. 建議使用HTTPS進行生產環境部署
4. 定期備份簽到資料

## 支援

如有問題或建議，請聯繫開發團隊。

---

**版本**: 1.0.0  
**更新日期**: 2024年12月 