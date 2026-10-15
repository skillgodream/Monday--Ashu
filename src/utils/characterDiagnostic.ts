/**
 * Character-by-Character PDF Text Diagnostic Logging Utility
 * Analyzes extracted raw text at the individual code-point level to pinpoint invalid characters,
 * control bytes, unreadable binary artifacts, and normalization anomalies.
 */

export interface CharacterAnomaly {
  index: number;
  line: number;
  column: number;
  char: string;
  codePointHex: string;
  category: 'control_character' | 'replacement_character' | 'binary_artifact' | 'non_printable' | 'unclassified';
  description: string;
  contextSnippet: string;
}

export interface CharacterAnalysisReport {
  filename: string;
  totalChars: number;
  wordCount: number;
  averageWordLength: number;
  categories: {
    asciiPrintable: number;
    unicodeLetterNumber: number;
    unicodePunctuationSymbol: number;
    controlCharacters: number;
    replacementCharacters: number;
    unclassified: number;
  };
  ratios: {
    readableRatio: number;
    controlRatio: number;
    replacementRatio: number;
  };
  anomalies: CharacterAnomaly[];
  summaryMessage: string;
}

/**
 * Performs character-by-character code point inspection of extracted document text
 */
export function analyzeDocumentCharacters(rawText: string, filename: string = 'uploaded_document.pdf'): CharacterAnalysisReport {
  let line = 1;
  let column = 1;

  let asciiPrintable = 0;
  let unicodeLetterNumber = 0;
  let unicodePunctuationSymbol = 0;
  let controlCharacters = 0;
  let replacementCharacters = 0;
  let unclassified = 0;

  const anomalies: CharacterAnomaly[] = [];

  const totalChars = rawText.length;

  for (let i = 0; i < totalChars; i++) {
    const char = rawText[i];
    const codePoint = char.codePointAt(0) || 0;
    const hex = `U+${codePoint.toString(16).padStart(4, '0').toUpperCase()}`;

    if (char === '\n') {
      line++;
      column = 1;
      asciiPrintable++;
      continue;
    }

    if (char === '\r' || char === '\t') {
      column++;
      asciiPrintable++;
      continue;
    }

    // 1. Check for Replacement Character U+FFFD
    if (codePoint === 0xFFFD) {
      replacementCharacters++;
      const start = Math.max(0, i - 15);
      const end = Math.min(totalChars, i + 15);
      const snippet = rawText.slice(start, end).replace(/\n/g, '↵');

      if (anomalies.length < 50) {
        anomalies.push({
          index: i,
          line,
          column,
          char: '',
          codePointHex: hex,
          category: 'replacement_character',
          description: 'Unicode Replacement Character (corrupt or unmapped byte sequence)',
          contextSnippet: `...${snippet}...`,
        });
      }
    }
    // 2. Check for Non-printable Binary Control Bytes (\x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F-\x9F)
    else if ((codePoint >= 0x00 && codePoint <= 0x08) || (codePoint >= 0x0B && codePoint <= 0x0C) || (codePoint >= 0x0E && codePoint <= 0x1F) || (codePoint >= 0x7F && codePoint <= 0x9F)) {
      controlCharacters++;
      const start = Math.max(0, i - 15);
      const end = Math.min(totalChars, i + 15);
      const snippet = rawText.slice(start, end).replace(/\n/g, '↵');

      if (anomalies.length < 50) {
        anomalies.push({
          index: i,
          line,
          column,
          char: `[${hex}]`,
          codePointHex: hex,
          category: 'control_character',
          description: 'Non-printable binary control byte artifact',
          contextSnippet: `...${snippet}...`,
        });
      }
    }
    // 3. ASCII Printable (0x20 - 0x7E)
    else if (codePoint >= 0x20 && codePoint <= 0x7E) {
      asciiPrintable++;
    }
    // 4. Unicode Letters & Numbers
    else if (/[\p{L}\p{N}]/u.test(char)) {
      unicodeLetterNumber++;
    }
    // 5. Unicode Punctuation & Symbols (accents, curly quotes, dashes, bullets)
    else if (/[\p{P}\p{S}]/u.test(char)) {
      unicodePunctuationSymbol++;
    }
    else {
      unclassified++;
    }

    column++;
  }

  // Word count & average word length
  const words = rawText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const totalWordChars = words.reduce((acc, w) => acc + w.length, 0);
  const averageWordLength = wordCount > 0 ? parseFloat((totalWordChars / wordCount).toFixed(1)) : 0;

  const readableTotal = asciiPrintable + unicodeLetterNumber + unicodePunctuationSymbol;
  const readableRatio = totalChars > 0 ? parseFloat((readableTotal / totalChars).toFixed(3)) : 0;
  const controlRatio = totalChars > 0 ? parseFloat((controlCharacters / totalChars).toFixed(3)) : 0;
  const replacementRatio = totalChars > 0 ? parseFloat((replacementCharacters / totalChars).toFixed(3)) : 0;

  let summaryMessage = `Analyzed ${totalChars.toLocaleString()} characters in '${filename}'. `;
  if (anomalies.length === 0) {
    summaryMessage += `Clean text stream: 0 control/replacement anomalies found (${readableRatio * 100}% readable).`;
  } else {
    summaryMessage += `Detected ${anomalies.length} anomaly instances (${controlCharacters} control bytes, ${replacementCharacters} replacement chars).`;
  }

  const report: CharacterAnalysisReport = {
    filename,
    totalChars,
    wordCount,
    averageWordLength,
    categories: {
      asciiPrintable,
      unicodeLetterNumber,
      unicodePunctuationSymbol,
      controlCharacters,
      replacementCharacters,
      unclassified,
    },
    ratios: {
      readableRatio,
      controlRatio,
      replacementRatio,
    },
    anomalies,
    summaryMessage,
  };

  // Detailed Console Output
  console.group(`[PDF Character Analysis Diagnostic] File: '${filename}'`);
  console.log(`Summary: ${summaryMessage}`);
  console.log(`Metrics: Total Chars = ${totalChars}, Words = ${wordCount}, Avg Word Length = ${averageWordLength}`);
  console.log(`Character Breakdown:`, {
    ASCII_Printable: asciiPrintable,
    Unicode_Letters_Numbers: unicodeLetterNumber,
    Unicode_Punctuation_Symbols: unicodePunctuationSymbol,
    Control_Bytes: controlCharacters,
    Replacement_Chars: replacementCharacters,
    Unclassified: unclassified,
  });

  if (anomalies.length > 0) {
    console.warn(`Top Character Anomalies (showing first ${Math.min(20, anomalies.length)}):`);
    console.table(
      anomalies.slice(0, 20).map((a) => ({
        Line: a.line,
        Column: a.column,
        Hex: a.codePointHex,
        Char: a.char,
        Category: a.category,
        Context: a.contextSnippet,
      }))
    );
  } else {
    console.log(`✅ Zero character normalization defects found in '${filename}'.`);
  }
  console.groupEnd();

  return report;
}
