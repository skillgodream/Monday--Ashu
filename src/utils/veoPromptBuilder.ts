/**
 * Utility to assemble high-fidelity prompts for Google Veo 3.2 Lite
 * following the AI Video Director 5-part standard:
 * [Visual Style] + [Continuous Subject Movement] + [Enriched Background] + [Studio Lighting] + [Continuous Camera Tracking]
 */

export interface VeoPromptOptions {
  role?: string;
  process?: string;
  taskTitle?: string;
  actionInstruction: string;
  stepIndex?: number;
  criticalControl?: string;
  decisionOrException?: string;
}

interface DomainPreset {
  environment: string;
  lighting: string;
  camera: string;
}

function getDomainPreset(text: string): DomainPreset {
  const lower = text.toLowerCase();

  // 1. Corporate, Compliance, Legal, HR, POSH
  if (
    lower.includes('posh') ||
    lower.includes('compliance') ||
    lower.includes('hr') ||
    lower.includes('investigation') ||
    lower.includes('committee') ||
    lower.includes('legal') ||
    lower.includes('policy') ||
    lower.includes('complaint') ||
    lower.includes('intake')
  ) {
    return {
      environment: 'executive private corporate meeting suite with frosted acoustic glass partitions, polished oak conference table, and organized file trays',
      lighting: 'diffused natural morning daylight mixed with warm commercial recessed spotlights',
      camera: 'slow cinematic right-to-left tracking dolly shot maintaining steady focal depth until the final frame',
    };
  }

  // 2. Healthcare, Medical, Phlebotomy, Diagnostic Lab
  if (
    lower.includes('phlebotom') ||
    lower.includes('blood') ||
    lower.includes('sample') ||
    lower.includes('patient') ||
    lower.includes('lab') ||
    lower.includes('specimen') ||
    lower.includes('clinic') ||
    lower.includes('hospital')
  ) {
    return {
      environment: 'sterile clinical preparation suite with stainless steel countertops, organized specimen racks, and digital centrifuge arrays',
      lighting: 'crisp medical-grade neutral illumination with soft diffused fill',
      camera: 'steady continuous forward camera drift gliding smoothly along the clinical preparation bench',
    };
  }

  // 3. Retail, POS, Cashier, Customer Service
  if (
    lower.includes('retail') ||
    lower.includes('cashier') ||
    lower.includes('store') ||
    lower.includes('checkout') ||
    lower.includes('pos') ||
    lower.includes('customer') ||
    lower.includes('barcode')
  ) {
    return {
      environment: 'modern organized retail point-of-sale checkout counter with barcode scanner cradle and clean product shelving displays',
      lighting: 'bright commercial overhead lighting balanced by warm ambient store glow',
      camera: 'slow cinematic lateral tracking shot moving steadily across the checkout area',
    };
  }

  // 4. Warehouse, Picker, Supply Chain, Logistics
  if (
    lower.includes('pick') ||
    lower.includes('pack') ||
    lower.includes('warehouse') ||
    lower.includes('tote') ||
    lower.includes('inventory') ||
    lower.includes('logistics') ||
    lower.includes('wms')
  ) {
    return {
      environment: 'well-lit fulfillment center staging aisle with high-bay metal racking, yellow safety bollards, and organized staging bins',
      lighting: 'even industrial high-bay LED illumination with clean directional contrast',
      camera: 'smooth continuous forward dolly shot gliding steadily down the aisle',
    };
  }

  // 5. Hospitality, Hotel, Housekeeping, Guest Services
  if (
    lower.includes('hotel') ||
    lower.includes('housekeep') ||
    lower.includes('guest') ||
    lower.includes('room') ||
    lower.includes('linen') ||
    lower.includes('suite')
  ) {
    return {
      environment: 'contemporary premium hospitality suite with tailored wood millwork, linen preparation station, and pristine surfaces',
      lighting: 'warm ambient sunlight filtered through sheer curtains with warm architectural accents',
      camera: 'slow cinematic lateral panning shot drifting smoothly across the room',
    };
  }

  // 6. General Operational & Technical Default
  return {
    environment: 'modern professional operational facility with organized workstations, safety signage, and equipment staging bays',
    lighting: 'clean commercial studio illumination with balanced soft natural daylight',
    camera: 'subtle continuous camera tracking shot gliding steadily forward',
  };
}

