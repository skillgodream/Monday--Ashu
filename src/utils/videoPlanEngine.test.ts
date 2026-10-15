/**
 * Guruji Intelligent Video Planning Engine - Regression & Quality Test Suite
 * 
 * Tests:
 * 1. Phlebotomy SOP regression test ("Hematoma develops" exception disposition)
 * 2. POSH SOP regression test ("Zero tolerance" statutory prohibition disposition to Test Me)
 * 3. Ambiguous/Unresolved items detection (ensures validation failure on unresolved items)
 * 4. Duplicate prevention & accountable disposition check (exactly 1 ledger record per item)
 * 5. Fixture SOPs end-to-end plan generation (Hotel, Housekeeping, Warehouse, Lab)
 * 6. Semantic association test (generic words do not trigger false association)
 * 7. Priority matching test (structured source references take highest priority)
 * 8. Ambiguity detection test (multiple plausible step matches flagged as unresolved/routed to guide me)
 * 9. Unassociated rule preservation test (zero silent omission)
 * 10. Destination learning content audit (Know It / Guide Me / Test Me content verification)
 */

import { OperationalBlueprint, VideoDemonstrationPlan } from '../types';
import { planVideoDemonstration, validateVideoPlan, isProhibitiveRule, matchesStepRef, makeLedgerItemId } from './videoPlanEngine';
import { FIXTURE_SOPS } from '../data/fixtureSops';
import { buildSopKnowledgeModel, buildOperationalBlueprintFromKnowledgeModel } from './domainNeutralGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('================================================================');
console.log('GURUJI VIDEO PLAN ENGINE - PHASE 3 REGRESSION & QUALITY AUDIT');
console.log('================================================================\n');

// ============================================================================
// TEST 1: PHLEBOTOMY REGRESSION TEST ("Hematoma develops" exception)
// ============================================================================
console.log('TEST 1: Phlebotomy SOP - "Hematoma develops" exception association & ledger tracking');

