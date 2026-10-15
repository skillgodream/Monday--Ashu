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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    console.error('[API Error] GEMINI_API_KEY is not defined in deployment environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  const { prompt, systemInstruction, fileBase64, mimeType = 'application/pdf', maxOutputTokens = 4000, temperature = 0.3 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
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

    const parts: any[] = [];
    if (fileBase64 && typeof fileBase64 === 'string') {
      const cleanMime = mimeType.includes('image')
        ? mimeType
        : mimeType.includes('text')
        ? 'text/plain'
        : 'application/pdf';
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: fileBase64,
        },
      });
    }
    parts.push({ text: prompt });

    const contentsPayload = parts.length > 1 ? { parts } : prompt;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || 'You are an expert assistant. Respond strictly with valid JSON.',
          responseMimeType: 'application/json',
          maxOutputTokens,
          temperature,
        },
      });
    } catch (primaryErr: any) {
      console.warn('[api/coach] Primary model failed, trying fallback gemini-flash-latest:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || 'You are an expert assistant. Respond strictly with valid JSON.',
          responseMimeType: 'application/json',
          maxOutputTokens,
          temperature,
        },
      });
    }

    const rawText = response.text || '';
    const cleanedText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!cleanedText) {
      return res.status(502).json({ error: 'Empty response received from LLM' });
    }

    const parsedData = JSON.parse(cleanedText);
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('[API Error] LLM generation failed:', error);
    if (error instanceof SyntaxError) {
      return res.status(502).json({
        error: 'JSON_PARSE_ERROR',
        message: 'The model output was malformed or truncated.',
        details: error.message,
      });
    }

    return res.status(500).json({
      error: 'LLM_PROVIDER_ERROR',
      message: error.message || 'Failed to generate response',
    });
  }
}
