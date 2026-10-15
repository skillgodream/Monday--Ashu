/**
 * Helper to construct request headers including the user's Gemini API key from localStorage if available.
 */
export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  try {
    const key = (
      localStorage.getItem('gemini_api_key') ||
      localStorage.getItem('GOOGLE_API_KEY') ||
      localStorage.getItem('API_KEY') ||
      ''
    ).trim();

    if (key) {
      headers['x-gemini-api-key'] = key.replace(/^["']|["']$/g, '');
    }
  } catch {
    // ignore localStorage errors in non-browser envs
  }

  return headers;
}
