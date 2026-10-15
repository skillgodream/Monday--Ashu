import { getApiHeaders } from '../utils/apiHelper';

export interface AIRequestPayload {
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export async function callAI<T = any>(payload: AIRequestPayload): Promise<T> {
  const response = await fetch('/api/coach', {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.message ||
        errorBody.error ||
        `API call failed with status ${response.status} (${response.statusText})`
    );
  }

  return response.json() as Promise<T>;
}
