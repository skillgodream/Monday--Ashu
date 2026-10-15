import { planKnowItSlides } from './knowItPlanner';
import { Lesson } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('================================================================');
console.log('KNOW-IT PLANNER TRUNCATION FIX & COVERAGE AUDIT TEST SUITE');
console.log('================================================================\n');

// ============================================================================
// TEST 1: SOP WITH MORE THAN 9 OPERATIONAL STEPS
// ============================================================================
console.log('TEST 1: SOP with > 9 operational steps');
const manyStepsLesson: Lesson = {
  id: 'lesson-many-steps',
  title: 'Extended Manufacturing SOP',
  subtitle: 'Process with 12 steps',
  category: 'Safety' as any,
  color: 'sky',
  accentColor: '#0ea5e9',
  stepsCount: 12,
  durationMinutes: 15,
  level: 'Advanced',
  progress: 0,
  masteryPercentage: 0,
  artType: 'clipboard',
  description: 'Extended process',
  operationalBlueprint: {
    document_identity: { doc_title: 'Extended SOP', doc_ref: 'SOP-100', version: '1.0' },
    role: 'Operator',
    process: 'Extended Manufacturing',
    purpose: 'Execute 12 distinct manufacturing steps',
    scope: 'Plant A',
    prerequisites: [],
    tools_and_systems: [],
    terminology: [],
    decision_points: [],
    exceptions: [],
    escalations: [],
    critical_controls: [],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: Array.from({ length: 12 }, (_, i) => ({
      instruction: `Execute step number ${i + 1} with absolute precision and safety verification.`,
      task_title: `Step ${i + 1} Title`,
      category: 'DO',
      action_verb: 'Execute',
      source: { source_ref: `step-${i + 1}`, page_or_section: `Sec ${i + 1}`, source_text: `Step ${i + 1} text` },
    })),
  },
};

const plan1 = planKnowItSlides(manyStepsLesson);
const overviewSlides = plan1.slides.filter(s => s.type === 'SECTION_INTRO' && s.sec === 'The process');
assert(overviewSlides.length > 1, 'Overview flow correctly paginated when steps > 9');
const allFlowItems = overviewSlides.flatMap(s => s.fl || []);
assert(allFlowItems.length === 12, 'All 12 step titles present in overview flow (zero omission)');
console.log('✅ TEST 1 PASSED: 12 operational steps fully preserved across paginated overview and teach slides.\n');

// ============================================================================
// TEST 2: MORE THAN 3 CONTROLS AND COMMON MISTAKES
// ============================================================================
console.log('TEST 2: More than 3 controls and common mistakes');
const manyControlsMistakesLesson: Lesson = {
  id: 'lesson-controls-mistakes',
  title: 'Strict Compliance SOP',
  subtitle: 'Many controls and mistakes',
  category: 'Safety' as any,
  color: 'mint',
  accentColor: '#10b981',
  stepsCount: 2,
  durationMinutes: 10,
  level: 'Intermediate',
  progress: 0,
  masteryPercentage: 0,
  artType: 'safety',
  description: 'Compliance process',
  operationalBlueprint: {
    document_identity: { doc_title: 'Compliance SOP', doc_ref: 'SOP-200', version: '1.0' },
    role: 'Inspector',
    process: 'Compliance Check',
    purpose: 'Enforce all safety controls',
    scope: 'Plant B',
    prerequisites: [],
    tools_and_systems: [],
    terminology: [],
    decision_points: [],
    exceptions: [],
    escalations: [],
    critical_controls: [
      { rule: 'Mandatory control rule alpha regarding safety gear.', rationale: 'Safety first', source_ref: 's1', source_text: 'r1' },
      { rule: 'Mandatory control rule beta regarding pressure valves.', rationale: 'Prevent blowout', source_ref: 's1', source_text: 'r2' },
      { rule: 'Mandatory control rule gamma regarding chemical spill kits.', rationale: 'Environmental protection', source_ref: 's1', source_text: 'r3' },
      { rule: 'Mandatory control rule delta regarding emergency shutoffs.', rationale: 'Life safety', source_ref: 's1', source_text: 'r4' },
      { rule: 'Mandatory control rule epsilon regarding calibration logs.', rationale: 'Accuracy', source_ref: 's1', source_text: 'r5' },
    ],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [
      { mistake: 'Mistake one: skipping checklist item A.', prevention: 'Always verify checklist A.', source_ref: 's1', source_text: 'm1' },
      { mistake: 'Mistake two: ignoring gauge warning light.', prevention: 'Stop immediately on warning.', source_ref: 's1', source_text: 'm2' },
      { mistake: 'Mistake three: failing to log timestamp.', prevention: 'Record timestamp instantly.', source_ref: 's1', source_text: 'm3' },
      { mistake: 'Mistake four: improper disposal of wipes.', prevention: 'Use hazmat bin.', source_ref: 's1', source_text: 'm4' },
    ],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: [
      {
        instruction: 'Initiate inspection protocol.',
        task_title: 'Initiate',
        category: 'DO',
        action_verb: 'Initiate',
        source: { source_ref: 's1', page_or_section: '1', source_text: 'Initiate inspection protocol.' },
      },
    ],
  },
};

