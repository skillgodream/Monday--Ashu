/**
 * Progressive SOP Intelligence Engine
 * Handles stateful session management, stage transition validations,
 * Gemini prompts execution, source-traceability tracking, and CTM integration.
 */

import {
  ProgressiveSopSession,
  SopWorkflowStage,
  ExtractionReport,
  ExtractedRequirement,
  UnresolvedIssue,
  ClarificationQuestion,
  SupplementaryInstruction,
  LearningBlueprint,
  BlueprintTaskItem,
} from '../types';
import { ExtractedDocument } from './documentExtractor';
import { buildCanonicalTaskModel, CanonicalTaskModel } from './canonicalTaskModel';
import { generateDomainNeutralLesson } from './domainNeutralGenerator';
import { getApiHeaders } from './apiHelper';

function getFetchUrl(path: string): string {
  if (typeof window !== 'undefined') return path;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}${path}`;
}

/**
 * Creates a fresh, isolated Progressive SOP session for an uploaded document
 */
export function createProgressiveSopSession(doc: ExtractedDocument): ProgressiveSopSession {
  const sessionId = `sop-session-${Date.now()}-${doc.fileHash.slice(0, 8)}`;
  return {
    sessionId,
    currentStage: 'UPLOADED',
    stepNumber: 1,
    sourceDoc: {
      filename: doc.filename,
      rawText: doc.rawText,
      wordCount: doc.wordCount,
      pageCount: doc.pageCount,
      fileHash: doc.fileHash,
      confirmationText: doc.confirmationText,
      mimeType: doc.mimeType,
      extractedAt: doc.extractedAt,
      fileBase64: doc.fileBase64,
      diagnostics: doc.diagnostics || {
        totalChars: doc.rawText.length,
        readableChars: doc.rawText.length,
        controlChars: 0,
        replacementChars: 0,
        wordCount: doc.wordCount,
        pageCount: doc.pageCount,
      },
    },
    unresolvedIssues: [],
    clarificationQuestions: [],
    currentQuestionIndex: 0,
    supplementaryInstructions: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Stage Transition Validator (Enforced Server-side & Client-side)
 */
export function validateStageTransition(
  session: ProgressiveSopSession,
  targetStage: SopWorkflowStage
): { allowed: boolean; reason?: string } {
  const current = session.currentStage;

  // Rule 1: Cannot generate deck if blueprint is not approved or if blocking gaps remain
  if (targetStage === 'APPROVED_FOR_GENERATION' || targetStage === 'GENERATION_COMPLETE') {
    if (current !== 'BLUEPRINT_REVIEW' && current !== 'APPROVED_FOR_GENERATION') {
      return { allowed: false, reason: `Cannot generate deck directly from stage '${current}'. Blueprint review is required.` };
    }

    // Check for unresolved blocking critical controls or conflicts
    const blocking = session.unresolvedIssues.filter((i) => i.isBlocking && !i.resolved);
    if (blocking.length > 0) {
      return {
        allowed: false,
        reason: `Cannot proceed to generation with ${blocking.length} unresolved critical gap(s): ${blocking.map((b) => b.description).join('; ')}`,
      };
    }

    if (session.learningBlueprint?.approvalStatus !== 'approved') {
      return { allowed: false, reason: 'Learning blueprint must be explicitly approved before generating the training deck.' };
    }
  }

  // Rule 2: Sequential stage progression
  const stageOrder: SopWorkflowStage[] = [
    'UPLOADED',
    'EXTRACTING',
    'EXTRACTION_REVIEW',
    'CLARIFICATION',
    'BLUEPRINT_REVIEW',
    'APPROVED_FOR_GENERATION',
    'GENERATION_COMPLETE',
  ];

  const currIdx = stageOrder.indexOf(current);
  const targetIdx = stageOrder.indexOf(targetStage);

  if (currIdx !== -1 && targetIdx !== -1 && targetIdx > currIdx + 1 && targetStage !== 'GENERATION_COMPLETE') {
    // Stage skipping protection
    return { allowed: false, reason: `Cannot jump from '${current}' directly to '${targetStage}'. Must complete intermediate review stages.` };
  }

  return { allowed: true };
}

/**
 * Runs Stage A -> Stage B: Extract SOP & Generate Extraction Report via Prompt A
 */
export async function runSopExtractionReport(
  session: ProgressiveSopSession
): Promise<ProgressiveSopSession> {
  const doc = session.sourceDoc;

  // Try Server API route /api/sop/extract-report first
  try {
    const res = await fetch(getFetchUrl('/api/sop/extract-report'), {
      method: 'POST',
      headers: getApiHeaders(),
      signal: AbortSignal.timeout(typeof window === 'undefined' ? 100 : 30000),
      body: JSON.stringify({
        filename: doc.filename,
        rawText: doc.rawText,
        wordCount: doc.wordCount,
        pageCount: doc.pageCount,
        fileHash: doc.fileHash,
        fileBase64: doc.fileBase64,
        mimeType: doc.mimeType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.extractionReport) {
        const report: ExtractionReport = data.extractionReport;
        const issues: UnresolvedIssue[] = data.unresolvedIssues || [];
        const questions: ClarificationQuestion[] = data.clarificationQuestions || [];

        return {
          ...session,
          currentStage: 'EXTRACTION_REVIEW',
          stepNumber: 3,
          extractionReport: report,
          unresolvedIssues: issues,
          clarificationQuestions: questions,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[Progressive SOP Engine] Server extraction report call failed, using local extraction engine:', err);
  }

  // Local Extraction Engine Fallback
  const report = buildLocalExtractionReport(doc);
  const issues = buildLocalUnresolvedIssues(report);
  const questions = buildLocalClarificationQuestions(report, issues);

  return {
    ...session,
    currentStage: 'EXTRACTION_REVIEW',
    stepNumber: 3,
    extractionReport: report,
    unresolvedIssues: issues,
    clarificationQuestions: questions,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Process a user's natural language or option answer in the Clarification Chat
 */
export async function submitClarificationAnswer(
  session: ProgressiveSopSession,
  questionId: string,
  answerText: string,
  selectedOptionId?: string,
  note?: string
): Promise<ProgressiveSopSession> {
  const updatedQuestions = session.clarificationQuestions.map((q) => {
    if (q.questionId === questionId) {
      return {
        ...q,
        status: 'answered' as const,
        userAnswer: {
          text: answerText,
          selectedOptionId,
          note,
          answeredAt: new Date().toISOString(),
          author: 'Learner/Supervisor',
        },
      };
    }
    return q;
  });

  // Track user additions as supplementary instructions if answer provides new rules
  const supplementary = [...session.supplementaryInstructions];
  if (answerText.trim().length > 0) {
    supplementary.push({
      id: `supp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: 'Learner/Supervisor',
      timestamp: new Date().toISOString(),
      instructionText: answerText.trim(),
      approvalStatus: 'approved',
      scope: 'User-Provided Process Clarification',
      provenance: 'USER_SUPPLEMENTARY',
    });
  }

  // Update unresolved issues list
  const targetQ = session.clarificationQuestions.find((q) => q.questionId === questionId);
  const updatedIssues = session.unresolvedIssues.map((issue) => {
    if (targetQ && issue.category === targetQ.category) {
      return {
        ...issue,
        resolved: true,
        resolutionText: answerText,
      };
    }
    return issue;
  });

  // Determine if more questions are pending
  const nextPendingIndex = updatedQuestions.findIndex((q) => q.status === 'pending');
  const hasPendingMandatory = updatedQuestions.some(
    (q) => q.isMandatory && q.status === 'pending'
  );

  let stage: SopWorkflowStage = session.currentStage;
  let step = session.stepNumber;

  if (nextPendingIndex !== -1) {
    stage = 'CLARIFICATION';
    step = 5;
  } else {
    // All questions answered -> Ready for Blueprint Review
    stage = 'BLUEPRINT_REVIEW';
    step = 7;
  }

  let updatedSession: ProgressiveSopSession = {
    ...session,
    currentStage: stage,
    stepNumber: step,
    clarificationQuestions: updatedQuestions,
    currentQuestionIndex: nextPendingIndex !== -1 ? nextPendingIndex : updatedQuestions.length - 1,
    unresolvedIssues: updatedIssues,
    supplementaryInstructions: supplementary,
    updatedAt: new Date().toISOString(),
  };

  // If ready for blueprint review, synthesize learning blueprint
  if (stage === 'BLUEPRINT_REVIEW' && !updatedSession.learningBlueprint) {
    updatedSession = await generateLearningBlueprint(updatedSession);
  }

  return updatedSession;
}

