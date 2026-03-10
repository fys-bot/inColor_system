/**
 * 健康检查接口
 * GET /health
 */
export function healthHandler(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  }));
}