const phlebotomyBlueprint: OperationalBlueprint = {
  document_identity: {
    doc_title: 'Diagnostic Laboratory Patient Registration & Blood Sample Collection',
    doc_ref: 'SOP-LAB-104',
    version: '2.1',
    department: 'Pathology & Diagnostic Medicine',
  },
  role: 'Phlebotomist',
  process: 'Diagnostic Venipuncture and Specimen Handling',
  purpose: 'Standardize patient identification, safe venipuncture, and specimen integrity.',
  scope: 'Applies to all outpatient and inpatient blood draws.',
  prerequisites: [
    {
      text: 'Valid phlebotomy certification and annual bloodborne pathogen training.',
      source_ref: 'pre-1',
      source_text: 'Staff must maintain active phlebotomy credentials and biohazard safety training.',
    },
  ],
  tools_and_systems: [
    {
      name: 'BD Vacutainer Evacuated Blood Collection System',
      purpose: 'Closed-system venous blood collection',
      never_do: 'Never reuse single-use needles or adaptors.',
      source_ref: 'tool-1',
      source_text: 'Use sterile closed-system collection tubes and needles.',
    },
  ],
  terminology: [
    {
      term: 'Syncope',
      meaning: 'Transient loss of consciousness caused by cerebral hypoperfusion (fainting).',
      source_ref: 'term-1',
      source_text: 'Monitor for vasovagal pre-syncope symptoms.',
    },
  ],
  operational_steps: [
    {
      instruction: 'Greet patient at intake desk, verify full legal name and date of birth against photo ID, and verify 12-hour fasting requirement in LIMS.',
      category: 'CHECK',
      task_title: 'Patient Identification & Requisition Verification',
      source: { page_or_section: 'Section 1', source_ref: 'step-1', source_text: 'Verify patient identity and fasting requisitions.' },
      action_verb: 'Verify',
      critical_control: true,
    },
    {
      instruction: 'Print barcode specimen labels and verify patient details match printed labels before entering draw room.',
      category: 'DO',
      task_title: 'Specimen Label Preparation',
      source: { page_or_section: 'Section 1', source_ref: 'step-2', source_text: 'Print barcode labels and match wristband.' },
      action_verb: 'Print',
    },
    {
      instruction: 'Sanitize phlebotomy station, don fresh disposable nitrile gloves, and assemble sterile collection tubes in proper draw order.',
      category: 'DO',
      task_title: 'Station Sanitization & Tube Assembly',
      source: { page_or_section: 'Section 2', source_ref: 'step-3', source_text: 'Sanitize station, don gloves, arrange tubes.' },
      action_verb: 'Sanitize',
    },
    {
      instruction: 'Apply tourniquet 3-4 inches above venipuncture site and disinfect skin with 70% isopropyl alcohol swab in outward circular motion for 30 seconds.',
      category: 'DO',
      task_title: 'Tourniquet & Aseptic Site Preparation',
      source: { page_or_section: 'Section 2', source_ref: 'step-4', source_text: 'Apply tourniquet and clean skin with alcohol.' },
      action_verb: 'Disinfect',
    },
    {
      instruction: 'Perform venipuncture cleanly at 15 to 30 degree angle, draw required blood volume into tubes, and release tourniquet prior to needle withdrawal.',
      category: 'DO',
      task_title: 'Venipuncture Execution & Blood Draw',
      source: { page_or_section: 'Section 2', source_ref: 'step-5', source_text: 'Perform clean venipuncture and draw tubes.' },
      action_verb: 'Perform',
    },
    {
      instruction: 'Gently invert blood collection tubes 5 to 8 times immediately to mix anticoagulant and prevent micro-clot formation.',
      category: 'CHECK',
      task_title: 'Immediate Tube Inversion & Mixing',
      source: { page_or_section: 'Section 2', source_ref: 'step-6', source_text: 'Invert tubes 5-8 times immediately.' },
      action_verb: 'Invert',
      critical_control: true,
    },
    {
      instruction: 'Apply sterile pressure gauze and bandage to puncture site, and label specimen tubes at bedside in full view of the patient.',
      category: 'DO',
      task_title: 'Post-Puncture Dressing & Bedside Labeling',
      source: { page_or_section: 'Section 3', source_ref: 'step-7', source_text: 'Dress wound and label tubes in patient view.' },
      action_verb: 'Label',
    },
    {
      instruction: 'Observe patient for minimum 2 minutes post-collection for dizziness, pallor, or signs of syncope before discharge.',
      category: 'CHECK',
      task_title: 'Post-Collection Patient Monitoring & Discharge',
      source: { page_or_section: 'Section 3', source_ref: 'step-8', source_text: 'Observe patient for 2 minutes for syncope signs.' },
      action_verb: 'Observe',
    },
  ],
  decision_points: [
    {
      situation: 'Patient reports feeling dizzy, lightheaded, or displays sudden facial pallor during collection.',
      decision: 'Immediate collection termination and vasovagal safety positioning.',
      action: 'Release tourniquet, withdraw needle, lower patient head between knees or place chair in full supine position.',
      source_ref: 'step-5-dec-1',
      source_text: 'If syncope warning signs appear, abort draw immediately.',
    },
  ],
  exceptions: [
    {
      trigger: 'Hematoma develops during needle insertion or blood collection.',
      resolution: 'Release tourniquet immediately, withdraw needle without recapping into sharps bin, and apply continuous firm pressure with sterile gauze for at least 2 minutes.',
      source_ref: 'step-5-exc-1',
      source_text: 'At first sign of swelling/hematoma, release tourniquet, withdraw needle, and apply direct pressure.',
    },
  ],
  escalations: [
    {
      situation: 'Specimen integrity compromised by gross hemolysis, severe clotting, or unresolvable patient barcode mismatch.',
      contact_or_action: 'Quarantine sample, document incident in LIMS quality log, and notify Laboratory Director immediately.',
      source_ref: 'step-7-esc-1',
      source_text: 'Quarantine compromised sample and notify Lab Director.',
    },
  ],
  critical_controls: [
    {
      rule: 'Never reuse single-use blood collection needles or adaptors.',
      rationale: 'Prevent patient bloodborne pathogen cross-contamination.',
      source_ref: 'tool-1',
      source_text: 'Never reuse single-use needles.',
    },
  ],
  safety_rules: [
    {
      rule: 'Always wear disposable nitrile gloves and PPE throughout specimen handling.',
      source_ref: 'safe-1',
      source_text: 'Maintain standard universal precautions.',
    },
  ],
  quality_rules: [
    {
      rule: 'Verify all specimen tubes are filled to minimum fill line for accurate additive ratio.',
      source_ref: 'qual-1',
      source_text: 'Ensure correct blood draw volume ratio.',
    },
  ],
  customer_or_business_impact: [
    {
      impact: 'Ensures accurate diagnostic results and patient safety during blood collection.',
      source_ref: 'impact-1',
      source_text: 'Patient safety and specimen integrity.',
    },
  ],
  common_mistakes: [
    {
      mistake: 'Failing to invert tubes immediately after collection.',
      prevention: 'Invert 5-8 times immediately.',
      source_ref: 'mistake-1',
      source_text: 'Immediate inversion prevents clotting.',
    },
  ],
  source_evidence: [],
  confidence: 0.99,
};

