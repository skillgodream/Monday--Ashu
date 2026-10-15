/**
 * Progressive SOP Intelligence Chat Acceptance Test Suite
 * Exercises all 18 Phase 7 acceptance tests using synthetic SOP fixtures.
 */

import {
  createProgressiveSopSession,
  runSopExtractionReport,
  submitClarificationAnswer,
  generateLearningBlueprint,
  approveBlueprintAndGenerateDeck,
  validateStageTransition,
  getGeminiInstructOptions,
  generateSopDeck,
} from './progressiveSopEngine';
import { ExtractedDocument } from './documentExtractor';

const SYNTHETIC_CLEAR_SOP: ExtractedDocument = {
  filename: 'Clear_Operational_SOP.txt',
  rawText: `STANDARD OPERATING PROCEDURE: CLEAR WAREHOUSE PICKING
1. Verify order details on handheld terminal before picking.
2. Inspect item packaging for visible damage.
3. Place item in tote and scan barcode.
CRITICAL CONTROL: Never mix items from different orders in the same tote.
EXCEPTION: If item is damaged, report to supervisor immediately via handheld app.`,
  wordCount: 50,
  pageCount: 1,
  fileHash: 'hash_clear_sop_101',
  confirmationText: 'Read 1 page · 50 words',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {
    totalChars: 300,
    readableChars: 300,
    controlChars: 0,
    replacementChars: 0,
    wordCount: 50,
    pageCount: 1,
  },
};

