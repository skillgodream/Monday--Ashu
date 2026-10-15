import * as fs from 'fs';
import * as path from 'path';

interface VisualAsset {
  id: string;
  file: string;
  tags: string[];
  category: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  source_generated?: boolean;
}

const LIB_DIR = './public/Guruji_Real_Photo_Visual_Library_500';
const JSON_01_PATH = path.join(LIB_DIR, 'visualLibrary01.json');
const MASTER_JSON_PATH = path.join(LIB_DIR, 'visualLibrary.json');

function cleanFilenameBase(filename: string): string {
  let base = filename.replace(/\.webp$/i, '');
  if (base.endsWith('-1')) {
    base = base.slice(0, -2);
  }
  return base.toLowerCase().trim();
}

function getFilenameTokens(base: string): string[] {
  const clean = base.replace(/^\d+_+/, '');
  return clean
    .split(/[\s-_]+/)
    .filter(t => t.length > 1 && !/^\d+$/.test(t));
}

function generatePerfectLibrary() {
  console.log('--- STARTING HEALING AND SYNCHRONIZATION FOR GURUJI_REAL_PHOTO_VISUAL_LIBRARY_500 ---');

  // 1. Read existing visualLibrary01.json for reference tags
  let originalAssets: VisualAsset[] = [];
  if (fs.existsSync(JSON_01_PATH)) {
    try {
      const origData = JSON.parse(fs.readFileSync(JSON_01_PATH, 'utf-8'));
      originalAssets = origData.assets || [];
      console.log(`Loaded ${originalAssets.length} reference assets from visualLibrary01.json`);
    } catch (err: any) {
      console.error(`Error loading visualLibrary01.json: ${err.message}`);
    }
  }

  // Create lookup maps
  const originalLookup = new Map<string, VisualAsset>();
  originalAssets.forEach(asset => {
    const filename = path.basename(asset.file);
    const cleanKey = cleanFilenameBase(filename);
    originalLookup.set(cleanKey, asset);
    
    const normalizedKey = cleanKey.replace(/_/g, '');
    originalLookup.set(normalizedKey, asset);
  });

  // 2. Scan all files on disk recursively
  const webpFiles: string[] = [];
  const walk = (dir: string) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.webp')) {
        const relPath = path.relative(LIB_DIR, fullPath).replace(/\\/g, '/');
        webpFiles.push(relPath);
      }
    }
  };
  walk(LIB_DIR);
  console.log(`Found ${webpFiles.length} actual .webp files on disk inside the 500 library directory.`);

  // 3. Rebuild and match assets
  const finalAssets: VisualAsset[] = [];
  const usedIds = new Set<string>();

  webpFiles.forEach(fileRelPath => {
    const filename = path.basename(fileRelPath);
    const folder = path.dirname(fileRelPath);
    const cleanKey = cleanFilenameBase(filename);
    const normalizedKey = cleanKey.replace(/_/g, '');

    // Check if we have a matching entry in visualLibrary01.json
    const refAsset = originalLookup.get(cleanKey) || originalLookup.get(normalizedKey);

    let baseId = cleanKey;
    let tags: string[] = [];
    let category = folder;

    if (refAsset) {
      baseId = refAsset.id;
      tags = [...refAsset.tags];
      if (refAsset.category) {
        category = refAsset.category;
      }
    } else {
      tags = getFilenameTokens(cleanKey);
    }

    if (category === '.' || category === '') {
      category = 'generic_actions';
    }

    // Ensure the ID is absolutely unique by appending folder or suffix if already taken
    let finalId = baseId;
    if (usedIds.has(finalId)) {
      // Try with folder prefix
      finalId = `${category}_${baseId}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }
    let suffixCounter = 1;
    while (usedIds.has(finalId)) {
      finalId = `${baseId}_${suffixCounter}`;
      suffixCounter++;
    }
    usedIds.add(finalId);

    let sizeBytes = 0;
    try {
      const stats = fs.statSync(path.join(LIB_DIR, fileRelPath));
      sizeBytes = stats.size;
    } catch (e) {}

    const uniqueTags = Array.from(new Set(tags.map(t => t.toLowerCase().trim()))).filter(t => t.length > 1);

    // Ensure standard categories are matched as best as possible
    // (hospitality, people_safety, retail, ecommerce, tools_props, decisions_exceptions, control_verification, escalation_handover, documents_records, generic_actions, safety)
    let standardCategory = category;
    if (category.includes('hospitality')) standardCategory = 'hospitality';
    else if (category.includes('safety')) standardCategory = 'people_safety';
    else if (category.includes('retail')) standardCategory = 'retail';
    else if (category.includes('ecommerce') || category.includes('warehouse')) standardCategory = 'ecommerce';
    else if (category.includes('tools_props') || category.includes('device')) standardCategory = 'tools_props';

    finalAssets.push({
      id: finalId,
      file: fileRelPath,
      tags: uniqueTags,
      category: standardCategory,
      width: refAsset?.width || 320,
      height: refAsset?.height || 240,
      size_bytes: sizeBytes || refAsset?.size_bytes || 5000,
      source_generated: true
    });
  });

  // 4. Sort assets by ID for clean output
  finalAssets.sort((a, b) => a.id.localeCompare(b.id));

  // 5. Build output library structure
  const categoriesCount: Record<string, number> = {};
  finalAssets.forEach(a => {
    categoriesCount[a.category] = (categoriesCount[a.category] || 0) + 1;
  });

  const outputLibrary = {
    library: {
      name: "Guruji Real Photo Visual Library 500 (Master Synced)",
      version: "3.0",
      asset_count: finalAssets.length,
      format: "WebP",
      dimensions: "Various",
      quality: 80,
      categories: categoriesCount
    },
    assets: finalAssets
  };

  // 6. Write perfect visualLibrary.json
  fs.writeFileSync(MASTER_JSON_PATH, JSON.stringify(outputLibrary, null, 2), 'utf-8');
  console.log(`Successfully generated synced metadata at: ${MASTER_JSON_PATH}`);
  console.log(`Total indexed assets: ${finalAssets.length}`);
  console.log('Category Distribution:', categoriesCount);

  // 7. Validate that everything is perfect
  let errorCount = 0;
  finalAssets.forEach(a => {
    const full = path.join(LIB_DIR, a.file);
    if (!fs.existsSync(full)) {
      console.error(`Validation Error: File listed does not exist: ${full}`);
      errorCount++;
    }
  });

  if (errorCount === 0) {
    console.log('Validation SUCCESS: 100% of generated assets are confirmed present on disk.');
  } else {
    console.error(`Validation FAILED: ${errorCount} assets are missing.`);
  }
}

generatePerfectLibrary();
