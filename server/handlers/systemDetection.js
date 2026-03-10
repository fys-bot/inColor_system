import { collection, doc, getDocs, limit, orderBy, query, Timestamp, where, writeBatch, updateDoc } from 'firebase/firestore';
import { firestore, thumbUri } from '../config/firebase.js';
import { parseBody } from '../utils/bodyParser.js';
import { success, serverError } from '../utils/response.js';

/**
 * 查询系统检测数据
 * POST /api/system-detection/load
 */
export async function systemDetectionLoadHandler(req, res) {
  try {
    const filters = await parseBody(req);
    const reportsRef = collection(firestore, 'posts_review');
    const constraints = [];

    // 状态过滤
    const likesCount = filters.likesCount || null;
    if (likesCount !== null) {
      constraints.push(where('likesCount', '==', likesCount));
    }

    // 默认按创建时间降序排序
    constraints.push(orderBy('createdAt', 'desc'));

    if (filters.limit) {
      const limitValue = parseInt(filters.limit, 10);
      if (!isNaN(limitValue) && limitValue > 0) {
        constraints.push(limit(limitValue));
      }
    }

    const q = query(reportsRef, ...constraints);
    const snapshot = await getDocs(q);

    let results = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt 
          ? typeof data.createdAt === 'string' 
            ? data.createdAt 
            : new Date(Math.abs(data.createdAt)).toLocaleString() 
          : null,
        url: thumbUri(data.type, data.imageName),
      };
    });

    // 前端关键词过滤
    if (filters.keyword) {
      const lowerCaseKeyword = filters.keyword.toLowerCase();
      results = results.filter((item) =>
        item.comment && item.comment.toLowerCase().includes(lowerCaseKeyword)
      );
    }

    // 按状态分组
    const groupedResults = results.reduce((acc, currentItem) => {
      const key = currentItem.likesCount;
      const keys = {
        0: 'pending',
        1: 'deleted',
        2: 'ignore',
      };
      const groupKey = keys[key] || 'pending';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(currentItem);
      return acc;
    }, {});

    console.log(`[SystemDetection] 查询到 ${results.length} 条记录`);
    success(res, groupedResults);

  } catch (err) {
    console.error('[SystemDetection] 查询失败:', err);
    serverError(res, err.message);
  }
}

/**
 * 更新系统检测记录状态
 * POST /api/system-detection/update
 */
export async function systemDetectionUpdateHandler(req, res) {
  try {
    const { action, rows } = await parseBody(req);
    const batch = writeBatch(firestore);

    if (!Array.isArray(rows) || rows.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: '请求中未包含有效的报告数据', success: false }));
    }

    let likesCountUpdate = 0;

    for (const row of rows) {
      const agentRef = collection(firestore, 'posts_review');
      const agentDocRef = doc(agentRef, row.id);

      if (action === 'delete') {
        likesCountUpdate = 1;
      } else if (action === 'ignore') {
        likesCountUpdate = 2;
      } else if (action === 'pending') {
        likesCountUpdate = 0;
      } else {
        throw new Error('无效的操作类型');
      }

      await updateDoc(agentDocRef, { 
        ...row, 
        likesCount: likesCountUpdate,
        createdAt: row.createdAt ? new Date(row.createdAt).getTime() : null
      });
    }

    await batch.commit();
    console.log('[SystemDetection] 更新成功');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      id: rows.map(row => row.id),
      updatedAt: new Date().toISOString(),
      action,
    }));

  } catch (err) {
    console.error('[SystemDetection] 更新失败:', err);
    serverError(res, err.message);
  }
}
