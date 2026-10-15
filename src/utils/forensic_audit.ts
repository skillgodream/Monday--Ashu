import * as fs from 'fs';
import * as path from 'path';

interface VisualAsset {
  id: string;
  file: string;
  tags: string[];
  category: string;
  source_generated?: boolean;
}

interface VisualLibrary {
  version?: string;
  total_assets?: number;
  assets: VisualAsset[];
}

function auditLibrary(libDir: string, jsonFileName: string) {
  const jsonPath = path.join(libDir, jsonFileName);
  console.log(`\n==================================================`);
  console.log(`AUDITING LIBRARY AT: ${libDir}`);
  console.log(`JSON FILE: ${jsonFileName}`);
  console.log(`==================================================`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: JSON file does not exist at ${jsonPath}`);
    return null;
  }

  let dataStr = '';
  try {
    dataStr = fs.readFileSync(jsonPath, 'utf-8');
  } catch (err: any) {
    console.error(`Error reading file: ${err.message}`);
    return null;
  }

  let lib: VisualLibrary;
  try {
    lib = JSON.parse(dataStr);
    console.log(`Successfully parsed JSON. Total assets declared in JSON: ${lib.assets?.length || 0}`);
  } catch (err: any) {
    console.error(`CRITICAL: JSON Syntax Error in ${jsonFileName}: ${err.message}`);
    // Let's print some lines around the error if possible, or just the error
    return { hasJsonError: true, error: err.message };
  }

  if (!lib.assets || !Array.isArray(lib.assets)) {
    console.error(`CRITICAL: 'assets' array is missing or not an array in JSON!`);
    return { hasJsonError: true, error: "'assets' is not an array" };
  }

  // Find all actual webp files on disk recursively
  const actualFiles: string[] = [];
  const walk = (dir: string) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.webp')) {
        // Get relative path from libDir
        const rel = path.relative(libDir, fullPath);
        actualFiles.push(rel);
      }
    }
  };

  try {
    walk(libDir);
    console.log(`Actual webp files found on disk in library folder: ${actualFiles.length}`);
  } catch (err: any) {
    console.error(`Error walking directory: ${err.message}`);
  }

  const missingFromDisk: any[] = [];
  const unindexedOnDisk: string[] = [];
  const duplicatesInJson: string[] = [];
  const duplicateIds: string[] = [];
  const invalidCategoryAssets: any[] = [];

  const indexedPaths = new Set<string>();
  const indexedIds = new Set<string>();

  // Check assets in JSON
  lib.assets.forEach((asset, idx) => {
    if (!asset.id) {
      console.warn(`Warning: Asset at index ${idx} is missing 'id'`);
    } else {
      if (indexedIds.has(asset.id)) {
        duplicateIds.push(asset.id);
      }
      indexedIds.add(asset.id);
    }

    if (!asset.file) {
      console.warn(`Warning: Asset at index ${idx} is missing 'file'`);
      return;
    }

    // Standardize file paths to forward slashes for checking
    const normalizedFile = asset.file.replace(/\\/g, '/');

    if (indexedPaths.has(normalizedFile)) {
      duplicatesInJson.push(normalizedFile);
    }
    indexedPaths.add(normalizedFile);

    // Verify if file exists on disk
    const diskPath = path.join(libDir, normalizedFile);
    if (!fs.existsSync(diskPath)) {
      missingFromDisk.push({ index: idx, id: asset.id, file: asset.file });
    }

    // Verify category is valid (standard ones are hospitality, people_safety, retail, ecommerce, tools_props)
    const validCategories = ['hospitality', 'people_safety', 'retail', 'ecommerce', 'tools_props', 'generic_actions', 'documents_records', 'escalation_handover', 'decisions_exceptions', 'control_verification', 'safety'];
    if (asset.category && !validCategories.includes(asset.category)) {
      invalidCategoryAssets.push({ id: asset.id, file: asset.file, category: asset.category });
    }
  });

  // Check actual files on disk that are NOT in JSON
  actualFiles.forEach(file => {
    const normalizedFile = file.replace(/\\/g, '/');
    if (!indexedPaths.has(normalizedFile)) {
      unindexedOnDisk.push(normalizedFile);
    }
  });

  console.log(`Discrepancies found:`);
  console.log(`- Assets in JSON but missing on disk: ${missingFromDisk.length}`);
  console.log(`- Files on disk but not in JSON (unindexed): ${unindexedOnDisk.length}`);
  console.log(`- Duplicate files listed in JSON: ${duplicatesInJson.length}`);
  console.log(`- Duplicate IDs listed in JSON: ${duplicateIds.length}`);
  console.log(`- Assets with non-standard categories: ${invalidCategoryAssets.length}`);

  return {
    declaredCount: lib.assets.length,
    actualWebpCount: actualFiles.length,
    missingFromDisk,
    unindexedOnDisk,
    duplicatesInJson,
    duplicateIds,
    invalidCategoryAssets,
    hasJsonError: false
  };
}

// Audit 500 variants
const audit500_main = auditLibrary('./public/Guruji_Real_Photo_Visual_Library_500', 'visualLibrary.json');
const audit500_v1 = auditLibrary('./public/Guruji_Real_Photo_Visual_Library_500', 'visualLibrary-1.json');
const audit500_v01 = auditLibrary('./public/Guruji_Real_Photo_Visual_Library_500', 'visualLibrary01.json');
const audit500_v01_1 = auditLibrary('./public/Guruji_Real_Photo_Visual_Library_500', 'visualLibrary01-1.json');

console.log('\n\n--- AUDIT COMPLETE ---');
