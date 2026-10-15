import { GoogleGenAI } from '@google/genai';

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
  const { prompt, aspectRatio = '16:9', resolution = '720p' } = bodyData || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'A prompt is required for video generation.' });
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

    const safePrompt = prompt.trim().slice(0, 2000);

    const VEO_MODELS = ['veo-3.1-fast-generate-preview', 'veo-3.1-lite-generate-preview'];
    let operation: any = null;
    let lastError: any = null;

    // Multi-lane routing with exponential backoff & jitter
    for (let attempt = 0; attempt < 2 && !operation; attempt++) {
      for (const modelName of VEO_MODELS) {
        try {
          console.log(`[Serverless Veo] Attempting video generation on model: ${modelName} (attempt ${attempt + 1})`);
          operation = await ai.models.generateVideos({
            model: modelName,
            prompt: safePrompt,
            config: {
              numberOfVideos: 1,
              resolution: resolution === '1080p' ? '1080p' : '720p',
              aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
            },
          });
          if (operation?.name) {
            console.log(`[Serverless Veo SUCCESS] Video generation started on ${modelName}:`, operation.name);
            break;
          }
        } catch (laneErr: any) {
          lastError = laneErr;
          const is429 = laneErr?.status === 429 || laneErr?.message?.includes('429') || laneErr?.message?.includes('RESOURCE_EXHAUSTED');
          console.warn(`[Serverless Veo Lane Warning] ${modelName} returned ${is429 ? '429 Rate Limit' : laneErr?.message?.slice(0, 60)}.`);
          // Backoff jitter delay before attempting alternate lane
          const backoffMs = (attempt + 1) * 2000 + Math.floor(Math.random() * 1500);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    if (!operation?.name) {
      throw lastError || new Error('Video generation failed on all available Veo model lanes.');
    }

    return res.status(200).json({ success: true, operationName: operation.name });
  } catch (error: any) {
    console.error('[Serverless Veo Generate Error]', error);
    let msg = error?.message || (typeof error === 'string' ? error : 'Failed to start video generation.');
    try {
      if (typeof msg === 'string' && msg.startsWith('{')) {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      }
    } catch (_) {}

    const isQuota =
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429 ||
      error?.code === 429;

    if (isQuota) {
      return res.status(429).json({
        success: false,
        isQuotaExceeded: true,
        error: 'Google Veo rate limit or daily quota reached (RESOURCE_EXHAUSTED). Video generation allows 1 request per minute on preview tiers. Please wait about 60 seconds and try again.',
      });
    }

    return res.status(500).json({ success: false, error: msg });
  }
}
