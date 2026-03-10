import { collection, doc, getDocs, limit, orderBy, query, setDoc, Timestamp, where, writeBatch } from 'firebase/firestore';
import { firestore, thumbUri } from '../config/firebase.js';
import { parseBody } from '../utils/bodyParser.js';
import { success, serverError } from '../utils/response.js';

/**
 * 查询用户举报数据
 * POST /api/user-report/load
 */
export async function userReportLoadHandler(req, res) {
  try {
    const filters = await parseBody(req);
    const reportsRef = collection(firestore, 'report');
    const constraints = [];

    // 状态过滤
    const state = filters.state || null;
    if (state) {
      constraints.push(where('state', '==', state));
    }

    // 时间范围过滤
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      const startTimestamp = Timestamp.fromDate(start);
      constraints.push(where('createdAt', '>=', startTimestamp));
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      const endTimestamp = Timestamp.fromDate(end);
      constraints.push(where('createdAt', '<', endTimestamp));
    }

    // 举报理由
    if (filters.reason) {
      constraints.push(where(`reasons.${filters.reason}`, '>', 0));
    }

    // PID, UID, CID 过滤
    if (filters.pid) {
      constraints.push(where('pid', '==', filters.pid));
    }
    if (filters.uid) {
      constraints.push(where('uid', '==', filters.uid));
    }
    if (filters.cid) {
      constraints.push(where('cid', '==', filters.cid));
    }
    if (filters.uids) {
      constraints.push(where('uids', 'array-contains', filters.uids));
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
      const imageId = data.imageId || '';
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toLocaleString() : null,
        url: data.state === 'pending' ? thumbUri('ugc', imageId) : null,
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
      const key = currentItem.state || 'unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(currentItem);
      return acc;
    }, {});

    console.log(`[UserReport] 查询到 ${results.length} 条记录`);
    success(res, groupedResults);

  } catch (err) {
    console.error('[UserReport] 查询失败:', err);
    serverError(res, err.message);
  }
}

function getMaxKey(obj) {
  let maxKey = '';
  let maxValue = -Infinity;
  for (const [key, value] of Object.entries(obj)) {
    if (value > maxValue) {
      maxValue = value;
      maxKey = key;
    }
  }
  return maxKey;
}

/**
 * 更新举报记录状态
 * POST /api/user-report/update
 */
export async function userReportUpdateHandler(req, res) {
  try {
    const { action, rows } = await parseBody(req);
    const batch = writeBatch(firestore);

    if (!Array.isArray(rows) || rows.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: '请求中未包含有效的报告数据', success: false }));
    }

    let stateUpdate = '';

    for (const row of rows) {
      const reportRef = doc(firestore, 'report', row.id);

      if (action === 'delete') {
        const body = {
          type: row.pid ? 'comment' : 'post',
          uid: row.uid,
          reason: getMaxKey(row.reasons || {}),
          imageId: row.imageId,
          pid: row.pid || row.id,
        };

        if (row.pid) {
          body.cid = row.id;
          body.comment = row.comment;
        }

        const agentRef = collection(firestore, 'agent');
        const agentDocRef = doc(agentRef);
        await setDoc(agentDocRef, body);
        stateUpdate = 'deleted';
      } else if (action === 'ignore') {
        stateUpdate = 'ignore';
      } else if (action === 'block') {
        stateUpdate = 'block';
      } else if (action === 'pending') {
        stateUpdate = 'pending';
      } else {
        throw new Error('无效的操作类型');
      }

      if (stateUpdate) {
        batch.update(reportRef, {
          state: stateUpdate,
          updatedAt: Timestamp.now(),
        });
      }
    }

    await batch.commit();
    console.log('[UserReport] 更新成功');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      id: rows.map(row => row.id),
      updatedAt: new Date().toISOString(),
      action,
    }));

  } catch (err) {
    console.error('[UserReport] 更新失败:', err);
    serverError(res, err.message);
  }
}
