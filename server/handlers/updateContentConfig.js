import { execSync } from 'child_process';

const BASE_URL = 'https://us-central1-incolor-cff73.cloudfunctions.net/updateContentConfig';
const API_KEY = 'hoahg*Aoyzo99034anvn-34hgannbaJOH';

/**
 * 更新素材配置（上传完图片后调用，让 app 可见）
 * GET /api/update-content-config
 */
export function updateContentConfigHandler(req, res) {
  console.log('[UpdateContentConfig] 开始更新素材配置...');

  try {
    const result = execSync(
      `curl -s --max-time 30 "${BASE_URL}?ak=${API_KEY}"`,
      { encoding: 'utf-8' }
    );

    let data;
    try { data = JSON.parse(result); } catch (_) { data = result; }

    console.log('[UpdateContentConfig] 结果:', JSON.stringify(data));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data }));
  } catch (e) {
    console.error('[UpdateContentConfig] 失败:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}