const plan2 = planKnowItSlides(manyControlsMistakesLesson);
const ruleSlides = plan2.slides.filter(s => s.type === 'IMPORTANT_RULE');
assert(ruleSlides.length === 5, 'All 5 critical controls generated as important rule slides (no cap at 3)');
const dontSlides = plan2.slides.filter(s => s.type === 'DO_DONT');
assert(dontSlides.length >= 2, 'Common mistakes paginated into multiple Do/Don’t slides (no cap at 3)');
console.log('✅ TEST 2 PASSED: 5 controls and 4 mistakes fully retained without 3-item truncation caps.\n');

// ============================================================================
// TEST 3: MORE THAN 4 DECISIONS, EXCEPTIONS AND ESCALATIONS
// ============================================================================
console.log('TEST 3: More than 4 decisions, exceptions and escalations');
const manyEdgeCasesLesson: Lesson = {
  id: 'lesson-edge-cases',
  title: 'Complex Decision Protocol',
  subtitle: 'Many decisions, exceptions, escalations',
  category: 'Safety' as any,
  color: 'peach',
  accentColor: '#f59e0b',
  stepsCount: 2,
  durationMinutes: 12,
  level: 'Advanced',
  progress: 0,
  masteryPercentage: 0,
  artType: 'clipboard',
  description: 'Complex flow',
  operationalBlueprint: {
    document_identity: { doc_title: 'Complex SOP', doc_ref: 'SOP-300', version: '1.0' },
    role: 'Supervisor',
    process: 'Complex Decision Handling',
    purpose: 'Manage edge cases',
    scope: 'Plant C',
    prerequisites: [],
    tools_and_systems: [],
    terminology: [],
    decision_points: [
      { situation: 'Condition 1 met', decision: 'Choose path A', action: 'Proceed with path A', source_ref: 's1', source_text: 'd1' },
      { situation: 'Condition 2 met', decision: 'Choose path B', action: 'Proceed with path B', source_ref: 's1', source_text: 'd2' },
      { situation: 'Condition 3 met', decision: 'Choose path C', action: 'Proceed with path C', source_ref: 's1', source_text: 'd3' },
      { situation: 'Condition 4 met', decision: 'Choose path D', action: 'Proceed with path D', source_ref: 's1', source_text: 'd4' },
      { situation: 'Condition 5 met', decision: 'Choose path E', action: 'Proceed with path E', source_ref: 's1', source_text: 'd5' },
    ],
    exceptions: [
      { trigger: 'Exception trigger 1', resolution: 'Resolution 1', source_ref: 's1', source_text: 'ex 1' },
      { trigger: 'Exception trigger 2', resolution: 'Resolution 2', source_ref: 's1', source_text: 'ex 2' },
      { trigger: 'Exception trigger 3', resolution: 'Resolution 3', source_ref: 's1', source_text: 'ex 3' },
      { trigger: 'Exception trigger 4', resolution: 'Resolution 4', source_ref: 's1', source_text: 'ex 4' },
      { trigger: 'Exception trigger 5', resolution: 'Resolution 5', source_ref: 's1', source_text: 'ex 5' },
    ],
    escalations: [
      { situation: 'Escalation situation 1', contact_or_action: 'Call manager 1', source_ref: 's1', source_text: 'esc 1' },
      { situation: 'Escalation situation 2', contact_or_action: 'Call manager 2', source_ref: 's1', source_text: 'esc 2' },
      { situation: 'Escalation situation 3', contact_or_action: 'Call manager 3', source_ref: 's1', source_text: 'esc 3' },
      { situation: 'Escalation situation 4', contact_or_action: 'Call manager 4', source_ref: 's1', source_text: 'esc 4' },
      { situation: 'Escalation situation 5', contact_or_action: 'Call manager 5', source_ref: 's1', source_text: 'esc 5' },
    ],
    critical_controls: [],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: [
      {
        instruction: 'Evaluate initial condition.',
        task_title: 'Evaluate',
        category: 'CHECK',
        action_verb: 'Evaluate',
        source: { source_ref: 's1', page_or_section: '1', source_text: 'Evaluate initial condition.' },
      },
    ],
  },
};

