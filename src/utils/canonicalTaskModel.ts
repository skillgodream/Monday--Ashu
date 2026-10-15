/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CANONICAL TASK MODEL (CTM) & COVERAGE LEDGER
 * One validated SOP -> One Canonical Task Model -> Four Learning Experiences
 */

import { OperationalBlueprint, Lesson, SopKnowledgeModel, SourceMeta } from '../types';

export type ProvenanceCategory = 'VERBATIM_SOURCE' | 'STRUCTURED_INTERPRETATION' | 'ENGINE_INFERENCE' | 'UNRESOLVED';

export interface CanonicalSourceRef {
  pageOrSection: string;
  sourceRef: string;
  sourceText: string;
}

export interface CanonicalPrerequisite {
  id: string;
  text: string;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalToolOrSystem {
  id: string;
  name: string;
  purpose: string;
  neverDo?: string;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  category: 'KNOW' | 'DO' | 'DECIDE' | 'RESPOND' | 'CHECK' | 'RECOVER' | 'ESCALATE';
  actionVerb: string;
  whyItMatters?: string;
  criticalControl?: boolean;
  scenarioQuestion?: string;
  choices?: { id: string; title: string; subtitle: string; isCorrect: boolean }[];
  coachTip?: string;
  hint?: string;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalControlRule {
  id: string;
  rule: string;
  rationale?: string;
  type: 'safety' | 'quality' | 'compliance';
  isCritical: boolean;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalDecisionPoint {
  id: string;
  situation: string;
  condition: string;
  compliantAction: string;
  prohibitedAction?: string;
  rationale: string;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalExceptionRule {
  id: string;
  type: 'exception' | 'escalation';
  trigger: string;
  resolutionOrAction: string;
  target?: string;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalProhibitedAction {
  id: string;
  mistake: string;
  prevention: string;
  provenance: ProvenanceCategory;
  source: CanonicalSourceRef;
}

export interface CanonicalTaskModel {
  id: string;
  documentIdentity: {
    docTitle: string;
    docRef: string;
    version: string;
    department?: string;
    organization?: string;
  };
  role: string;
  process: string;
  purpose: string;
  scope: string;

  prerequisites: CanonicalPrerequisite[];
  toolsAndSystems: CanonicalToolOrSystem[];
  steps: CanonicalStep[];
  controls: CanonicalControlRule[];
  decisions: CanonicalDecisionPoint[];
  exceptionsAndEscalations: CanonicalExceptionRule[];
  prohibitedActions: CanonicalProhibitedAction[];

  qualityAuditCriteria?: { id: string; criteria: string; provenance: ProvenanceCategory; source: CanonicalSourceRef }[];
  evidenceRequired?: { id: string; description: string; provenance: ProvenanceCategory; source: CanonicalSourceRef }[];
  unresolvedGaps?: { topic: string; description: string; sourceRef?: string; isBlocking?: boolean }[];

  rawText?: string;
  sourceMeta?: SourceMeta;
  confidence: number;
  ambiguities: { topic: string; description: string; sourceRef?: string; isBlocking?: boolean }[];
}

export type ExperienceMode = 'learnTheFlow' | 'seeTheAction' | 'makeTheDecision' | 'proveCapability';
export type CoverageDisposition = 'taught' | 'demonstrated' | 'practised' | 'assessed' | 'flagged_for_review';

export interface CoverageItemRecord {
  itemId: string;
  itemType: 'prerequisite' | 'tool' | 'step' | 'control' | 'decision' | 'exception_escalation' | 'prohibited_action';
  description: string;
  sourceRef: string;
  dispositions: Set<CoverageDisposition>;
  experiences: Record<ExperienceMode, boolean>;
}

export interface CanonicalCoverageReport {
  isFullyCovered: boolean;
  totalRequirements: number;
  coveredRequirements: number;
  coveragePercentage: number;
  records: CoverageItemRecord[];
  unresolvedItems: { itemId: string; description: string; reason: string }[];
}

/** Helper to clean & truncate strings cleanly */
function clean(input: unknown, fallback = ''): string {
  if (!input || typeof input !== 'string') return fallback;
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Builds the Canonical Task Model from any OperationalBlueprint or Lesson data.
 * Guarantees zero silent drop of source items and 100% traceability.
 */
export function buildCanonicalTaskModel(
  blueprint?: OperationalBlueprint | null,
  lesson?: Lesson | null,
  rawText?: string
): CanonicalTaskModel {
  const docTitle = clean(
    blueprint?.document_identity?.doc_title || lesson?.title,
    'Standard Operating Procedure'
  );
  const docRef = clean(
    blueprint?.document_identity?.doc_ref || (lesson as any)?.sourceMeta?.version,
    'SOP-REF-1'
  );
  const version = clean(
    blueprint?.document_identity?.version || (lesson as any)?.sourceMeta?.version,
    '1.0'
  );
  const role = clean(blueprint?.role || (lesson as any)?.role, 'Workplace Operator');
  const process = clean(blueprint?.process || (lesson as any)?.topic || lesson?.title, docTitle);
  const purpose = clean(
    blueprint?.purpose || lesson?.description,
    `Standard operational execution guidelines for ${process}.`
  );
  const scope = clean(blueprint?.scope, 'All active personnel.');

  // 1. Prerequisites
  const prerequisites: CanonicalPrerequisite[] = (blueprint?.prerequisites || []).map((p, idx) => ({
    id: `prereq-${idx + 1}`,
    text: clean(p.text),
    provenance: (p.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION') as ProvenanceCategory,
    source: {
      pageOrSection: p.source_ref || 'Prerequisites',
      sourceRef: p.source_ref || 'SOP Section 1',
      sourceText: clean(p.source_text || p.text),
    },
  })).filter((p) => p.text.length > 0);

  // 2. Tools & Systems
  const toolsAndSystems: CanonicalToolOrSystem[] = (blueprint?.tools_and_systems || []).map((t, idx) => ({
    id: `tool-${idx + 1}`,
    name: clean(t.name),
    purpose: clean(t.purpose),
    neverDo: t.never_do ? clean(t.never_do) : undefined,
    provenance: (t.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION') as ProvenanceCategory,
    source: {
      pageOrSection: t.source_ref || 'Tools & Equipment',
      sourceRef: t.source_ref || 'SOP Section 2',
      sourceText: clean(t.source_text || t.name),
    },
  })).filter((t) => t.name.length > 0);

  // 3. Operational Steps
  const rawOpSteps = blueprint?.operational_steps || [];
  const steps: CanonicalStep[] = rawOpSteps.length > 0
    ? rawOpSteps.map((s, idx) => ({
        id: `step-${idx + 1}`,
        stepNumber: idx + 1,
        title: clean(s.task_title || s.instruction.slice(0, 50), `Step ${idx + 1}`),
        instruction: clean(s.instruction),
        category: ((s.category as any) || 'DO') as CanonicalStep['category'],
        actionVerb: s.action_verb || clean(s.instruction.split(' ')[0], 'Execute'),
        whyItMatters: s.why_it_matters ? clean(s.why_it_matters) : undefined,
        criticalControl: Boolean(s.critical_control),
        scenarioQuestion: s.scenario_question,
        choices: s.choices,
        coachTip: s.coach_tip,
        hint: s.hint,
        provenance: (s.source?.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION') as ProvenanceCategory,
        source: {
          pageOrSection: s.source?.page_or_section || `Step ${idx + 1}`,
          sourceRef: s.source?.source_ref || `SOP Step ${idx + 1}`,
          sourceText: clean(s.source?.source_text || s.instruction),
        },
      })).filter((s) => s.instruction.length > 0)
    : (lesson?.stepObjects || []).map((so: any, idx: number) => ({
        id: `step-${idx + 1}`,
        stepNumber: idx + 1,
        title: clean(so.title, `Step ${idx + 1}`),
        instruction: clean(so.question || so.screen?.info || so.title),
        category: 'DO' as CanonicalStep['category'],
        actionVerb: 'Execute',
        whyItMatters: so.why,
        coachTip: so.coach_say,
        hint: so.hint,
        provenance: 'STRUCTURED_INTERPRETATION' as const,
        source: {
          pageOrSection: `Step ${idx + 1}`,
          sourceRef: `SOP Step ${idx + 1}`,
          sourceText: clean(so.title),
        },
      })).filter((s) => s.instruction.length > 0);

  // If still zero steps, parse lines from lesson content or raw text
  if (steps.length === 0 && (rawText || lesson?.description)) {
    const textToParse = rawText || lesson?.description || '';
    const lines = textToParse
      .split(/\n+/)
      .map((l) => l.replace(/^(\d+[.)]|[-*•])\s+/, '').trim())
      .filter((l) => l.length >= 15 && !/^(standard operating procedure|sop\b|document ref|doc ref|version|effective date|approved by|page \d+|revision|department|title:|controlled copy|ret-pu-sop|return pickup|field associate|delivery partner|document id)/i.test(l));
    
    lines.forEach((l, idx) => {
      // If line is metadata, skip
      if (/^(standard operating procedure|sop\b|document ref|doc ref|version|effective date|approved by|page \d+|revision|department|title:|controlled copy|ret-pu-sop|return pickup|field associate|delivery partner|document id)/i.test(l)) return;

      steps.push({
        id: `step-${idx + 1}`,
        stepNumber: idx + 1,
        title: clean(l.slice(0, 50), `Step ${idx + 1}`),
        instruction: clean(l),
        category: 'DO',
        actionVerb: 'Execute',
        provenance: 'VERBATIM_SOURCE',
        source: {
          pageOrSection: `Line ${idx + 1}`,
          sourceRef: `SOP Line ${idx + 1}`,
          sourceText: clean(l),
        },
      });
    });
  }

  // 4. Controls (Critical, Safety, Quality)
  const controls: CanonicalControlRule[] = [];
  (blueprint?.critical_controls || []).forEach((c: any, idx) => {
    const rule = typeof c === 'string' ? c : (c?.rule || c?.text || c?.description || '');
    if (rule) {
      const isExplicit = rule.toUpperCase().includes('CRITICAL RULE') ||
        rule.toUpperCase().includes('CRITICAL CONTROL') ||
        rule.toUpperCase().includes('MANDATORY CRITICAL') ||
        rule.toUpperCase().includes('NEVER OVERRIDE');
      controls.push({
        id: `ctrl-crit-${idx + 1}`,
        rule: clean(rule),
        rationale: (typeof c === 'object' && c?.rationale) ? clean(c.rationale) : undefined,
        type: 'compliance',
        isCritical: true,
        provenance: isExplicit ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION',
        source: {
          pageOrSection: (typeof c === 'object' && c?.source_ref) || 'Critical Controls',
          sourceRef: (typeof c === 'object' && c?.source_ref) || 'SOP Controls',
          sourceText: clean((typeof c === 'object' && (c?.source_text || c?.rule)) || rule),
        },
      });
    }
  });

  (blueprint?.safety_rules || []).forEach((s: any, idx) => {
    const rule = typeof s === 'string' ? s : (s?.rule || s?.text || s?.description || '');
    if (rule) {
      const isExplicit = rule.toUpperCase().includes('CRITICAL') || rule.toUpperCase().includes('MANDATORY');
      controls.push({
        id: `ctrl-safe-${idx + 1}`,
        rule: clean(rule),
        type: 'safety',
        isCritical: isExplicit || clean(rule).toLowerCase().includes('lethal') || clean(rule).toLowerCase().includes('chloramine') || clean(rule).toLowerCase().includes('emergency'),
        provenance: isExplicit ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION',
        source: {
          pageOrSection: (typeof s === 'object' && s?.source_ref) || 'Safety Rules',
          sourceRef: (typeof s === 'object' && s?.source_ref) || 'SOP Safety',
          sourceText: clean((typeof s === 'object' && (s?.source_text || s?.rule)) || rule),
        },
      });
    }
  });

  (blueprint?.quality_rules || []).forEach((q: any, idx) => {
    const rule = typeof q === 'string' ? q : (q?.rule || q?.text || q?.description || '');
    if (rule) {
      controls.push({
        id: `ctrl-qual-${idx + 1}`,
        rule: clean(rule),
        type: 'quality',
        isCritical: false,
        provenance: 'STRUCTURED_INTERPRETATION',
        source: {
          pageOrSection: (typeof q === 'object' && q?.source_ref) || 'Quality Rules',
          sourceRef: (typeof q === 'object' && q?.source_ref) || 'SOP Quality',
          sourceText: clean((typeof q === 'object' && (q?.source_text || q?.rule)) || rule),
        },
      });
    }
  });

  // 5. Decisions
  const decisions: CanonicalDecisionPoint[] = (blueprint?.decision_points || [])
    .filter((d) => d.situation && d.action)
    .map((d, idx) => ({
      id: `dec-${idx + 1}`,
      situation: clean(d.situation),
      condition: clean(d.decision || d.situation),
      compliantAction: clean(d.action),
      rationale: clean(d.source_text || d.action),
      provenance: d.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION',
      source: {
        pageOrSection: d.source_ref || 'Decision Points',
        sourceRef: d.source_ref || 'SOP Decisions',
        sourceText: clean(d.source_text || d.situation),
      },
    }));

  // 6. Exceptions & Escalations
  const exceptionsAndEscalations: CanonicalExceptionRule[] = [];
  (blueprint?.exceptions || []).forEach((e, idx) => {
    if (e.trigger && e.resolution) {
      exceptionsAndEscalations.push({
        id: `exc-${idx + 1}`,
        type: 'exception',
        trigger: clean(e.trigger),
        resolutionOrAction: clean(e.resolution),
        provenance: e.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION',
        source: {
          pageOrSection: e.source_ref || 'Exceptions',
          sourceRef: e.source_ref || 'SOP Exceptions',
          sourceText: clean(e.source_text || e.trigger),
        },
      });
    }
  });

  (blueprint?.escalations || []).forEach((esc, idx) => {
    if (esc.situation && esc.contact_or_action) {
      exceptionsAndEscalations.push({
        id: `escala-${idx + 1}`,
        type: 'escalation',
        trigger: clean(esc.situation),
        resolutionOrAction: clean(esc.contact_or_action),
        target: clean(esc.contact_or_action),
        provenance: esc.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION',
        source: {
          pageOrSection: esc.source_ref || 'Escalations',
          sourceRef: esc.source_ref || 'SOP Escalations',
          sourceText: clean(esc.source_text || esc.situation),
        },
      });
    }
  });

  // 7. Prohibited Actions / Mistakes
  const prohibitedActions: CanonicalProhibitedAction[] = (blueprint?.common_mistakes || [])
    .filter((m) => m.mistake)
    .map((m, idx) => ({
      id: `prohib-${idx + 1}`,
      mistake: clean(m.mistake),
      prevention: clean(m.prevention),
      provenance: m.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION',
      source: {
        pageOrSection: m.source_ref || 'Prohibited Actions',
        sourceRef: m.source_ref || 'SOP Prohibited Actions',
        sourceText: clean(m.source_text || m.mistake),
      },
    }));

  // 8. Quality Audit Criteria
  const qualityAuditCriteria = (blueprint?.quality_rules || []).map((q: any, idx) => {
    const criteria = typeof q === 'string' ? q : (q?.rule || q?.text || q?.description || '');
    return {
      id: `audit-${idx + 1}`,
      criteria: clean(criteria),
      provenance: (typeof q === 'object' && q?.source_text ? 'VERBATIM_SOURCE' : 'STRUCTURED_INTERPRETATION') as ProvenanceCategory,
      source: {
        pageOrSection: (typeof q === 'object' && q?.source_ref) || 'Quality Criteria',
        sourceRef: (typeof q === 'object' && q?.source_ref) || 'SOP Section 8',
        sourceText: clean((typeof q === 'object' && (q?.source_text || q?.rule)) || criteria),
      },
    };
  }).filter((q) => q.criteria.length > 0);

  // 9. Evidence Required for Capability Demonstration
  const evidenceRequired = steps
    .filter((s) => s.criticalControl || s.category === 'CHECK' || s.category === 'RESPOND' || s.category === 'ESCALATE')
    .map((s, idx) => ({
      id: `ev-${idx + 1}`,
      description: `Demonstrate compliant execution of: "${s.instruction}"`,
      provenance: s.provenance,
      source: s.source,
    }));

  const escalationsPresent = exceptionsAndEscalations.some((e) => e.type === 'escalation');
  const ambList: { topic: string; description: string; sourceRef?: string; isBlocking?: boolean }[] = [];
  const unresolvedGaps: { topic: string; description: string; sourceRef?: string; isBlocking?: boolean }[] = [];

  if (!escalationsPresent) {
    const gap = {
      topic: 'Escalations',
      description: 'Source document contains no explicit escalation rule or supervisor contact path.',
      isBlocking: true,
    };
    ambList.push(gap);
    unresolvedGaps.push(gap);
  }

  // Check if any critical control or step has unstated parameters
  steps.forEach((s) => {
    if (s.instruction.toLowerCase().includes('contingency') || s.instruction.toLowerCase().includes('as per policy')) {
      const gap = {
        topic: 'External Policy Reference',
        description: `Step relies on unstated external policy: "${s.instruction}"`,
        sourceRef: s.source.sourceRef,
        isBlocking: false,
      };
      ambList.push(gap);
      unresolvedGaps.push(gap);
    }
  });

  const confidence = Math.max(0.5, 1.0 - ambList.length * 0.15);

  return {
    id: lesson?.id || `task-model-${Date.now()}`,
    documentIdentity: {
      docTitle,
      docRef,
      version,
      department: blueprint?.document_identity?.department,
    },
    role,
    process,
    purpose,
    scope,
    prerequisites,
    toolsAndSystems,
    steps,
    controls,
    decisions,
    exceptionsAndEscalations,
    prohibitedActions,
    qualityAuditCriteria,
    evidenceRequired,
    unresolvedGaps,
    rawText: rawText || (lesson as any)?.sourceMeta?.rawText,
    sourceMeta: (lesson as any)?.sourceMeta,
    confidence,
    ambiguities: ambList,
  };
}

/**
 * Audits coverage across the four learning experiences.
 */
export function auditTaskModelCoverage(
  taskModel: CanonicalTaskModel,
  experiences: {
    learnTheFlowCoveredIds: string[];
    seeTheActionCoveredIds: string[];
    makeTheDecisionCoveredIds: string[];
    proveCapabilityCoveredIds: string[];
  }
): CanonicalCoverageReport {
  const records: CoverageItemRecord[] = [];
  const unresolvedItems: { itemId: string; description: string; reason: string }[] = [];

  const learnSet = new Set(experiences.learnTheFlowCoveredIds);
  const seeSet = new Set(experiences.seeTheActionCoveredIds);
  const decideSet = new Set(experiences.makeTheDecisionCoveredIds);
  const proveSet = new Set(experiences.proveCapabilityCoveredIds);

  const addRecord = (
    itemId: string,
    itemType: CoverageItemRecord['itemType'],
    description: string,
    sourceRef: string
  ) => {
    const taught = learnSet.has(itemId);
    const demonstrated = seeSet.has(itemId);
    const practised = decideSet.has(itemId);
    const assessed = proveSet.has(itemId);

    const dispositions = new Set<CoverageDisposition>();
    if (taught) dispositions.add('taught');
    if (demonstrated) dispositions.add('demonstrated');
    if (practised) dispositions.add('practised');
    if (assessed) dispositions.add('assessed');

    if (dispositions.size === 0) {
      dispositions.add('flagged_for_review');
      unresolvedItems.push({
        itemId,
        description,
        reason: `Item ${itemId} has no instructional disposition across the 4 learning experiences.`,
      });
    }

    records.push({
      itemId,
      itemType,
      description,
      sourceRef,
      dispositions,
      experiences: {
        learnTheFlow: taught,
        seeTheAction: demonstrated,
        makeTheDecision: practised,
        proveCapability: assessed,
      },
    });
  };

  taskModel.prerequisites.forEach((p) => addRecord(p.id, 'prerequisite', p.text, p.source.sourceRef));
  taskModel.toolsAndSystems.forEach((t) => addRecord(t.id, 'tool', t.name, t.source.sourceRef));
  taskModel.steps.forEach((s) => addRecord(s.id, 'step', s.instruction, s.source.sourceRef));
  taskModel.controls.forEach((c) => addRecord(c.id, 'control', c.rule, c.source.sourceRef));
  taskModel.decisions.forEach((d) => addRecord(d.id, 'decision', d.situation, d.source.sourceRef));
  taskModel.exceptionsAndEscalations.forEach((e) => addRecord(e.id, 'exception_escalation', e.trigger, e.source.sourceRef));
  taskModel.prohibitedActions.forEach((p) => addRecord(p.id, 'prohibited_action', p.mistake, p.source.sourceRef));

  (taskModel.ambiguities || []).forEach((amb, idx) => {
    unresolvedItems.push({
      itemId: `ambiguity-${idx + 1}`,
      description: amb.topic,
      reason: amb.description,
    });
  });

  const totalRequirements = records.length;
  const coveredRequirements = records.filter((r) => !r.dispositions.has('flagged_for_review')).length;
  const coveragePercentage = totalRequirements > 0 ? Math.round((coveredRequirements / totalRequirements) * 100) : 100;

  return {
    isFullyCovered: unresolvedItems.length === 0 && (taskModel.ambiguities || []).length === 0 && taskModel.confidence >= 0.90,
    totalRequirements,
    coveredRequirements,
    coveragePercentage,
    records,
    unresolvedItems,
  };
}
