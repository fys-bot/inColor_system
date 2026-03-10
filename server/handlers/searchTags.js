import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const BASE_URL = 'https://us-central1-incolor-cff73.cloudfunctions.net/searchTags';
const API_KEY = 'hoahg*Aoyzo99034anvn-34hgannbaJOH';

/**
 * 获取图片搜索标签
 * GET /api/search-tags?name=20240612-a
 */
export function getSearchTagsHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = url.searchParams.get('name');

  if (!name) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少 name 参数' }));
    return;
  }

  const apiUrl = `${BASE_URL}?ak=${API_KEY}&name=${encodeURIComponent(name)}`;
  console.log('[SearchTags] GET:', name);

  try {
    const result = execSync(`curl -s --max-time 15 "${apiUrl}"`, { encoding: 'utf-8' });
    const data = JSON.parse(result);
    console.log('[SearchTags] 结果:', JSON.stringify(data));
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ data }));
  } catch (e) {
    console.error('[SearchTags] GET 失败:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/**
 * 修改图片搜索标签
 * PATCH /api/search-tags
 * Body: { id: string, tags: string }
 */
export function patchSearchTagsHandler(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let responded = false;
    try {
      const { id, tags } = JSON.parse(body);
      if (!id || tags === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少 id 或 tags 参数' }));
        return;
      }

      console.log('[SearchTags] PATCH:', id, '->', tags);

      const payload = JSON.stringify({ id, tags });
      // 写入临时文件避免 shell 特殊字符问题
      const tmpDir = mkdtempSync(join(tmpdir(), 'searchtags-'));
      const tmpFile = join(tmpDir, 'payload.json');
      writeFileSync(tmpFile, payload);

      const result = execSync(
        `curl -s --max-time 15 -X PATCH "${BASE_URL}?ak=${API_KEY}" -H "Content-Type: application/json" -d @${tmpFile}`,
        { encoding: 'utf-8' }
      );

      // 清理临时文件
      try { unlinkSync(tmpFile); } catch (_) {}

      console.log('[SearchTags] PATCH 结果:', result);

      let data = null;
      try { data = JSON.parse(result); } catch (_) { data = result; }

      responded = true;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ success: true, data }));
    } catch (e) {
      console.error('[SearchTags] PATCH 失败:', e.message);
      if (!responded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
  });
}
