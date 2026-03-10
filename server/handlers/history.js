import { ref, get, query, orderByKey, startAt, endAt } from 'firebase/database';
import { db } from '../config/firebase.js';
import { parseBody } from '../utils/bodyParser.js';
import { success, serverError } from '../utils/response.js';

/**
 * 查询指定日期范围内的所有搜索词历史记录
 */
function getSearchHistoryByDateRange(startDate, endDate) {
  const searchRef = ref(db, 'searchWords');
  let queryRef = query(searchRef, orderByKey());
  
  if (startDate) {
    queryRef = query(queryRef, startAt(startDate));
  }
  if (endDate) {
    queryRef = query(queryRef, endAt(endDate));
  }

  return get(queryRef)
    .then((snapshot) => snapshot.val() || {})
    .catch((error) => {
      console.error('查询指定日期范围搜索历史失败:', error);
      throw error;
    });
}

/**
 * 跨日期对搜索词数据进行累加、计算稀缺值并排序
 */
function aggregateSearchTerms(historyData, sortBy = 'rarity', order = 'desc', limit = 50) {
  if (!historyData || Object.keys(historyData).length === 0) {
    return [];
  }

  const aggregatedMap = new Map();

  // 遍历所有日期并累加数据
  for (const dateKey in historyData) {
    const dateData = historyData[dateKey];
    if (typeof dateData === 'object' && dateData !== null) {
      for (const term in dateData) {
        const data = dateData[term];
        const current = aggregatedMap.get(term) || { c: 0, n: 0, h: 0 };
        current.c += data.c || 0;
        current.n += data.n || 0;
        current.h = Math.max(current.h, data.h || 0);
        aggregatedMap.set(term, current);
      }
    }
  }

  // 转换为数组，计算稀缺值
  const finalArray = Array.from(aggregatedMap.entries()).map(([term, data]) => {
    const n = data.n;
    const h = data.h === 0 ? 1 : data.h;
    const rarityValue = (n / h) * 100;

    return {
      term: term,
      c: data.c,
      h: data.h,
      n: data.n,
      rarity: parseFloat(rarityValue.toFixed(4)),
    };
  });

  // 排序
  finalArray.sort((a, b) => {
    let valA, valB;
    if (sortBy === 'rarity') {
      valA = a.rarity;
      valB = b.rarity;
    } else if (sortBy === 'n') {
      valA = a.n;
      valB = b.n;
    } else if (sortBy === 'h') {
      valA = a.h;
      valB = b.h;
    } else {
      valA = a.c;
      valB = b.c;
    }
    return order === 'desc' ? valB - valA : valA - valB;
  });

  return finalArray.slice(0, limit);
}

/**
 * 获取搜索历史
 * POST /api/history/:type (h 或 rarity)
 */
export async function historyHandler(req, res) {
  try {
    const type = req.pathname.split('/').pop(); // 获取 type: h 或 rarity
    const { limit = 50, startDate, endDate, order = 'desc' } = await parseBody(req);

    const history = await getSearchHistoryByDateRange(startDate, endDate);
    const topRareTerms = aggregateSearchTerms(history, type, order, limit);

    console.log(`[History] 查询到 ${topRareTerms.length} 条记录, type: ${type}`);
    success(res, topRareTerms);

  } catch (err) {
    console.error('[History] 查询失败:', err);
    serverError(res, err.message);
  }
}