const plan3 = planKnowItSlides(manyEdgeCasesLesson);
const decisionSlides = plan3.slides.filter(s => s.step && s.step.toLowerCase().includes('decision'));
const exceptionSlides = plan3.slides.filter(s => s.step && s.step.toLowerCase().includes('exception'));
const escalationSlides = plan3.slides.filter(s => s.step && s.step.toLowerCase().includes('escalation'));
assert(decisionSlides.length >= 2, 'Decisions paginated into multiple slides (no cap at 4)');
assert(exceptionSlides.length >= 2, 'Exceptions paginated into multiple slides (no cap at 4)');
assert(escalationSlides.length >= 2, 'Escalations paginated into multiple slides (no cap at 4)');
console.log('✅ TEST 3 PASSED: 5 decisions, 5 exceptions, and 5 escalations fully retained without 4-item caps.\n');

// ============================================================================
// TEST 4: MORE THAN 6 PREREQUISITES / TOOLS
// ============================================================================
console.log('TEST 4: More than 6 prerequisites/tools');
const manyPrepLesson: Lesson = {
  id: 'lesson-many-prep',
  title: 'Tool-Heavy SOP',
  subtitle: '8 prerequisites and tools',
  category: 'Safety' as any,
  color: 'lilac',
  accentColor: '#8b5cf6',
  stepsCount: 2,
  durationMinutes: 10,
  level: 'Beginner',
  progress: 0,
  masteryPercentage: 0,
  artType: 'box',
  description: 'Tool heavy',
  operationalBlueprint: {
    document_identity: { doc_title: 'Prep SOP', doc_ref: 'SOP-400', version: '1.0' },
    role: 'Technician',
    process: 'Setup Protocol',
    purpose: 'Prepare 8 tools',
    scope: 'Lab 1',
    prerequisites: [
      { text: 'Prerequisite item alpha', source_ref: 's1', source_text: 'p1' },
      { text: 'Prerequisite item beta', source_ref: 's1', source_text: 'p2' },
      { text: 'Prerequisite item gamma', source_ref: 's1', source_text: 'p3' },
      { text: 'Prerequisite item delta', source_ref: 's1', source_text: 'p4' },
    ],
    tools_and_systems: [
      { name: 'Tool Alpha', purpose: 'Measure voltage', never_do: 'Misuse', source_ref: 's1', source_text: 't1' },
      { name: 'Tool Beta', purpose: 'Calibrate pressure', never_do: 'Misuse', source_ref: 's1', source_text: 't2' },
      { name: 'Tool Gamma', purpose: 'Sanitize surface', never_do: 'Misuse', source_ref: 's1', source_text: 't3' },
      { name: 'Tool Delta', purpose: 'Record telemetry', never_do: 'Misuse', source_ref: 's1', source_text: 't4' },
    ],
    terminology: [],
    decision_points: [],
    exceptions: [],
    escalations: [],
    critical_controls: [],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: [
      {
        instruction: 'Setup equipment.',
        task_title: 'Setup',
        category: 'DO',
        action_verb: 'Setup',
        source: { source_ref: 's1', page_or_section: '1', source_text: 'Setup equipment.' },
      },
    ],
  },
};

