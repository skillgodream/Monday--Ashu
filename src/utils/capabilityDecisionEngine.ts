/**
 * CAPABILITY DECISION & TARGETED REMEDIATION ENGINE
 * 
 * Authoritative evaluation of learner evidence against the Canonical Task Model (CTM).
 * Determines whether the learner:
 * 1. IS READY: All required capabilities and critical controls demonstrated.
 * 2. NEEDS TARGETED PRACTICE: Specific capability gaps remain -> routes directly to weak items without full repeat.
 * 3. REQUIRES REVIEW: Source SOP is ambiguous, critical control unvalidated, or insufficient evidence.
 */

import { CanonicalTaskModel, CoverageDisposition, ExperienceMode } from './canonicalTaskModel';

export type CapabilityDecision = 'is_ready' | 'needs_targeted_practice' | 'requires_review';

export interface WeakRequirement {
  id: string;
  type: 'step' | 'control' | 'decision' | 'exception_escalation' | 'prohibited_action';
  title: string;
  reason: string;
  sourceRef: string;
}

export interface TargetedRemediationPlan {
  modeToTarget: ExperienceMode;
  targetItemIds: string[];
  description: string;
  buttonText: string;
}

export interface CapabilityDecisionResult {
  decision: CapabilityDecision;
  decisionTitle: string;
  decisionBadgeColor: 'emerald' | 'amber' | 'rose';
  summary: string;
  demonstratedCount: number;
  totalCount: number;
  percentage: number;
  criticalControlsPassed: boolean;
  unresolvedAmbiguitiesCount: number;
  weakRequirements: WeakRequirement[];
  remediationPlan: TargetedRemediationPlan | null;
  evidenceMatrix: {
    prerequisites: { total: number; demonstrated: number };
    tools: { total: number; demonstrated: number };
    steps: { total: number; demonstrated: number };
    controls: { total: number; demonstrated: number; criticalCount: number; criticalPassed: number };
    decisions: { total: number; demonstrated: number };
    exceptions: { total: number; demonstrated: number };
  };
}