const phlebotomyPlan = planVideoDemonstration(phlebotomyBlueprint);
console.log(`  Planned clips: ${phlebotomyPlan.clips.length}`);
console.log(`  Validation status: ${phlebotomyPlan.validation_status}`);
console.log(`  Coverage ledger count: ${phlebotomyPlan.coverage_ledger?.length}`);

assert(phlebotomyPlan.validation_status === 'valid', 'Phlebotomy video plan is marked VALID');
assert(phlebotomyPlan.clips.length >= 4, 'Sufficient scene count');

const hematomaItem = phlebotomyPlan.coverage_ledger?.find(i => i.source_ref === 'step-5-exc-1');
assert(Boolean(hematomaItem), '"Hematoma develops" is explicitly tracked in coverage ledger');
assert(hematomaItem?.disposition === 'represented_in_video', '"Hematoma develops" has valid disposition (represented_in_video)');
console.log(`  "Hematoma develops" disposition: ${hematomaItem?.disposition}, mode: ${hematomaItem?.assigned_mode}, reason: ${hematomaItem?.reason}`);

const zeroReuseItem = phlebotomyPlan.coverage_ledger?.find(i => i.description.toLowerCase().includes('never reuse') || i.source_ref === 'tool-1');
assert(Boolean(zeroReuseItem), '"Zero reuse" safety rule is explicitly tracked in coverage ledger');
assert(zeroReuseItem?.assigned_mode === 'Test Me', '"Zero reuse" prohibitive rule is assigned to Test Me');

const totalExpectedPhleb = phlebotomyBlueprint.operational_steps.length + phlebotomyBlueprint.critical_controls.length + phlebotomyBlueprint.decision_points.length + phlebotomyBlueprint.exceptions.length + phlebotomyBlueprint.escalations.length + phlebotomyBlueprint.prerequisites.length + phlebotomyBlueprint.safety_rules.length + phlebotomyBlueprint.quality_rules.length;
assert(phlebotomyPlan.coverage_ledger?.length === totalExpectedPhleb, `Ledger recorded exactly ${totalExpectedPhleb} items (zero silent omissions)`);
console.log('✅ TEST 1 PASSED: Phlebotomy regression test completed successfully.\n');


// ============================================================================
// TEST 2: POSH SOP REGRESSION TEST ("Zero tolerance" statutory prohibition)
// ============================================================================
console.log('TEST 2: POSH SOP - "Zero tolerance" statutory prohibition disposition to Test Me');

