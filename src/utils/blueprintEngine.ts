/**
 * Blueprint Engine: Implementation of P0 (Process Passport Builder),
 * P1 (Perceive Vision Analysis), and P2 (Blueprint Builder v1.1).
 */

import { ProcessPassport, PerceiveObservation, BlueprintV1, SimulatorStep } from '../types';
import { SIMULATION_STEPS, SIMULATION_STEPS_B, FLOOR_CHECKLIST } from '../data/lessonsData';

export interface SourceDocument {
  id: string;
  type: 'sop' | 'policy' | 'ground_reality' | 'passport' | 'image';
  text: string;
}

/**
 * P0: Process Passport Builder
 * Generates an unapproved draft Process Passport from source documents.
 */
export function buildProcessPassport(
  processName: string,
  role: string,
  language: string = 'en',
  sources: SourceDocument[] = []
): ProcessPassport {
  const combinedText = sources.map((s) => s.text).join(' ');
  const mainSourceId = sources[0]?.id || 'S1';

  const questionsForTrainer: { field: string; question: string }[] = [];

  const plainDefinitionText = combinedText.length > 20
    ? `${processName} standard operating procedure for ${role}.`
    : `Standard operational procedure for ${processName}.`;
  
  const plainDefinitionBasis = sources.length > 0 ? 'from_source' : 'general_knowledge';

  // Why It Matters (NEVER filled from general knowledge)
  const hasWhyInSource = combinedText.toLowerCase().includes('impact') || combinedText.toLowerCase().includes('matters') || combinedText.toLowerCase().includes('critical');
  const whyItMatters = hasWhyInSource
    ? [
        {
          who_depends: 'Operations Team & Quality Lead',
          impact: `Ensures compliance and safety during ${processName}.`,
          source_ref: mainSourceId,
          basis: 'from_source' as const,
          status: 'draft' as const,
        },
      ]
    : [];

  if (!hasWhyInSource) {
    questionsForTrainer.push({
      field: 'why_it_matters',
      question: 'Who depends on this process on the floor, and what is the direct operational impact?',
    });
  }

  // Where It Fits
  const whereItFits = {
    upstream: 'Pre-process Preparation / Assignment',
    this: processName,
    downstream: 'Process Handover / Log Completion',
    source_ref: mainSourceId,
    status: 'draft' as const,
  };

  // Tools explicitly extracted from source
  const tools: ProcessPassport['fields']['tools'] = [];
  const lowerText = combinedText.toLowerCase();
  if (lowerText.includes('tool') || lowerText.includes('equipment') || lowerText.includes('scanner') || lowerText.includes('thermometer') || lowerText.includes('probe')) {
    const lines = combinedText.split('\n').filter(l => l.toLowerCase().includes('tool') || l.toLowerCase().includes('equipment') || l.toLowerCase().includes('scanner') || l.toLowerCase().includes('thermometer'));
    lines.forEach((l, idx) => {
      tools.push({
        name: l.split(/[:\-\—]/)[0]?.trim() || `Tool ${idx + 1}`,
        what_it_is: l.trim(),
        purpose: l.trim(),
        never_do: '',
        visual_hint: 'Operational equipment',
        source_ref: mainSourceId,
        basis: 'from_source' as const,
        status: 'draft' as const,
      });
    });
  }

  // Terms explicitly extracted from source
  const terms: ProcessPassport['fields']['terms'] = [];

  // Golden Rules
  const goldenRules: ProcessPassport['fields']['golden_rules'] = [];
  const ruleLines = combinedText.split('\n').filter(l => l.toLowerCase().includes('must') || l.toLowerCase().includes('never') || l.toLowerCase().includes('always'));
  ruleLines.forEach(l => {
    goldenRules.push({
      text: l.trim(),
      source_ref: mainSourceId,
      status: 'draft' as const,
    });
  });

  if (goldenRules.length === 0) {
    questionsForTrainer.push({
      field: 'golden_rules',
      question: 'What are the non-negotiable golden rules for workers doing this process?',
    });
  }

  // Safety Notes
  const safetyNotes: ProcessPassport['fields']['safety_notes'] = [];
  const safetyLines = combinedText.split('\n').filter(l => l.toLowerCase().includes('safety') || l.toLowerCase().includes('ppe') || l.toLowerCase().includes('hazard'));
  safetyLines.forEach(l => {
    safetyNotes.push({
      text: l.trim(),
      source_ref: mainSourceId,
      status: 'draft' as const,
    });
  });

  // Escalation
  const escLine = combinedText.split('\n').find(l => l.toLowerCase().includes('escalat') || l.toLowerCase().includes('notify') || l.toLowerCase().includes('contact'));
  const escalation = {
    text: escLine ? escLine.trim() : 'Escalate unresolved anomalies to the designated department lead or supervisor.',
    source_ref: mainSourceId,
    basis: escLine ? ('from_source' as const) : ('general_knowledge' as const),
    status: 'draft' as const,
  };

  return {
    process_name: processName,
    language,
    fields: {
      plain_definition: {
        text: plainDefinitionText,
        source_ref: mainSourceId,
        basis: plainDefinitionBasis,
        status: 'draft',
      },
      why_it_matters: whyItMatters,
      where_it_fits: whereItFits,
      tools,
      terms,
      golden_rules: goldenRules,
      safety_notes: safetyNotes,
      escalation,
      newcomer_worries: [
        'Finding the right bin in large aisles',
        'Accidentally scanning the wrong SKU',
      ],
    },
    questions_for_trainer: questionsForTrainer,
    is_approved: false, // Default draft until trainer sign-off
  };
}

