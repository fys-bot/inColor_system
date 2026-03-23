import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { router } from './router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = 4000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API 路由 → 后端处理
  const urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/api/') || urlPath === '/health' || urlPath.startsWith('/proxy')) {
    router(req, res);
    return;
  }

  // 静态文件服务（仅在 dist 目录存在时生效）
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

    // 文件存在 → 直接返回
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const data = fs.readFileSync(filePath);

      // JS/CSS 等静态资源加缓存头
      if (ext !== '.html') {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
      return;
    }

    // SPA fallback → index.html
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      const data = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
      return;
    }
  }

  // 没有 dist 目录（开发模式），返回提示
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Run "npm run build" first for static file serving.' }));
});

server.listen(PORT, '0.0.0.0', () => {
  const hasDist = fs.existsSync(DIST_DIR);
  console.log(`\n🚀 服务器运行在 http://0.0.0.0:${PORT}`);
  if (hasDist) {
    console.log(`📦 静态文件服务: ${DIST_DIR}`);
  } else {
    console.log(`⚠️  未检测到 dist 目录，仅提供 API 服务（运行 npm run build 构建前端）`);
  }
  console.log(`\n可用接口:`);
  console.log(`  GET  /health - 健康检查`);
  console.log(`  GET  /proxy?url=<URL> - 图片代理`);
  console.log(`  POST /api/imagen/records - 生图记录\n`);
});