const poshBlueprint: OperationalBlueprint = {
  document_identity: {
    doc_title: 'Prevention of Sexual Harassment (POSH) Workplace Committee Guidelines',
    doc_ref: 'SOP-POSH-202',
    version: '3.0',
    department: 'Human Resources & Legal Compliance',
  },
  role: 'Internal Committee Member',
  process: 'Workplace Harassment Inquiry & Redressal',
  purpose: 'Enforce statutory compliance and zero-tolerance mandate against workplace harassment.',
  scope: 'Applies to all employees, contractors, and visitors.',
  prerequisites: [
    {
      text: 'Mandatory annual POSH orientation for all organizational personnel.',
      source_ref: 'pre-posh-1',
      source_text: 'All personnel must complete annual compliance training.',
    },
  ],
  tools_and_systems: [
    {
      name: 'Secure Confidential Grievance Portal',
      purpose: 'Encrypted digital complaint intake',
      never_do: 'Never store unencrypted grievance records on local workstations.',
      source_ref: 'tool-posh-1',
      source_text: 'Use secure encrypted grievance portal.',
    },
  ],
  terminology: [
    {
      term: 'Quid Pro Quo',
      meaning: 'Unwelcome sexually determined behavior linked to employment decisions.',
      source_ref: 'term-posh-1',
      source_text: 'Define quid pro quo harassment clearly.',
    },
  ],
  operational_steps: [
    {
      instruction: 'Receive formal written complaint of harassment within 3 months of incident date and log into confidential portal.',
      category: 'CHECK',
      task_title: 'Formal Complaint Intake & Logging',
      source: { page_or_section: 'Section 1', source_ref: 'step-1', source_text: 'Receive complaint within 3 months.' },
      action_verb: 'Receive',
      critical_control: true,
    },
    {
      instruction: 'Convene Internal Committee quorum within 7 working days of receipt to review complaint admissibility.',
      category: 'DO',
      task_title: 'Internal Committee Quorum Convening',
      source: { page_or_section: 'Section 1', source_ref: 'step-2', source_text: 'Convene IC quorum within 7 days.' },
      action_verb: 'Convene',
    },
    {
      instruction: 'Provide copy of formal complaint to respondent and collect written response along with supporting document evidence.',
      category: 'CHECK',
      task_title: 'Respondent Notice & Evidence Collection',
      source: { page_or_section: 'Section 2', source_ref: 'step-3', source_text: 'Issue notice to respondent and collect reply.' },
      action_verb: 'Issue',
      critical_control: true,
    },
    {
      instruction: 'Conduct confidential inquiry interviews with complainant, respondent, and listed witnesses with verbatim minutes.',
      category: 'DO',
      task_title: 'Confidential Inquiry & Witness Interviews',
      source: { page_or_section: 'Section 2', source_ref: 'step-4', source_text: 'Conduct confidential inquiry hearings.' },
      action_verb: 'Conduct',
    },
    {
      instruction: 'Draft inquiry report with findings and submit recommendations to employer within 90 days.',
      category: 'DO',
      task_title: 'Inquiry Report & Recommendation Drafting',
      source: { page_or_section: 'Section 3', source_ref: 'step-5', source_text: 'Submit inquiry report within 90 days.' },
      action_verb: 'Submit',
    },
  ],
  decision_points: [
    {
      situation: 'Complainant requests interim conciliation settlement prior to formal inquiry completion.',
      decision: 'Facilitate monetary-free conciliation under statutory guidelines if requested in writing.',
      action: 'Record terms of conciliation settlement and forward copies to employer without monetary settlement.',
      source_ref: 'step-3-dec-1',
      source_text: 'Conciliation allowed without monetary settlement if requested by aggrieved woman.',
    },
  ],
  exceptions: [
    {
      trigger: 'Respondent fails to appear for scheduled inquiry hearings after 3 successive written notices.',
      resolution: 'Proceed ex-parte with inquiry proceedings after recording formal service of notice.',
      source_ref: 'step-4-exc-1',
      source_text: 'If respondent fails to appear after 3 notices, proceed ex-parte.',
    },
  ],
  escalations: [
    {
      situation: 'Immediate threat to complainant safety or evidence tampering by respondent during inquiry.',
      contact_or_action: 'Recommend immediate workplace transfer or leave of absence to employer executive committee.',
      source_ref: 'step-4-esc-1',
      source_text: 'Recommend interim relief such as transfer or leave.',
    },
  ],
  critical_controls: [
    {
      rule: 'Zero tolerance for retaliatory action against reporting employee, witnesses, or IC committee members.',
      rationale: 'Protect statutory reporting rights and prevent intimidation.',
      source_ref: 'ctrl-posh-zero-tol',
      source_text: 'Zero tolerance for retaliation.',
    },
  ],
  safety_rules: [
    {
      rule: 'Maintain strict confidentiality of all inquiry proceedings, identities, and records under statutory privacy mandates.',
      source_ref: 'safe-posh-1',
      source_text: 'Maintain strict confidentiality.',
    },
  ],
  quality_rules: [],
  customer_or_business_impact: [
    {
      impact: 'Ensures a safe, harassment-free workplace compliant with statutory POSH legal frameworks.',
      source_ref: 'impact-posh-1',
      source_text: 'Safe workplace compliance.',
    },
  ],
  common_mistakes: [
    {
      mistake: 'Breaching confidentiality of complainant identity during inquiry process.',
      prevention: 'Keep all records under lock and key or encrypted digital access.',
      source_ref: 'mistake-posh-1',
      source_text: 'Do not breach confidentiality.',
    },
  ],
  source_evidence: [],
  confidence: 0.99,
};

const poshPlan = planVideoDemonstration(poshBlueprint);
console.log(`  Planned clips: ${poshPlan.clips.length}`);
console.log(`  Validation status: ${poshPlan.validation_status}`);
console.log(`  Coverage ledger count: ${poshPlan.coverage_ledger?.length}`);