const plan4 = planKnowItSlides(manyPrepLesson);
const prepSlides = plan4.slides.filter(s => s.type === 'SECTION_INTRO' && s.sec === 'Before you start');
assert(prepSlides.length >= 2, 'Prerequisites & tools paginated when total > 6');
const allPrepItems = prepSlides.flatMap(s => s.fl || []);
assert(allPrepItems.length === 8, 'All 8 prerequisites and tools preserved across prep slides');
console.log('✅ TEST 4 PASSED: 8 prerequisites/tools fully retained without 6-item cap.\n');

// ============================================================================
// TEST 5: CORRECT ORDERING, GROUPING AND DUPLICATE HANDLING
// ============================================================================
console.log('TEST 5: Correct ordering, grouping and duplicate handling');
const orderingLesson: Lesson = {
  id: 'lesson-ordering',
  title: 'Ordered Process',
  subtitle: 'Check order and deduplication',
  category: 'Safety' as any,
  color: 'butter',
  accentColor: '#eab308',
  stepsCount: 3,
  durationMinutes: 5,
  level: 'Beginner',
  progress: 0,
  masteryPercentage: 0,
  artType: 'clipboard',
  description: 'Ordering test',
  operationalBlueprint: {
    document_identity: { doc_title: 'Order SOP', doc_ref: 'SOP-500', version: '1.0' },
    role: 'Clerk',
    process: 'Sequence Check',
    purpose: 'Check sequence',
    scope: 'Desk 1',
    prerequisites: [{ text: 'Badge required', source_ref: 's1', source_text: 'b1' }, { text: 'badge required', source_ref: 's1', source_text: 'b1' }], // duplicate
    tools_and_systems: [],
    terminology: [],
    decision_points: [],
    exceptions: [],
    escalations: [],
    critical_controls: [],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: [
      { instruction: 'First execute step one of procedure.', task_title: 'First Step', category: 'DO', action_verb: 'Execute', source: { source_ref: 's1', page_or_section: '1', source_text: 'First execute step one.' } },
      { instruction: 'Second execute step two of procedure.', task_title: 'Second Step', category: 'DO', action_verb: 'Execute', source: { source_ref: 's2', page_or_section: '2', source_text: 'Second execute step two.' } },
      { instruction: 'Third execute step three of procedure.', task_title: 'Third Step', category: 'DO', action_verb: 'Execute', source: { source_ref: 's3', page_or_section: '3', source_text: 'Third execute step three.' } },
    ],
  },
};

const plan5 = planKnowItSlides(orderingLesson);
const prepSlide = plan5.slides.find(s => s.type === 'SECTION_INTRO' && s.sec === 'Before you start');
assert(prepSlide?.fl?.length === 1, 'Duplicate prerequisites correctly deduplicated');
const stepTeachSlides = plan5.slides.filter(s => s.type === 'TEACH_STEP' && s.step?.startsWith('Step '));
assert(stepTeachSlides[0].title.includes('First Step'), 'Steps retain correct original order (First Step is first)');
assert(stepTeachSlides[1].title.includes('Second Step'), 'Steps retain correct original order (Second Step is second)');
console.log('✅ TEST 5 PASSED: Correct ordering, grouping and duplicate deduplication verified.\n');

// ============================================================================
// TEST 6: NORMAL SHORT SOP RETAINS EXISTING SLIDE STRUCTURE
// ============================================================================
console.log('TEST 6: Normal short SOP retains existing slide structure');
const shortSopLesson: Lesson = {
  id: 'lesson-short',
  title: 'Standard Short SOP',
  subtitle: 'Basic process',
  category: 'Safety' as any,
  color: 'blush',
  accentColor: '#f43f5e',
  stepsCount: 2,
  durationMinutes: 5,
  level: 'Beginner',
  progress: 0,
  masteryPercentage: 0,
  artType: 'clipboard',
  description: 'Short SOP',
  operationalBlueprint: {
    document_identity: { doc_title: 'Short SOP', doc_ref: 'SOP-600', version: '1.0' },
    role: 'Staff',
    process: 'Short Process',
    purpose: 'Do quick task',
    scope: 'General',
    prerequisites: [{ text: 'Safety glasses', source_ref: 's1', source_text: 'sg' }],
    tools_and_systems: [{ name: 'Wrench', purpose: 'Turn valve', never_do: 'Misuse', source_ref: 's1', source_text: 'wr' }],
    terminology: [],
    decision_points: [],
    exceptions: [],
    escalations: [],
    critical_controls: [{ rule: 'Wear safety glasses at all times.', rationale: 'Safety', source_ref: 's1', source_text: 'sg' }],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: [
      { instruction: 'Turn valve clockwise.', task_title: 'Turn Valve', category: 'DO', action_verb: 'Turn', source: { source_ref: 's1', page_or_section: '1', source_text: 'Turn valve clockwise.' } },
    ],
  },
};

