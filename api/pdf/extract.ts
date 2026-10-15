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

  const { fileBase64, mimeType = 'application/pdf', filename = 'uploaded_document.pdf' } = req.body;

  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return res.status(400).json({ success: false, error: 'No fileBase64 data provided.' });
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

    const cleanMime = mimeType.includes('image')
      ? mimeType
      : mimeType.includes('text')
      ? 'text/plain'
      : 'application/pdf';

    const docPart = {
      inlineData: {
        mimeType: cleanMime,
        data: fileBase64,
      },
    };

    const prompt = `You are a High-Fidelity Document & OCR Extraction Engine.
Extract the COMPLETE human-readable text from this document ("${filename}") word-for-word.
Preserve paragraph structure, headers, section numbers, bullet points, and original Unicode typography (curly quotes, dashes, accents, symbols).
Do NOT summarize. Return JSON:
{
  "extractedText": "Complete extracted text content here...",
  "pageCount": estimated total pages as integer,
  "wordCount": estimated total words as integer
}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4000,
          temperature: 0.2,
        },
      });
    } catch (primaryErr: any) {
      console.warn('[api/pdf/extract] Primary model failed, trying fallback gemini-flash-latest:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4000,
          temperature: 0.2,
        },
      });
    }

    const outputText = response.text || '';
    const cleanedText = outputText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!cleanedText) {
      return res.status(502).json({ success: false, error: 'Empty response received from LLM' });
    }

    const parsed = JSON.parse(cleanedText);
    const extractedText = parsed.extractedText || '';
    const wordCount = parsed.wordCount || extractedText.split(/\s+/).filter(Boolean).length;
    const pageCount = parsed.pageCount || Math.max(1, Math.ceil(wordCount / 220));

    return res.status(200).json({
      success: true,
      extractedText,
      wordCount,
      pageCount,
    });
  } catch (error: any) {
    console.error('[API Error] PDF extraction failed:', error);
    if (error instanceof SyntaxError) {
      return res.status(502).json({
        success: false,
        error: 'JSON_PARSE_ERROR',
        message: 'The model output was malformed or truncated.',
        details: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'LLM_PROVIDER_ERROR',
      message: error.message || 'Server PDF extraction failed',
    });
  }
}