assert(poshPlan.validation_status === 'valid', 'POSH video plan is marked VALID');
const zeroTolItem = poshPlan.coverage_ledger?.find(i => i.description.toLowerCase().includes('zero tolerance'));
assert(Boolean(zeroTolItem), '"Zero tolerance" control is present in coverage ledger');
assert(zeroTolItem?.disposition === 'assigned_to_learning_mode', '"Zero tolerance" is assigned to learning mode, not forced into video');
assert(zeroTolItem?.assigned_mode === 'Test Me', '"Zero tolerance" prohibitive mandate is assigned specifically to Test Me');
console.log(`  "Zero tolerance" disposition: ${zeroTolItem?.disposition}, mode: ${zeroTolItem?.assigned_mode}`);
console.log(`  Reason: ${zeroTolItem?.reason}`);

const totalExpectedPosh = poshBlueprint.operational_steps.length + poshBlueprint.critical_controls.length + poshBlueprint.decision_points.length + poshBlueprint.exceptions.length + poshBlueprint.escalations.length + poshBlueprint.prerequisites.length + poshBlueprint.safety_rules.length + poshBlueprint.quality_rules.length;
assert(poshPlan.coverage_ledger?.length === totalExpectedPosh, `POSH ledger recorded exactly ${totalExpectedPosh} items with zero silent omissions`);
console.log('✅ TEST 2 PASSED: POSH regression test completed successfully.\n');


// ============================================================================
// TEST 3: UNRESOLVED ITEMS DETECTION (BLOCKS VALIDATION ON AMBIGUOUS CRITICAL ITEMS)
// ============================================================================
console.log('TEST 3: Unresolved items detection - Ensures planner blocks validation when critical items are ambiguous');

const flawedBlueprint: OperationalBlueprint = {
  ...phlebotomyBlueprint,
  critical_controls: [
    {
      rule: '', // Empty control rule triggering unresolved review
      rationale: '',
      source_ref: 'broken-ctrl-99',
      source_text: '',
    },
  ],
};

const flawedPlan = planVideoDemonstration(flawedBlueprint);
console.log(`  Flawed plan validation status: ${flawedPlan.validation_status}`);
console.log(`  Flawed plan validation errors: ${flawedPlan.validation_errors?.length}`);
assert(flawedPlan.validation_status === 'invalid', 'Planner marks flawed plan INVALID');
assert(Boolean(flawedPlan.validation_errors && flawedPlan.validation_errors.length > 0), 'Planner outputs validation error for unresolved empty critical control');
assert(Boolean(flawedPlan.unresolved_items && flawedPlan.unresolved_items.length > 0), 'Planner captures unresolved items in plan.unresolved_items');
console.log(`  Detected error message: ${flawedPlan.validation_errors?.[0]}`);
console.log('✅ TEST 3 PASSED: Unresolved item correctly blocked plan approval.\n');


// ============================================================================
// TEST 4: NO DUPLICATE ASSIGNMENTS & ACCCOUNTABLE LEDGER INTEGRITY
// ============================================================================
console.log('TEST 4: Accountable ledger integrity - Verifies unique ledger IDs and non-overlapping assignments');

const idSet = new Set<string>();
let hasDuplicates = false;
phlebotomyPlan.coverage_ledger?.forEach(item => {
  if (idSet.has(item.item_id)) {
    console.error(`  Duplicate ID found: ${item.item_id}`);
    hasDuplicates = true;
  }
  idSet.add(item.item_id);
});
assert(!hasDuplicates, 'All ledger items in phlebotomy plan have unique item_ids');

const poshIdSet = new Set<string>();
let hasPoshDuplicates = false;
poshPlan.coverage_ledger?.forEach(item => {
  if (poshIdSet.has(item.item_id)) {
    console.error(`  Duplicate ID found: ${item.item_id}`);
    hasPoshDuplicates = true;
  }
  poshIdSet.add(item.item_id);
});
assert(!hasPoshDuplicates, 'All ledger items in POSH plan have unique item_ids');
console.log('✅ TEST 4 PASSED: Ledger integrity and uniqueness verified.\n');


// ============================================================================
// TEST 5: MULTI-DOMAIN FIXTURE SOPS TEST
// ============================================================================
console.log('TEST 5: Multi-domain fixture SOPs plan generation');

const testFixtures = FIXTURE_SOPS.filter(f => f.category !== 'Corrupt');

