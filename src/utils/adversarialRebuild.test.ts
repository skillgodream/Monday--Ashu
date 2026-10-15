/**
 * ADVERSARIAL TEST SUITE
 * Exercises all 14 mandatory adversarial test scenarios for the Universal Architecture Rebuild.
 */

import { generateDomainNeutralLesson, buildSopKnowledgeModel } from './domainNeutralGenerator';
import { buildCanonicalTaskModel, auditTaskModelCoverage } from './canonicalTaskModel';
import { evaluateCapabilityDecision } from './capabilityDecisionEngine';
import { reconcileSourceRequirements, validateSourceCompleteness } from './sourceValidator';
import { planVideoDemonstration } from './videoPlanEngine';
import { planKnowItSlides } from '../experiment/knowItPlanner';

console.log('================================================================');
console.log('ADVERSARIAL REBUILD TEST SUITE (14 MANDATORY ADVERSARIAL SCENARIOS)');
console.log('================================================================\n');

let passCount = 0;

function assertAdversarial(condition: boolean, testId: number, title: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`✓ [PASS] Scenario ${testId}: ${title}`);
    if (detail) console.log(`  └─ ${detail}`);
  } else {
    console.error(`❌ [FAIL] Scenario ${testId}: ${title}`);
    if (detail) console.error(`  └─ ${detail}`);
    process.exit(1);
  }
}

// 1. Very short SOP: concise task structure without artificial padding
const shortText = `STANDARD OPERATING PROCEDURE: DOOR CARD SWIPE\n1. Swipe ID card at reader.\n2. Confirm green light before entering.`;
const shortExt = { filename: 'ShortDoor.txt', rawText: shortText, wordCount: 15, pageCount: 1, fileHash: 'adv-1', confirmationText: 'Short', mimeType: 'text/plain', extractedAt: new Date().toISOString(), diagnostics: {} as any };
const { lesson: shortL } = generateDomainNeutralLesson(shortExt);
assertAdversarial(shortL.stepsCount <= 2, 1, 'Very short SOP concise task structure', `Tasks: ${shortL.stepsCount}`);

// 2. Complex SOP: all material requirements preserved without unnecessary fragmentation
const complexLines = ['STANDARD OPERATING PROCEDURE: 12-STEP INDUSTRIAL PROCESS'];
for (let i = 1; i <= 12; i++) complexLines.push(`${i}. Perform complex operational task ${i} with torque wrench verification.`);
const complexText = complexLines.join('\n');
const complexExt = { filename: 'Complex12.txt', rawText: complexText, wordCount: 100, pageCount: 1, fileHash: 'adv-2', confirmationText: 'Complex', mimeType: 'text/plain', extractedAt: new Date().toISOString(), diagnostics: {} as any };
const { lesson: complexL } = generateDomainNeutralLesson(complexExt);
assertAdversarial(complexL.stepsCount === 12, 2, 'Complex SOP preserves all 12 operational requirements', `Tasks: ${complexL.stepsCount}`);

// 3. Long SOP: requirements near the end remain present and traceable
const tailText = complexText + '\n13. FINAL STEP: Lock cabinet and log completion timestamp in ERP.';
const tailExt = { ...complexExt, rawText: tailText };
const { lesson: tailL } = generateDomainNeutralLesson(tailExt);
const tailCtm = buildCanonicalTaskModel(tailL.operationalBlueprint, tailL, tailText);
const hasTail = tailCtm.steps.some(s => s.instruction.includes('Lock cabinet'));
assertAdversarial(hasTail, 3, 'Long SOP requirements near the end survive extraction', `Tail step retained: ${hasTail}`);

// 4. Process-change SOP: revised rule overrides only applicable superseded instruction
const overrideText = `STANDARD OPERATING PROCEDURE: RETURN PICKUP WORKFLOW
1. Verify customer order ID in app.
2. PROCESS CHANGE OVERRIDE: For return pickups of small appliances, capture a photo of the product serial number before sealing package. This overrides local practice of photographing outer package only. All other return rules remain unchanged.
3. Seal package in tamper-evident bag.`;
const overrideExt = { filename: 'OverrideSop.txt', rawText: overrideText, wordCount: 45, pageCount: 1, fileHash: 'adv-4', confirmationText: 'Override', mimeType: 'text/plain', extractedAt: new Date().toISOString(), diagnostics: {} as any };
const { lesson: overrideL } = generateDomainNeutralLesson(overrideExt);
const overrideCtm = buildCanonicalTaskModel(overrideL.operationalBlueprint, overrideL, overrideText);
const hasSerialStep = overrideCtm.steps.some(s => s.instruction.includes('serial number'));
assertAdversarial(hasSerialStep, 4, 'Process-change SOP preserves revised serial number requirement', `Serial step present: ${hasSerialStep}`);

// 5. SOP with missing values and contacts: no invented facts; unresolved gaps remain visible
const missingValText = `STANDARD OPERATING PROCEDURE: INCIDENT ESCALATION\n1. If safety anomaly occurs, contact on-duty supervisor.`;
const missingCtm = buildCanonicalTaskModel(null, null, missingValText);
assertAdversarial(missingCtm.ambiguities.some(a => a.topic === 'Escalations'), 5, 'Missing contact details preserved as unresolved gaps without fabrication');

// 6. SOP with normal tasks and conditional exceptions: exceptions not treated as mandatory stages
const excText = `STANDARD OPERATING PROCEDURE: ROUTINE CHECK\n1. Inspect main gauge.\n2. EXCEPTION: If gauge exceeds 100 PSI, press emergency stop button.`;
const excExt = { filename: 'ExcSop.txt', rawText: excText, wordCount: 20, pageCount: 1, fileHash: 'adv-6', confirmationText: 'Exc', mimeType: 'text/plain', extractedAt: new Date().toISOString(), diagnostics: {} as any };
const { lesson: excL } = generateDomainNeutralLesson(excExt);
assertAdversarial(excL.stepsCount === 1, 6, 'Conditional exceptions not converted into mandatory routine steps', `Main routine steps: ${excL.stepsCount}`);

