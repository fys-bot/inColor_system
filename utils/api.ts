/**
 * API 基础地址配置
 * 
 * 部署模式（前后端同端口）：API_BASE = ''
 * 局域网开发模式：API_BASE = `http://${window.location.hostname}:4000`
 * 写死 IP 模式：API_BASE = 'http://10.10.88.135:4000'
 */
const isDev = ['3000', '3001', '3002'].includes(window.location.port); // Vite dev server
export const API_BASE = isDev ? `http://${window.location.hostname}:4000` : '';