for (const fixture of testFixtures) {
  console.log(`  Evaluating: [${fixture.category}] ${fixture.title}...`);
  const km = buildSopKnowledgeModel({
    filename: fixture.filename,
    rawText: fixture.content,
    wordCount: fixture.content.split(/\s+/).length,
    pageCount: 1,
    fileHash: 'test-hash-' + fixture.id,
    confirmationText: 'Test fixture confirmation',
    mimeType: 'text/plain',
    extractedAt: new Date().toISOString(),
    diagnostics: {
      status: 'clean_text',
      pagesProcessed: 1,
      totalCharacters: fixture.content.length,
      estimatedTokens: Math.round(fixture.content.length / 4),
      cleanlinessScore: 1.0,
      formatDetected: 'plain_text',
      warnings: [],
      ocrApplied: false,
    } as any,
  } as any);
  const blueprint = buildOperationalBlueprintFromKnowledgeModel(km);
  const plan = planVideoDemonstration(blueprint);
  
  assert(plan.clips.length > 0, `Generated ${plan.clips.length} scenes for ${fixture.id}`);
  assert(plan.validation_status === 'valid', `Plan is VALID for ${fixture.id}`);
  assert(Boolean(plan.coverage_ledger && plan.coverage_ledger.length > 0), `Coverage ledger populated for ${fixture.id}`);
  
  const calculatedDuration = plan.clips.reduce((sum, c) => sum + (c.duration_seconds || 8), 0);
  assert(
    plan.total_estimated_duration_seconds === calculatedDuration,
    `Duration matches sum of scenes (${calculatedDuration}s) for ${fixture.id}`
  );
}

console.log('✅ TEST 5 PASSED: All fixture SOPs produced valid, fully tracked VideoPlans.\n');


// ============================================================================
// TEST 6: GENERIC WORD DOES NOT INDEPENDENTLY ESTABLISH ASSOCIATION
// ============================================================================
console.log('TEST 6: Semantic Association - Control sharing generic word ("patient") with unrelated step');
const genericWordBlueprint: OperationalBlueprint = {
  document_identity: { doc_title: 'Clinical Procedure', doc_ref: 'SOP-001', version: '1.0' },
  role: 'Technician',
  process: 'Sample Processing',
  purpose: 'Process diagnostic samples',
  scope: 'General',
  prerequisites: [],
  tools_and_systems: [],
  terminology: [],
  decision_points: [],
  exceptions: [],
  escalations: [],
  critical_controls: [
    {
      rule: 'Ensure patient physical comfort during prolonged diagnostic wait times.',
      source_ref: 'ctrl-wait-comfort',
      source_text: 'Ensure patient physical comfort.',
      rationale: 'Promotes patient satisfaction',
    },
  ],
  safety_rules: [],
  quality_rules: [],
  customer_or_business_impact: [],
  common_mistakes: [],
  source_evidence: [],
  confidence: 0.99,
  operational_steps: [
    {
      instruction: 'Verify patient registration and check intake requisition forms carefully.',
      task_title: 'Patient Intake Registration',
      category: 'CHECK',
      action_verb: 'Verify',
      source: { source_ref: 'step-1', page_or_section: 'Sec 1', source_text: 'Verify patient registration.' },
    },
    {
      instruction: 'Centrifuge chemical reagent vials at 4000 RPM for 10 minutes.',
      task_title: 'Centrifuge Calibration',
      category: 'DO',
      action_verb: 'Centrifuge',
      source: { source_ref: 'step-2', page_or_section: 'Sec 2', source_text: 'Centrifuge chemical reagent vials.' },
    },
  ],
};

const genericPlan = planVideoDemonstration(genericWordBlueprint);
const ctrlWaitItem = genericPlan.coverage_ledger?.find(i => i.source_ref === 'ctrl-wait-comfort');
assert(Boolean(ctrlWaitItem), 'Control sharing generic word is tracked in coverage ledger');
assert(ctrlWaitItem?.disposition === 'assigned_to_learning_mode', 'Control sharing generic word is NOT falsely assigned to video scene');
assert(ctrlWaitItem?.assigned_mode === 'Guide Me', 'Control sharing generic word routed to Guide Me simulation');
console.log('✅ TEST 6 PASSED: Generic word ("patient") did not trigger false semantic video association.\n');