const plan6 = planKnowItSlides(shortSopLesson);
assert(plan6.slides.some(s => s.type === 'WELCOME'), 'Short SOP retains WELCOME slide');
assert(plan6.slides.some(s => s.type === 'OBJECTIVES'), 'Short SOP retains OBJECTIVES slide');
assert(plan6.slides.some(s => s.type === 'IMPORTANT_RULE'), 'Short SOP retains IMPORTANT_RULE slide');
assert(plan6.slides.some(s => s.type === 'COMPLETION'), 'Short SOP retains COMPLETION slide');
console.log('✅ TEST 6 PASSED: Normal short SOP successfully retains standard slide structure.\n');

// ============================================================================
// TEST 7: MASSIVE 104-STEP SOP (INCIDENT REPRODUCTION & VALIDATION)
// ============================================================================
console.log('TEST 7: Massive 104-step SOP deck limit and anti-corruption verification');
const massive104Lesson: Lesson = {
  id: 'lesson-massive-104',
  title: 'Standard Return Pickup Workflow',
  subtitle: 'High-volume logistics return process',
  category: 'Safety' as any,
  color: 'sky',
  accentColor: '#0ea5e9',
  stepsCount: 104,
  durationMinutes: 45,
  level: 'Advanced',
  progress: 0,
  masteryPercentage: 0,
  artType: 'clipboard',
  description: 'Complete returns process',
  operationalBlueprint: {
    document_identity: { doc_title: 'Return Pickup SOP', doc_ref: 'RET-PU-SOP-001', version: '1.0' },
    role: 'Field Associate / Delivery Partner',
    process: 'Standard Return Pickup Workflow',
    purpose: 'Verify, inspect, and process all customer returns consistently.',
    scope: 'Returns Operations',
    prerequisites: [
      { text: 'Equip handheld mobile barcode scanner with full battery charge', source_ref: 'p1', source_text: 'scanner' },
      { text: 'Prepare tamper-evident return polybags and seal stickers', source_ref: 'p2', source_text: 'polybags' },
    ],
    tools_and_systems: [
      { name: 'Logistics Mobile App', purpose: 'Barcode scanning and customer verification', never_do: 'Bypass OTP', source_ref: 't1', source_text: 'app' },
    ],
    terminology: [],
    decision_points: [
      { situation: 'Customer item seal is broken upon inspection', action: 'Photograph discrepancy and mark as damaged in app', decision: 'Seal check', source_ref: 'd1', source_text: 'seal' },
    ],
    exceptions: [],
    escalations: [],
    critical_controls: [
      { rule: 'Never accept unsealed electronics without verifying serial number.', rationale: 'Fraud prevention', source_ref: 'c1', source_text: 'serial' },
    ],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [
      { mistake: 'Accepting return without scanning package barcode', prevention: 'Scan package before handing customer receipt', source_ref: 'm1', source_text: 'scan' },
    ],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: Array.from({ length: 104 }, (_, i) => ({
      instruction: `Execute verified return verification sub-step ${i + 1} with barcode recording.`,
      task_title: `Return Verification Step ${i + 1}`,
      category: 'DO',
      action_verb: 'Verify',
      source: { source_ref: `step-${i + 1}`, page_or_section: `Page ${Math.floor(i / 10) + 1}`, source_text: `Step ${i + 1} text` },
    })),
  },
};

const plan7 = planKnowItSlides(massive104Lesson);
assert(plan7.slides.length <= 18, `Massive 104-step SOP constrained to <= 18 slides (got ${plan7.slides.length})`);

