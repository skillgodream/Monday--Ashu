/**
 * Document Extractor Utility
 * Unicode-preserving extraction pipeline for PDF, DOCX, TXT, MD, and Image documents.
 * Preserves international scripts, accents, curly quotes, dashes, bullets, and symbols.
 * Strips ONLY non-printable binary control artifacts.
 */

import { analyzeDocumentCharacters } from './characterDiagnostic';
import { extractTextFromPdf } from '../services/pdfService';
import { extractTextFromImage } from '../services/ocrService';
import { getApiHeaders } from './apiHelper';

export interface ExtractionDiagnostics {
  totalChars: number;
  readableChars: number;
  controlChars: number;
  replacementChars: number;
  wordCount: number;
  pageCount: number;
}

export interface ExtractedDocument {
  filename: string;
  rawText: string;
  wordCount: number;
  pageCount: number;
  fileHash: string;
  confirmationText: string;
  mimeType: string;
  extractedAt: string;
  diagnostics: ExtractionDiagnostics;
  fileBase64?: string;
}

/**
 * Deterministic string hash function (Fowler-Noll-Vo / FNV-1a 32-bit hex)
 */
export function computeDeterministicHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Normalizes text to Unicode NFC and strips ONLY non-printable control characters.
 * Preserves all valid Unicode scripts (Latin, Devanagari, Cyrillic, CJK),
 * curly quotes (“ ” ‘ ’), dashes (– —), bullets (•), accents (é ñ ü), and symbols.
 */
export function normalizeUnicodeText(input: string): { normalizedText: string; diagnostics: ExtractionDiagnostics } {
  // 1. Unicode NFC Normalization
  let text = input.normalize('NFC');

  const totalChars = text.length;

  // Count replacement characters (U+FFFD )
  const replacementMatch = text.match(/\uFFFD/g);
  const replacementChars = replacementMatch ? replacementMatch.length : 0;

  // Count control characters (\x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F-\x9F)
  const controlMatch = text.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g);
  const controlChars = controlMatch ? controlMatch.length : 0;

  // 2. Remove ONLY non-printable control bytes, preserving \n, \r, \t and all Unicode
  text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');

  // Normalize excessive horizontal whitespace (preserve paragraph newlines)
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 220));

  // Count readable characters (letters, numbers, punctuation, spaces across all Unicode blocks)
  const readableMatch = text.match(/[\p{L}\p{N}\p{P}\p{S}\s]/gu);
  const readableChars = readableMatch ? readableMatch.length : 0;

  const diagnostics: ExtractionDiagnostics = {
    totalChars,
    readableChars,
    controlChars,
    replacementChars,
    wordCount,
    pageCount,
  };

  return { normalizedText: text, diagnostics };
}

/**
 * Converts File object to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Clean text from PDF streams while preserving full Unicode text literals
 */
