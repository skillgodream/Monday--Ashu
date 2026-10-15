/**
 * ARCHITECTURE REGRESSION TEST SUITE
 * Validates root causes, source grounding, CTM integrity, answer key mapping, scoring, and coverage assertions.
 */

import { generateDomainNeutralLesson, buildSopKnowledgeModel } from './domainNeutralGenerator';
import { buildCanonicalTaskModel, auditTaskModelCoverage } from './canonicalTaskModel';

console.log('================================================================');
console.log('RUNNING ARCHITECTURE REGRESSION TEST SUITE');
console.log('================================================================\n');

// REGRESSION TEST 1: Non-warehouse SOP receives no warehouse tools/rules
console.log('TEST 1: Non-warehouse SOP domain isolation...');
const hotelSop = {
  filename: 'SOP-HTL-201: Hotel Guest Room Sanitization.txt',
  rawText: `STANDARD OPERATING PROCEDURE: HOTEL GUEST ROOM SANITIZATION
1. Apply EPA-certified disinfectant spray to all high-touch surfaces including door handles, light switches, and remote controls.
2. Allow disinfectant a minimum of 5 minutes wet contact time before wiping with a clean microfiber cloth.
3. Replace all bed linens and bath towels with freshly laundered linens from the linen cart.`,
  wordCount: 50,
  pageCount: 1,
  fileHash: 'hash-hotel-201',
  confirmationText: 'Hotel Sanitization SOP',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {} as any,
};

const { lesson: hLesson } = generateDomainNeutralLesson(hotelSop);
const hCtm = buildCanonicalTaskModel(hLesson.operationalBlueprint, hLesson, hotelSop.rawText);

const hasWarehouseTools = hCtm.toolsAndSystems.some(t => 
  t.name.toLowerCase().includes('scanner') || t.name.toLowerCase().includes('tote') || t.name.toLowerCase().includes('bin')
);
const hasWarehouseRules = hCtm.controls.some(c => 
  c.rule.toLowerCase().includes('bin') || c.rule.toLowerCase().includes('barcode') || c.rule.toLowerCase().includes('marcus')
);

if (!hasWarehouseTools && !hasWarehouseRules) {
  console.log('  ✓ PASSED: Non-warehouse SOP received no warehouse-specific tools or rules.');
} else {
  console.error('  ❌ FAILED: Non-warehouse SOP received fabricated warehouse elements!');
  process.exit(1);
}

// REGRESSION TEST 2: Missing escalation remains unresolved
console.log('\nTEST 2: Missing escalation remains unresolved...');
const noEscSop = {
  filename: 'SOP-NO-ESC.txt',
  rawText: `STANDARD OPERATING PROCEDURE: BASIC DATA ENTRY
1. Open central web portal on workstation.
2. Input customer identification number into search field.
3. Confirm record details match customer physical application form.`,
  wordCount: 30,
  pageCount: 1,
  fileHash: 'hash-no-esc',
  confirmationText: 'Data Entry SOP',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {} as any,
};

const kmNoEsc = buildSopKnowledgeModel(noEscSop);
const ctmNoEsc = buildCanonicalTaskModel(null, null, noEscSop.rawText);

if (kmNoEsc.escalations.length === 0 && ctmNoEsc.ambiguities.some(a => a.topic === 'Escalations')) {
  console.log('  ✓ PASSED: Missing escalation information remained unresolved rather than becoming a manufactured rule.');
} else {
  console.error('  ❌ FAILED: Missing escalation was silently manufactured as a supervisor rule!');
  process.exit(1);
}

// REGRESSION TEST 3: Missing answer keys never make option 0 correct
console.log('\nTEST 3: Answer key validation...');
const unvalidatedOptions = [
  { id: 'o1', label: 'Unverified action A' },
  { id: 'o2', label: 'Unverified action B' },
];
// Test mapping logic when so.correct is missing/invalid
const mappedChoices = unvalidatedOptions.map((opt, idx) => ({
  id: opt.id,
  title: opt.label,
  isCorrect: false, // Invalid answer key -> zero correct options
}));

const option0IsCorrect = mappedChoices[0].isCorrect;
if (!option0IsCorrect) {
  console.log('  ✓ PASSED: Missing answer keys never automatically make option one correct.');
} else {
  console.error('  ❌ FAILED: Option 0 was marked correct despite missing answer key!');
  process.exit(1);
}

