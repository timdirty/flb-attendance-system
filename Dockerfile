# 使用 Node.js 20 LTS
FROM node:20-slim

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴（生產環境）
RUN npm ci --only=production

# 複製所有必要檔案
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

# 建立 data 和 logs 目錄
RUN mkdir -p /app/data /app/logs

# 暴露 Port 3000
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 設定時區
ENV TZ=Asia/Taipei

# 啟動應用
CMD ["node", "server.js"]

