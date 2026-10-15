/**
 * End-to-End Real SOP Pipeline Integration Verification Script
 * Exercises: Raw SOP Text -> ExtractedDocument -> SopKnowledgeModel -> OperationalBlueprint -> CanonicalTaskModel -> 4 Learning Experiences -> Coverage Audit
 */

import { generateDomainNeutralLesson } from './domainNeutralGenerator';
import { buildCanonicalTaskModel, auditTaskModelCoverage } from './canonicalTaskModel';
import { planKnowItSlides } from '../experiment/knowItPlanner';
import { planVideoDemonstration, validateVideoPlan } from './videoPlanEngine';

console.log('================================================================');
console.log('GURUJI PIPELINE MODEL INTEGRATION TEST (GENERATED MODEL ASSERTER)');
console.log('================================================================\n');

// 1. NON-FIXTURE TEST SOP
const REAL_TEST_SOP_TEXT = `STANDARD OPERATING PROCEDURE: COMMERCIAL COLD-CHAIN STORAGE & TEMPERATURE LOGGING
DOCUMENT REF: SOP-COLD-808 VERSION 4.2
DEPARTMENT: COLD-STORAGE & PHARMACEUTICAL LOGISTICS
ROLE: COLD-CHAIN LOGISTICS TECHNICIAN

SECTION 1: PRE-ENTRY QUALIFICATION & WORKSTATION SETUP
1. Complete calibrated digital thermometer battery and sensor probe calibration check before entering the sub-zero cold room.
2. Don thermal insulated PPE including anti-slip insulated boots, thermal gloves, and high-visibility freezer jacket.
3. Verify secondary backup data logger is powered on and synchronized with the central warehouse ERP system.

SECTION 2: TEMPERATURE MONITORING & PALLET INSPECTION
4. Inspect main cold-room temperature display and verify reading remains strictly between 2.0°C and 8.0°C.
5. Log hourly temperature reading into central LIMS/ERP terminal with timestamp and probe serial number.
6. Inspect incoming pharmaceutical pallet seals for physical condensation, ice buildup, or broken tamper tape.

SECTION 3: ANOMALY RECOVERY, CRITICAL CONTROLS & ESCALATION
7. CRITICAL CONTROL: Never leave cold-room freezer door open or unlatched for longer than 60 consecutive seconds.
8. EXCEPTION: If cold-room temperature exceeds 8.0°C for >15 minutes, quarantine affected pharmaceutical pallets immediately in backup freezer unit.
9. ESCALATION: If temperature excursion exceeds 30 minutes, immediately notify Cold-Chain Quality Director and log formal Excursion Incident Report.`;

const sampleExtracted = {
  filename: 'SOP-COLD-808: Commercial Cold-Chain Storage & Temperature Logging.txt',
  rawText: REAL_TEST_SOP_TEXT,
  wordCount: REAL_TEST_SOP_TEXT.split(/\s+/).length,
  pageCount: 1,
  fileHash: 'hash-cold-chain-808',
  confirmationText: 'Cold-Chain Storage SOP Confirmed',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {
    status: 'clean_text',
    pagesProcessed: 1,
    totalCharacters: REAL_TEST_SOP_TEXT.length,
    estimatedTokens: Math.round(REAL_TEST_SOP_TEXT.length / 4),
    cleanlinessScore: 1.0,
    formatDetected: 'plain_text',
    warnings: [],
    ocrApplied: false,
  } as any,
};

// 2. RUN PIPELINE
console.log('1. RUNNING EXTRACTION & DOMAIN-NEUTRAL GENERATOR...');
const { lesson, passport, blueprint, stepObjects } = generateDomainNeutralLesson(sampleExtracted);

console.log('  ✓ Lesson generated:', lesson.title);
console.log('  ✓ Steps count:', lesson.stepsCount);
console.log('  ✓ Role:', lesson.operationalBlueprint?.role);

// 3. BUILD CANONICAL TASK MODEL (CTM)
console.log('\n2. BUILDING CANONICAL TASK MODEL (CTM)...');
const ctm = buildCanonicalTaskModel(lesson.operationalBlueprint, lesson, sampleExtracted.rawText);

console.log('  ✓ Doc Title:', ctm.documentIdentity.docTitle);
console.log('  ✓ CTM Steps:', ctm.steps.length);
console.log('  ✓ CTM Prerequisites:', ctm.prerequisites.length);
console.log('  ✓ CTM Controls:', ctm.controls.length);
console.log('  ✓ CTM Exceptions:', ctm.exceptionsAndEscalations.length);

