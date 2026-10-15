import fs from 'fs';
import path from 'path';

const PAGES_DIR = './src/experiment/pages';
const EXCLUDE_FILES = [];

const BANNED_PATTERNS = [
  { name: 'uppercase', regex: /\buppercase\b/ },
  { name: 'tracking-', regex: /\btracking-[a-z]+\b/ },
  { name: 'hex-color', regex: /#[0-9A-Fa-f]{3,8}\b/ },
  { name: 'tailwind-font-size', regex: /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b/ },
  { name: 'banned-label-required-actions', regex: /required\s+actions/i },
  { name: 'banned-label-operational-situation', regex: /operational\s+situation/i },
  { name: 'banned-label-compliant-protocol', regex: /compliant\s+protocol/i },
  { name: 'banned-label-prohibited-failure-modes', regex: /prohibited\s+failure\s+modes/i },
  { name: 'banned-label-sop-exception-trigger', regex: /sop\s+exception\s+trigger/i },
];

let hasErrors = false;

if (fs.existsSync(PAGES_DIR)) {
  const files = fs.readdirSync(PAGES_DIR);
  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    if (EXCLUDE_FILES.includes(file)) continue;

    const filePath = path.join(PAGES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comment lines
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

      BANNED_PATTERNS.forEach((pattern) => {
        if (pattern.regex.test(line)) {
          // If hex-color is present, check if it's an allowed exclusion (e.g. none currently allowed in pages)
          console.error(`❌ [Design Lint Violation] ${filePath}:${index + 1} contains banned pattern "${pattern.name}": "${line.trim()}"`);
          hasErrors = true;
        }
      });
    });
  }
} else {
  console.warn(`Directory not found: ${PAGES_DIR}`);
}

if (hasErrors) {
  console.error('\n❌ Design validation failed! Please fix the errors listed above.');
  process.exit(1);
} else {
  console.log('✅ Design validation PASSED! All pages comply with the design system restrictions.');
  process.exit(0);
}
