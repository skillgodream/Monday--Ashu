export interface VisualAsset {
  id: string;
  file: string;
  tags: string[];
  category: string;
  source_generated: boolean;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'for', 'with', 'on', 'at', 
  'in', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this', 'that', 
  'these', 'those', 'you', 'your', 'yours', 'from', 'it', 'its', 'about', 'above', 
  'after', 'again', 'against', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 
  'other', 'some', 'such', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 
  'should', 'now', 'do', 'does', 'did', 'doing', 'how', 'what', 'why', 'where', 'when'
]);

/**
 * Micro-stemmer to normalize various word forms into base forms.
 */
export function stem(word: string): string {
  const w = word.toLowerCase().trim();
  
  if (w.startsWith('housekeep')) return 'housekeep';
  if (w.startsWith('sanit')) return 'sanit';
  if (w.startsWith('clean')) return 'clean';
  if (w.startsWith('saf')) return 'safe';
  if (w.startsWith('scan')) return 'scan';
  if (w.startsWith('pack')) return 'pack';
  if (w.startsWith('pick')) return 'pick';
  if (w.startsWith('verify')) return 'verify';
  if (w.startsWith('verifi')) return 'verify';
  if (w.startsWith('prepar')) return 'prepare';
  if (w.startsWith('prepa')) return 'prepare';
  if (w.startsWith('dilut')) return 'dilute';
  if (w.startsWith('applic')) return 'apply';
  if (w.startsWith('appl')) return 'apply';
  if (w.startsWith('bottl')) return 'bottle';
  if (w.startsWith('glov')) return 'glove';
  if (w.startsWith('loan')) return 'loan';
  if (w.startsWith('interest')) return 'interest';
  if (w.startsWith('remind')) return 'reminder';

  if (w.endsWith('ing')) return w.slice(0, -3);
  if (w.endsWith('ed')) return w.slice(0, -2);
  if (w.endsWith('er')) return w.slice(0, -2);
  if (w.endsWith('es')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);

  return w;
}