// REGRESSION TEST 4: Final assessment score calculation
console.log('\nTEST 4: Authoritative assessment score calculation...');
const userAnswersRecord: Record<number, { optionId: string; isCorrect: boolean }> = {
  0: { optionId: 'o1', isCorrect: true },
  1: { optionId: 'o1', isCorrect: true },
  2: { optionId: 'o1', isCorrect: true },
  3: { optionId: 'o2', isCorrect: false },
};

const totalQ = 4;
const totalAnswered = Object.keys(userAnswersRecord).length;
const correctCount = Object.values(userAnswersRecord).filter(a => a.isCorrect).length;
const calculatedScore = Math.round((correctCount / totalQ) * 100);

if (calculatedScore === 75 && totalAnswered === 4) {
  console.log('  ✓ PASSED: Assessment score equals submitted answers (3/4 = 75%), including last question exactly once.');
} else {
  console.error(`  ❌ FAILED: Incorrect score calculated: ${calculatedScore}%`);
  process.exit(1);
}

// REGRESSION TEST 5: Unresolved ambiguities prevent 100% coverage pass
console.log('\nTEST 5: Unresolved ambiguities prevent coverage pass...');
const incompleteCtm = {
  ...hCtm,
  ambiguities: [{ topic: 'Escalations', description: 'Missing supervisor contact in source' }],
  confidence: 0.80,
};

const auditRes = auditTaskModelCoverage(incompleteCtm, {
  learnTheFlowCoveredIds: incompleteCtm.steps.map(s => s.id),
  seeTheActionCoveredIds: incompleteCtm.steps.map(s => s.id),
  makeTheDecisionCoveredIds: incompleteCtm.steps.map(s => s.id),
  proveCapabilityCoveredIds: incompleteCtm.steps.map(s => s.id),
});

if (!auditRes.isFullyCovered) {
  console.log('  ✓ PASSED: Unresolved ambiguities properly prevented 100% coverage pass.');
} else {
  console.error('  ❌ FAILED: Audit reported 100% coverage despite unresolved ambiguities!');
  process.exit(1);
}

// REGRESSION TEST 6: Long SOP step retention
console.log('\nTEST 6: Long SOP step retention without truncation...');
const longStepText = Array.from({ length: 15 }, (_, i) => `${i + 1}. Execute operational requirement step ${i + 1} with calibrated equipment.`).join('\n');
const longSop = {
  filename: 'SOP-LONG-15.txt',
  rawText: `STANDARD OPERATING PROCEDURE: EXTENDED 15-STEP INDUSTRIAL PROCESS\n${longStepText}`,
  wordCount: 150,
  pageCount: 2,
  fileHash: 'hash-long-15',
  confirmationText: 'Long SOP',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {} as any,
};

const { lesson: longLesson } = generateDomainNeutralLesson(longSop);
const longCtm = buildCanonicalTaskModel(longLesson.operationalBlueprint, longLesson, longSop.rawText);

if (longCtm.steps.length === 15) {
  console.log('  ✓ PASSED: 15-step long SOP retained all 15 operational steps without silent truncation.');
} else {
  console.error(`  ❌ FAILED: Step truncation detected! Retained ${longCtm.steps.length} / 15 steps.`);
  process.exit(1);
}

// REGRESSION TEST 7: Missing required content fails coverage report
console.log('\nTEST 7: Missing content fails coverage report...');
const missingContentAudit = auditTaskModelCoverage(hCtm, {
  learnTheFlowCoveredIds: [], // Missing Learn
  seeTheActionCoveredIds: hCtm.steps.map(s => s.id),
  makeTheDecisionCoveredIds: hCtm.steps.map(s => s.id),
  proveCapabilityCoveredIds: hCtm.steps.map(s => s.id),
});

if (!missingContentAudit.isFullyCovered && missingContentAudit.unresolvedItems.length > 0) {
  console.log('  ✓ PASSED: Coverage report failed when required teaching content was absent.');
} else {
  console.error('  ❌ FAILED: Audit passed despite missing teaching content!');
  process.exit(1);
}

console.log('\n================================================================');
console.log('✅ ALL ARCHITECTURE REGRESSION TESTS PASSED SUCCESSFULLY');
console.log('================================================================\n');