// ============================================================================
// TEST 7: CLEAR STRUCTURED REFERENCE IS MATCHED WITH HIGHEST PRIORITY
// ============================================================================
console.log('TEST 7: Priority Matching - Control with a clear structured reference');
const structuredRefBlueprint: OperationalBlueprint = {
  document_identity: { doc_title: 'Specimen Intake', doc_ref: 'SOP-002', version: '1.0' },
  role: 'Lab Tech',
  process: 'Specimen Intake',
  purpose: 'Receive and label specimens',
  scope: 'General',
  prerequisites: [],
  tools_and_systems: [],
  terminology: [],
  decision_points: [],
  exceptions: [],
  escalations: [],
  critical_controls: [
    {
      rule: 'Barcode orientation must align exactly with tube window markings.',
      source_ref: 'step-2-ctrl-barcode',
      source_text: 'Barcode orientation must align.',
      rationale: 'Prevents scanner misread',
    },
  ],
  safety_rules: [],
  quality_rules: [],
  customer_or_business_impact: [],
  common_mistakes: [],
  source_evidence: [],
  confidence: 0.99,
  operational_steps: [
    {
      instruction: 'Receive specimen container from courier desk.',
      task_title: 'Courier Intake',
      category: 'DO',
      action_verb: 'Receive',
      source: { source_ref: 'step-1', page_or_section: 'Sec 1', source_text: 'Receive specimen container.' },
    },
    {
      instruction: 'Affix barcode label onto specimen tube and cross-verify with requisition sheet.',
      task_title: 'Barcoding & Verification',
      category: 'CHECK',
      action_verb: 'Affix',
      source: { source_ref: 'step-2', page_or_section: 'Sec 2', source_text: 'Affix barcode label.' },
    },
  ],
};

const structPlan = planVideoDemonstration(structuredRefBlueprint);
const structCtrlItem = structPlan.coverage_ledger?.find(i => i.source_ref === 'step-2-ctrl-barcode');
assert(Boolean(structCtrlItem), 'Structured control tracked in ledger');
assert(structCtrlItem?.disposition === 'represented_in_video', 'Structured control prioritized into video demonstration');
assert(structCtrlItem?.assigned_scene_index === 2, 'Structured control assigned to Scene 2 (matching step-2)');
assert(structCtrlItem?.confidence === 'high', 'Structured association has high confidence');
const scene2Clip = structPlan.clips.find(c => c.clip_index === 2);
assert(Boolean(scene2Clip?.what_the_learner_should_see?.includes('mandatory control')), 'Scene 2 learner observation cue includes mandatory control');
console.log('✅ TEST 7 PASSED: Clear structured reference matched with highest priority and verified in scene cues.\n');


// ============================================================================
// TEST 8: MULTIPLE PLAUSIBLE STEP MATCHES DO NOT FORCE A MATCH
// ============================================================================
console.log('TEST 8: Ambiguity Detection - Rule with multiple plausible step matches');
const multiMatchBlueprint: OperationalBlueprint = {
  document_identity: { doc_title: 'Sanitization Protocol', doc_ref: 'SOP-003', version: '1.0' },
  role: 'Sanitation Lead',
  process: 'Facility Sanitation',
  purpose: 'Disinfect work surfaces',
  scope: 'General',
  prerequisites: [],
  tools_and_systems: [],
  terminology: [],
  decision_points: [],
  exceptions: [],
  escalations: [],
  critical_controls: [
    {
      rule: 'Ensure isopropyl disinfectant dwell duration exceeds 60 seconds across all surfaces.',
      source_ref: 'ctrl-dwell-time',
      source_text: 'Ensure isopropyl disinfectant dwell duration.',
      rationale: 'Complete antimicrobial eradication',
    },
  ],
  safety_rules: [],
  quality_rules: [],
  customer_or_business_impact: [],
  common_mistakes: [],
  source_evidence: [],
  confidence: 0.99,
  operational_steps: [
    {
      instruction: 'Sanitize stainless steel preparation table with isopropyl disinfectant solution.',
      task_title: 'Prep Table Disinfection',
      category: 'DO',
      action_verb: 'Sanitize',
      source: { source_ref: 'step-1', page_or_section: 'Sec 1', source_text: 'Sanitize stainless steel preparation table.' },
    },
    {
      instruction: 'Sanitize equipment storage shelving with isopropyl disinfectant solution.',
      task_title: 'Shelving Disinfection',
      category: 'DO',
      action_verb: 'Sanitize',
      source: { source_ref: 'step-2', page_or_section: 'Sec 2', source_text: 'Sanitize equipment storage shelving.' },
    },
  ],
};

const multiPlan = planVideoDemonstration(multiMatchBlueprint);
const multiCtrlItem = multiPlan.coverage_ledger?.find(i => i.source_ref === 'ctrl-dwell-time');
assert(Boolean(multiCtrlItem), 'Multi-match rule is tracked in ledger');
assert(multiCtrlItem?.disposition === 'assigned_to_learning_mode', 'Ambiguous multi-match rule is NOT guessed or forced into a video scene');
assert(multiCtrlItem?.assigned_mode === 'Guide Me', 'Ambiguous rule assigned to Guide Me practice');
assert(Boolean(multiCtrlItem?.reason?.includes('Ambiguous multi-step association')), 'Ledger reason explicitly records multi-step ambiguity');
console.log('✅ TEST 8 PASSED: Multiple plausible step matches correctly detected as ambiguous without forced guessing.\n');


