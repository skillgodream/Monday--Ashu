import fs from 'fs';
import path from 'path';
import { extractDocumentContent } from '../src/utils/documentExtractor';
import { generateDomainNeutralLesson } from '../src/utils/domainNeutralGenerator';
import { buildCanonicalTaskModel, auditTaskModelCoverage } from '../src/utils/canonicalTaskModel';
import { planKnowItSlides } from '../src/experiment/knowItPlanner';
import { planVideoDemonstration } from '../src/utils/videoPlanEngine';
import { evaluateCapabilityDecision } from '../src/utils/capabilityDecisionEngine';

async function evaluateAviationSop() {
  const filePath = path.resolve(process.cwd(), 'uploads', 'Aviation_Ground_Operations_SOP.txt');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  console.log('=== [1] EXTRACTION ===');
  const extractedDoc = await extractDocumentContent({
    name: 'Aviation_Ground_Operations_SOP.pdf',
    content: fileContent,
  });

  console.log('Extracted diagnostics:', extractedDoc.diagnostics);
  console.log('Word count:', extractedDoc.wordCount);
  console.log('Page count:', extractedDoc.pageCount);
  console.log('File hash:', extractedDoc.fileHash);

  console.log('\n=== [2] GENERATING LESSON & CANONICAL TASK MODEL ===');
  const { lesson, blueprint, passport } = generateDomainNeutralLesson(extractedDoc);
  const ctm = buildCanonicalTaskModel(lesson.operationalBlueprint, lesson, extractedDoc.rawText);

  console.log('CTM ID:', ctm.id);
  console.log('Role:', ctm.role);
  console.log('Process:', ctm.process);
  console.log('Steps count:', ctm.steps.length);
  console.log('Prerequisites count:', ctm.prerequisites.length);
  console.log('Tools/Systems count:', ctm.toolsAndSystems.length);
  console.log('Controls count:', ctm.controls.length);
  console.log('Decisions count:', ctm.decisions.length);
  console.log('Exceptions & Escalations count:', ctm.exceptionsAndEscalations.length);
  console.log('Prohibited Actions count:', ctm.prohibitedActions.length);
  console.log('Ambiguities count:', ctm.ambiguities.length);

  console.log('\n=== [3] LEARN THE FLOW (KNOW IT DECK) ===');
  const slideDeck = planKnowItSlides(lesson);
  console.log('Total slides:', slideDeck.slides.length);
  const slideTypes = slideDeck.slides.map((s, idx) => ({ idx: idx + 1, type: s.type, title: s.title }));
  console.log('Slide sequence summary:', JSON.stringify(slideTypes, null, 2));

  console.log('\n=== [4] SEE THE ACTION (VIDEO PLAN) ===');
  const videoPlan = planVideoDemonstration(lesson.operationalBlueprint!);
  console.log('Video Plan scenes count:', videoPlan.clips.length);
  const videoScenes = videoPlan.clips.map((c) => ({
    clip_index: c.clip_index,
    title: c.title,
    duration: c.duration_seconds,
    key_action: c.key_action || c.critical_action,
    prompt_snippet: c.veo_prompt.slice(0, 100) + '...',
  }));
  console.log('Video scenes:', JSON.stringify(videoScenes, null, 2));

  console.log('\n=== [5 & 6] MAKE THE DECISION & PROVE CAPABILITY ===');
  const simSteps = lesson.stepObjects || [];
  console.log('Simulator / Assessment items count:', simSteps.length);
  const sampleSteps = simSteps.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    question: s.question,
    options: s.options,
    correct: s.correct,
    why: s.why,
    wrong_feedback: s.wrong_feedback,
    hint: s.hint,
    source_ref: s.source_ref,
  }));
  console.log('Sample items (first 5):', JSON.stringify(sampleSteps, null, 2));

  console.log('\n=== [7] CAPABILITY DECISION EVALUATION ===');
  // Baseline evaluation
  const allRequirementIds = [
    ...ctm.steps.map((s) => s.id),
    ...ctm.controls.map((c) => c.id),
    ...ctm.decisions.map((d) => d.id),
    ...ctm.exceptionsAndEscalations.map((e) => e.id),
  ];

  // Case 1: All passed
  const allPassedDecision = evaluateCapabilityDecision(ctm, {
    completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
    demonstratedRequirementIds: allRequirementIds,
    failedRequirementIds: [],
  });

  // Case 2: 1 Critical control failed
  const criticalControl = ctm.controls.find((c) => c.isCritical || c.type === 'safety');
  const failedCriticalDecision = criticalControl
    ? evaluateCapabilityDecision(ctm, {
        completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
        demonstratedRequirementIds: allRequirementIds.filter((id) => id !== criticalControl.id),
        failedRequirementIds: [criticalControl.id],
      })
    : null;

  // Case 3: 1 Non-critical step failed
  const nonCriticalStepId = ctm.steps[ctm.steps.length - 1]?.id;
  const failedNonCriticalDecision = nonCriticalStepId
    ? evaluateCapabilityDecision(ctm, {
        completedModes: new Set(['learnTheFlow', 'seeTheAction', 'makeTheDecision', 'proveCapability']),
        demonstratedRequirementIds: allRequirementIds.filter((id) => id !== nonCriticalStepId),
        failedRequirementIds: [nonCriticalStepId],
      })
    : null;

  console.log('All Passed Decision:', {
    decision: allPassedDecision.decision,
    title: allPassedDecision.decisionTitle,
    percentage: allPassedDecision.percentage,
    criticalPassed: allPassedDecision.criticalControlsPassed,
    weakRequirements: allPassedDecision.weakRequirements,
  });

  if (failedCriticalDecision) {
    console.log('Failed Critical Decision:', {
      criticalControlId: criticalControl?.id,
      decision: failedCriticalDecision.decision,
      title: failedCriticalDecision.decisionTitle,
      percentage: failedCriticalDecision.percentage,
      criticalPassed: failedCriticalDecision.criticalControlsPassed,
      remediationPlan: failedCriticalDecision.remediationPlan,
    });
  }

  if (failedNonCriticalDecision) {
    console.log('Failed Non-Critical Decision:', {
      nonCriticalStepId,
      decision: failedNonCriticalDecision.decision,
      title: failedNonCriticalDecision.decisionTitle,
      percentage: failedNonCriticalDecision.percentage,
      criticalPassed: failedNonCriticalDecision.criticalControlsPassed,
      remediationPlan: failedNonCriticalDecision.remediationPlan,
    });
  }

  console.log('\n=== [8] COVERAGE AUDIT ===');
  const allCoverageIds = [
    ...ctm.prerequisites.map((p) => p.id),
    ...ctm.toolsAndSystems.map((t) => t.id),
    ...ctm.steps.map((s) => s.id),
    ...ctm.controls.map((c) => c.id),
    ...ctm.decisions.map((d) => d.id),
    ...ctm.exceptionsAndEscalations.map((e) => e.id),
    ...ctm.prohibitedActions.map((p) => p.id),
  ];

  const audit = auditTaskModelCoverage(ctm, {
    learnTheFlowCoveredIds: allCoverageIds,
    seeTheActionCoveredIds: [
      ...ctm.steps.map((s) => s.id),
      ...ctm.controls.map((c) => c.id),
      ...ctm.exceptionsAndEscalations.map((e) => e.id),
    ],
    makeTheDecisionCoveredIds: [
      ...ctm.steps.map((s) => s.id),
      ...ctm.controls.map((c) => c.id),
      ...ctm.decisions.map((d) => d.id),
      ...ctm.exceptionsAndEscalations.map((e) => e.id),
    ],
    proveCapabilityCoveredIds: [
      ...ctm.steps.map((s) => s.id),
      ...ctm.controls.map((c) => c.id),
      ...ctm.decisions.map((d) => d.id),
      ...ctm.exceptionsAndEscalations.map((e) => e.id),
    ],
  });
  console.log('Audit coverage percentage:', `${audit.coveragePercentage}%`);
  console.log('Is fully covered:', audit.isFullyCovered);
  console.log('Unresolved items count:', audit.unresolvedItems.length);

  // Save the full evaluation dump for detailed reference
  const fullDump = {
    extractedDoc: {
      filename: extractedDoc.filename,
      wordCount: extractedDoc.wordCount,
      diagnostics: extractedDoc.diagnostics,
    },
    ctm: {
      role: ctm.role,
      process: ctm.process,
      purpose: ctm.purpose,
      scope: ctm.scope,
      prerequisites: ctm.prerequisites,
      toolsAndSystems: ctm.toolsAndSystems,
      steps: ctm.steps,
      controls: ctm.controls,
      decisions: ctm.decisions,
      exceptionsAndEscalations: ctm.exceptionsAndEscalations,
      prohibitedActions: ctm.prohibitedActions,
      ambiguities: ctm.ambiguities,
    },
    slideDeck: {
      total: slideDeck.slides.length,
      slides: slideDeck.slides,
    },
    videoPlan: {
      clips: videoPlan.clips,
    },
    simSteps,
    decisions: {
      allPassed: allPassedDecision,
      failedCritical: failedCriticalDecision,
      failedNonCritical: failedNonCriticalDecision,
    },
    audit,
  };

  fs.writeFileSync('uploads/aviation_evaluation_dump.json', JSON.stringify(fullDump, null, 2));
  console.log('\nWrote full evaluation dump to uploads/aviation_evaluation_dump.json');
}

evaluateAviationSop().catch((err) => {
  console.error('Evaluation error:', err);
  process.exit(1);
});
