import { collection, query, limit, orderBy, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { firestore, PREFIX, SEPARATOR, SUFFIX } from '../config/firebase.js';
import { parseBody } from '../utils/bodyParser.js';
import { success, serverError } from '../utils/response.js';

// 缓存筛选选项（避免每次都查询全部数据）
let filterOptionsCache = null;
let filterOptionsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 缓存总数
let totalCountCache = null;
let totalCountCacheTime = 0;

async function getCachedTotal(imagenRef, constraints) {
  const now = Date.now();
  if (totalCountCache !== null && (now - totalCountCacheTime) < CACHE_TTL) {
    return totalCountCache;
  }
  const countQuery = query(imagenRef, ...constraints);
  const countSnapshot = await getCountFromServer(countQuery);
  totalCountCache = countSnapshot.data().count;
  totalCountCacheTime = now;
  return totalCountCache;
}

/**
 * 获取所有筛选选项
 */
async function getFilterOptions() {
  const now = Date.now();
  if (filterOptionsCache && (now - filterOptionsCacheTime) < CACHE_TTL) {
    return filterOptionsCache;
  }

  const imagenRef = collection(firestore, 'imagen');
  const q = query(imagenRef, orderBy('createdAt', 'desc'), limit(5000));
  const snapshot = await getDocs(q);

  const models = new Set();
  const styles = new Set();
  const ratios = new Set();
  const platforms = new Set();
  const modes = new Set();
  const clientVersions = new Set();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.model) models.add(data.model);
    if (data.style) styles.add(data.style);
    if (data.ratio) ratios.add(formatRatio(data.ratio));
    if (data.platform) platforms.add(data.platform);
    if (data.mode) modes.add(data.mode);
    if (data.clientVersion) clientVersions.add(data.clientVersion);
  });

  filterOptionsCache = {
    models: [...models].sort(),
    styles: [...styles].sort(),
    ratios: [...ratios].sort(),
    platforms: [...platforms].sort(),
    modes: [...modes].sort(),
    clientVersions: [...clientVersions].sort()
  };
  filterOptionsCacheTime = now;

  return filterOptionsCache;
}

/**
 * 格式化比例为易读格式
 */
