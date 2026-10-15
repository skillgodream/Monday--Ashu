import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import fs from 'fs';
import path from 'path';

function getApiKey(req?: any): string | undefined {
  const headerKey = req ? (
    (typeof req.headers?.['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : '') ||
    (typeof req.headers?.['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '')
  ).trim() : '';

  const rawKey = (
    headerKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  return rawKey.replace(/^["']|["']$/g, '').trim() || undefined;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key, Authorization');

  const method = (req.method || '').toUpperCase();
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Gemini API key is not configured in server environment or request headers.' });
  }

  let bodyData = req.body;
  if (typeof bodyData === 'string') {
    try {
      bodyData = JSON.parse(bodyData);
    } catch (_) {}
  }
  const { operationName, lessonId, clipIndex = 1 } = bodyData || {};
  if (!operationName) {
    return res.status(400).json({ success: false, error: 'operationName is required.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const downloadUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadUri) {
      return res.status(404).json({ success: false, error: 'Video URI not found in completed operation.' });
    }

    const videoRes = await fetch(downloadUri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ success: false, error: `Failed to fetch video file: ${videoRes.statusText}` });
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Persist to server disk if possible
    if (lessonId && typeof lessonId === 'string') {
      try {
        const videosDir = path.resolve(process.cwd(), 'uploads', 'videos');
        if (!fs.existsSync(videosDir)) {
          fs.mkdirSync(videosDir, { recursive: true });
        }
        const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const destPath = path.join(videosDir, `${safeId}_clip_${Number(clipIndex) || 1}.mp4`);
        await fs.promises.writeFile(destPath, buffer);
      } catch (saveErr) {
        // Non-fatal if filesystem is read-only in serverless
        console.warn('[Serverless Disk Save Warning]', saveErr);
      }
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.send(buffer);
  } catch (error: any) {
    console.error('[Serverless Veo Download Error]', error);
    const msg = error?.message || (typeof error === 'string' ? error : 'Failed to download video.');
    return res.status(500).json({ success: false, error: msg });
  }
}
