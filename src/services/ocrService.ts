import { createWorker } from 'tesseract.js';

/**
 * Extracts raw textual content from an image data URL, blob, or file.
 * Wrapped in a timeout race to ensure slow connections or worker initialization
 * never freeze the app.
 */
export async function extractTextFromImage(
  imageUrl: string,
  timeoutMs: number = 20000
): Promise<string> {
  const ocrPromise = (async () => {
    try {
      if (typeof window === 'undefined') return '';

      // 1. Initialize Tesseract worker with English model using explicit CDN assets
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5/tesseract-core.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      });

      // 2. Perform text recognition on the uploaded image (base64, blob, or URL)
      const result = await worker.recognize(imageUrl);

      // 3. Terminate worker immediately to free memory/threads
      await worker.terminate();

      return result?.data?.text?.trim() || '';
    } catch (err) {
      console.warn('[OCR Service] Tesseract recognition failed:', err);
      return '';
    }
  })();

  // Safeguard: Fall back after timeoutMs if cloud connection or worker stalls
  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      console.warn(`[OCR Service] OCR timed out after ${timeoutMs}ms`);
      resolve('');
    }, timeoutMs);
  });

  return Promise.race([ocrPromise, timeoutPromise]);
}
