#!/bin/bash
# ============================================
# inColor 管理后台 - 一键部署脚本
# 用法: ./scripts/deploy.sh [选项]
# ============================================

set -e

# ── 配置 ──
SERVER="root@106.53.153.117"
REMOTE_DIR="/root/incolor-admin"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 帮助 ──
show_help() {
    echo "用法: ./scripts/deploy.sh [选项]"
    echo ""
    echo "选项:"
    echo "  (无参数)      完整部署（同步代码 + 安装依赖 + 构建 + 重启）"
    echo "  --code-only   仅同步代码（不构建不重启）"
    echo "  --build       仅构建前端并重启"
    echo "  --restart     仅重启后端服务"
    echo "  --status      查看服务器状态"
    echo "  --logs        查看后端日志"
    echo "  --init        首次部署（初始化服务器环境）"
    exit 0
}

# ── 同步代码 ──
sync_code() {
    log "同步代码到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude '.DS_Store' \
        --exclude 'logs' \
        "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"
    log "代码同步完成"
}

# ── 远程构建 ──
remote_build() {
    log "服务器上安装依赖 + 构建前端..."
    ssh "$SERVER" "cd $REMOTE_DIR && npm install --registry=https://registry.npmmirror.com && npm run build"
    log "构建完成"
}

# ── 重启服务 ──
restart_service() {
    log "重启后端服务..."
    ssh "$SERVER" "cd $REMOTE_DIR && mkdir -p logs && (pm2 delete incolor-admin 2>/dev/null || true) && pm2 start ecosystem.config.cjs && pm2 save"
    log "后端服务已重启"
}

# ── 配置 Nginx ──
setup_nginx() {
    log "配置 Nginx..."
    ssh "$SERVER" "cp $REMOTE_DIR/nginx/incolor-admin.conf /etc/nginx/conf.d/incolor-admin.conf && nginx -t && systemctl reload nginx"
    log "Nginx 配置完成"
}

# ── 查看状态 ──
show_status() {
    echo ""
    ssh "$SERVER" "echo '── PM2 进程 ──' && pm2 ls && echo '' && echo '── Nginx 状态 ──' && systemctl is-active nginx && echo '' && echo '── 磁盘使用 ──' && du -sh $REMOTE_DIR"
}

# ── 查看日志 ──
show_logs() {
    ssh "$SERVER" "pm2 logs incolor-admin --lines 50 --nostream"
}

# ── 首次初始化 ──
init_server() {
    warn "首次部署：初始化服务器环境..."
    
    # 同步代码
    sync_code
    
    # 安装依赖 + 构建
    remote_build
    
    # 创建日志目录
    ssh "$SERVER" "mkdir -p $REMOTE_DIR/logs"
    
    # 配置 Nginx
    setup_nginx
    
    # 启动 PM2
    restart_service
    
    # 开放防火墙端口
    ssh "$SERVER" "firewall-cmd --permanent --add-port=8066/tcp 2>/dev/null; firewall-cmd --reload 2>/dev/null || true"
    
    log "首次部署完成！"
    echo ""
    echo -e "  访问地址: ${GREEN}http://106.53.153.117:8066${NC}"
    echo ""
}

# ── 完整部署 ──
full_deploy() {
    log "开始完整部署..."
    sync_code
    remote_build
    restart_service
    log "部署完成！"
    echo ""
    echo -e "  访问地址: ${GREEN}http://106.53.153.117:8066${NC}"
    echo ""
}

# ── 主逻辑 ──
case "${1:-}" in
    --help|-h)    show_help ;;
    --code-only)  sync_code ;;
    --build)      remote_build && restart_service ;;
    --restart)    restart_service ;;
    --status)     show_status ;;
    --logs)       show_logs ;;
    --init)       init_server ;;
    "")           full_deploy ;;
    *)            err "未知选项: $1，使用 --help 查看帮助" ;;
esac
