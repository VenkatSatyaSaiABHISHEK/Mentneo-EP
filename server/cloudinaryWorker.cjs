/**
 * Mentneo EP - Cloudinary Background Upload Worker
 * 
 * Uploads locally persisted attendance photos to Cloudinary in the background.
 * Deletes local files upon successful upload and handles retries with backoff.
 * 
 * Run with: node server/cloudinaryWorker.cjs
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'mentneo';

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  console.log(`[Worker] Cloudinary configured with API key for cloud: ${cloudName}`);
} else if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    secure: true,
  });
  console.log(`[Worker] Cloudinary configured with unsigned upload preset: ${uploadPreset}`);
} else {
  console.warn('[Worker] Warning: Cloudinary environment variables not set. Uploads will remain in local storage.');
}

const UPLOAD_DIR = path.resolve(__dirname, '../public/uploads/attendance');
const QUEUE_FILE = path.resolve(__dirname, '../public/uploads/upload_queue.json');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function readQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[Worker] Error reading queue file:', err);
  }
  return [];
}

function writeQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Worker] Error writing queue file:', err);
  }
}

/**
 * Upload single item to Cloudinary
 */
async function processQueueItem(item) {
  const filePath = path.resolve(__dirname, '..', item.localPath.replace(/^\//, ''));

  if (!fs.existsSync(filePath)) {
    console.warn(`[Worker] Local file not found: ${filePath}. Marking failed.`);
    item.status = 'failed';
    item.error = 'Local file not found on disk';
    return item;
  }

  console.log(`[Worker] Uploading to Cloudinary: ${item.empId} - ${path.basename(filePath)}...`);

  try {
    let result;
    if (apiKey && apiSecret) {
      result = await cloudinary.uploader.upload(filePath, {
        folder: 'mentneo/attendance',
        resource_type: 'image',
        tags: ['attendance', item.empId],
      });
    } else {
      result = await cloudinary.uploader.unsigned_upload(filePath, uploadPreset, {
        folder: 'mentneo/attendance',
      });
    }

    console.log(`[Worker] ✓ Upload success: ${result.secure_url}`);

    // Delete local copy after successful upload
    try {
      fs.unlinkSync(filePath);
      console.log(`[Worker] Deleted local file: ${filePath}`);
    } catch (delErr) {
      console.warn(`[Worker] Could not delete local file: ${delErr.message}`);
    }

    item.status = 'uploaded';
    item.cloudinaryUrl = result.secure_url;
    item.cloudinaryPublicId = result.public_id;
    item.uploadedAt = new Date().toISOString();
  } catch (uploadErr) {
    console.error(`[Worker] ✗ Upload failed: ${uploadErr.message}`);
    item.retryCount = (item.retryCount || 0) + 1;
    if (item.retryCount >= 3) {
      item.status = 'failed';
      item.error = uploadErr.message;
    } else {
      item.status = 'pending';
      item.error = `Retry ${item.retryCount}/3: ${uploadErr.message}`;
    }
  }

  return item;
}

/**
 * Process pending items in queue
 */
async function runWorkerCycle() {
  const queue = readQueue();
  const pendingItems = queue.filter(q => q.status === 'pending');

  if (pendingItems.length === 0) {
    return;
  }

  console.log(`[Worker] Found ${pendingItems.length} pending photo upload(s)...`);

  for (const item of pendingItems) {
    await processQueueItem(item);
  }

  writeQueue(queue);
}

// Run every 10 seconds
setInterval(() => {
  runWorkerCycle().catch(console.error);
}, 10000);

// Run initial cycle on startup
runWorkerCycle().catch(console.error);

console.log('[Worker] Mentneo Cloudinary background worker running. Watching for pending photos...');

module.exports = {
  processQueueItem,
  readQueue,
  writeQueue,
};