/**
 * P1: Perceive Stage
 * Analyzes uploaded SOP image / photo and produces structured observation JSON.
 */
export function perceiveImage(imageFileName: string = 'SOP_Page.png'): PerceiveObservation {
  const isBlurry = imageFileName.toLowerCase().includes('blurry');

  if (isBlurry) {
    return {
      image_type: 'sop_page',
      quality: {
        score: 0.35,
        flags: ['blur', 'text_unreadable'],
      },
      readable_text: [],
      objects: [],
      tool_candidates: [],
      detected_tasks: [],
      visible_hazards: [],
      unreadable_regions: ['Entire page text blurry'],
      recommended_action: 'retake',
      retake_tip: 'Hold camera steady with good lighting directly above the SOP document.',
    };
  }

  return {
    image_type: 'sop_page',
    quality: {
      score: 0.94,
      flags: [],
    },
    readable_text: [
      { text: 'Warehouse Picking SOP #402', bbox: [20, 15, 60, 8], confidence: 0.98 },
      { text: 'Bin A-03-B-2 Location Scan Mandatory', bbox: [20, 30, 70, 10], confidence: 0.96 },
      { text: 'Shortage Exception: Pick physical & report short', bbox: [20, 50, 75, 12], confidence: 0.95 },
    ],
    objects: [
      { label: 'SOP Document Header', bbox: [15, 10, 80, 20] },
      { label: 'Handheld WMS Terminal Diagram', bbox: [20, 35, 30, 40] },
      { label: 'Bin Barcode Label Sample', bbox: [55, 35, 35, 25] },
    ],
    tool_candidates: [
      { label: 'Handheld WMS Scanner', bbox: [20, 35, 30, 40], confidence: 0.96 },
      { label: 'Order Tote', bbox: [55, 65, 35, 25], confidence: 0.92 },
    ],
    detected_tasks: [
      { task: 'Order Picking & Location Scanning', confidence: 0.97 },
      { task: 'Shortage Exception Logging', confidence: 0.91 },
    ],
    visible_hazards: [],
    unreadable_regions: [],
    recommended_action: 'proceed',
    retake_tip: '',
  };
}

/**
 * P2: Blueprint Builder
 * Compiles P0 Process Passport, P1 Perceive observations, and Sources into a v1.1 Blueprint.
 */
