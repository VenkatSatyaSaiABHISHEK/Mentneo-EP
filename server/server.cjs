const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { processQueueItem, readQueue, writeQueue } = require('./cloudinaryWorker.cjs');

const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.resolve(__dirname, '../public/uploads/attendance');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 1. POST /api/attendance/check-in
  if (req.method === 'POST' && url.pathname === '/api/attendance/check-in') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { empId, name, date, time, imageBase64 } = payload;

        if (!imageBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Image data required' }));
          return;
        }

        // Clean base64 header
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const filename = `att_${Date.now()}_${(empId || 'EMP').toUpperCase()}.jpg`;
        const localFilePath = path.join(UPLOAD_DIR, filename);

        // Immediate synchronous write to local disk
        fs.writeFileSync(localFilePath, buffer);
        const localPhotoPath = `/uploads/attendance/${filename}`;

        // Enqueue for background Cloudinary sync
        const queue = readQueue();
        const queueItem = {
          id: `queue_${Date.now()}`,
          empId: empId || '',
          name: name || '',
          date: date || '',
          time: time || '',
          localPath: localPhotoPath,
          status: 'pending',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        };
        queue.push(queueItem);
        writeQueue(queue);

        // Immediate <50ms response to client
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          localPhotoPath,
          message: 'Saved to local storage, queued for background upload',
        }));

        // Fire-and-forget background upload attempt
        setTimeout(() => {
          processQueueItem(queueItem).then(() => {
            const currentQ = readQueue();
            const idx = currentQ.findIndex(q => q.id === queueItem.id);
            if (idx !== -1) {
              currentQ[idx] = queueItem;
              writeQueue(currentQ);
            }
          }).catch(console.error);
        }, 100);
      } catch (err) {
        console.error('Check-in save error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save local photo' }));
      }
    });
    return;
  }

  // 2. POST /api/attendance/retry-upload/:id
  if (req.method === 'POST' && url.pathname.startsWith('/api/attendance/retry-upload/')) {
    const queue = readQueue();
    const item = queue.find(q => q.status === 'failed' || q.status === 'pending');
    if (item) {
      item.retryCount = 0;
      item.status = 'pending';
      processQueueItem(item).then(() => {
        writeQueue(queue);
      }).catch(console.error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Upload retry triggered' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'No failed upload found in queue' }));
    }
    return;
  }

  // 3. GET /api/attendance/queue-status
  if (req.method === 'GET' && url.pathname === '/api/attendance/queue-status') {
    const queue = readQueue();
    const pending = queue.filter(q => q.status === 'pending').length;
    const uploaded = queue.filter(q => q.status === 'uploaded').length;
    const failed = queue.filter(q => q.status === 'failed').length;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pending, uploaded, failed, total: queue.length }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[Server] Mentneo Attendance API server listening on http://localhost:${PORT}`);
});
