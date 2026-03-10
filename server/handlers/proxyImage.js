import { execSync } from 'child_process';

/**
 * 代理下载远程图片，避免前端 CORS 问题
 * POST /api/proxy-image
 * Body: { url: "https://..." }
 */
export function proxyImageHandler(req, res) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const url = body.url;
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'url is required' }));
        return;
      }

      console.log('[ProxyImage] 下载:', url.substring(0, 100));

      const result = execSync(
        `curl -s --max-time 30 -L "${url}"`,
        { maxBuffer: 20 * 1024 * 1024 }
      );

      // 根据 URL 或内容判断 Content-Type
      let contentType = 'image/png';
      if (url.includes('.jpg') || url.includes('.jpeg')) contentType = 'image/jpeg';
      else if (url.includes('.webp')) contentType = 'image/webp';
      else if (result[0] === 0xFF && result[1] === 0xD8) contentType = 'image/jpeg';
      else if (result[0] === 0x52 && result[1] === 0x49) contentType = 'image/webp';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Content-Length': result.length,
      });
      res.end(result);
    } catch (e) {
      console.error('[ProxyImage] 失败:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}