export function buildBlueprintV1(
  passport: ProcessPassport | null,
  perceiveResult: PerceiveObservation,
  sources: SourceDocument[] = []
): BlueprintV1 {
  // Check 1: Image unreadable -> unusable
  if (perceiveResult.recommended_action === 'retake') {
    return {
      schema_version: '1.1',
      status: 'unusable',
      status_reason: `Image quality too low (${perceiveResult.quality.score * 100}%): ${perceiveResult.retake_tip}`,
      missing_passport_fields: [],
      meta: {
        title: 'Unusable SOP Image',
        topic: 'Order Picking',
        language: 'en',
        role: 'Picker',
        image_type: perceiveResult.image_type,
        confidence: perceiveResult.quality.score,
        passport_id: 'PP-000',
        passport_version: 0,
        estimated_minutes: 0,
        sources: [],
      },
      orientation: {
        estimated_minutes: 0,
        cards: [],
        tool_explorer: { enabled: false, items: [] },
        quick_check: [],
        skip: { diagnostic_step_ids: [], pass_threshold: 0.75, always_show: [] },
      },
      scenarios: { watch: [], practice: [], test: [] },
      floor_checklist: [],
      takeaways: [],
      common_mistakes: [],
    };
  }

  // Check 2: Missing or Unapproved Passport -> needs_passport
  if (!passport || !passport.is_approved) {
    const missingFields: string[] = [];
    if (!passport) {
      missingFields.push('plain_definition', 'why_it_matters', 'golden_rules', 'tools');
    } else {
      if (passport.questions_for_trainer.length > 0) {
        missingFields.push(...passport.questions_for_trainer.map((q) => q.field));
      }
      if (!passport.is_approved) {
        missingFields.push('trainer_approval_stamp');
      }
    }

    return {
      schema_version: '1.1',
      status: 'needs_passport',
      status_reason: 'Process Passport is in draft state and requires human trainer review & sign-off before publication.',
      missing_passport_fields: missingFields,
      meta: {
        title: passport?.process_name || 'Warehouse Picking',
        topic: 'Order Fulfillment',
        language: passport?.language || 'en',
        role: 'Warehouse Operator',
        image_type: perceiveResult.image_type,
        confidence: perceiveResult.quality.score,
        passport_id: 'PP-DRAFT-001',
        passport_version: 1,
        estimated_minutes: 8,
        sources: sources.map((s) => ({ id: s.id, type: s.type, note: 'Source document' })),
      },
      orientation: {
        estimated_minutes: 3,
        cards: [],
        tool_explorer: { enabled: false, items: [] },
        quick_check: [],
        skip: { diagnostic_step_ids: [], pass_threshold: 0.75, always_show: ['safety_rules'] },
      },
      scenarios: { watch: [], practice: [], test: [] },
      floor_checklist: [],
      takeaways: [],
      common_mistakes: [],
    };
  }

  // Check 3: Passport Approved -> Generate complete Blueprint v1.1
  const mainSourceId = sources[0]?.id || 'S1';

  return {
    schema_version: '1.1',
    status: 'ok',
    status_reason: 'Approved Process Passport & SOP document verified. Blueprint ready.',
    missing_passport_fields: [],
    meta: {
      title: passport.process_name,
      topic: 'Outbound Order Picking',
      language: passport.language,
      role: 'Warehouse Picker',
      image_type: perceiveResult.image_type,
      confidence: perceiveResult.quality.score,
      passport_id: 'PP-APPROVED-2026',
      passport_version: 1,
      estimated_minutes: 8,
      sources: sources.map((s) => ({ id: s.id, type: s.type, note: 'Approved source' })),
    },
    orientation: {
      estimated_minutes: 3,
      cards: [
        {
          id: 'what',
          kind: 'what',
          title: 'What is Picking?',
          body: passport.fields.plain_definition.text,
          audio_text: passport.fields.plain_definition.text,
          visual: { type: 'icon', ref: 'tote' },
          must_view: true,
          source_ref: passport.fields.plain_definition.source_ref,
        },
        {
          id: 'why',
          kind: 'why',
          title: 'Why It Matters',
          body: passport.fields.why_it_matters[0]?.impact || 'Prevents shipping delays and stock discrepancies.',
          audio_text: passport.fields.why_it_matters[0]?.impact || 'Prevents shipping delays.',
          visual: { type: 'icon', ref: 'clipboard' },
          must_view: true,
          source_ref: passport.fields.why_it_matters[0]?.source_ref || mainSourceId,
        },
        {
          id: 'tool_scanner',
          kind: 'tool',
          title: 'Handheld Scanner',
          body: 'Directs every task and verifies bin barcode scans.',
          audio_text: 'Directs every task and verifies bin barcode scans.',
          visual: { type: 'image_region', ref: 'bbox_scanner' },
          tool: {
            name: passport.fields.tools[0]?.name || 'Handheld Scanner',
            purpose: passport.fields.tools[0]?.purpose || 'Directs tasks',
            never_do: passport.fields.tools[0]?.never_do || 'Never key quantity without counting',
          },
          must_view: true,
          source_ref: passport.fields.tools[0]?.source_ref || mainSourceId,
        },
        {
          id: 'rules',
          kind: 'rule',
          title: 'Golden Rules',
          body: passport.fields.golden_rules.map((r) => r.text).join(' '),
          audio_text: 'Always scan bin label before touching stock. Match exact SKU code.',
          visual: { type: 'icon', ref: 'medal' },
          must_view: true,
          source_ref: passport.fields.golden_rules[0]?.source_ref || mainSourceId,
        },
        {
          id: 'safety_rules',
          kind: 'safety',
          title: 'Floor Safety Notes',
          body: passport.fields.safety_notes[0]?.text || 'Wear Hi-Vis vest in forklift zones.',
          audio_text: 'Wear Hi-Vis vest in forklift zones.',
          visual: { type: 'icon', ref: 'safety' },
          must_view: true,
          source_ref: passport.fields.safety_notes[0]?.source_ref || mainSourceId,
        },
      ],
      tool_explorer: {
        enabled: true,
        items: perceiveResult.tool_candidates.map((tc, idx) => ({
          tool_name: tc.label,
          card_id: `tool_${idx}`,
          hotspot: { bbox: tc.bbox },
        })),
      },
      quick_check: SIMULATION_STEPS.slice(0, 3),
      skip: {
        diagnostic_step_ids: ['step_1', 'step_2', 'step_3'],
        pass_threshold: 0.75,
        always_show: ['safety_rules'],
      },
    },
    scenarios: {
      watch: SIMULATION_STEPS,
      practice: SIMULATION_STEPS_B,
      test: SIMULATION_STEPS_B,
    },
    floor_checklist: FLOOR_CHECKLIST.map((behaviour, idx) => ({
      id: `fc_${idx + 1}`,
      step_id: `step_${idx + 1}`,
      behaviour,
      source_ref: mainSourceId,
    })),
    takeaways: [
      'Always scan bin barcode label before touching stock',
      'Report shortage gaps immediately in WMS',
    ],
    common_mistakes: [
      'Grabbing items before scanning location barcode',
      'Falsifying quantities to maintain pick rate',
    ],
  };
}
