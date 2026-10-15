import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

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
  const { operationName } = bodyData || {};
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

    let errObj: string | null = null;
    if (updated.error) {
      errObj = typeof updated.error === 'string' ? updated.error : (updated.error as any).message || JSON.stringify(updated.error);
    }

    return res.status(200).json({
      success: true,
      done: Boolean(updated.done),
      error: errObj,
    });
  } catch (error: any) {
    console.error('[Serverless Veo Status Error]', error);
    const msg = error?.message || (typeof error === 'string' ? error : 'Failed to check video status.');
    return res.status(500).json({ success: false, error: msg });
  }
}