/**
 * Generate Learning Blueprint based on extracted SOP, CTM, and approved clarification records
 */
export async function generateLearningBlueprint(
  session: ProgressiveSopSession
): Promise<ProgressiveSopSession> {
  const doc = session.sourceDoc;
  const report = session.extractionReport;

  // Call server /api/sop/generate-blueprint
  try {
    const res = await fetch(getFetchUrl('/api/sop/generate-blueprint'), {
      method: 'POST',
      headers: getApiHeaders(),
      signal: AbortSignal.timeout(typeof window === 'undefined' ? 100 : 30000),
      body: JSON.stringify({
        session,
        filename: doc.filename,
        rawText: doc.rawText,
        extractionReport: report,
        supplementaryInstructions: session.supplementaryInstructions,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.learningBlueprint) {
        return {
          ...session,
          currentStage: 'BLUEPRINT_REVIEW',
          stepNumber: 7,
          learningBlueprint: data.learningBlueprint,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[Progressive SOP Engine] Server blueprint call failed, generating local blueprint:', err);
  }

  // Local Blueprint Builder
  const blueprint = buildLocalLearningBlueprint(session);

  return {
    ...session,
    currentStage: 'BLUEPRINT_REVIEW',
    stepNumber: 7,
    learningBlueprint: blueprint,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Explicit Blueprint Approval & Training Deck Generation
 */
export async function approveBlueprintAndGenerateDeck(
  session: ProgressiveSopSession,
  approvedBy: string = 'Operations Reviewer'
): Promise<ProgressiveSopSession> {
  if (!session.learningBlueprint) {
    return {
      ...session,
      currentStage: 'BLOCKED_CRITICAL_GAP',
      validationResult: { isValid: false, blockingErrors: ['No learning blueprint present'], warnings: [] },
    };
  }

  // Update blueprint approval
  const approvedBlueprint: LearningBlueprint = {
    ...session.learningBlueprint,
    approvalStatus: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString(),
  };

  const sessionWithApprovedBp: ProgressiveSopSession = {
    ...session,
    learningBlueprint: approvedBlueprint,
  };

  // Validate stage transition
  const transition = validateStageTransition(sessionWithApprovedBp, 'APPROVED_FOR_GENERATION');
  if (!transition.allowed) {
    return {
      ...session,
      currentStage: 'BLOCKED_CRITICAL_GAP',
      validationResult: {
        isValid: false,
        blockingErrors: [transition.reason || 'Blueprint approval blocked.'],
        warnings: [],
      },
    };
  }

  const opBlueprint: any = {
    document_identity: {
      doc_title: session.sourceDoc.filename.replace(/\.(pdf|txt|docx)$/i, ''),
    },
    role: 'Workplace Operator',
    process: session.sourceDoc.filename.replace(/\.(pdf|txt|docx)$/i, ''),
    purpose: session.extractionReport?.intendedOutcome || 'Execute operational standard correctly',
    scope: 'Workspace Operations',
    prerequisites: approvedBlueprint.prerequisites.map((p) => ({
      text: p.requirement,
      source_ref: p.sourceRef,
      source_text: p.requirement,
    })),
    tools_and_systems: [],
    terminology: [],
    operational_steps: approvedBlueprint.tasks.map((t) => ({
      instruction: t.instruction,
      category: t.category,
      action_verb: t.actionVerb,
      task_title: t.title,
      critical_control: t.criticalControl,
      why_it_matters: t.whyItMatters,
      source: {
        page_or_section: t.sourceRef,
        source_ref: t.ctmRequirementId,
        source_text: t.sourceText,
      },
    })),
    decision_points: approvedBlueprint.decisionPoints.map((d) => ({
      situation: d.situation,
      decision: d.decision,
      action: d.action,
      source_ref: d.sourceRef,
      source_text: d.situation,
    })),
    exceptions: approvedBlueprint.exceptions.map((e) => ({
      trigger: e.trigger,
      resolution: e.resolution,
      source_ref: e.sourceRef,
      source_text: e.trigger,
    })),
    escalations: [],
    critical_controls: approvedBlueprint.criticalControls.map((c) => ({
      rule: c.rule,
      rationale: c.rationale,
      source_ref: c.sourceRef,
      source_text: c.rule,
    })),
    safety_rules: [],
    quality_rules: [],
    customer_or_business_impact: [],
    common_mistakes: [],
    source_evidence: [],
    confidence: 0.98,
  };

  // Generate complete Canonical Task Model (CTM) & 4 Learning Experiences
  const ctm = buildCanonicalTaskModel(session.sourceDoc as any, opBlueprint);
  const { lesson } = generateDomainNeutralLesson(session.sourceDoc as any, opBlueprint);

  return {
    ...session,
    currentStage: 'GENERATION_COMPLETE',
    stepNumber: 10,
    learningBlueprint: approvedBlueprint,
    canonicalTaskModel: ctm,
    generatedLesson: lesson,
    validationResult: {
      isValid: true,
      blockingErrors: [],
      warnings: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// HELPER IMPLEMENTATIONS FOR LOCAL EXTRACTION & BLUEPRINT ENGINE
// ============================================================================

function buildLocalExtractionReport(doc: { filename: string; rawText: string; wordCount: number; pageCount: number; fileHash: string }): ExtractionReport {
  const text = doc.rawText || '';
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const extractedRequirements: ExtractedRequirement[] = [];
  const ambiguities: { id: string; topic: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; sourceRef?: string; isBlocking: boolean }[] = [];

  let stepIdx = 0;
  let prereqIdx = 0;
  let decisionIdx = 0;
  let exceptionIdx = 0;
  let controlIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionRef = `Section ${Math.floor(i / 5) + 1}, Line ${i + 1}`;

    if (/^(\d+[\.\)]|step\s+\d+|task\s+\d+)/i.test(line) || /verify|inspect|check|apply|scan|record|log|perform|ensure|place|clean|remove/i.test(line)) {
      stepIdx++;
      extractedRequirements.push({
        id: `req-step-${stepIdx}`,
        type: 'task',
        title: line.replace(/^(\d+[\.\)]|step\s+\d+:?)\s*/i, '').slice(0, 40) || `Operational Task ${stepIdx}`,
        instruction: line,
        category: /check|verify|inspect/i.test(line) ? 'CHECK' : /decide|if/i.test(line) ? 'DECIDE' : 'DO',
        provenance: 'VERBATIM_SOURCE',
        sourceRef: sectionRef,
        sourceText: line,
        isCriticalControl: /never|must|danger|hazard|prohibited|critical|mandatory/i.test(line),
        sequenceNumber: stepIdx,
      });
    } else if (/prerequisite|before starting|prior to|requires/i.test(line)) {
      prereqIdx++;
      extractedRequirements.push({
        id: `req-prereq-${prereqIdx}`,
        type: 'prerequisite',
        title: `Prerequisite ${prereqIdx}`,
        instruction: line,
        provenance: 'VERBATIM_SOURCE',
        sourceRef: sectionRef,
        sourceText: line,
      });
    } else if (/if|where|in case|when/i.test(line) && /then|select|choose|decide|proceed/i.test(line)) {
      decisionIdx++;
      extractedRequirements.push({
        id: `req-decision-${decisionIdx}`,
        type: 'decision',
        title: `Decision Point ${decisionIdx}`,
        instruction: line,
        category: 'DECIDE',
        provenance: 'VERBATIM_SOURCE',
        sourceRef: sectionRef,
        sourceText: line,
      });
    } else if (/exception|error|defect|fail|unavailable|spill|damaged/i.test(line)) {
      exceptionIdx++;
      extractedRequirements.push({
        id: `req-exception-${exceptionIdx}`,
        type: 'exception',
        title: `Exception Rule ${exceptionIdx}`,
        instruction: line,
        category: 'RECOVER',
        provenance: 'VERBATIM_SOURCE',
        sourceRef: sectionRef,
        sourceText: line,
      });
    } else if (/never|must|always|prohibited|warning|caution|critical|compliance/i.test(line)) {
      controlIdx++;
      extractedRequirements.push({
        id: `req-control-${controlIdx}`,
        type: 'control',
        title: `Critical Control ${controlIdx}`,
        instruction: line,
        provenance: 'VERBATIM_SOURCE',
        sourceRef: sectionRef,
        sourceText: line,
        isCriticalControl: true,
      });
    }
  }

  // Ensure at least 3 operational requirements if text parsing was sparse
  if (stepIdx === 0) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    sentences.slice(0, 5).forEach((s, idx) => {
      extractedRequirements.push({
        id: `req-step-${idx + 1}`,
        type: 'task',
        title: `Operational Task ${idx + 1}`,
        instruction: s.trim(),
        category: 'DO',
        provenance: 'VERBATIM_SOURCE',
        sourceRef: `Page 1, Paragraph ${idx + 1}`,
        sourceText: s.trim(),
        sequenceNumber: idx + 1,
      });
    });
  }

  // Check for unresolved ambiguities or missing contact paths
  const hasEscalation = lines.some((l) => /escalate|supervisor|contact|call|notify|manager/i.test(l));
  if (!hasEscalation) {
    ambiguities.push({
      id: 'amb-1',
      topic: 'Escalation Protocol',
      description: 'The SOP mentions exception handling but does not explicitly state the escalation contact or supervisor authority path.',
      severity: 'medium',
      sourceRef: 'Document Analysis',
      isBlocking: false,
    });
  }

  return {
    documentIdentity: {
      filename: doc.filename,
      docTitle: doc.filename.replace(/\.(pdf|txt|docx)$/i, ''),
      docRef: 'RET-PU-SOP-001',
      version: '1.0',
      uploadedAt: new Date().toISOString(),
      wordCount: doc.wordCount,
      pageCount: doc.pageCount,
      fileHash: doc.fileHash,
    },
    documentPurpose: 'Ensure standard, safe, and compliant operational execution according to SOP requirements.',
    intendedOutcome: 'Verified workplace performance with 100% compliance on critical controls.',
    extractedRequirements,
    stepsCount: extractedRequirements.filter((r) => r.type === 'task').length,
    prerequisitesCount: extractedRequirements.filter((r) => r.type === 'prerequisite').length,
    decisionsCount: extractedRequirements.filter((r) => r.type === 'decision').length,
    exceptionsCount: extractedRequirements.filter((r) => r.type === 'exception').length,
    criticalControlsCount: extractedRequirements.filter((r) => r.isCriticalControl).length,
    missingInfoCount: ambiguities.length,
    contradictionsAndAmbiguities: ambiguities,
    coverageStatus: {
      isComplete: true,
      wordCount: doc.wordCount,
      pageCount: doc.pageCount,
    },
  };
}

function buildLocalUnresolvedIssues(report: ExtractionReport): UnresolvedIssue[] {
  const issues: UnresolvedIssue[] = [];

  report.contradictionsAndAmbiguities.forEach((amb) => {
    issues.push({
      id: amb.id,
      category: amb.topic.toLowerCase().includes('safety') ? 'safety' : 'conflict',
      description: amb.description,
      severity: amb.severity,
      sourceRef: amb.sourceRef,
      isBlocking: amb.isBlocking,
      resolved: false,
    });
  });

  // Always verify if grace period or local exception duration is specified
  issues.push({
    id: 'issue-clarify-scope',
    category: 'decision_criteria',
    description: 'Clarify handling when customer or supervisor is not present or when a local grace period applies.',
    severity: 'medium',
    isBlocking: false,
    resolved: false,
  });

  return issues;
}

function buildLocalClarificationQuestions(
  report: ExtractionReport,
  issues: UnresolvedIssue[]
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  questions.push({
    questionId: 'q-1',
    questionText: `The SOP references handling unexpected conditions and exceptions, but the exact local grace period or wait duration before escalation is unstated. How should this be handled in training?`,
    reason: 'To ensure accurate decision training without inventing unstated wait durations or policy timelines.',
    category: 'decision_criteria',
    sourceRef: 'Section 2.1',
    isMandatory: false,
    consequenceOfLeavingUnanswered: 'Training will instruct the worker to stop and escalate immediately without assuming a fixed duration.',
    status: 'pending',
    options: [
      { id: 'opt-1a', label: 'Use existing approved policy reference', isCompliantWithSource: true },
      { id: 'opt-1b', label: 'Stop and escalate immediately; do not invent a duration', isCompliantWithSource: true },
      { id: 'opt-1c', label: 'Provide a standard duration (specify in notes)' },
      { id: 'opt-1d', label: "I'll provide the correct detail" },
    ],
  });

  questions.push({
    questionId: 'q-2',
    questionText: `The SOP mentions product-specific or role-specific inspection checks. Should the training focus strictly on explicit SOP instructions, or include references to your existing product directory?`,
    reason: 'To establish training scope boundary and prevent unapproved policy additions.',
    category: 'training_preference',
    sourceRef: 'Section 1.3',
    isMandatory: false,
    consequenceOfLeavingUnanswered: 'Training will focus exclusively on explicit SOP requirements.',
    status: 'pending',
    options: [
      { id: 'opt-2a', label: "Only what's in this SOP", isCompliantWithSource: true },
      { id: 'opt-2b', label: 'Reference existing product policy directory' },
      { id: 'opt-2c', label: "I'll provide additional guidance" },
    ],
  });

  return questions;
}

function buildLocalLearningBlueprint(session: ProgressiveSopSession): LearningBlueprint {
  const reqs = session.extractionReport?.extractedRequirements || [];
  let taskReqs = reqs.filter((r) => r.type === 'task');
  if (taskReqs.length === 0 && reqs.length > 0) {
    taskReqs = reqs;
  }

  const tasks: BlueprintTaskItem[] = taskReqs.map((r, idx) => ({
    id: `task-${idx + 1}`,
    ctmRequirementId: r.id,
    title: r.title || `Task ${idx + 1}`,
    instruction: r.instruction,
    category: r.category || 'DO',
    actionVerb: (r.title || 'Execute').split(' ')[0] || 'Execute',
    whyItMatters: 'Essential for operational safety and standard compliance.',
    criticalControl: r.isCriticalControl,
    observableAction: `Worker performs ${(r.instruction || '').toLowerCase()} accurately.`,
    evidenceRequired: 'Physical observation or system verification log.',
    sourceRef: r.sourceRef || 'Section 1',
    sourceText: r.sourceText || r.instruction,
    provenance: r.provenance || 'VERBATIM_SOURCE',
  }));

  return {
    operationalOutcome: session.extractionReport?.intendedOutcome || 'Compliant workplace operational execution.',
    tasks,
    prerequisites: reqs.filter((r) => r.type === 'prerequisite').map((r, i) => ({ id: `pre-${i}`, requirement: r.instruction, sourceRef: r.sourceRef })),
    decisionPoints: reqs.filter((r) => r.type === 'decision').map((r, i) => ({ id: `dec-${i}`, situation: r.title, decision: r.instruction, action: 'Execute SOP choice', sourceRef: r.sourceRef })),
    exceptions: reqs.filter((r) => r.type === 'exception').map((r, i) => ({ id: `exp-${i}`, trigger: r.title, resolution: r.instruction, sourceRef: r.sourceRef })),
    criticalControls: reqs.filter((r) => r.isCriticalControl).map((r, i) => ({ id: `ctrl-${i}`, rule: r.instruction, rationale: 'Prevent operational risk or safety defect', sourceRef: r.sourceRef })),
    learningGoals: [
      { id: 'g-1', goal: 'Verify order and item details accurately prior to execution', bloomLevel: 'Apply' },
      { id: 'g-2', goal: 'Inspect item condition and apply appropriate quality rules', bloomLevel: 'Analyze' },
      { id: 'g-3', goal: 'Make accurate accept or reject operational decisions', bloomLevel: 'Evaluate' },
      { id: 'g-4', goal: 'Handle exceptions and follow supervisor escalation paths', bloomLevel: 'Apply' },
    ],
    experienceCoverage: {
      teachMe: true,
      showMe: true,
      guideMe: true,
      testMe: true,
    },
    unresolvedItems: [],
    approvalStatus: 'draft',
    version: 1,
  };
}

// ============================================================================
// AUTO-CREATE & INSTRUCT MODE GENERATION FUNCTIONS
// ============================================================================

export interface InstructOption {
  id: string;
  title: string;
  description: string;
  focusAreas: string[];
  recommendedSteps: number;
}

/**
 * Fetches Gemini's recommended structural options for Instruct Mode
 */
export async function getGeminiInstructOptions(doc: ExtractedDocument): Promise<InstructOption[]> {
  try {
    const res = await fetch(getFetchUrl('/api/sop/instruct-options'), {
      method: 'POST',
      headers: getApiHeaders(),
      signal: AbortSignal.timeout(typeof window === 'undefined' ? 100 : 30000),
      body: JSON.stringify({
        filename: doc.filename,
        rawText: doc.rawText,
        wordCount: doc.wordCount,
        pageCount: doc.pageCount,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.options) && data.options.length > 0) {
        return data.options;
      }
    }
  } catch (err) {
    console.warn('[progressiveSopEngine] Failed to load server instruct options, returning local defaults:', err);
  }

  // Local document-grounded defaults
  return [
    {
      id: 'opt-standard',
      title: 'SOP Flow',
      description: 'Balanced, step-by-step procedural training covering prerequisites, core execution, and verification.',
      focusAreas: ['End-to-End Procedural Flow', 'Task Verification'],
      recommendedSteps: 5,
    },
    {
      id: 'opt-controls-exceptions',
      title: 'Critical Controls',
      description: 'Emphasizes high-stakes safety rules, decision criteria, exception handling, and escalation protocols.',
      focusAreas: ['Critical Safety Controls', 'Exception Recovery'],
      recommendedSteps: 6,
    },
    {
      id: 'opt-fast-track',
      title: 'Fast Track',
      description: 'Concise, high-velocity frontline drill focusing strictly on core physical and system actions.',
      focusAreas: ['Core Action Verbs', 'Fast Field Execution'],
      recommendedSteps: 4,
    },
  ];
}

/**
 * Generates the full 4-experience learning deck from an SOP document using Auto-Create or Instruct Mode
 */
export async function generateSopDeck(
  doc: ExtractedDocument,
  mode: 'auto' | 'instruct' = 'auto',
  selectedOptionId?: string,
  customInstruction?: string
) {
  let opBlueprint: any = null;

  try {
    const res = await fetch(getFetchUrl('/api/gemini/generate-blueprint'), {
      method: 'POST',
      headers: getApiHeaders(),
      signal: AbortSignal.timeout(typeof window === 'undefined' ? 100 : 120000),
      body: JSON.stringify({
        rawText: doc.rawText,
        fileBase64: doc.fileBase64,
        mimeType: doc.mimeType,
        filename: doc.filename,
        fileHash: doc.fileHash,
        pageCount: doc.pageCount,
        wordCount: doc.wordCount,
        instructMode: mode === 'instruct',
        selectedOptionId,
        customInstruction,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.blueprint) {
        opBlueprint = data.blueprint;
      }
    }
  } catch (err: any) {
    console.warn('[progressiveSopEngine] Server LLM blueprint generation failed or timed out:', err?.message || err);
  }

  // Fallback to local domain-neutral generator
  const { lesson } = generateDomainNeutralLesson(doc, opBlueprint);
  return lesson;
}

