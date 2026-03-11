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

    // 上一个周期的起止时间（用于环比）
    const prevEnd = new Date(startTime);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days);

    const [
      imagenData,
      prevImagenData,
      moderationData,
      searchData
    ] = await Promise.all([
      getImagenData(startTime.getTime(), days),
      getImagenRangeCount(prevStart.getTime(), prevEnd.getTime()),
      getModerationData(),
      getSearchData()
    ]);

    success(res, {
      ...imagenData,
      prevRangeTotal: prevImagenData.count,
      prevUniqueUsers: prevImagenData.uniqueUsers,
      ...moderationData,
      ...searchData,
      range
    });
  } catch (err) {
    console.error('[Dashboard] 查询失败:', err);
    serverError(res, err.message);
  }
}

/** 获取上一周期的生图数和独立用户数（用于环比） */
async function getImagenRangeCount(startTime, endTime) {
  try {
    const imagenRef = collection(firestore, 'imagen');
    const q = query(
      imagenRef,
      where('createdAt', '>=', startTime),
      where('createdAt', '<', endTime),
      orderBy('createdAt', 'desc'),
      limit(5000)
    );
    const snapshot = await getDocs(q);
    const uids = new Set();
    snapshot.docs.forEach(doc => {
      const d = doc.data();
      if (d.uid) uids.add(d.uid);
    });
    return { count: snapshot.size, uniqueUsers: uids.size };
  } catch (e) {
    console.error('[Dashboard] 上周期数据查询失败:', e);
    return { count: 0, uniqueUsers: 0 };
  }
}

/** AI 生图数据（总数 + 趋势 + 多维分布 + 成功率 + 活跃用户 + 高峰时段） */
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

  // 各维度统计
  const styleCounts = {};
  const modelCounts = {};
  const platformCounts = {};
  const modeCounts = {};
  const userCounts = {};
  const hourlyCounts = new Array(24).fill(0);
  const modelSuccessCounts = {}; // { model: { success: n, fail: n } }
  let rangeTotal = 0;
  let successCount = 0;
  let failCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    rangeTotal++;
    if (data.createdAt) {
      const dt = new Date(data.createdAt);
      const dateStr = dt.toISOString().split('T')[0];
      if (dailyCounts[dateStr] !== undefined) dailyCounts[dateStr]++;
      hourlyCounts[dt.getHours()]++;
    }
    if (data.style) styleCounts[data.style] = (styleCounts[data.style] || 0) + 1;
    if (data.model) {
      modelCounts[data.model] = (modelCounts[data.model] || 0) + 1;
      if (!modelSuccessCounts[data.model]) modelSuccessCounts[data.model] = { success: 0, fail: 0, total: 0 };
      modelSuccessCounts[data.model].total++;
      if (data.success === true) modelSuccessCounts[data.model].success++;
      else if (data.success === false) modelSuccessCounts[data.model].fail++;
    }
    if (data.platform) platformCounts[data.platform] = (platformCounts[data.platform] || 0) + 1;
    if (data.mode) modeCounts[data.mode] = (modeCounts[data.mode] || 0) + 1;
    else modeCounts['text'] = (modeCounts['text'] || 0) + 1;
    if (data.uid) userCounts[data.uid] = (userCounts[data.uid] || 0) + 1;
    if (data.success === true) successCount++;
    else if (data.success === false) failCount++;
  });

  const weeklyGenerations = Object.entries(dailyCounts).map(([date, count]) => ({
    name: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    count
  }));

  const toSorted = (obj, topN = 5) => Object.entries(obj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  const styleDistribution = toSorted(styleCounts, 5);
  const modelDistribution = toSorted(modelCounts, 10);
  const platformDistribution = Object.entries(platformCounts).map(([name, count]) => ({ name, count }));
  const modeDistribution = Object.entries(modeCounts).map(([name, count]) => ({ name, count }));
  const topUsers = toSorted(userCounts, 10);
  const uniqueUsers = Object.keys(userCounts).length;

  // 高峰时段（取 top 3）
  const peakHours = hourlyCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter(h => h.count > 0);

  // 各模型成功率
  const modelPerformance = Object.entries(modelSuccessCounts)
    .map(([name, d]) => ({
      name,
      total: d.total,
      success: d.success,
      fail: d.fail,
      rate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 人均生图数
  const avgPerUser = uniqueUsers > 0 ? (rangeTotal / uniqueUsers).toFixed(1) : '0';

  return {
    imagenTotal, rangeTotal, weeklyGenerations, styleDistribution,
    modelDistribution, platformDistribution, modeDistribution,
    successCount, failCount, topUsers, uniqueUsers,
    peakHours, modelPerformance, avgPerUser, hourlyCounts
  };
}

/** 社区审核数据（用户举报 + 系统检测） */
async function getModerationData() {
  try {
    const reportsRef = collection(firestore, 'report');
    const detectionRef = collection(firestore, 'posts_review');

    // 并行查询各状态数量
    const [
      reportPendingSnap,
      reportTotalSnap,
      detectionPendingSnap,
      detectionTotalSnap
    ] = await Promise.all([
      getCountFromServer(query(reportsRef, where('state', '==', 'pending'))),
      getCountFromServer(query(reportsRef)),
      getCountFromServer(query(detectionRef, where('likesCount', '==', 0))),
      getCountFromServer(query(detectionRef)),
    ]);

    return {
      reportPending: reportPendingSnap.data().count,
      reportTotal: reportTotalSnap.data().count,
      detectionPending: detectionPendingSnap.data().count,
      detectionTotal: detectionTotalSnap.data().count,
    };
  } catch (e) {
    console.error('[Dashboard] 审核数据查询失败:', e);
    return { reportPending: 0, reportTotal: 0, detectionPending: 0, detectionTotal: 0 };
  }
}

/** 搜索数据（热门词 + 稀缺词） */
async function getSearchData() {
  try {
    const today = new Date();
    const allTerms = [];
    let dataDate = '';

    for (let i = 0; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const searchRef = ref(db, `searchWords/${dateKey}`);
      const snapshot = await get(searchRef);
      const data = snapshot.val();
      if (data) {
        dataDate = dateKey;
        for (const term in data) {
          allTerms.push({
            term,
            h: data[term].h || 0,
            n: data[term].n || 0,
            c: data[term].c || 0
          });
        }
        break;
      }
    }

    if (allTerms.length === 0) {
      return { hotSearchTerm: null, topSearchTerms: [], scarceTerms: [], searchDataDate: '', totalSearchTerms: 0 };
    }

    // 按热度排序
    const byHeat = [...allTerms].sort((a, b) => b.h - a.h);
    // 稀缺词：搜索次数高但结果少（n/h 比值高）
    const scarce = allTerms
      .filter(t => t.n > 0)
      .map(t => ({ ...t, rarity: t.h > 0 ? (t.n / t.h) * 100 : t.n * 100 }))
      .sort((a, b) => b.rarity - a.rarity)
      .slice(0, 5);

    return {
      hotSearchTerm: byHeat[0] || null,
      topSearchTerms: byHeat.slice(0, 10),
      scarceTerms: scarce,
      searchDataDate: dataDate,
      totalSearchTerms: allTerms.length
    };
  } catch (e) {
    console.error('[Dashboard] 搜索词查询失败:', e);
    return { hotSearchTerm: null, topSearchTerms: [], scarceTerms: [], searchDataDate: '', totalSearchTerms: 0 };
  }
}
