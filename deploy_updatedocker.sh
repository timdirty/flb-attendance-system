cat > /volume1/web/flb-attendance/deploy.sh <<'EOF'
#!/bin/bash
set -euo pipefail

cd /volume1/web/flb-attendance

# ===== 可選：若此資料夾是 git 專案，打開這行即可自動拉最新程式碼 =====
# echo "🔄 Pull latest code..."
# git pull --ff-only || true

# 找可用的 docker compose 指令
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ 找不到 docker compose 指令，請確認已安裝 Docker 套件。"
  exit 1
fi

echo "📦 重建映像檔..."
$COMPOSE_CMD build

echo "🚀 以背景模式啟動容器..."
$COMPOSE_CMD up -d

echo "🔍 查看容器狀態..."
docker ps

echo "✅ 部署完成。"
EOF