/**
 * Transforms an imperative instruction into an active progressive continuous phrase
 */
function toContinuousAction(rawAction: string): string {
  let clean = rawAction.trim().replace(/^Step \d+:\s*/i, '');

  // Strip leading auxiliary verbs
  clean = clean.replace(/^(please|ensure to|make sure to|always|must|should|verify that|check that)\s+/i, '');

  // 1. First replace discrete completion verbs with continuous states (Ban Completion Verbs Rule)
  clean = clean
    .replace(/\b(close[s]?|shut[s]?)\s+the\s+laptop\b/gi, 'keeping the laptop open as operational data flows')
    .replace(/\b(press[es]?|push[es]?|hit[s]?)\s+(?:the\s+)?button\b/gi, 'holding down the control button safely')
    .replace(/\b(sit[s]?\s+down)\b/gi, 'seated stationary while methodically analyzing')
    .replace(/\b(stand[s]?\s+up)\b/gi, 'standing alertly while inspecting')
    .replace(/\b(shut[s]?\s+down|power[s]?\s+off)\b/gi, 'steadily monitoring system status indicators')
    .replace(/\b(finish[es]?|complete[s]?)\b/gi, 'continuously verifying and logging final results');

  // 2. Common imperative verb to continuous progressive verb mapping
  const verbMap: Record<string, string> = {
    receive: 'receiving and cross-checking',
    verify: 'methodically verifying and examining',
    inspect: 'carefully inspecting and reviewing',
    check: 'systematically checking and confirming',
    scan: 'steadily scanning and logging',
    record: 'precisely documenting and recording',
    review: 'continuously reviewing and cross-referencing',
    prepare: 'methodically preparing and staging',
    intake: 'conducting formal intake and documenting',
    route: 'securing and routing',
    pack: 'carefully arranging and packing',
    place: 'steadily positioning and securing',
    handle: 'properly handling and managing',
    examine: 'thoroughly examining and analyzing',
    log: 'systematically logging and recording',
    confirm: 'consistently confirming and validating',
    monitor: 'continuously monitoring and observing',
    calibrate: 'slowly calibrating and adjusting',
  };

  const words = clean.split(/\s+/);
  const firstWord = words[0]?.toLowerCase() || '';

  if (verbMap[firstWord]) {
    words[0] = verbMap[firstWord];
    clean = words.join(' ');
  } else if (!clean.toLowerCase().includes('ing')) {
    clean = `steadily executing ${clean}`;
  }

  return clean;
}

/**
 * Assembles a dense 65-85 word prompt optimized for Google Veo 3.2 Lite
 */
export function buildVeoPrompt(options: VeoPromptOptions): string {
  const { role = 'frontline professional', process = 'operational procedure', actionInstruction, criticalControl, decisionOrException } = options;
  const contextText = `${role} ${process} ${actionInstruction} ${criticalControl || ''} ${decisionOrException || ''}`;
  const preset = getDomainPreset(contextText);
  let continuousAction = toContinuousAction(actionInstruction);

  if (criticalControl && !continuousAction.toLowerCase().includes(criticalControl.toLowerCase().slice(0, 15))) {
    continuousAction += ` while applying critical control (${criticalControl.replace(/\.$/, '')})`;
  } else if (decisionOrException && !continuousAction.toLowerCase().includes(decisionOrException.toLowerCase().slice(0, 15))) {
    continuousAction += ` while executing procedure (${decisionOrException.replace(/\.$/, '')})`;
  }

  // 5-element composition:
  // 1. Visual Style: Photorealistic 720p 16:9 cinematic instructional demonstration.
  // 2. Continuous Subject Action: Frontline {role} {continuous action} with deliberate, continuous hand movements.
  // 3. Enriched Background: Background shows {preset.environment}.
  // 4. Lighting: {preset.lighting}.
  // 5. Continuous Camera Motion: {preset.camera}.
  return `Photorealistic 720p 16:9 cinematic instructional demonstration. A frontline ${role} is ${continuousAction} with steady, continuous hand movements. The setting is a ${preset.environment}. ${preset.lighting}. ${preset.camera}.`;
}
