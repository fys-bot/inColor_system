import https from 'https';
import http from 'http';

/**
 * 图片代理下载接口
 * GET /proxy?url=<图片URL>
 */
export function proxyHandler(req, res) {
  // 从原始 URL 中提取完整的 url 参数（包括其自身的查询参数）
  const fullUrl = req.url;
  const urlParamStart = fullUrl.indexOf('url=');
  
  if (urlParamStart === -1) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少 url 参数' }));
    return;
  }
  
  // 提取 url= 后面的所有内容并解码
  const imageUrl = decodeURIComponent(fullUrl.substring(urlParamStart + 4));

  if (!imageUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少 url 参数' }));
    return;
  }

  console.log('[Proxy] 下载:', imageUrl);

  // 解析 URL 以获取 hostname 和 path
  const parsedUrl = new URL(imageUrl);
  const client = parsedUrl.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    }
  };

  const proxyReq = client.request(options, (proxyRes) => {
    // 检查响应状态
    if (proxyRes.statusCode !== 200) {
      console.error('[Proxy] 远程服务器返回:', proxyRes.statusCode);
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `远程服务器返回 ${proxyRes.statusCode}` }));
      return;
    }
    
    console.log('[Proxy] 成功获取图片, Content-Type:', proxyRes.headers['content-type']);
    
    res.writeHead(200, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
      'Content-Length': proxyRes.headers['content-length'],
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('[Proxy] 请求失败:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });
  
  proxyReq.end();
}
