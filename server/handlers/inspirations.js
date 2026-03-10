import { execSync } from 'child_process';

const INSPIRATIONS_BASE = 'https://us-central1-incolor-cff73.cloudfunctions.net/inspirations';
const API_KEY = 'hoahg*Aoyzo99034anvn-34hgannbaJOH';
const IMAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/incolor-cff73.appspot.com/o/';
const SEP = '%2F';
const SUFFIX = '?alt=media';

/**
 * 获取某个素材的用户作品列表
 * GET /api/inspirations?pname=xxx&limit=20&offset=xxx
 */
export function inspirationsHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pname = url.searchParams.get('pname');
  const limit = url.searchParams.get('limit') || '30';
  const offset = url.searchParams.get('offset') || '';

  if (!pname) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少 pname 参数' }));
    return;
  }

  let apiUrl = `${INSPIRATIONS_BASE}?ak=${API_KEY}&pname=${encodeURIComponent(pname)}&limit=${limit}`;
  if (offset) apiUrl += `&offset=${offset}`;

  console.log('[Inspirations] 请求:', pname);

  try {
    const result = execSync(`curl -s --max-time 15 "${apiUrl}"`, { encoding: 'utf-8' });
    const data = JSON.parse(result);

    const creations = (Array.isArray(data) ? data : []).map((item) => ({
      id: item.key || item.imageName,
      // 大图: posts/snapshot/{imageName}.webp
      imageUrl: IMAGE_BASE + ['posts', 'snapshot', item.imageName + '.webp'].join(SEP) + SUFFIX,
      // 小图: posts/thumb/{imageName}.webp
      thumbUrl: IMAGE_BASE + ['posts', 'thumb', item.imageName + '.webp'].join(SEP) + SUFFIX,
      // 用户头像: posts/avatar/{userUid}.jpg
      avatarUrl: item.userUid
        ? IMAGE_BASE + ['posts', 'avatar', item.userUid + '.jpg'].join(SEP) + SUFFIX
        : '',
      userId: item.userUid || '',
      userName: item.userName || '匿名用户',
      likes: Math.abs(item.likesCount || 0),
      subscribe: item.subscribe || false,
      createdAt: Math.abs(item.createdAt || 0),
      type: item.type,
      patternName: item.patternName,
      imageName: item.imageName,
    }));

    console.log(`[Inspirations] ${pname}: ${creations.length} 条作品`);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ data: creations }));
  } catch (e) {
    console.error('[Inspirations] 失败:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message, data: [] }));
  }
}
