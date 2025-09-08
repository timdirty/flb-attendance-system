FROM node:18-slim

# 安裝必要的工具
RUN apt-get update && apt-get install -y \
    wget \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install --only=production

# 複製應用程式代碼
COPY . .

# 創建 logs 目錄
RUN mkdir -p /app/logs

# 設置權限
RUN chown -R node:node /app && \
    chmod -R 755 /app && \
    chmod 644 /app/server.js
USER node

# 暴露端口
EXPOSE 3000

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 啟動應用
CMD ["node", "server.js"] 