// 4. GENERATE 4 EXPERIENCES
console.log('\n3. GENERATING 4 LEARNING EXPERIENCES...');

// Experience 1: Learn the Flow
const teachMePlan = planKnowItSlides(lesson);
console.log('  [Exp 1: Learn the Flow] Slides generated:', teachMePlan.slides.length);

// Experience 2: See the Action
const videoPlan = planVideoDemonstration(lesson.operationalBlueprint!);
console.log('  [Exp 2: See the Action] Video clips generated:', videoPlan.clips.length);
console.log('  [Exp 2: See the Action] Ledger items:', videoPlan.coverage_ledger?.length);

// Experience 3: Make the Decision
const simulatorSteps = lesson.stepObjects || [];
console.log('  [Exp 3: Make the Decision] Simulator steps:', simulatorSteps.length);

// Experience 4: Prove Capability
const assessmentQuestions = blueprint.scenarios.test || [];
console.log('  [Exp 4: Prove Capability] Assessment items:', assessmentQuestions.length);

// 5. VALIDATION & COVERAGE AUDIT
console.log('\n4. RUNNING COVERAGE AUDIT...');
const videoValidation = validateVideoPlan(videoPlan, lesson.operationalBlueprint!);
console.log('  ✓ Video Plan Validation Status:', videoPlan.validation_status);
console.log('  ✓ Is Valid:', videoValidation.isValid);

function norm(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/^when executing:\s*/i, '')
    .replace(/^quality or compliance anomaly:\_*/i, '')
    .replace(/^unresolved issue or anomaly during\s*/i, '')
    .replace(/^[\d\.\-\*\•\:]\s*/, '')
    .replace(/[^a-z0-9]/g, '');
}

// Gather covered IDs by asserting against actual generated output models
const allSlideText = norm(
  teachMePlan.slides
    .map((s) => `${s.title} ${s.content || ''} ${s.items?.join(' ') || ''} ${s.fl?.join(' ') || ''}`)
    .join(' ')
);
const learnCoveredIds: string[] = [];

ctm.steps.forEach((s) => {
  const target = norm(s.instruction).slice(0, 20);
  if (target && allSlideText.includes(target)) learnCoveredIds.push(s.id);
});
ctm.prerequisites.forEach((p) => {
  const target = norm(p.text).slice(0, 20);
  if (target && allSlideText.includes(target)) learnCoveredIds.push(p.id);
});
ctm.toolsAndSystems.forEach((t) => {
  const target = norm(t.name).slice(0, 15);
  if (target && allSlideText.includes(target)) learnCoveredIds.push(t.id);
});
ctm.controls.forEach((c) => {
  const target = norm(c.rule).slice(0, 20);
  if (target && allSlideText.includes(target)) learnCoveredIds.push(c.id);
});
ctm.decisions.forEach((d) => {
  const t1 = norm(d.situation).slice(0, 15);
  const t2 = norm(d.compliantAction).slice(0, 15);
  if ((t1 && allSlideText.includes(t1)) || (t2 && allSlideText.includes(t2))) learnCoveredIds.push(d.id);
});
ctm.exceptionsAndEscalations.forEach((e) => {
  const t1 = norm(e.trigger).slice(0, 15);
  const t2 = norm(e.resolutionOrAction).slice(0, 15);
  if ((t1 && allSlideText.includes(t1)) || (t2 && allSlideText.includes(t2))) learnCoveredIds.push(e.id);
});
ctm.prohibitedActions.forEach((p) => {
  const target = norm(p.mistake).slice(0, 20);
  if (target && allSlideText.includes(target)) learnCoveredIds.push(p.id);
});

// See: Assert against actual video plan clips and coverage ledger
const allClipText = norm(videoPlan.clips.map((c) => `${c.title} ${(c as any).action_description || (c as any).action || ''} ${(c as any).assigned_step_id || ''}`).join(' '));
const ledgerIds = new Set((videoPlan.coverage_ledger || []).map((l) => l.item_id));
const seeCoveredIds: string[] = [];

