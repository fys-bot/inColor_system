import { execSync } from 'child_process';

/**
 * 批量下载图片并打包成 ZIP
 * POST /api/batch-download
 * Body: { urls: [{ id: string, url: string }], filename: string }
 */
export async function batchDownloadHandler(req, res) {
  let body = '';
  
  req.on('data', chunk => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { urls, filename = 'images' } = JSON.parse(body);
      
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少 urls 参数' }));
        return;
      }

      console.log(`[BatchDownload] 开始下载 ${urls.length} 张图片...`);

      // 动态导入 archiver
      const archiver = (await import('archiver')).default;
      
      // 设置响应头
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}.zip"`,
        'Access-Control-Allow-Origin': '*',
      });

      // 创建 ZIP 归档
      const archive = archiver('zip', { zlib: { level: 5 } });
      
      archive.on('error', (err) => {
        console.error('[BatchDownload] Archive error:', err);
      });

      // 将 archive 流式传输到响应
      archive.pipe(res);

      // 下载每张图片并添加到 ZIP
      let successCount = 0;
      let failCount = 0;

      for (const item of urls) {
        try {
          const imageBuffer = downloadImageWithCurl(item.url);
          if (imageBuffer && imageBuffer.length > 0) {
            const ext = item.url.includes('.webp') ? 'webp' : item.url.includes('.png') ? 'png' : 'jpg';
            archive.append(imageBuffer, { name: `${item.id}.${ext}` });
            successCount++;
            console.log(`[BatchDownload] ✓ ${item.id} (${imageBuffer.length} bytes)`);
          } else {
            throw new Error('Empty response');
          }
        } catch (err) {
          console.warn(`[BatchDownload] ✗ ${item.id}:`, err.message);
          failCount++;
        }
      }

      console.log(`[BatchDownload] 完成: 成功 ${successCount}, 失败 ${failCount}`);
      
      // 完成归档
      await archive.finalize();
      
    } catch (err) {
      console.error('[BatchDownload] Error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });
}

/**
 * 使用 curl 下载图片（绕过 Node.js 网络问题）
 */
function downloadImageWithCurl(imageUrl) {
  try {
    // 使用 curl 下载图片，输出到 stdout
    const buffer = execSync(`curl -s -L --max-time 60 "${imageUrl}"`, {
      maxBuffer: 50 * 1024 * 1024, // 50MB
      encoding: 'buffer'
    });
    return buffer;
  } catch (err) {
    throw new Error(`curl failed: ${err.message}`);
  }
}