// ============================================================================
// TEST 9: RULE WITH NO VALID ASSOCIATION PRESERVED WITHOUT SILENT OMISSION
// ============================================================================
console.log('TEST 9: Unassociated Rule - Rule with no valid association preserved in coverage ledger');
const unassocBlueprint: OperationalBlueprint = {
  document_identity: { doc_title: 'Warehouse Logistics', doc_ref: 'SOP-004', version: '1.0' },
  role: 'Logistics Clerk',
  process: 'Freight Receiving',
  purpose: 'Receive and unload cargo pallets',
  scope: 'General',
  prerequisites: [],
  tools_and_systems: [],
  terminology: [],
  decision_points: [],
  exceptions: [],
  escalations: [],
  critical_controls: [
    {
      rule: 'Submit quarterly energy conservation metrics to regional facilities oversight board.',
      source_ref: 'ctrl-energy-audit',
      source_text: 'Submit quarterly energy metrics.',
      rationale: 'Environmental sustainability compliance',
    },
  ],
  safety_rules: [],
  quality_rules: [],
  customer_or_business_impact: [],
  common_mistakes: [],
  source_evidence: [],
  confidence: 0.99,
  operational_steps: [
    {
      instruction: 'Inspect trailer seal integrity and sign bill of lading.',
      task_title: 'Trailer Inspection',
      category: 'CHECK',
      action_verb: 'Inspect',
      source: { source_ref: 'step-1', page_or_section: 'Sec 1', source_text: 'Inspect trailer seal integrity.' },
    },
    {
      instruction: 'Unload pallets using motorized pallet jack into staging lane 4.',
      task_title: 'Pallet Unloading',
      category: 'DO',
      action_verb: 'Unload',
      source: { source_ref: 'step-2', page_or_section: 'Sec 2', source_text: 'Unload pallets using motorized pallet jack.' },
    },
  ],
};

const unassocPlan = planVideoDemonstration(unassocBlueprint);
const unassocItem = unassocPlan.coverage_ledger?.find(i => i.source_ref === 'ctrl-energy-audit');
assert(Boolean(unassocItem), 'Unassociated rule tracked in coverage ledger (zero silent omission)');
assert(unassocItem?.disposition === 'assigned_to_learning_mode', 'Unassociated rule not forced into demonstration video');
assert(unassocItem?.coverage_status === 'verified_instructional_coverage', 'Ledger tracks verified instructional coverage');
assert(unassocPlan.validation_status === 'valid', 'Plan is valid with complete accountable ledger');
console.log('✅ TEST 9 PASSED: Rule with no valid association preserved in coverage ledger without silent omission.\n');


// ============================================================================
// TEST 10: DESTINATION LEARNING CONTENT AUDIT (KNOW IT / GUIDE ME / TEST ME)
// ============================================================================
console.log('TEST 10: Real Learning Content Verification - Destination learning content audit');
import { generateDomainNeutralLesson } from './domainNeutralGenerator';

const sampleExtracted = {
  filename: 'SOP-Phlebotomy-Test.txt',
  rawText: 'Standard Operating Procedure for Diagnostic Phlebotomy...',
  wordCount: 150,
  pageCount: 1,
  fileHash: 'test-hash-real-content',
  confirmationText: 'Confirmed',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {
    status: 'clean_text',
    pagesProcessed: 1,
    totalCharacters: 500,
    estimatedTokens: 100,
    cleanlinessScore: 1.0,
    formatDetected: 'plain_text',
    warnings: [],
    ocrApplied: false,
  } as any,
} as any;

const generatedResult = generateDomainNeutralLesson(sampleExtracted, phlebotomyBlueprint);
const prereqCard = generatedResult.blueprint.orientation.cards.find(c => c.id.includes('prereq'));
assert(Boolean(prereqCard), 'Know It orientation cards contain prerequisite qualification');

const ctrlSimulatorStep = generatedResult.lesson.stepObjects?.find(s => s.title.includes('Critical Control') || s.risk === 'compliance');
assert(Boolean(ctrlSimulatorStep), 'Simulator steps contain compliance assessment for critical controls');
console.log('✅ TEST 10 PASSED: Destination learning modes actually contain verified instructional content.\n');

console.log('================================================================');
console.log('ALL REGRESSION AND QUALITY AUDIT TESTS PASSED (10/10)');
console.log('================================================================');