ctm.steps.forEach((s) => {
  if (ledgerIds.has(s.id) || allClipText.includes(norm(s.id)) || allClipText.includes(norm(s.instruction).slice(0, 15))) {
    seeCoveredIds.push(s.id);
  }
});
ctm.controls.forEach((c) => {
  if (ledgerIds.has(c.id) || allClipText.includes(norm(c.rule).slice(0, 15))) {
    seeCoveredIds.push(c.id);
  }
});

// Make: Assert against actual simulator steps
const allSimText = norm(simulatorSteps.map((s: any) => `${s.question || ''} ${s.taskItem || ''} ${s.why || ''}`).join(' '));
const makeCoveredIds: string[] = [];
ctm.steps.forEach((s) => {
  if (allSimText.includes(norm(s.instruction).slice(0, 15))) makeCoveredIds.push(s.id);
});
ctm.decisions.forEach((d) => {
  const t1 = norm(d.situation).slice(0, 15);
  const t2 = norm(d.compliantAction).slice(0, 15);
  if ((t1 && allSimText.includes(t1)) || (t2 && allSimText.includes(t2))) makeCoveredIds.push(d.id);
});
ctm.exceptionsAndEscalations.forEach((e) => {
  const t1 = norm(e.trigger).slice(0, 15);
  const t2 = norm(e.resolutionOrAction).slice(0, 15);
  if ((t1 && allSimText.includes(t1)) || (t2 && allSimText.includes(t2))) makeCoveredIds.push(e.id);
});

// Prove: Assert against actual assessment questions
const allTestText = norm((assessmentQuestions || []).map((q: any) => `${q.title || ''} ${q.question || ''} ${q.situation || ''}`).join(' '));
const proveCoveredIds: string[] = [];
ctm.steps.forEach((s) => {
  if (allTestText.includes(norm(s.instruction).slice(0, 15)) || allSimText.includes(norm(s.instruction).slice(0, 15))) proveCoveredIds.push(s.id);
});
ctm.controls.forEach((c) => {
  if (allTestText.includes(norm(c.rule).slice(0, 15)) || allSimText.includes(norm(c.rule).slice(0, 15))) proveCoveredIds.push(c.id);
});
ctm.prohibitedActions.forEach((p) => {
  if (allTestText.includes(norm(p.mistake).slice(0, 15)) || allSimText.includes(norm(p.mistake).slice(0, 15))) proveCoveredIds.push(p.id);
});

const auditReport = auditTaskModelCoverage(ctm, {
  learnTheFlowCoveredIds: learnCoveredIds,
  seeTheActionCoveredIds: seeCoveredIds,
  makeTheDecisionCoveredIds: makeCoveredIds,
  proveCapabilityCoveredIds: proveCoveredIds,
});

console.log('  ✓ CTM Requirements Total:', auditReport.totalRequirements);
console.log('  ✓ CTM Requirements Covered:', auditReport.coveredRequirements);
console.log('  ✓ CTM Coverage Percentage:', auditReport.coveragePercentage + '%');
if (auditReport.unresolvedItems.length > 0) {
  console.log('  Unresolved items detail:', auditReport.unresolvedItems);
}

import { evaluateCapabilityDecision } from './capabilityDecisionEngine';

const capabilityResult = evaluateCapabilityDecision(ctm, {
  completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
  demonstratedRequirementIds: ctm.steps.slice(0, 8).map((s) => s.id),
  failedRequirementIds: ctm.steps.slice(8).map((s) => s.id),
});

console.log('\n5. EVALUATING CAPABILITY DECISION & TARGETED REMEDIATION...');
console.log('  ✓ Decision Title:', capabilityResult.decisionTitle);
console.log('  ✓ Decision Status:', capabilityResult.decision);
console.log('  ✓ Demonstrated:', `${capabilityResult.demonstratedCount}/${capabilityResult.totalCount}`);
console.log('  ✓ Weak Requirements Count:', capabilityResult.weakRequirements.length);
if (capabilityResult.remediationPlan) {
  console.log('  ✓ Targeted Remediation Plan:', capabilityResult.remediationPlan.buttonText);
}

if (auditReport.isFullyCovered && videoValidation.isValid && capabilityResult.remediationPlan !== null) {
  console.log('\n================================================================');
  console.log('✅ END-TO-END PIPELINE & CAPABILITY DECISION VERIFICATION PASSED');
  console.log('================================================================');
} else {
  console.error('\n❌ PIPELINE VERIFICATION FAILED');
  process.exit(1);
}
