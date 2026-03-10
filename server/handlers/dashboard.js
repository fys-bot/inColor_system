import { collection, query, limit, orderBy, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { firestore, db } from '../config/firebase.js';
import { success, serverError } from '../utils/response.js';

/**
 * 仪表盘概览数据
 * GET /api/dashboard/overview?range=1d|7d|30d
 */
export async function dashboardOverviewHandler(req, res) {
  try {
    const range = req.query?.range || '1d';
    const days = range === '30d' ? 30 : range === '7d' ? 7 : 1;

    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() - days);
    startTime.setHours(0, 0, 0, 0);

    const [
      imagenData,
      reportPending,
      hotSearchTerm
    ] = await Promise.all([
      getImagenData(startTime.getTime(), days),
      getPendingReportCount(),
      getHotSearchTerm()
    ]);

    success(res, {
      ...imagenData,
      reportPending,
      hotSearchTerm,
      range
    });
  } catch (err) {
    console.error('[Dashboard] 查询失败:', err);
    serverError(res, err.message);
  }
}

/** AI 生图数据（总数 + 趋势 + 风格分布） */
async function getImagenData(startTime, days) {
  const imagenRef = collection(firestore, 'imagen');

  // 总数
  const totalSnapshot = await getCountFromServer(query(imagenRef));
  const imagenTotal = totalSnapshot.data().count;

  // 时间范围内的数据
  const q = query(
    imagenRef,
    where('createdAt', '>=', startTime),
    orderBy('createdAt', 'desc'),
    limit(5000)
  );
  const snapshot = await getDocs(q);

  // 按天统计趋势
  const dailyCounts = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyCounts[d.toISOString().split('T')[0]] = 0;
  }

  // 风格统计
  const styleCounts = {};
  let rangeTotal = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    rangeTotal++;
    if (data.createdAt) {
      const dateStr = new Date(data.createdAt).toISOString().split('T')[0];
      if (dailyCounts[dateStr] !== undefined) dailyCounts[dateStr]++;
    }
    if (data.style) styleCounts[data.style] = (styleCounts[data.style] || 0) + 1;
  });

  const weeklyGenerations = Object.entries(dailyCounts).map(([date, count]) => ({
    name: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    count
  }));

  const styleDistribution = Object.entries(styleCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { imagenTotal, rangeTotal, weeklyGenerations, styleDistribution };
}

/** 待处理举报数 */
async function getPendingReportCount() {
  try {
    const reportsRef = collection(firestore, 'report');
    const q = query(reportsRef, where('state', '==', 'pending'));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (e) {
    console.error('[Dashboard] 举报查询失败:', e);
    return 0;
  }
}

/** 最热搜索词 */
async function getHotSearchTerm() {
  try {
    const today = new Date();
    // 尝试今天和昨天
    for (let i = 0; i <= 1; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const searchRef = ref(db, `searchWords/${dateKey}`);
      const snapshot = await get(searchRef);
      const data = snapshot.val();
      if (data) {
        let hottest = null;
        let maxH = 0;
        for (const term in data) {
          const h = data[term].h || 0;
          if (h > maxH) { maxH = h; hottest = { term, h, n: data[term].n || 0 }; }
        }
        if (hottest) return hottest;
      }
    }
    return null;
  } catch (e) {
    console.error('[Dashboard] 搜索词查询失败:', e);
    return null;
  }
}
