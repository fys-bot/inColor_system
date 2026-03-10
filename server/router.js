import url from 'url';
import { proxyHandler } from './handlers/proxy.js';
import { healthHandler } from './handlers/health.js';
import { imagenRecordsHandler, imagenStatsHandler, imagenFilterOptionsHandler } from './handlers/imagen.js';
import { dashboardOverviewHandler } from './handlers/dashboard.js';
import { userReportLoadHandler, userReportUpdateHandler } from './handlers/userReport.js';
import { systemDetectionLoadHandler, systemDetectionUpdateHandler } from './handlers/systemDetection.js';
import { historyHandler } from './handlers/history.js';
import { batchDownloadHandler } from './handlers/batchDownload.js';
import { inspirationsHandler } from './handlers/inspirations.js';
import { getSearchTagsHandler, patchSearchTagsHandler } from './handlers/searchTags.js';
import { importImgHandler } from './handlers/importImg.js';
import { aiGatewayModelsHandler, aiGatewayDocsHandler, aiGatewayChatHandler, aiGatewayImageHandler } from './handlers/aiGateway.js';
import { updateContentConfigHandler } from './handlers/updateContentConfig.js';
import { contentConfigHandler } from './handlers/contentConfig.js';
import { proxyImageHandler } from './handlers/proxyImage.js';

// 路由表
const routes = {
  'GET /health': healthHandler,
  'GET /proxy': proxyHandler,
  'GET /api/dashboard/overview': dashboardOverviewHandler,
  'POST /api/batch-download': batchDownloadHandler,
  'POST /api/imagen/records': imagenRecordsHandler,
  'GET /api/imagen/stats': imagenStatsHandler,
  'GET /api/imagen/filter-options': imagenFilterOptionsHandler,
  'GET /api/inspirations': inspirationsHandler,
  'GET /api/search-tags': getSearchTagsHandler,
  'PATCH /api/search-tags': patchSearchTagsHandler,
  'POST /api/import-img': importImgHandler,
  'POST /api/proxy-image': proxyImageHandler,
  'GET /api/ai-gateway/models': aiGatewayModelsHandler,
  'GET /api/ai-gateway/docs': aiGatewayDocsHandler,
  'POST /api/ai-gateway/chat': aiGatewayChatHandler,
  'POST /api/ai-gateway/image': aiGatewayImageHandler,
  'GET /api/update-content-config': updateContentConfigHandler,
  'GET /api/content-config': contentConfigHandler,
  'POST /api/user-report/load': userReportLoadHandler,
  'POST /api/user-report/update': userReportUpdateHandler,
  'POST /api/system-detection/load': systemDetectionLoadHandler,
  'POST /api/system-detection/update': systemDetectionUpdateHandler,
};

// 动态路由 (支持路径参数)
const dynamicRoutes = [
  { method: 'POST', pattern: /^\/api\/history\/(h|rarity)$/, handler: historyHandler },
];

export function router(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  // 构建路由 key
  const routeKey = `${method} ${pathname}`;
  
  // 先查找静态路由
  let handler = routes[routeKey];
  
  // 如果没找到，查找动态路由
  if (!handler) {
    for (const route of dynamicRoutes) {
      if (route.method === method && route.pattern.test(pathname)) {
        handler = route.handler;
        break;
      }
    }
  }
  
  if (handler) {
    req.query = parsedUrl.query;
    req.pathname = pathname;
    handler(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
  }
}