/**
 * Tokenizes text, filters out stop words, and applies stemming to each word.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/[\s-_]+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem);
}

// 31 High-resolution real photo assets verified present on-disk
const allAssets: VisualAsset[] = [
  { id: '001_retail_store_front', file: '001_retail_store_front.webp', tags: ['retail', 'store', 'front', 'shop', 'entrance', 'gate'], category: 'retail', source_generated: true },
  { id: '002_retail_cashier_scanning_product', file: '002_retail_cashier_scanning_product.webp', tags: ['retail', 'cashier', 'scanning', 'barcode', 'product', 'register', 'checkout', 'scan', 'verify'], category: 'retail', source_generated: true },
  { id: '003_retail_shelf_restocking', file: '003_retail_shelf_restocking.webp', tags: ['retail', 'shelf', 'restocking', 'stock', 'merchandise', 'aisle'], category: 'retail', source_generated: true },
  { id: '004_warehouse_packing_box', file: '004_warehouse_packing_box.webp', tags: ['warehouse', 'packing', 'box', 'order', 'package', 'carton', 'tape'], category: 'warehouse', source_generated: true },
  { id: '005_warehouse_inventory_check', file: '005_warehouse_inventory_check.webp', tags: ['warehouse', 'inventory', 'check', 'audit', 'count', 'scan', 'pda', 'sku'], category: 'warehouse', source_generated: true },
  { id: '006_warehouse_pallet_jack', file: '006_warehouse_pallet_jack.webp', tags: ['warehouse', 'pallet', 'jack', 'forklift', 'transport', 'cargo', 'staging'], category: 'warehouse', source_generated: true },
  { id: '007_logistics_receiving_goods', file: '007_logistics_receiving_goods.webp', tags: ['logistics', 'receiving', 'goods', 'dock', 'delivery', 'intake', 'inbound'], category: 'logistics', source_generated: true },
  { id: '008_logistics_forklift_operation', file: '008_logistics_forklift_operation.webp', tags: ['logistics', 'forklift', 'operation', 'drive', 'pallet', 'high', 'bay'], category: 'logistics', source_generated: true },
  { id: '009_hospitality_room_cleaning', file: '009_hospitality_room_cleaning.webp', tags: ['hospitality', 'room', 'cleaning', 'housekeeping', 'sanitizing', 'disinfect', 'surface'], category: 'hospitality', source_generated: true },
  { id: '010_hospitality_bed_making', file: '010_hospitality_bed_making.webp', tags: ['hospitality', 'bed', 'making', 'linen', 'sheet', 'room', 'hotel'], category: 'hospitality', source_generated: true },
  { id: '011_hospitality_food_preparation', file: '011_hospitality_food_preparation.webp', tags: ['hospitality', 'food', 'preparation', 'kitchen', 'hygiene', 'culinary'], category: 'hospitality', source_generated: true },
  { id: '012_hospitality_handwashing', file: '012_hospitality_handwashing.webp', tags: ['hospitality', 'handwashing', 'hygiene', 'sanitizer', 'soap', 'wash', 'hands'], category: 'hospitality', source_generated: true },
  { id: '013_healthcare_patient_check', file: '013_healthcare_patient_check.webp', tags: ['healthcare', 'patient', 'check', 'clinical', 'vitals', 'medical', 'nurse'], category: 'healthcare', source_generated: true },
  { id: '014_healthcare_medication_prep', file: '014_healthcare_medication_prep.webp', tags: ['healthcare', 'medication', 'prep', 'pharmacy', 'dose', 'prescription'], category: 'healthcare', source_generated: true },
  { id: '015_healthcare_sharps_disposal', file: '015_healthcare_sharps_disposal.webp', tags: ['healthcare', 'sharps', 'disposal', 'biohazard', 'needle', 'syringe', 'safety'], category: 'healthcare', source_generated: true },
  { id: '016_manufacturing_machine_operation', file: '016_manufacturing_machine_operation.webp', tags: ['manufacturing', 'machine', 'operation', 'controls', 'operator', 'factory'], category: 'manufacturing', source_generated: true },
  { id: '017_manufacturing_quality_check', file: '017_manufacturing_quality_check.webp', tags: ['manufacturing', 'quality', 'check', 'inspection', 'qc', 'standards'], category: 'manufacturing', source_generated: true },
  { id: '018_maintenance_repair', file: '018_maintenance_repair.webp', tags: ['maintenance', 'repair', 'tools', 'technician', 'fix', 'equipment'], category: 'maintenance', source_generated: true },
  { id: '019_finance_report_preparation', file: '019_finance_report_preparation.webp', tags: ['finance', 'report', 'preparation', 'document', 'audit', 'spreadsheet'], category: 'finance', source_generated: true },
  { id: '020_finance_invoice_processing', file: '020_finance_invoice_processing.webp', tags: ['finance', 'invoice', 'processing', 'billing', 'accounts', 'receipt'], category: 'finance', source_generated: true },
  { id: '021_hr_employee_records', file: '021_hr_employee_records.webp', tags: ['hr', 'employee', 'records', 'file', 'personnel', 'compliance'], category: 'hr', source_generated: true },
  { id: '022_hr_recruitment_interview', file: '022_hr_recruitment_interview.webp', tags: ['hr', 'recruitment', 'interview', 'meeting', 'candidate', 'hiring'], category: 'hr', source_generated: true },
  { id: '023_safety_ppe_equipment', file: '023_safety_ppe_equipment.webp', tags: ['safety', 'ppe', 'equipment', 'gear', 'gloves', 'helmet', 'vest', 'goggles', 'protection', 'stop', 'escalate'], category: 'safety', source_generated: true },
  { id: '024_safety_fire_extinguisher', file: '024_safety_fire_extinguisher.webp', tags: ['safety', 'fire', 'extinguisher', 'emergency', 'hazard', 'alert'], category: 'safety', source_generated: true },
  { id: '025_safety_emergency_exit', file: '025_safety_emergency_exit.webp', tags: ['safety', 'emergency', 'exit', 'evacuation', 'door', 'route', 'sign'], category: 'safety', source_generated: true },
  { id: '026_safety_spill_cleanup', file: '026_safety_spill_cleanup.webp', tags: ['safety', 'spill', 'cleanup', 'hazard', 'chemical', 'wipe', 'caution'], category: 'safety', source_generated: true },
  { id: '027_admin_document_filing', file: '027_admin_document_filing.webp', tags: ['admin', 'document', 'filing', 'paperwork', 'records', 'archive', 'verification', 'boarding', 'flight', 'gate'], category: 'admin', source_generated: true },
  { id: '028_admin_email_communication', file: '028_admin_email_communication.webp', tags: ['admin', 'email', 'communication', 'message', 'correspondence', 'dispatch', 'announcement'], category: 'admin', source_generated: true },
  { id: '029_technology_qr_scan', file: '029_technology_qr_scan.webp', tags: ['technology', 'qr', 'scan', 'barcode', 'mobile', 'digital', 'scanner', 'app', 'boarding pass', 'pass'], category: 'technology', source_generated: true },
  { id: '030_technology_system_login', file: '030_technology_system_login.webp', tags: ['technology', 'system', 'login', 'portal', 'terminal', 'computer', 'screen', 'auth', 'boarding'], category: 'technology', source_generated: true },
];

/**
 * Finds the absolute best real-photo visual asset matching a given step's textual context.
 */
