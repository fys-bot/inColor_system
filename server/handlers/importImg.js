import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const BASE_URL = 'https://us-central1-incolor-cff73.cloudfunctions.net/importImg';
const API_KEY = 'hoahg*Aoyzo99034anvn-34hgannbaJOH';

/**
 * 上传素材图片
 * POST /api/import-img
 * Content-Type: multipart/form-data (raw body forwarded)
 * 
 * 参数:
 *   type: activity | normal | daily
 *   searchTags: 可选，英文逗号分隔
 *   category: type=normal时可选，枚举值
 *   ad: type=normal时可选，1=看广告解锁
 *   img: 图片文件
 */
export function importImgHandler(req, res) {
  // 收集 raw body（二进制）
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';

      // 将 body 写入临时文件，用 curl 转发
      const tmpDir = mkdtempSync(join(tmpdir(), 'importimg-'));
      const tmpFile = join(tmpDir, 'body.bin');
      writeFileSync(tmpFile, body);

      const apiUrl = `${BASE_URL}?ak=${API_KEY}`;
      console.log('[ImportImg] 转发上传请求, Content-Type:', contentType, ', body size:', body.length);

      const result = execSync(
        `curl -s --max-time 60 -X POST "${apiUrl}" -H "Content-Type: ${contentType}" --data-binary @${tmpFile}`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      // 清理临时文件
      try { unlinkSync(tmpFile); } catch (_) {}

      console.log('[ImportImg] 响应:', result);

      let data;
      try { data = JSON.parse(result); } catch (_) { data = result; }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ success: true, data }));
    } catch (e) {
      console.error('[ImportImg] 上传失败:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  });
}
