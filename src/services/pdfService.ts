import * as pdfjsLib from 'pdfjs-dist';

// Configure worker safely for browser environments
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('[PDF Service] Could not set GlobalWorkerOptions.workerSrc:', e);
}

/**
 * Extracts digital text from a PDF file directly in the browser with page awareness.
 * Uses a timeout race so that it never hangs.
 */
export async function extractTextFromPdf(
  fileOrBuffer: File | ArrayBuffer,
  timeoutMs: number = 15000
): Promise<{ text: string; pageCount: number }> {
  const extractPromise = (async () => {
    try {
      const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true,
      });

      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageLines: string[] = [];
        let lastY: number | null = null;
        let currentLine = '';

        for (const item of textContent.items) {
          if ('str' in item && typeof item.str === 'string') {
            const hasY = 'transform' in item && Array.isArray((item as any).transform);
            const currentY = hasY ? (item as any).transform[5] : null;

            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
              if (currentLine.trim()) pageLines.push(currentLine.trim());
              currentLine = item.str;
            } else {
              currentLine += (currentLine ? ' ' : '') + item.str;
            }
            if (currentY !== null) lastY = currentY;
          }
        }
        if (currentLine.trim()) pageLines.push(currentLine.trim());

        const pageText = pageLines.join('\n');
        if (pageText.trim()) {
          fullText += `${pageText}\n\n`;
        }
      }

      return { text: fullText.trim(), pageCount };
    } catch (err) {
      console.warn('[PDF Service] PDF text extraction failed, attempting direct buffer decode:', err);
      try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const decoder = new TextDecoder('latin1');
        const pdfContent = decoder.decode(buffer);
        const textChunks: string[] = [];
        const tjMatches = pdfContent.match(/\(([^)]{2,})\)\s*(?:Tj|'|")/g);
        if (tjMatches) {
          tjMatches.forEach((m) => {
            const inner = m.replace(/\s*(?:Tj|'|")$/, '').replace(/^\(/, '').replace(/\)$/, '').trim();
            if (inner.length > 0 && !/^[\x00-\x1F]+$/.test(inner)) textChunks.push(inner);
          });
        }
        if (textChunks.length >= 3) {
          return { text: textChunks.join(' ').replace(/\s+/g, ' ').trim(), pageCount: 1 };
        }
      } catch (fallbackErr) {
        console.warn('[PDF Service] Direct buffer decode fallback failed:', fallbackErr);
      }
      return { text: '', pageCount: 0 };
    }
  })();

  let timerId: any;
  const timeoutPromise = new Promise<{ text: string; pageCount: number }>((resolve) => {
    timerId = setTimeout(() => {
      console.warn(`[PDF Service] PDF extraction timed out after ${timeoutMs}ms`);
      resolve({ text: '', pageCount: 0 });
    }, timeoutMs);
  });

  const res = await Promise.race([extractPromise, timeoutPromise]);
  clearTimeout(timerId);
  return res;
}
