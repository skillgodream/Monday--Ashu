import fs from 'fs';
import path from 'path';

const videosDir = path.resolve(process.cwd(), 'uploads', 'videos');

function getSafeVideoPath(lessonId: string, clipIndex: number = 1): string {
  const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(videosDir, `${safeId}_clip_${clipIndex}.mp4`);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key, Authorization');

  const method = (req.method || '').toUpperCase();
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query || {};
  const segments: string[] = Array.isArray(slug) ? slug : (typeof slug === 'string' ? slug.split('/') : []);

  // 1. CHECK ENDPOINT: /api/videos/check/:lessonId
  if (segments[0] === 'check' || req.url?.includes('/check')) {
    const lessonId = segments[1] || req.query.lessonId;
    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'lessonId is required' });
    }

    const foundClips: number[] = [];
    if (fs.existsSync(videosDir)) {
      for (let i = 1; i <= 10; i++) {
        const filePath = getSafeVideoPath(lessonId, i);
        if (fs.existsSync(filePath)) {
          foundClips.push(i);
        }
      }
    }

    return res.status(200).json({
      success: true,
      hasVideos: foundClips.length > 0,
      clips: foundClips,
    });
  }

  // 2. STREAM ENDPOINT: /api/videos/stream/:lessonId/:clipIndex
  if (segments[0] === 'stream' || req.url?.includes('/stream')) {
    const lessonId = segments[1] || req.query.lessonId;
    const clipIndex = Number(segments[2] || req.query.clipIndex) || 1;

    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'lessonId is required' });
    }

    const filePath = getSafeVideoPath(lessonId, clipIndex);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Video file not found on server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      return file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 3. DELETE ENDPOINT: /api/videos/:lessonId
  if (req.method === 'DELETE') {
    const lessonId = segments[0] || req.query.lessonId;
    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'lessonId is required' });
    }

    let deletedCount = 0;
    if (fs.existsSync(videosDir)) {
      for (let i = 1; i <= 10; i++) {
        const filePath = getSafeVideoPath(lessonId, i);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (_) {}
        }
      }
    }

    return res.status(200).json({ success: true, deletedCount });
  }

  return res.status(404).json({ success: false, error: 'Videos route not found' });
}
