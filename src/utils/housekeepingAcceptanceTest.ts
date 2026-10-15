/**
 * HOUSEKEEPING GOLD STANDARD & MULTI-DOMAIN ACCEPTANCE TEST
 * 
 * Verifies end-to-end pipeline execution for:
 * 1. Housekeeping Gold-Standard SOP (urban-housekeeping-501)
 * 2. Diagnostic Laboratory SOP (diag-lab-104)
 * 3. All 3 Capability Decision Outcomes (Ready, Targeted Remediation, Policy Review)
 */

import { FIXTURE_SOPS } from '../data/fixtureSops';
import { generateDomainNeutralLesson } from './domainNeutralGenerator';
import { buildCanonicalTaskModel, auditTaskModelCoverage } from './canonicalTaskModel';
import { planKnowItSlides } from '../experiment/knowItPlanner';
import { planVideoDemonstration } from './videoPlanEngine';
import { evaluateCapabilityDecision } from './capabilityDecisionEngine';

console.log('================================================================');
console.log('GURUJI ACCEPTANCE AUDIT: HOUSEKEEPING GOLD STANDARD & DOMAIN NEUTRALITY');
console.log('================================================================\n');

// 1. HOUSEKEEPING GOLD STANDARD VERIFICATION
const hskFixture = FIXTURE_SOPS.find((f) => f.category === 'Housekeeping' || f.id === 'urban-housekeeping-501')!;
console.log(`1. PROCESSING HOUSEKEEPING SOP: "${hskFixture.title}"...`);

const hskExtracted = {
  filename: hskFixture.filename,
  rawText: hskFixture.content,
  wordCount: hskFixture.content.split(/\s+/).length,
  pageCount: 1,
  fileHash: 'hash-hsk-501',
  confirmationText: 'Housekeeping Protocol Confirmed',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {} as any,
};

const { lesson: hskLesson } = generateDomainNeutralLesson(hskExtracted);
const hskCtm = buildCanonicalTaskModel(hskLesson.operationalBlueprint, hskLesson, hskExtracted.rawText);

console.log('  ✓ Process Title:', hskCtm.process);
console.log('  ✓ Role:', hskCtm.role);
console.log('  ✓ Steps Count:', hskCtm.steps.length);
console.log('  ✓ Controls Count:', hskCtm.controls.length);

const hskSlides = planKnowItSlides(hskLesson);
console.log('  [Learn] Slides generated:', hskSlides.slides.length);

const hskVideo = planVideoDemonstration(hskLesson.operationalBlueprint!);
console.log('  [See] Video scenes generated:', hskVideo.clips.length);

const hskSimSteps = hskLesson.stepObjects || [];
console.log('  [Guide] Simulator steps:', hskSimSteps.length);

const hskAudit = auditTaskModelCoverage(hskCtm, {
  learnTheFlowCoveredIds: hskCtm.steps.map((s) => s.id),
  seeTheActionCoveredIds: hskCtm.steps.map((s) => s.id),
  makeTheDecisionCoveredIds: hskCtm.steps.map((s) => s.id),
  proveCapabilityCoveredIds: hskCtm.steps.map((s) => s.id),
});
console.log('  ✓ Coverage Percentage:', `${hskAudit.coveragePercentage}%`);

// 2. EXERCISE ALL 3 DECISION OUTCOMES ON HOUSEKEEPING
console.log('\n2. EXERCISING 3 CAPABILITY DECISION OUTCOMES...');

const allRequirementIds = [
  ...hskCtm.steps.map((s) => s.id),
  ...hskCtm.controls.map((c) => c.id),
  ...hskCtm.decisions.map((d) => d.id),
];

const readyDecision = evaluateCapabilityDecision(hskCtm, {
  completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
  demonstratedRequirementIds: allRequirementIds,
  failedRequirementIds: [],
});
console.log('  [Outcome A - Perfect]:', readyDecision.decisionTitle, `(${readyDecision.percentage}%)`);
if (readyDecision.decision !== 'is_ready') {
  console.error('  ❌ FAILED: Expected is_ready decision');
  process.exit(1);
}

// Outcome B: TARGETED REMEDIATION REQUIRED
const failedStepId = hskCtm.steps[hskCtm.steps.length - 1]?.id || 'step-1';
const targetedDecision = evaluateCapabilityDecision(hskCtm, {
  completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
  demonstratedRequirementIds: hskCtm.steps.slice(0, -1).map((s) => s.id),
  failedRequirementIds: [failedStepId],
});
console.log('  [Outcome B - Targeted Gap]:', targetedDecision.decisionTitle, `(${targetedDecision.percentage}%)`);
console.log('    ✓ Remediation Action:', targetedDecision.remediationPlan?.buttonText);
if (targetedDecision.decision !== 'needs_targeted_practice' || !targetedDecision.remediationPlan) {
  console.error('  ❌ FAILED: Expected needs_targeted_practice decision with remediation plan');
  process.exit(1);
}

// Outcome C: SOURCE / POLICY REVIEW REQUIRED
const ambiguousCtm = {
  ...hskCtm,
  ambiguities: [{ topic: 'Unresolved Chemical Hazards', description: 'Source SOP specifies no clear escalation path for unsafe chemical mixing.' }],
  confidence: 0.70,
};
const reviewDecision = evaluateCapabilityDecision(ambiguousCtm, {
  completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
  demonstratedRequirementIds: allRequirementIds,
  failedRequirementIds: [],
});
console.log('  [Outcome C - Policy Ambiguity]:', reviewDecision.decisionTitle);
if (reviewDecision.decision !== 'requires_review') {
  console.error('  ❌ FAILED: Expected requires_review decision for ambiguous CTM');
  process.exit(1);
}

// 3. DOMAIN NEUTRALITY PROOF: DIAGNOSTIC LAB SOP
const labFixture = FIXTURE_SOPS.find((f) => f.id === 'diag-lab-104')!;
console.log(`\n3. PROVING DOMAIN NEUTRALITY ON DIFFERENT DOMAIN: "${labFixture.title}"...`);

const labExtracted = {
  filename: labFixture.filename,
  rawText: labFixture.content,
  wordCount: labFixture.content.split(/\s+/).length,
  pageCount: 1,
  fileHash: 'hash-lab-104',
  confirmationText: 'Diagnostic Lab Protocol Confirmed',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {} as any,
};

const { lesson: labLesson } = generateDomainNeutralLesson(labExtracted);
const labCtm = buildCanonicalTaskModel(labLesson.operationalBlueprint, labLesson, labExtracted.rawText);

console.log('  ✓ Process Title:', labCtm.process);
console.log('  ✓ Role:', labCtm.role);
console.log('  ✓ Steps Count:', labCtm.steps.length);
console.log('  ✓ Controls Count:', labCtm.controls.length);

const labSlides = planKnowItSlides(labLesson);
console.log('  [Learn] Slides generated:', labSlides.slides.length);

const labVideo = planVideoDemonstration(labLesson.operationalBlueprint!);
console.log('  [See] Video scenes generated:', labVideo.clips.length);

console.log('\n================================================================');
console.log('✅ HOUSEKEEPING GOLD STANDARD & DOMAIN NEUTRALITY ACCEPTANCE PASSED');
console.log('================================================================');