export function evaluateCapabilityDecision(
  taskModel: CanonicalTaskModel,
  evidence: {
    completedModes: Set<ExperienceMode>;
    demonstratedRequirementIds: string[];
    failedRequirementIds: string[];
  }
): CapabilityDecisionResult {
  const demonstratedSet = new Set(evidence.demonstratedRequirementIds);
  const failedSet = new Set(evidence.failedRequirementIds);

  const weakRequirements: WeakRequirement[] = [];

  // Track counts per requirement category
  let prereqTotal = 0, prereqDemo = 0;
  let toolTotal = 0, toolDemo = 0;
  let stepTotal = 0, stepDemo = 0;
  let ctrlTotal = 0, ctrlDemo = 0, criticalCount = 0, criticalPassed = 0;
  let decTotal = 0, decDemo = 0;
  let excTotal = 0, excDemo = 0;

  // 1. Prerequisites
  taskModel.prerequisites.forEach((p) => {
    prereqTotal++;
    if (demonstratedSet.has(p.id) && !failedSet.has(p.id)) {
      prereqDemo++;
    } else if (failedSet.has(p.id)) {
      weakRequirements.push({
        id: p.id,
        type: 'step',
        title: p.text,
        reason: 'Prerequisite qualification not verified in practice',
        sourceRef: p.source.sourceRef,
      });
    }
  });

  // 2. Tools & Systems
  taskModel.toolsAndSystems.forEach((t) => {
    toolTotal++;
    if (demonstratedSet.has(t.id) && !failedSet.has(t.id)) {
      toolDemo++;
    } else if (failedSet.has(t.id)) {
      weakRequirements.push({
        id: t.id,
        type: 'step',
        title: t.name,
        reason: 'Tool usage specification violated',
        sourceRef: t.source.sourceRef,
      });
    }
  });

  // 3. Operational Steps
  taskModel.steps.forEach((s) => {
    stepTotal++;
    if (demonstratedSet.has(s.id) && !failedSet.has(s.id)) {
      stepDemo++;
    } else {
      weakRequirements.push({
        id: s.id,
        type: 'step',
        title: s.title || s.instruction,
        reason: s.whyItMatters || 'Step action incorrect or skipped during solo check',
        sourceRef: s.source.sourceRef,
      });
    }
  });

  // 4. Critical & Compliance Controls
  taskModel.controls.forEach((c) => {
    ctrlTotal++;
    if (c.isCritical) criticalCount++;

    const passed = demonstratedSet.has(c.id) && !failedSet.has(c.id);
    if (passed) {
      ctrlDemo++;
      if (c.isCritical) criticalPassed++;
    } else {
      if (failedSet.has(c.id) || c.isCritical) {
        weakRequirements.push({
          id: c.id,
          type: 'control',
          title: c.rule,
          reason: `Critical ${c.type} control missed or violated`,
          sourceRef: c.source.sourceRef,
        });
      }
    }
  });

  // 5. Decision Points
  taskModel.decisions.forEach((d) => {
    decTotal++;
    if (demonstratedSet.has(d.id) && !failedSet.has(d.id)) {
      decDemo++;
    } else if (failedSet.has(d.id)) {
      weakRequirements.push({
        id: d.id,
        type: 'decision',
        title: d.situation,
        reason: `Non-compliant decision chosen: ${d.compliantAction}`,
        sourceRef: d.source.sourceRef,
      });
    }
  });

  // 6. Exceptions & Escalations
  taskModel.exceptionsAndEscalations.forEach((e) => {
    excTotal++;
    if (demonstratedSet.has(e.id) && !failedSet.has(e.id)) {
      excDemo++;
    } else if (failedSet.has(e.id)) {
      weakRequirements.push({
        id: e.id,
        type: 'exception_escalation',
        title: e.trigger,
        reason: `Incorrect response or missing escalation target: ${e.resolutionOrAction}`,
        sourceRef: e.source.sourceRef,
      });
    }
  });

  const totalRequirements = stepTotal + ctrlTotal + decTotal + excTotal;
  const totalDemonstrated = stepDemo + ctrlDemo + decDemo + excDemo;
  const percentage = totalRequirements > 0 ? Math.round((totalDemonstrated / totalRequirements) * 100) : 100;
  const criticalControlsPassed = criticalCount === 0 || criticalPassed === criticalCount;

  const materialAmbiguities = (taskModel.ambiguities || []).filter((a: any) => a.isBlocking !== false);
  const unresolvedAmbiguitiesCount = materialAmbiguities.length;
  const hasMaterialAmbiguity = unresolvedAmbiguitiesCount > 0 || taskModel.confidence < 0.85;

  const hasOperationalDeficit = !criticalControlsPassed || weakRequirements.length > 0 || percentage < 85;

  // Determine Capability Decision
  let decision: CapabilityDecision = 'is_ready';
  let decisionTitle = 'READY FOR THE FLOOR';
  let decisionBadgeColor: 'emerald' | 'amber' | 'rose' = 'emerald';
  let summary = 'All operational requirements and critical controls have been demonstrated without hints.';

  if (hasOperationalDeficit) {
    decision = 'needs_targeted_practice';
    decisionTitle = 'TARGETED REMEDIATION REQUIRED';
    decisionBadgeColor = 'amber';
    if (!criticalControlsPassed) {
      summary = `Critical safety or compliance control was missed. Targeted practice required on ${weakRequirements.length} specific item(s).`;
    } else {
      summary = `Demonstrated ${percentage}% competence. ${weakRequirements.length} specific requirement(s) need targeted practice.`;
    }
  } else if (hasMaterialAmbiguity) {
    decision = 'requires_review';
    decisionTitle = 'SOURCE / POLICY REVIEW REQUIRED';
    decisionBadgeColor = 'rose';
    summary = `Source SOP contains ${unresolvedAmbiguitiesCount} unresolved ambiguity point(s) that require supervisor review before floor operation.`;
  }

  // Build Targeted Remediation Plan
  let remediationPlan: TargetedRemediationPlan | null = null;
  if (weakRequirements.length > 0) {
    // Operational failure: Always target the learner's actual weak requirements in Make the Decision mode
    const targetIds = weakRequirements.map((w) => w.id);
    remediationPlan = {
      modeToTarget: 'makeTheDecision',
      targetItemIds: targetIds,
      description: `Practise the ${targetIds.length} specific missed step(s) in Guide Me mode without re-doing the full lesson.`,
      buttonText: `Practise ${targetIds.length} Weak Item${targetIds.length > 1 ? 's' : ''} Only →`,
    };
  } else if (decision === 'requires_review') {
    // Policy failure: Target SOP review cards
    remediationPlan = {
      modeToTarget: 'learnTheFlow',
      targetItemIds: (taskModel.ambiguities || []).map((_, i) => `ambiguity-${i + 1}`),
      description: 'Review written SOP cards in Learn the Flow to resolve missing operational facts.',
      buttonText: 'Review SOP Source Cards →',
    };
  }

  return {
    decision,
    decisionTitle,
    decisionBadgeColor,
    summary,
    demonstratedCount: totalDemonstrated,
    totalCount: totalRequirements,
    percentage,
    criticalControlsPassed,
    unresolvedAmbiguitiesCount,
    weakRequirements,
    remediationPlan,
    evidenceMatrix: {
      prerequisites: { total: prereqTotal, demonstrated: prereqDemo },
      tools: { total: toolTotal, demonstrated: toolDemo },
      steps: { total: stepTotal, demonstrated: stepDemo },
      controls: { total: ctrlTotal, demonstrated: ctrlDemo, criticalCount, criticalPassed },
      decisions: { total: decTotal, demonstrated: decDemo },
      exceptions: { total: excTotal, demonstrated: excDemo },
    },
  };
}