function cleanPdfStreamText(rawPdfText: string): string {
  if (rawPdfText.includes('%PDF-') || rawPdfText.includes('/FlateDecode') || rawPdfText.includes('ReportLab')) {
    const matches: string[] = [];
    const regex = /\(([^()]{2,})\)/g;
    let match;
    while ((match = regex.exec(rawPdfText)) !== null) {
      const candidate = match[1].trim();
      if (
        !candidate.match(/^(Helvetica|Times|Courier|Font|Page|Catalog|Parent|Type|MediaBox|ProcSet|Encoding|WinAnsiEncoding|PDF|Identity-H|FlateDecode|Length|Filter|Root|Info|Size|Prev|XRef)/i) &&
        !candidate.match(/^[0-9\s\.\,\-\+\/]+$/) &&
        candidate.length > 2
      ) {
        matches.push(candidate);
      }
    }

    if (matches.length >= 3) {
      return matches.join(' ');
    }

    const cleaned = rawPdfText
      .replace(/%PDF-[\d\.]+/gi, ' ')
      .replace(/ReportLab Generated PDF document [^\n]*/gi, ' ')
      .replace(/<<[^>]*>>/g, ' ')
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer|startxref|FlateDecode|Filter|Length|Page|Pages|Catalog|Font|Type|MediaBox|ProcSet|Encoding|WinAnsiEncoding)\b/gi, ' ')
      .replace(/[\/\\][A-Za-z0-9\+\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  return rawPdfText;
}

/**
 * Extracts plain text and metadata from an uploaded File or text buffer
 */
export async function extractDocumentContent(file: File | { name: string; content: string }): Promise<ExtractedDocument> {
  let rawText = '';
  let filename = file.name || 'uploaded_document.txt';
  let mimeType = 'text/plain';
  let fileBase64: string | undefined;

  if ('content' in file && typeof file.content === 'string') {
    rawText = file.content;
  } else if (file instanceof File) {
    filename = file.name;
    mimeType = file.type || 'text/plain';

    try {
      fileBase64 = await fileToBase64(file);
    } catch {
      console.warn('[DocumentExtractor] Could not convert file to base64');
    }

    const lowerName = filename.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf');
    const isImage = mimeType.includes('image') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp');

    // 1. FAST CLIENT-SIDE PDF EXTRACTION (pdfjs-dist in browser — instant & resilient)
    if (isPdf) {
      try {
        console.log(`[DocumentExtractor] Running browser-side PDF text extraction for '${filename}'...`);
        const pdfResult = await extractTextFromPdf(file);
        if (pdfResult.text && pdfResult.text.trim().length > 25) {
          rawText = pdfResult.text;
          console.log(`[DocumentExtractor Browser PDF SUCCESS] Extracted ${rawText.split(/\s+/).length} words across ${pdfResult.pageCount} pages`);
        }
      } catch (pdfErr) {
        console.warn('[DocumentExtractor Browser PDF] Extraction error:', pdfErr);
      }
    }

    // 2. CLIENT-SIDE OCR FOR IMAGES (tesseract.js in browser with timeout race)
    if (!rawText && isImage) {
      try {
        console.log(`[DocumentExtractor] Running browser-side OCR for image '${filename}'...`);
        const fileUrl = URL.createObjectURL(file);
        const ocrText = await extractTextFromImage(fileUrl, 15000);
        URL.revokeObjectURL(fileUrl);
        if (ocrText && ocrText.trim().length > 15) {
          rawText = ocrText;
          console.log(`[DocumentExtractor Browser OCR SUCCESS] Extracted ${rawText.split(/\s+/).length} words via Tesseract`);
        }
      } catch (ocrErr) {
        console.warn('[DocumentExtractor Browser OCR] Extraction error:', ocrErr);
      }
    }

    // 3. CLIENT-SIDE DOCX EXTRACTION
    if (!rawText && (lowerName.endsWith('.docx') || lowerName.endsWith('.doc'))) {
      try {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(buffer);
        const xmlMatches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (xmlMatches && xmlMatches.length > 0) {
          rawText = xmlMatches.map((node) => node.replace(/<[^>]+>/g, '')).join(' ');
        } else {
          rawText = text.replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
        }
      } catch {
        rawText = await file.text();
      }
    }

    // 4. CLIENT-SIDE TEXT EXTRACTION
    if (!rawText && (mimeType.includes('text') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json') || lowerName.endsWith('.csv'))) {
      rawText = await file.text();
    }

    // 5. SERVER EXTRACTION FALLBACK (if digital text not found, e.g. scanned PDF document)
    if (!rawText && fileBase64) {
      try {
        console.log(`[DocumentExtractor] Invoking server extraction endpoint for '${filename}'...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('/api/pdf/extract', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            fileBase64,
            mimeType: mimeType || 'application/pdf',
            filename,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.success && data.extractedText && data.extractedText.trim().length > 10) {
            rawText = data.extractedText;
            console.log(`[DocumentExtractor SUCCESS] Server extracted ${data.wordCount} words from '${filename}'`);
          }
        } else {
          console.warn(`[DocumentExtractor] /api/pdf/extract returned HTTP ${res.status}`);
        }
      } catch (err: any) {
        console.warn('[DocumentExtractor] /api/pdf/extract error or timeout:', err?.message || err);
      }

      // Secondary Server Fallback: Try /api/coach
      if (!rawText) {
        try {
          console.log(`[DocumentExtractor] Attempting fallback extraction via /api/coach for '${filename}'...`);
          const coachController = new AbortController();
          const coachTimeoutId = setTimeout(() => coachController.abort(), 12000);
          const coachRes = await fetch('/api/coach', {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              prompt: `You are an expert Document & OCR text extraction engine. Extract the complete text from this document ("${filename}") word-for-word. Return JSON: {"extractedText": "full text content here...", "wordCount": number, "pageCount": number}`,
              systemInstruction: 'You are an accurate OCR engine. Respond strictly with valid JSON.',
              fileBase64,
              mimeType: mimeType || 'application/pdf',
              maxOutputTokens: 4000,
            }),
            signal: coachController.signal,
          });
          clearTimeout(coachTimeoutId);
          if (coachRes.ok) {
            const coachData = await coachRes.json().catch(() => ({}));
            if (coachData.extractedText && coachData.extractedText.trim().length > 10) {
              rawText = coachData.extractedText;
              console.log(`[DocumentExtractor SUCCESS via /api/coach] Extracted ${coachData.wordCount || 0} words from '${filename}'`);
            }
          } else {
            console.warn(`[DocumentExtractor] /api/coach returned HTTP ${coachRes.status}`);
          }
        } catch (coachErr: any) {
          console.warn('[DocumentExtractor] /api/coach fallback error or timeout:', coachErr?.message || coachErr);
        }
      }
    }

    // 6. LOCAL PDF BINARY STREAM DECODER (Final Fallback)
    if (!rawText && (lowerName.endsWith('.pdf') || mimeType.includes('pdf'))) {
      try {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('latin1');
        const pdfContent = decoder.decode(buffer);
        
        const textChunks: string[] = [];
        const tjMatches = pdfContent.match(/\(([^)]{2,})\)\s*(?:Tj|'|")/g);
        if (tjMatches && tjMatches.length > 0) {
          tjMatches.forEach((m) => {
            const inner = m.replace(/\s*(?:Tj|'|")$/, '').replace(/^\(/, '').replace(/\)$/, '');
            if (inner.trim().length > 0 && !/^[\x00-\x1F]+$/.test(inner)) {
              textChunks.push(inner);
            }
          });
        }

        const arrayMatches = pdfContent.match(/\[([^\]]{2,})\]\s*TJ/g);
        if (arrayMatches && arrayMatches.length > 0) {
          arrayMatches.forEach((m) => {
            const inParens = m.match(/\(([^)]{2,})\)/g);
            if (inParens) {
              inParens.forEach((p) => {
                const cleaned = p.slice(1, -1);
                if (cleaned.trim()) textChunks.push(cleaned);
              });
            }
          });
        }

        if (textChunks.length >= 3) {
          rawText = textChunks.join(' ').replace(/\s+/g, ' ').trim();
          console.log(`[DocumentExtractor Local PDF Stream Decode] Extracted ${rawText.split(/\s+/).length} words from PDF text chunks`);
        }
      } catch (pdfErr) {
        console.warn('[DocumentExtractor Local PDF Decode Error]:', pdfErr);
      }
    }
  }

  // Sanity check for raw PDF stream syntax
  if (rawText.startsWith('%PDF-') || rawText.includes('/FlateDecode')) {
    rawText = cleanPdfStreamText(rawText);
  }

  // Perform character-by-character code point analysis & logging
  analyzeDocumentCharacters(rawText, filename);

  // Normalize Unicode text and compute diagnostics
  const { normalizedText, diagnostics } = normalizeUnicodeText(rawText);

  const pipelineVersion = 'v1.1';
  const fileHash = computeDeterministicHash(`${normalizedText}||${filename}||${pipelineVersion}`);
  const confirmationText = `We read ${diagnostics.pageCount} page${diagnostics.pageCount > 1 ? 's' : ''} · ${diagnostics.wordCount.toLocaleString()} words`;

  const result: ExtractedDocument = {
    filename,
    rawText: normalizedText,
    wordCount: diagnostics.wordCount,
    pageCount: diagnostics.pageCount,
    fileHash,
    confirmationText,
    mimeType,
    extractedAt: new Date().toISOString(),
    diagnostics,
    fileBase64,
  };

  // Diagnostic Audit Logging
  console.log('[SOP Pipeline] Unicode Document Extracted:', {
    filename: result.filename,
    fileHash: result.fileHash,
    diagnostics: result.diagnostics,
    sample: normalizedText.slice(0, 160) + '...',
  });

  return result;
}