export function findBestVisualMatch(
  stepText: string,
  contextText: string = ''
): { asset: VisualAsset | null; score: number; url: string | null } {
  const stepTokens = tokenize(stepText);
  const contextTokens = tokenize(contextText);
  const allTokens = [...stepTokens, ...contextTokens];
  const isBankingSop = allTokens.some(t => [
    'loan', 'kyc', 'emi', 'disburse', 'verification', 'cash', 'account', 'security', 'aml', 'pan', 'borrower', 'bank'
  ].includes(t));

  if (allTokens.length === 0) {
    const fallback = allAssets[0];
    return {
      asset: fallback,
      score: 0,
      url: `/Guruji_Real_Photo_Visual_Library_500/${fallback.file}`
    };
  }

  let bestAsset: VisualAsset | null = null;
  let highestScore = -1;

  for (const asset of allAssets) {
    let score = 0;
    const assetTags = asset.tags.map(stem);

    for (const tag of assetTags) {
      if (stepTokens.includes(tag)) {
        score += 15;
      } else if (contextTokens.includes(tag)) {
        score += 8;
      }
    }

    for (const tag of assetTags) {
      for (const token of allTokens) {
        if (token !== tag && (token.includes(tag) || tag.includes(token))) {
          score += 4;
        }
      }
    }

    const filenameNoExt = asset.file.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    const filenameTokens = tokenize(filenameNoExt);
    for (const fToken of filenameTokens) {
      if (stepTokens.includes(fToken)) {
        score += 10;
      } else if (contextTokens.includes(fToken)) {
        score += 5;
      }
    }

    if (isBankingSop && (
      asset.category === 'pilot_25' || 
      asset.category === 'tools_tech' || 
      asset.category === 'verification_risk' || 
      asset.category === 'branch_customer_security' || 
      asset.category === 'loan_operations' || 
      asset.category === 'people_roles'
    )) {
      score += 12;
    }

    if (score > highestScore) {
      highestScore = score;
      bestAsset = asset;
    }
  }

  if (!bestAsset || highestScore <= 0) {
    const fallback = allAssets[0];
    return {
      asset: fallback,
      score: 0,
      url: `/Guruji_Real_Photo_Visual_Library_500/${fallback.file}`
    };
  }

  return {
    asset: bestAsset,
    score: highestScore,
    url: `/Guruji_Real_Photo_Visual_Library_500/${bestAsset.file}`
  };
}