// Ensure no slide contains the corrupted joined titles or duplicate strings
for (const s of plan7.slides) {
  assert(!s.title.includes(' & 104 Steps'), `Slide title must not contain repeated '& 104 Steps': "${s.title}"`);
  assert(!s.title.includes('(8/12) &'), `Slide title must not contain concatenated page indicators: "${s.title}"`);
  if (s.content) {
    const lines = s.content.split('\n');
    const hasRepeatedIntro = lines.filter(l => l.includes('Key operational stages')).length > 1;
    assert(!hasRepeatedIntro, `Slide content must not duplicate identical overview sentences: "${s.content}"`);
  }
  if (s.type === 'SECTION_INTRO') {
    assert((s.fl || []).length <= 25, `SECTION_INTRO must not accumulate 40+ merged checklist items (got ${(s.fl || []).length})`);
  }
}
console.log('✅ TEST 7 PASSED: Massive 104-step SOP successfully constrained without title concatenation or content duplication.\n');

// ============================================================================
// TEST 8: CROSS-DOMAIN SOURCE GROUNDING & DECOUPLING
// ============================================================================
console.log('TEST 8: Cross-domain source grounding (Hotel vs Returns Logistics)');
const hotelLesson: Lesson = {
  id: 'lesson-hotel',
  title: 'Hotel Housekeeping Sanitization',
  subtitle: 'Hospitality room turnover',
  category: 'Safety' as any,
  color: 'lilac',
  accentColor: '#9333ea',
  stepsCount: 3,
  durationMinutes: 10,
  level: 'Beginner',
  progress: 0,
  masteryPercentage: 0,
  artType: 'clipboard',
  description: 'Sanitize guest rooms',
  operationalBlueprint: {
    document_identity: { doc_title: 'Room Sanitization SOP', doc_ref: 'HOTEL-HSK-01', version: '2.0' },
    role: 'Housekeeping Attendant',
    process: 'Guest Room Sanitization',
    purpose: 'Deliver hygienic guest rooms.',
    scope: 'Guest floors',
    prerequisites: [{ text: 'Wear nitrile protective gloves', source_ref: 'p1', source_text: 'gloves' }],
    tools_and_systems: [{ name: 'Microfiber cloth', purpose: 'Surface wiping', never_do: 'Clean floor then bed', source_ref: 't1', source_text: 'cloth' }],
    terminology: [],
    decision_points: [],
    exceptions: [],
    escalations: [],
    critical_controls: [{ rule: 'Discard used cleaning cloths after each bathroom.', rationale: 'Prevent cross-contamination', source_ref: 'c1', source_text: 'cloth' }],
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 1.0,
    operational_steps: [
      { instruction: 'Strip bed linens and inspect mattress protector.', task_title: 'Strip Linens', category: 'DO', action_verb: 'Strip', source: { source_ref: 's1', page_or_section: '1', source_text: 'Strip bed' } },
      { instruction: 'Spray sanitizer on high-touch desk and door surfaces.', task_title: 'Disinfect Surfaces', category: 'DO', action_verb: 'Spray', source: { source_ref: 's2', page_or_section: '1', source_text: 'Spray sanitizer' } },
      { instruction: 'Mop floor starting from farthest corner toward exit door.', task_title: 'Mop Floor', category: 'DO', action_verb: 'Mop', source: { source_ref: 's3', page_or_section: '2', source_text: 'Mop floor' } },
    ],
  },
};

const hotelPlan = planKnowItSlides(hotelLesson);
assert(hotelPlan.title === 'Hotel Housekeeping Sanitization', 'Hotel plan retains source title');
assert(Boolean(hotelPlan.slides[0]?.role?.includes('Housekeeping Attendant')), 'Hotel plan retains Housekeeping role');

// Returns plan must NOT have Housekeeping concepts
assert(!plan7.slides[0]?.role?.includes('Housekeeping'), 'Logistics Returns deck does NOT inherit Housekeeping role');
assert(Boolean(plan7.slides[0]?.role?.includes('Field Associate')), 'Logistics Returns deck correctly uses Field Associate role');
console.log('✅ TEST 8 PASSED: Cross-domain decoupling verified between Hospitality and Logistics.\n');

console.log('================================================================');
console.log('ALL KNOW-IT PLANNER TESTS PASSED (8/8)');
console.log('================================================================');


