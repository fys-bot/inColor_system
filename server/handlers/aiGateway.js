import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const BASE_URL = 'https://ai-gateway.eyewind.com';
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3Njk1MDI5MTMsImV4cCI6MTg2NDExMDkxMywiYXBwaWQiOiJkZXYiLCJ0eXAiOiJhcGkifQ.SMnJiua1U_Z7VYpqG9yO-DAGox4nMQZsW53TeM3Ea3s';

/**
 * GET /api/ai-gateway/models
 * 获取模型列表，可通过 ?type=Chat 过滤
 */
export function aiGatewayModelsHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const typeFilter = url.searchParams.get('type') || '';

  console.log('[AI-Gateway] GET models, filter:', typeFilter || 'all');

  try {
    const result = execSync(
      `curl -s --max-time 30 -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/v1/models"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    const parsed = JSON.parse(result);
    let models = parsed.data || [];

    if (typeFilter) {
      models = models.filter(m => m.type === typeFilter);
    }

    console.log(`[AI-Gateway] 返回 ${models.length} 个模型`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: models }));
  } catch (e) {
    console.error('[AI-Gateway] models 失败:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/**
 * GET /api/ai-gateway/docs?model=xxx
 * 获取模型配置文档（入参出参）
 */
export function aiGatewayDocsHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const model = url.searchParams.get('model');

  if (!model) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少 model 参数' }));
    return;
  }

  console.log('[AI-Gateway] GET docs:', model);

  try {
    const result = execSync(
      `curl -s --max-time 15 -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/v1/docs-json?model=${encodeURIComponent(model)}"`,
      { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 }
    );
    const data = JSON.parse(result);
    console.log(`[AI-Gateway] docs for ${model}: endpoint=${data?.api_schema?.endpoint}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data }));
  } catch (e) {
    console.error('[AI-Gateway] docs 失败:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}


/**
 * POST /api/ai-gateway/chat
 * 代理转发聊天请求到 ai-gateway
 * Body: { model, messages, ...otherParams }
 */
export function aiGatewayChatHandler(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let responded = false;
    try {
      const payload = JSON.parse(body);
      const endpoint = payload._endpoint || '/v1/chat/completions';
      delete payload._endpoint;

      console.log('[AI-Gateway] POST chat:', payload.model, 'endpoint:', endpoint);

      const payloadStr = JSON.stringify(payload);
      const tmpDir = mkdtempSync(join(tmpdir(), 'aigw-'));
      const tmpFile = join(tmpDir, 'payload.json');
      writeFileSync(tmpFile, payloadStr);

      const result = execSync(
        `curl -s --max-time 120 -X POST "${BASE_URL}${endpoint}" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d @${tmpFile}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      try { unlinkSync(tmpFile); } catch (_) {}

      // 尝试解析JSON，如果失败就原样返回
      let data;
      try { data = JSON.parse(result); } catch (_) { data = result; }

      responded = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error('[AI-Gateway] chat 失败:', e.message);
      if (!responded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
  });
}

/**
 * POST /api/ai-gateway/image
 * 代理转发图片生成请求到 ai-gateway
 * Body: { model, prompt, ...otherParams, _endpoint }
 */
export function aiGatewayImageHandler(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let responded = false;
    try {
      const payload = JSON.parse(body);
      const endpoint = payload._endpoint || '/v1/images/generations';
      delete payload._endpoint;

      console.log('[AI-Gateway] POST image:', payload.model, 'endpoint:', endpoint);

      const payloadStr = JSON.stringify(payload);
      const tmpDir = mkdtempSync(join(tmpdir(), 'aigw-img-'));
      const tmpFile = join(tmpDir, 'payload.json');
      writeFileSync(tmpFile, payloadStr);

      const result = execSync(
        `curl -s --max-time 120 -X POST "${BASE_URL}${endpoint}" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d @${tmpFile}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      try { unlinkSync(tmpFile); } catch (_) {}

      let data;
      try { data = JSON.parse(result); } catch (_) { data = result; }

      responded = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error('[AI-Gateway] image 失败:', e.message);
      if (!responded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
  });
}