function formatRatio(ratio) {
  if (!ratio || isNaN(ratio)) return '1:1';
  const r = Number(ratio);
  
  // 常见比例映射（允许一定误差）
  const ratioList = [
    { value: 1.0, label: '1:1' },
    { value: 0.75, label: '3:4' },
    { value: 1.333, label: '4:3' },
    { value: 0.5625, label: '9:16' },
    { value: 1.778, label: '16:9' },
    { value: 1.5, label: '3:2' },
    { value: 0.667, label: '2:3' },
    { value: 0.8, label: '4:5' },
    { value: 1.25, label: '5:4' },
    { value: 1.37, label: '5:4' }, // 有些 5:4 可能是 1.37
  ];

  // 找最接近的比例
  let closest = ratioList[0];
  let minDiff = Math.abs(r - closest.value);
  
  for (const item of ratioList) {
    const diff = Math.abs(r - item.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }

  // 如果差距太大，动态计算比例
  if (minDiff > 0.1) {
    if (r >= 1) {
      const w = Math.round(r * 4);
      return `${w}:4`;
    } else {
      const h = Math.round(4 / r);
      return `4:${h}`;
    }
  }

  return closest.label;
}

/**
 * 查询 Imagen 文档列表（支持分页和筛选）
 * POST /api/imagen/records
 */
export async function imagenRecordsHandler(req, res) {
  try {
    const filters = await parseBody(req);
    const imagenRef = collection(firestore, 'imagen');
    const constraints = [];

    // 时间筛选（Firestore 原生支持）
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      constraints.push(where('createdAt', '>=', start.getTime()));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      constraints.push(where('createdAt', '<=', end.getTime()));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    // 检查是否有内存筛选条件
    const hasMemoryFilters = filters.model || filters.style || filters.ratio || filters.uid || filters.prompt || filters.keyword || filters.platform || filters.clientVersion || filters.mode;

    // 分页参数
    const page = parseInt(filters.page, 10) || 1;
    const pageSize = parseInt(filters.pageSize, 10) || 20;

    let results = [];
    let total = 0;

    if (hasMemoryFilters) {
      // 有筛选条件时：获取更多数据，先筛选再分页
      const fetchLimit = 2000; // 获取足够多的数据用于筛选
      const q = query(imagenRef, ...constraints, limit(fetchLimit));
      const snapshot = await getDocs(q);

      // 转换数据
      let allResults = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          ratioFormatted: formatRatio(data.ratio),
          createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString() : null,
          URL: `${PREFIX}imagen-thumb${SEPARATOR}${doc.id}.webp${SUFFIX}`
        };
      });

      // 内存筛选
      if (filters.model) {
        allResults = allResults.filter(item => item.model === filters.model);
      }
      if (filters.style) {
        allResults = allResults.filter(item => item.style === filters.style);
      }
      if (filters.ratio) {
        allResults = allResults.filter(item => item.ratioFormatted === filters.ratio);
      }
      if (filters.uid) {
        const uidLower = filters.uid.toLowerCase();
        allResults = allResults.filter(item => item.uid && item.uid.toLowerCase().includes(uidLower));
      }
      if (filters.prompt || filters.keyword) {
        const keyword = (filters.prompt || filters.keyword).toLowerCase();
        allResults = allResults.filter(item => {
          const promptMatch = item.prompt && item.prompt.toLowerCase().includes(keyword);
          const enhancedMatch = item.promptEnhance && item.promptEnhance.toLowerCase().includes(keyword);
          return promptMatch || enhancedMatch;
        });
      }
      if (filters.platform) {
        allResults = allResults.filter(item => item.platform === filters.platform);
      }
      if (filters.clientVersion) {
        allResults = allResults.filter(item => item.clientVersion && item.clientVersion.includes(filters.clientVersion));
      }
      if (filters.mode) {
        allResults = allResults.filter(item => item.mode === filters.mode);
      }

      // 筛选后分页
      total = allResults.length;
      const skipCount = (page - 1) * pageSize;
      results = allResults.slice(skipCount, skipCount + pageSize);

    } else {
      // 无筛选条件：直接分页查询
      const skipCount = (page - 1) * pageSize;
      const fetchLimit = skipCount + pageSize + 1; // 多取1条判断是否有下一页
      
      const q = query(imagenRef, ...constraints, limit(fetchLimit));
      const snapshot = await getDocs(q);

      const hasMore = snapshot.docs.length > skipCount + pageSize;
      results = snapshot.docs.slice(skipCount, skipCount + pageSize).map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          ratioFormatted: formatRatio(data.ratio),
          createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString() : null,
          URL: `${PREFIX}imagen-thumb${SEPARATOR}${doc.id}.webp${SUFFIX}`
        };
      });

      // 估算总数：如果有更多数据，用缓存的总数或估算值
      if (hasMore) {
        // 懒获取总数（只在需要时查一次，缓存起来）
        total = await getCachedTotal(imagenRef, constraints.filter(c => c.type !== 'limit'));
      } else {
        total = skipCount + results.length;
      }
    }

    // 筛选选项不再随 records 一起返回，改为独立接口
    const totalPages = Math.ceil(total / pageSize);
    console.log(`[Imagen] 查询到 ${results.length} 条记录 (第 ${page}/${totalPages} 页，共 ${total} 条)`);
    
    success(res, {
      list: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });

  } catch (err) {
    console.error('[Imagen] 查询失败:', err);
    serverError(res, err.message);
  }
}

/**
 * 获取 Imagen 统计分布数据
 * GET /api/imagen/stats
 */
export async function imagenStatsHandler(req, res) {
  try {
    const imagenRef = collection(firestore, 'imagen');
    const q = query(imagenRef, orderBy('createdAt', 'desc'), limit(5000));
    const snapshot = await getDocs(q);

    const modelCount = {};
    const styleCount = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.model) modelCount[data.model] = (modelCount[data.model] || 0) + 1;
      if (data.style) styleCount[data.style] = (styleCount[data.style] || 0) + 1;
    });

    const modelData = Object.entries(modelCount).map(([name, value]) => ({ name, value }));
    const styleData = Object.entries(styleCount).map(([name, value]) => ({ name, value }));

    success(res, { modelData, styleData });
  } catch (err) {
    console.error('[Imagen Stats] 查询失败:', err);
    serverError(res, err.message);
  }
}

/**
 * 获取筛选选项（独立接口，带缓存）
 * GET /api/imagen/filter-options
 */
export async function imagenFilterOptionsHandler(req, res) {
  try {
    const filterOptions = await getFilterOptions();
    success(res, filterOptions);
  } catch (err) {
    console.error('[Imagen FilterOptions] 查询失败:', err);
    serverError(res, err.message);
  }
}