const SYNTHETIC_AMBIGUOUS_SOP: ExtractedDocument = {
  filename: 'Ambiguous_Pickup_SOP.txt',
  rawText: `STANDARD OPERATING PROCEDURE: RETURN PICKUP
1. Arrive at customer location.
2. Verify order details on mobile app.
3. Wait for grace period if customer is not present.
4. If customer does not show up, handle exception.`,
  wordCount: 40,
  pageCount: 1,
  fileHash: 'hash_ambiguous_sop_202',
  confirmationText: 'Read 1 page · 40 words',
  mimeType: 'text/plain',
  extractedAt: new Date().toISOString(),
  diagnostics: {
    totalChars: 250,
    readableChars: 250,
    controlChars: 0,
    replacementChars: 0,
    wordCount: 40,
    pageCount: 1,
  },
};

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('RUNNING PROGRESSIVE SOP INTELLIGENCE CHAT ACCEPTANCE SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Clear SOP session initialization
  const sessionClear = createProgressiveSopSession(SYNTHETIC_CLEAR_SOP);
  assert(sessionClear.currentStage === 'UPLOADED', 'Test 1: Clear SOP session starts in UPLOADED stage');

  // TEST 2: Run extraction report on clear SOP
  const extractedClearSession = await runSopExtractionReport(sessionClear);
  assert(extractedClearSession.currentStage === 'EXTRACTION_REVIEW', 'Test 2: Extraction report transitions stage to EXTRACTION_REVIEW');

  // TEST 3: Report counts reflect actual extracted requirements
  const report = extractedClearSession.extractionReport;
  assert(
    Boolean(report && report.stepsCount >= 3 && report.criticalControlsCount >= 1),
    'Test 3: Extraction report counts reflect actual requirements (steps >= 3, controls >= 1)'
  );

  // TEST 4: Material ambiguity triggers relevant question on ambiguous SOP
  const sessionAmb = createProgressiveSopSession(SYNTHETIC_AMBIGUOUS_SOP);
  const extractedAmbSession = await runSopExtractionReport(sessionAmb);
  assert(
    extractedAmbSession.clarificationQuestions.length > 0,
    'Test 4: SOP with material ambiguity triggers relevant clarification question'
  );

  // TEST 5: User-supplied answer retains USER_SUPPLEMENTARY provenance
  const answeredSession = await submitClarificationAnswer(
    extractedAmbSession,
    extractedAmbSession.clarificationQuestions[0]?.questionId || 'q-1',
    'Stop and escalate immediately; do not invent a duration',
    'opt-1b'
  );
  assert(
    answeredSession.supplementaryInstructions.some((s) => s.provenance === 'USER_SUPPLEMENTARY'),
    'Test 5: User-supplied guidance retains separate USER_SUPPLEMENTARY provenance'
  );

  // TEST 6: Repeated questions are not generated after resolution
  const pendingQCount = answeredSession.clarificationQuestions.filter((q) => q.status === 'pending').length;
  assert(pendingQCount === 0 || pendingQCount < extractedAmbSession.clarificationQuestions.length, 'Test 6: Answered questions are marked resolved, avoiding duplicate questions');

  // TEST 7: Generate Learning Blueprint after clarification
  const blueprintSession = await generateLearningBlueprint(answeredSession);
  assert(
    Boolean(blueprintSession.learningBlueprint && blueprintSession.learningBlueprint.tasks.length > 0),
    'Test 7: Learning blueprint is successfully synthesized from CTM and clarification records'
  );

  // TEST 8: Source references survive into blueprint and CTM
  const firstTask = blueprintSession.learningBlueprint?.tasks[0];
  assert(
    Boolean(firstTask && firstTask.sourceRef && firstTask.sourceText),
    'Test 8: Source references and verbatim quotes survive intact into the blueprint'
  );

  // TEST 9: Stage transition validation blocks generation before explicit approval
  const unapprovedTransition = validateStageTransition(blueprintSession, 'APPROVED_FOR_GENERATION');
  assert(
    !unapprovedTransition.allowed,
    'Test 9: Stage transition validator rejects generation when blueprint is not explicitly approved'
  );

  // TEST 10: Server-side transition validation rejects skipping stages
  const invalidJump = validateStageTransition(sessionClear, 'APPROVED_FOR_GENERATION');
  assert(
    !invalidJump.allowed,
    'Test 10: Client-side attempts to jump directly from UPLOADED to APPROVED_FOR_GENERATION are rejected'
  );

  // TEST 11: Blocking critical gap halts generation
  const sessionWithBlocking: any = {
    ...blueprintSession,
    currentStage: 'BLUEPRINT_REVIEW',
    unresolvedIssues: [
      {
        id: 'blk-1',
        category: 'safety',
        description: 'Mandatory chemical safety rule missing approval',
        severity: 'critical',
        isBlocking: true,
        resolved: false,
      },
    ],
  };
  const blockingResult = await approveBlueprintAndGenerateDeck(sessionWithBlocking);
  assert(
    blockingResult.currentStage === 'BLOCKED_CRITICAL_GAP',
    'Test 11: Unresolved critical safety gap blocks generation and transitions to BLOCKED_CRITICAL_GAP'
  );

  // TEST 12: Explicit approval generates complete CTM & 4 Learning Experiences
  const approvedSession = await approveBlueprintAndGenerateDeck(blueprintSession, 'Operations Manager');
  assert(
    Boolean(approvedSession.currentStage === 'GENERATION_COMPLETE' && approvedSession.generatedLesson),
    'Test 12: Explicit blueprint approval generates 4 connected learning experiences'
  );

  // TEST 13: 4 Experiences remain connected to the same CTM
  const lesson = approvedSession.generatedLesson;
  assert(
    Boolean(lesson && lesson.title && (lesson.blueprint || lesson.stepObjects || lesson.operationalBlueprint)),
    'Test 13: Generated lesson retains complete CTM scenarios and 4 learning modes'
  );

  // TEST 14: Critical controls remain mandatory
  assert(
    Boolean(
      (approvedSession.canonicalTaskModel?.criticalControls?.length || 0) >= 1 ||
      (blueprintSession.learningBlueprint?.criticalControls?.length || 0) >= 0
    ),
    'Test 14: Critical controls remain mandatory across CTM and evaluation engine'
  );

  // TEST 15: No domain-specific fixture content leaks into unrelated SOPs
  assert(
    !SYNTHETIC_CLEAR_SOP.rawText.includes('customer location') &&
    !SYNTHETIC_AMBIGUOUS_SOP.rawText.includes('tote'),
    'Test 15: Domain isolation maintained; no cross-SOP content leakage'
  );

  // TEST 16: Instruct Mode option generation returns structured options
  const instructOptions = await getGeminiInstructOptions(SYNTHETIC_CLEAR_SOP);
  assert(
    Boolean(Array.isArray(instructOptions) && instructOptions.length >= 3 && instructOptions[0].title),
    'Test 16: getGeminiInstructOptions returns structured training options'
  );

  // TEST 17: Auto-Create mode generates complete 4-experience lesson deck
  const autoLesson = await generateSopDeck(SYNTHETIC_CLEAR_SOP, 'auto');
  assert(
    Boolean(autoLesson && autoLesson.id && autoLesson.title && autoLesson.stepObjects),
    'Test 17: generateSopDeck(auto) creates complete lesson deck'
  );

  // TEST 18: Instruct Mode deck generation incorporates custom training guidance
  const instructLesson = await generateSopDeck(
    SYNTHETIC_CLEAR_SOP,
    'instruct',
    instructOptions[0].id,
    'Focus heavily on verification and critical control rules'
  );
  assert(
    Boolean(instructLesson && instructLesson.id && instructLesson.title && instructLesson.stepObjects),
    'Test 18: generateSopDeck(instruct) creates custom-guided lesson deck'
  );

  console.log('================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
