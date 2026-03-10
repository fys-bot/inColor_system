import http from 'http';
import { router } from './router.js';

const PORT = 4000;

const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 路由处理
  router(req, res);
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http:///10.10.88.135:${PORT}`);
  console.log('可用接口:');
  console.log('  GET  /health - 健康检查');
  console.log('  GET  /proxy?url=<URL> - 图片代理下载');
  console.log('  POST /api/imagen/records - 查询生图记录');
});
