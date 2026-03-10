/**
 * 响应工具函数
 */

export function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function success(res, data) {
  jsonResponse(res, 200, { success: true, data });
}

export function error(res, statusCode, message) {
  jsonResponse(res, statusCode, { success: false, error: message });
}

export function badRequest(res, message = '请求参数错误') {
  error(res, 400, message);
}

export function notFound(res, message = '资源不存在') {
  error(res, 404, message);
}

export function serverError(res, message = '服务器内部错误') {
  error(res, 500, message);
}