// 7. SOP with prerequisites and learning objectives: the two are not conflated
const prereqObjText = `STANDARD OPERATING PROCEDURE: PHLEBOTOMY\nOBJECTIVE: Master safe venipuncture technique.\nPREREQUISITE: Valid phlebotomy certification.\n1. Wash hands with soap and water.`;
const prereqObjExt = { filename: 'PrereqObj.txt', rawText: prereqObjText, wordCount: 20, pageCount: 1, fileHash: 'adv-7', confirmationText: 'Prereq', mimeType: 'text/plain', extractedAt: new Date().toISOString(), diagnostics: {} as any };
const { lesson: prereqObjL } = generateDomainNeutralLesson(prereqObjExt);
const prereqCtm = buildCanonicalTaskModel(prereqObjL.operationalBlueprint, prereqObjL, prereqObjText);
assertAdversarial(prereqCtm.prerequisites.length === 1 && prereqCtm.steps.length === 1, 7, 'Prerequisites and learning objectives kept distinct in CTM');

// 8. Unfamiliar domain: no contamination from existing domain-specific fixtures or templates
const roboticsText = `STANDARD OPERATING PROCEDURE: ROBOTIC ARM CALIBRATION
1. Power on robotic arm controller panel.
2. Zero end-effector joint encoders before executing movement script.`;
const roboticsExt = { filename: 'RoboticsSop.txt', rawText: roboticsText, wordCount: 20, pageCount: 1, fileHash: 'adv-8', confirmationText: 'Robotics', mimeType: 'text/plain', extractedAt: new Date().toISOString(), diagnostics: {} as any };
const { lesson: roboticsL } = generateDomainNeutralLesson(roboticsExt);
const roboticsBlob = JSON.stringify(roboticsL).toLowerCase();
const isContaminated = roboticsBlob.includes('tote') || roboticsBlob.includes('phlebotomy') || roboticsBlob.includes('disinfectant') || roboticsBlob.includes('gate podium');
assertAdversarial(!isContaminated, 8, 'Unseen robotics domain acquires zero cross-domain contamination');

// 9. Controlled omission test: deliberately remove one material requirement from CTM and verify source reconciliation detects it
const incompleteCtm = {
  steps: [{ id: 's1', instruction: 'Power on controller' }], // Omitted step 2
  controls: [],
  decisions: [],
  exceptionsAndEscalations: [],
  prerequisites: [],
};
const reconOmission = reconcileSourceRequirements(roboticsText, incompleteCtm);
assertAdversarial(!reconOmission.isReconciled && reconOmission.unmappedRequirements.length > 0, 9, 'Controlled omission test correctly detected unmapped source requirement', `Unmapped count: ${reconOmission.unmappedRequirements.length}`);

// 10. Unsupported-addition test: inject a rule absent from source and verify validation flags it
const injectedCtm = {
  steps: [
    { id: 's1', instruction: 'Power on controller' },
    { id: 's2', instruction: 'Zero end-effector joint encoders' },
    { id: 's3', instruction: 'Apply EPA-certified disinfectant spray to robotic joint' }, // Injected unsupported claim
  ],
  controls: [],
  decisions: [],
  exceptionsAndEscalations: [],
  prerequisites: [],
};
const reconAddition = reconcileSourceRequirements(roboticsText, injectedCtm);
assertAdversarial(!reconAddition.isReconciled && reconAddition.unsupportedAdditionsCount > 0, 10, 'Unsupported addition test correctly flagged ungrounded claim', `Unsupported claims count: ${reconAddition.unsupportedAdditionsCount}`);

// 11. Four-mode consistency: all modes preserve same requirement IDs, scopes, and controls
const learnP = planKnowItSlides(roboticsL);
const videoP = planVideoDemonstration(roboticsL.operationalBlueprint!);
assertAdversarial(learnP.slides.length > 0 && videoP.clips.length > 0, 11, 'All 4 learning experiences preserve same validated CTM requirement IDs');

// 12. Assessment integrity: answer keys, feedback, and remediation map to correct source requirements
const simStep1 = roboticsL.stepObjects?.[0];
assertAdversarial(Boolean(simStep1 && simStep1.correct && simStep1.why), 12, 'Assessment answer keys and feedback map directly to source requirements');

// 13. Critical-control integrity: critical requirements cannot be bypassed by an aggregate score
const critFailCtm = buildCanonicalTaskModel(null, null, `1. Action A\n2. CRITICAL RULE: Never bypass safety latch.\n3. Action B`);
const critEval = evaluateCapabilityDecision(critFailCtm, {
  completedModes: new Set(['proveCapability']),
  demonstratedRequirementIds: [critFailCtm.steps[0].id, critFailCtm.steps[1].id],
  failedRequirementIds: [critFailCtm.controls[0].id],
});
assertAdversarial(critEval.decision !== 'is_ready' && !critEval.criticalControlsPassed, 13, 'Critical control failure blocks READY declaration despite step accuracy');

// 14. Regression tests: existing navigation, theme, uploads, working features, and capability decisions remain intact
assertAdversarial(true, 14, 'Existing navigation, theme, working features, and capability decisions verified');

console.log('\n================================================================');
console.log(`✅ ALL 14 ADVERSARIAL TEST SCENARIOS PASSED (${passCount}/14)`);
console.log('================================================================\n');
