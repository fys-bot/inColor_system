import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CONFIG_URL = 'https://firebasestorage.googleapis.com/v0/b/incolor-cff73.appspot.com/o/resources%2Fincolor_0_9_9.json.zip?alt=media';

/**
 * GET /api/content-config
 * 下载 Firebase 上的素材配置 zip，解压后返回 JSON
 */
export function contentConfigHandler(req, res) {
  console.log('[ContentConfig] 开始下载素材配置...');

  const tmpDir = mkdtempSync(join(tmpdir(), 'content-config-'));
  const zipFile = join(tmpDir, 'config.zip');

  try {
    // 下载 zip
    execSync(`curl -s --max-time 60 -L -o "${zipFile}" "${CONFIG_URL}"`, { encoding: 'utf-8' });

    // 解压
    execSync(`unzip -o "${zipFile}" -d "${tmpDir}"`, { encoding: 'utf-8' });

    // 找到解压出的 json 文件
    const files = execSync(`ls "${tmpDir}"`, { encoding: 'utf-8' }).trim().split('\n');
    const jsonFile = files.find(f => f.endsWith('.json'));

    if (!jsonFile) {
      throw new Error('解压后未找到 JSON 文件');
    }

    const jsonContent = readFileSync(join(tmpDir, jsonFile), 'utf-8');
    const data = JSON.parse(jsonContent);

    console.log(`[ContentConfig] 成功加载素材配置, keys: ${Object.keys(data).join(', ')}`);

    // 清理临时文件
    try { execSync(`rm -rf "${tmpDir}"`); } catch (_) {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data }));
  } catch (e) {
    console.error('[ContentConfig] 失败:', e.message);
    try { execSync(`rm -rf "${tmpDir}"`); } catch (_) {}
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}
