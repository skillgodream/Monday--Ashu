import * as fs from 'fs';
import * as path from 'path';

interface VisualAsset {
  id: string;
  file: string;
  tags: string[];
  category: string;
}

const libDir = './public/Guruji_Real_Photo_Visual_Library_500';

function analyzePaths(jsonFile: string) {
  const jsonPath = path.join(libDir, jsonFile);
  if (!fs.existsSync(jsonPath)) return;

  const lib = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const assets: VisualAsset[] = lib.assets || [];

  // Find actual webp files on disk recursively
  const actualFiles: string[] = [];
  const walk = (dir: string) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.webp')) {
        const rel = path.relative(libDir, fullPath).replace(/\\/g, '/');
        actualFiles.push(rel);
      }
    }
  };
  walk(libDir);

  const actualSet = new Set(actualFiles);
  const declaredSet = new Set(assets.map(a => a.file.replace(/\\/g, '/')));

  console.log(`\n=========================================`);
  console.log(`ANALYSIS OF ${jsonFile}`);
  console.log(`=========================================`);

  // 1. Missing from disk examples
  console.log(`\n--- EXAMPLES OF DECLARED FILES MISSING ON DISK (Total: ${assets.filter(a => !actualSet.has(a.file.replace(/\\/g, '/'))).length}) ---`);
  let missingCount = 0;
  for (const asset of assets) {
    const norm = asset.file.replace(/\\/g, '/');
    if (!actualSet.has(norm)) {
      missingCount++;
      if (missingCount <= 10) {
        console.log(`Index ${missingCount}: Declared: "${asset.file}" (Category: ${asset.category})`);
        // Check if the filename itself exists under a different subfolder or with a different prefix
        const filename = path.basename(norm);
        const matchOnDisk = actualFiles.find(f => path.basename(f) === filename);
        if (matchOnDisk) {
          console.log(`   💡 Found file with same name at different path: "${matchOnDisk}"`);
        } else {
          // Check for similar name
          const baseNoExt = filename.replace(/\.[^/.]+$/, '');
          const partialMatch = actualFiles.find(f => f.includes(baseNoExt));
          if (partialMatch) {
            console.log(`   💡 Found similar file on disk: "${partialMatch}"`);
          } else {
            console.log(`   ❌ No similar filename found anywhere on disk.`);
          }
        }
      }
    }
  }

  // 2. Unindexed files examples
  console.log(`\n--- EXAMPLES OF ACTUAL FILES ON DISK UNINDEXED IN JSON (Total: ${actualFiles.filter(f => !declaredSet.has(f)).length}) ---`);
  let unindexedCount = 0;
  for (const file of actualFiles) {
    if (!declaredSet.has(file)) {
      unindexedCount++;
      if (unindexedCount <= 10) {
        console.log(`Index ${unindexedCount}: On Disk: "${file}"`);
      }
    }
  }
}

analyzePaths('visualLibrary01.json');
analyzePaths('visualLibrary.json');
