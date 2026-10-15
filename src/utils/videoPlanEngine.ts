/**
 * Guruji Intelligent Video Planning & Validation Engine
 * Transforms OperationalBlueprint into a dynamically structured, instructional VideoPlan.
 * Replaces hardcoded 3-clip first/middle/last sampling with comprehensive scene grouping.
 * Enforces 100% coverage, source fidelity, positive continuous actions, and strict validation.
 */

import { OperationalBlueprint, OperationalBlueprintItem, VideoDemonstrationPlan, VideoClipPlan, ExcludedFromVideoItem, VideoCoverageLedgerItem } from '../types';
import { buildVeoPrompt } from './veoPromptBuilder';

export interface VideoPlanValidationResult {
  isValid: boolean;
  errors: string[];
  metrics: {
    totalSteps: number;
    coveredStepsCount: number;
    excludedItemsCount: number;
    scenesCount: number;
    totalEstimatedDuration: number;
  };
}

/**
 * Groups raw operational steps into coherent instructional scenes.
 * Rules:
 * 1. Do NOT create 1 clip per micro-step (avoid fragmented repetition).
 * 2. Group adjacent sequential steps that share a single operational phase / physical workspace.
 * 3. Never exceed 2-3 micro-steps per scene so each scene maintains ONE clear instructional purpose.
 * 4. Never drop any step silently.
 */
export type ScenePhase = 
  | 'setup_and_intake' 
  | 'inspection_and_prep' 
  | 'core_execution' 
  | 'control_and_decision' 
  | 'exception_and_escalation' 
  | 'verification_and_handoff';

function clusterStepsIntoScenes(steps: OperationalBlueprint['operational_steps']): Array<{
  title: string;
  steps: OperationalBlueprint['operational_steps'];
  phase: ScenePhase;
}> {
  if (!steps || steps.length === 0) return [];

  const clusters: Array<{
    title: string;
    steps: OperationalBlueprint['operational_steps'];
    phase: ScenePhase;
  }> = [];

  // If very short SOP (1-3 steps): 1 scene per step
  if (steps.length <= 3) {
    steps.forEach((step, idx) => {
      clusters.push({
        title: step.task_title || `Step ${idx + 1}`,
        steps: [step],
        phase: idx === 0 ? 'setup_and_intake' : idx === steps.length - 1 ? 'verification_and_handoff' : 'core_execution',
      });
    });
    return clusters;
  }

  let currentGroup: OperationalBlueprint['operational_steps'] = [];
  let currentTitle = '';
  let currentPhase: ScenePhase = 'setup_and_intake';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const cat = step.category || 'DO';
    const isEscalationOrException = cat === 'ESCALATE' || cat === 'RECOVER' || cat === 'RESPOND' || /escalat|damage|hazard|reject|incident/i.test(step.instruction);
    const isDecisionOrControl = cat === 'DECIDE' || cat === 'CHECK' || step.critical_control || /verif|inspect|check|ratio|dwell/i.test(step.instruction);
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;

    // Determine target phase
    let stepPhase: ScenePhase = 'core_execution';
    if (isFirst || i <= 1 && /greet|arriv|intake|identif|receiv|order|book/i.test(step.instruction)) {
      stepPhase = 'setup_and_intake';
    } else if (/prep|sanitiz|dilut|clean|station|tray|glove|swab/i.test(step.instruction)) {
      stepPhase = 'inspection_and_prep';
    } else if (isEscalationOrException) {
      stepPhase = 'exception_and_escalation';
    } else if (isDecisionOrControl) {
      stepPhase = 'control_and_decision';
    } else if (isLast || /handover|sign-off|discharg|complet|log|handoff/i.test(step.instruction)) {
      stepPhase = 'verification_and_handoff';
    }

    // Flush current group if phase changes or group size reaches 2 (or 3 max)
    if (currentGroup.length > 0) {
      const shouldSplit = currentGroup.length >= 2 || currentPhase !== stepPhase;
      if (shouldSplit) {
        clusters.push({
          title: currentTitle,
          steps: currentGroup,
          phase: currentPhase,
        });
        currentGroup = [];
      }
    }

    if (currentGroup.length === 0) {
      currentPhase = stepPhase;
      const cleanPhaseName = stepPhase.charAt(0).toUpperCase() + stepPhase.slice(1).replace(/_/g, ' ');
      currentTitle = step.task_title || (step.instruction ? step.instruction.trim().slice(0, 45) : `${cleanPhaseName} Part ${clusters.length + 1}`);
    }

    currentGroup.push(step);
  }

  if (currentGroup.length > 0) {
    clusters.push({
      title: currentTitle,
      steps: currentGroup,
      phase: currentPhase,
    });
  }

  return clusters;
}

export const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'have', 'must', 'when', 'then', 'into', 'after', 
  'before', 'should', 'ensure', 'using', 'under', 'over', 'each', 'every', 'will', 'been', 
  'being', 'standard', 'procedure', 'this', 'that', 'these', 'those', 'such', 'only',
  'more', 'most', 'some', 'any', 'all', 'both', 'between', 'through', 'during'
]);

export const GENERIC_WORDS = new Set([
  'patient', 'customer', 'safety', 'process', 'procedure', 'standard', 'protocol',
  'operation', 'operational', 'frontline', 'service', 'system', 'action', 'check',
  'ensure', 'verify', 'verifying', 'perform', 'performing', 'practice', 'guideline',
  'compliance', 'compliant', 'requirement', 'require', 'correct', 'proper', 'appropriate',
  'manner', 'method', 'methodical', 'carefully', 'always', 'never', 'routine', 'rule',
  'rules', 'step', 'steps', 'item', 'items', 'work', 'worker', 'staff', 'employee',
  'department', 'role', 'unit', 'area', 'room', 'time', 'date', 'form'
]);

export function extractSpecificKeywords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w) && !GENERIC_WORDS.has(w));
}

export function computeKeywordOverlap(textA: string, textB: string): { matchCount: number; matchedWords: string[] } {
  const wordsA = new Set(extractSpecificKeywords(textA));
  const wordsB = extractSpecificKeywords(textB);
  const matchedWords: string[] = [];
  wordsB.forEach(w => {
    if (wordsA.has(w) && !matchedWords.includes(w)) {
      matchedWords.push(w);
    }
  });
  return { matchCount: matchedWords.length, matchedWords };
}

/**
 * Detects whether an instructional constraint is a negative/prohibitive rule or zero-tolerance mandate.
 * Such rules cannot be physically acted out as positive continuous demonstration in video, and must be tested in Test Me.
 */
export function isProhibitiveRule(text: string): boolean {
  if (!text) return false;
  return /\b(zero\s+tolerance|zero|never|prohibit|prohibited|forbidden|not\s+permitted|cannot|ban|banned|refuse|strictly\s+avoided|do\s+not|don't)\b/i.test(text);
}

/**
 * Checks for structured reference between a step and a rule/item reference.
 */
export function matchesStepRef(step: OperationalBlueprintItem, stepIdx: number, sourceRef?: string): boolean {
  if (!sourceRef) return false;
  const trimmed = sourceRef.trim();
  const stepIdxTag = `step-${stepIdx + 1}`;
  if (trimmed === stepIdxTag || trimmed.startsWith(`${stepIdxTag}-`)) {
    return true;
  }
  const sRef = step.source?.source_ref?.trim();
  if (sRef) {
    if (trimmed === sRef || trimmed.startsWith(`${sRef}-`)) {
      return true;
    }
  }
  return false;
}

/**
 * Formats a clean, globally unique ID for coverage ledger accounting.
 */
export function makeLedgerItemId(type: VideoCoverageLedgerItem['item_type'], sourceRef: string | undefined, idx: number): string {
  const cleanRef = sourceRef?.trim() || '';
  if (cleanRef && !cleanRef.includes(' ') && cleanRef.startsWith(`${type}-`)) {
    return cleanRef;
  }
  return `${type}:${cleanRef || idx + 1}`;
}

export interface AssociationResult {
  clusterIndex?: number;
  matchType?: 'structured' | 'semantic';
  confidence?: 'high' | 'medium';
  isAmbiguous?: boolean;
  ambiguousCandidateIndices?: number[];
  matchedWords?: string[];
}

/**
 * Resolves reliable step association:
 * 1. Structured source reference (highest priority)
 * 2. Semantic fallback ONLY if there is sufficient distinguishing non-generic keyword overlap (>= 2 keywords)
 * 3. Ambiguity detection: ties between multiple scenes prevent forced match
 */
export function findBestSceneAssociation(
  itemText: string,
  itemSourceRef: string | undefined,
  stepClusters: Array<{ title: string; steps: OperationalBlueprintItem[] }>,
  steps: OperationalBlueprintItem[]
): AssociationResult | null {
  // 1. Structured reference match (Highest Priority)
  if (itemSourceRef && itemSourceRef.trim().length > 0) {
    const structuredMatches: number[] = [];
    stepClusters.forEach((cluster, cIdx) => {
      const hasDirectRef = cluster.steps.some(s => matchesStepRef(s, steps.indexOf(s), itemSourceRef));
      if (hasDirectRef) {
        structuredMatches.push(cIdx);
      }
    });
    if (structuredMatches.length > 0) {
      return {
        clusterIndex: structuredMatches[0],
        matchType: 'structured',
        confidence: 'high',
      };
    }
  }

  // 2. Semantic fallback ONLY if there is sufficient distinguishing evidence
  const specificItemKeywords = Array.from(new Set(extractSpecificKeywords(itemText)));
  if (specificItemKeywords.length < 2) {
    // Insufficient distinguishing evidence (0 or 1 specific keyword, or generic words only)
    return null;
  }

  const scores: Array<{ clusterIndex: number; score: number; matchedWords: string[] }> = [];

  stepClusters.forEach((cluster, cIdx) => {
    const clusterText = `${cluster.title} ${cluster.steps.map(s => `${s.task_title || ''} ${s.instruction}`).join(' ')}`;
    const clusterKeywords = new Set(extractSpecificKeywords(clusterText));
    const matchedWords = specificItemKeywords.filter(w => clusterKeywords.has(w));
    if (matchedWords.length >= 2) {
      scores.push({ clusterIndex: cIdx, score: matchedWords.length, matchedWords });
    }
  });

  if (scores.length === 0) {
    return null; // No valid association
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  // If there is a tie for top score across multiple scenes -> ambiguous match!
  if (scores.length > 1 && scores[0].score === scores[1].score) {
    return {
      isAmbiguous: true,
      ambiguousCandidateIndices: scores.map(s => s.clusterIndex),
      matchedWords: scores[0].matchedWords,
    };
  }

  // Unambiguous best semantic match
  return {
    clusterIndex: scores[0].clusterIndex,
    matchType: 'semantic',
    confidence: scores[0].score >= 3 ? 'high' : 'medium',
    matchedWords: scores[0].matchedWords,
  };
}

/**
 * Synthesizes a dynamic, fully traceable VideoDemonstrationPlan from an OperationalBlueprint.
 */
export function planVideoDemonstration(blueprint: OperationalBlueprint): VideoDemonstrationPlan {
  const steps = blueprint.operational_steps || [];
  const controls = blueprint.critical_controls || [];
  const decisions = blueprint.decision_points || [];
  const exceptions = blueprint.exceptions || [];
  const escalations = blueprint.escalations || [];
  const safetyRules = blueprint.safety_rules || [];
  const qualityRules = blueprint.quality_rules || [];
  const prerequisites = blueprint.prerequisites || [];
  const role = blueprint.role || 'frontline professional';
  const processName = blueprint.process || blueprint.document_identity?.doc_title || 'Standard Operating Procedure';

  const excludedItems: ExcludedFromVideoItem[] = [];
  const coverageLedger: VideoCoverageLedgerItem[] = [];
  const unresolvedItems: VideoCoverageLedgerItem[] = [];

  // Group steps into instructional scenes
  const stepClusters = clusterStepsIntoScenes(steps);
  const plannedClips: VideoClipPlan[] = [];

  // Track claimed indices to ensure exactly one accountable disposition per item
  const claimedControlIndices = new Set<number>();
  const claimedDecisionIndices = new Set<number>();
  const claimedExceptionIndices = new Set<number>();
  const claimedEscalationIndices = new Set<number>();
  const claimedSafetyIndices = new Set<number>();
  const claimedQualityIndices = new Set<number>();

  // Map scene index -> matched item (prevents early weak matches from claiming items)
  const assignedControlByScene = new Map<number, { ctrl: typeof controls[0]; index: number }>();
  const assignedDecisionByScene = new Map<number, { dec: typeof decisions[0]; index: number }>();
  const assignedExceptionByScene = new Map<number, { exc: typeof exceptions[0]; index: number }>();
  const assignedEscalationByScene = new Map<number, { esc: typeof escalations[0]; index: number }>();
  const assignedSafetyByScene = new Map<number, { safe: typeof safetyRules[0]; index: number }>();
  const assignedQualityByScene = new Map<number, { qual: typeof qualityRules[0]; index: number }>();

  // Pre-associate Controls
  controls.forEach((ctrl, cIdx) => {
    if (isProhibitiveRule(ctrl.rule)) return; // deferred to Test Me
    const text = `${ctrl.rule} ${ctrl.rationale || ''}`;
    const res = findBestSceneAssociation(text, ctrl.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== undefined) {
      if (!assignedControlByScene.has(res.clusterIndex)) {
        assignedControlByScene.set(res.clusterIndex, { ctrl, index: cIdx });
        claimedControlIndices.add(cIdx);
      }
    }
  });

  // Pre-associate Decisions
  decisions.forEach((dec, dIdx) => {
    if (!dec.situation || dec.situation.trim().length <= 3) return;
    const text = `${dec.situation} ${dec.decision || ''}`;
    const res = findBestSceneAssociation(text, dec.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== undefined) {
      if (!assignedDecisionByScene.has(res.clusterIndex)) {
        assignedDecisionByScene.set(res.clusterIndex, { dec, index: dIdx });
        claimedDecisionIndices.add(dIdx);
      }
    }
  });

  // Pre-associate Exceptions
  exceptions.forEach((exc, eIdx) => {
    if (!exc.trigger || exc.trigger.trim().length <= 3) return;
    const text = `${exc.trigger} ${exc.resolution || ''}`;
    const res = findBestSceneAssociation(text, exc.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== undefined) {
      if (!assignedExceptionByScene.has(res.clusterIndex)) {
        assignedExceptionByScene.set(res.clusterIndex, { exc, index: eIdx });
        claimedExceptionIndices.add(eIdx);
      }
    }
  });

  // Pre-associate Escalations
  escalations.forEach((esc, escIdx) => {
    if (!esc.situation || esc.situation.trim().length <= 3) return;
    const text = `${esc.situation} ${esc.contact_or_action || ''}`;
    const res = findBestSceneAssociation(text, esc.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== undefined) {
      if (!assignedEscalationByScene.has(res.clusterIndex)) {
        assignedEscalationByScene.set(res.clusterIndex, { esc, index: escIdx });
        claimedEscalationIndices.add(escIdx);
      }
    }
  });

  // Pre-associate Safety Rules (positive non-prohibitive procedural safety)
  safetyRules.forEach((safe, sIdx) => {
    if (!safe.rule || safe.rule.trim().length <= 3 || isProhibitiveRule(safe.rule)) return;
    const res = findBestSceneAssociation(safe.rule, safe.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== undefined) {
      if (!assignedSafetyByScene.has(res.clusterIndex)) {
        assignedSafetyByScene.set(res.clusterIndex, { safe, index: sIdx });
        claimedSafetyIndices.add(sIdx);
      }
    }
  });

  // Pre-associate Quality Rules
  qualityRules.forEach((qual, qIdx) => {
    if (!qual.rule || qual.rule.trim().length <= 3 || isProhibitiveRule(qual.rule)) return;
    const res = findBestSceneAssociation(qual.rule, qual.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== undefined) {
      if (!assignedQualityByScene.has(res.clusterIndex)) {
        assignedQualityByScene.set(res.clusterIndex, { qual, index: qIdx });
        claimedQualityIndices.add(qIdx);
      }
    }
  });

  // Build sequential scenes
  stepClusters.forEach((cluster, clusterIdx) => {
    const sceneIndex = clusterIdx + 1;
    const sceneId = `scene-${sceneIndex}`;
    const primaryStep = cluster.steps[0];
    const coveredRefs = cluster.steps.map((s, idx) => s.source?.source_ref || `step-${steps.indexOf(s) + 1}`);

    // Aggregate actions from all steps in cluster
    const combinedActions = cluster.steps.map(s => s.instruction).join(' and ');
    const primaryTaskTitle = cluster.steps.map(s => s.task_title).filter(Boolean).join(' & ') || cluster.title;

    // 1. Record covered steps in coverage ledger
    cluster.steps.forEach(step => {
      const stepIdx = steps.indexOf(step);
      const stepRef = step.source?.source_ref || `step-${stepIdx + 1}`;
      coverageLedger.push({
        item_id: makeLedgerItemId('step', stepRef, stepIdx),
        item_type: 'step',
        source_ref: stepRef,
        description: step.instruction,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Demonstrated as core procedural action in Scene ${sceneIndex}.`,
      });
    });

    // 2. Claimed Critical Control for this scene
    const matchedControlObj = assignedControlByScene.get(clusterIdx);
    const matchedControl = matchedControlObj?.ctrl;
    if (matchedControl && matchedControlObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId('control', matchedControl.source_ref, matchedControlObj.index),
        item_type: 'control',
        source_ref: matchedControl.source_ref || `ctrl-${matchedControlObj.index + 1}`,
        description: matchedControl.rule,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        reason: `Demonstrated directly in Scene ${sceneIndex} as active procedural control.`,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Observed in Scene ${sceneIndex} prompt and learner observation cues.`,
      });
    }

    // 3. Claimed Decision Point for this scene
    const matchedDecisionObj = assignedDecisionByScene.get(clusterIdx);
    const matchedDecision = matchedDecisionObj?.dec;
    if (matchedDecision && matchedDecisionObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId('decision', matchedDecision.source_ref, matchedDecisionObj.index),
        item_type: 'decision',
        source_ref: matchedDecision.source_ref || `dec-${matchedDecisionObj.index + 1}`,
        description: matchedDecision.situation,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        reason: `Illustrated in Scene ${sceneIndex} decision cue.`,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Demonstrated in Scene ${sceneIndex} decision cue.`,
      });
    }

    // 4. Claimed Exception for this scene
    const matchedExceptionObj = assignedExceptionByScene.get(clusterIdx);
    const matchedException = matchedExceptionObj?.exc;
    if (matchedException && matchedExceptionObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId('exception', matchedException.source_ref, matchedExceptionObj.index),
        item_type: 'exception',
        source_ref: matchedException.source_ref || `exc-${matchedExceptionObj.index + 1}`,
        description: matchedException.trigger,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        reason: `Visualized in Scene ${sceneIndex} exception resolution cue.`,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Visualized in Scene ${sceneIndex} exception prompt and resolution cue.`,
      });
    }

    // 5. Claimed Escalation for this scene
    const matchedEscalationObj = assignedEscalationByScene.get(clusterIdx);
    const matchedEscalation = matchedEscalationObj?.esc;
    if (matchedEscalation && matchedEscalationObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId('escalation', matchedEscalation.source_ref, matchedEscalationObj.index),
        item_type: 'escalation',
        source_ref: matchedEscalation.source_ref || `esc-${matchedEscalationObj.index + 1}`,
        description: matchedEscalation.situation,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        reason: `Highlighted in Scene ${sceneIndex} escalation cue.`,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Highlighted in Scene ${sceneIndex} escalation cue.`,
      });
    }

    // 6. Claimed Safety Rule for this scene
    const matchedSafetyObj = assignedSafetyByScene.get(clusterIdx);
    const matchedSafety = matchedSafetyObj?.safe;
    if (matchedSafety && matchedSafetyObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId('safety_rule', matchedSafety.source_ref, matchedSafetyObj.index),
        item_type: 'safety_rule',
        source_ref: matchedSafety.source_ref || `safe-${matchedSafetyObj.index + 1}`,
        description: matchedSafety.rule,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        reason: `Demonstrated in Scene ${sceneIndex} procedural safety precautions.`,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Demonstrated in Scene ${sceneIndex} procedural safety precautions.`,
      });
    }

    // 7. Claimed Quality Rule for this scene
    const matchedQualityObj = assignedQualityByScene.get(clusterIdx);
    const matchedQuality = matchedQualityObj?.qual;
    if (matchedQuality && matchedQualityObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId('control', matchedQuality.source_ref, matchedQualityObj.index),
        item_type: 'control',
        source_ref: matchedQuality.source_ref || `qual-${matchedQualityObj.index + 1}`,
        description: matchedQuality.rule,
        disposition: 'represented_in_video',
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: 'Show Me',
        reason: `Demonstrated in Scene ${sceneIndex} quality execution standard.`,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: `Demonstrated in Scene ${sceneIndex} quality execution standard.`,
      });
    }

    // Purpose definition
    const purpose = cluster.steps.length === 1
      ? `Demonstrate ${cluster.steps[0].instruction}`
      : `Demonstrate sequential execution of ${cluster.steps[0].task_title || 'initial action'} followed by ${cluster.steps[cluster.steps.length - 1].task_title || 'verification'}`;

    // Critical Action description
    const criticalAction = `Frontline ${role} executes ${combinedActions}`;

    // Control or decision text
    let controlOrDecision: string | undefined;
    if (matchedControl) {
      controlOrDecision = `Critical Control: ${matchedControl.rule}`;
    } else if (matchedDecision) {
      controlOrDecision = `Decision Point: In situation "${matchedDecision.situation}", choose "${matchedDecision.decision}"`;
    }

    // Exception or escalation text
    let exceptionOrEscalation: string | undefined;
    if (matchedEscalation) {
      exceptionOrEscalation = `Escalation: ${matchedEscalation.situation} -> ${matchedEscalation.contact_or_action}`;
    } else if (matchedException) {
      exceptionOrEscalation = `Exception Resolution: ${matchedException.trigger} -> ${matchedException.resolution}`;
    }

    // Visual cues & cognitive understanding
    let whatLearnerShouldSee = `Clear physical view of ${role} performing ${cluster.steps[0].instruction}${cluster.steps[1] ? ` and then ${cluster.steps[1].instruction}` : ''} with authentic equipment.`;
    if (matchedControl) {
      whatLearnerShouldSee += ` Learner explicitly observes execution of mandatory control: "${matchedControl.rule}".`;
    }
    if (matchedException) {
      whatLearnerShouldSee += ` Learner explicitly observes exception management: in response to "${matchedException.trigger}", immediately "${matchedException.resolution}".`;
    }

    const whatLearnerShouldUnderstand = cluster.steps[0].why_it_matters || matchedControl?.rationale || `Ensures compliance with standard operational quality and safety guidelines.`;

    // Concise on-screen training overlay (max 3-6 words)
    const onScreenText = buildOnScreenText(cluster.steps, matchedControl?.rule, matchedEscalation?.contact_or_action);

    // Assemble rich, continuous Veo prompt using our AI Video Director formula
    const veoPrompt = buildVeoPrompt({
      role,
      process: processName,
      taskTitle: primaryTaskTitle,
      actionInstruction: combinedActions,
      stepIndex: sceneIndex,
      criticalControl: matchedControl?.rule,
      decisionOrException: matchedException?.resolution || matchedDecision?.action,
    });

    const clipDuration = 8; // Optimal Veo 3.2 Lite generation length

    // Ensure unique distinct scene title
    let distinctTitle = primaryTaskTitle;
    if (plannedClips.some(p => p.title.toLowerCase() === distinctTitle.toLowerCase())) {
      distinctTitle = `${primaryTaskTitle} (Part ${sceneIndex})`;
    }

    plannedClips.push({
      clip_index: sceneIndex,
      scene_id: sceneId,
      title: distinctTitle,
      purpose,
      step_ref: `Steps ${coveredRefs.join(', ')}`,
      covered_step_refs: coveredRefs,
      critical_action: criticalAction,
      control_or_decision: controlOrDecision,
      exception_or_escalation: exceptionOrEscalation,
      what_the_learner_should_see: whatLearnerShouldSee,
      what_the_learner_should_understand: whatLearnerShouldUnderstand,
      on_screen_text: onScreenText,
      duration_seconds: clipDuration,
      estimated_duration_seconds: clipDuration,
      veo_prompt: veoPrompt,
      key_action: cluster.steps[0].instruction,
      tool_or_hazard: cluster.steps.find(s => s.target_code)?.target_code,
    });
  });

  if (plannedClips.length === 0) {
    const defaultAction = blueprint.process || 'Perform standard operational procedure';
    plannedClips.push({
      clip_index: 1,
      scene_id: 'scene-1',
      title: 'Operational Procedure Overview',
      purpose: `Demonstrate ${defaultAction}`,
      step_ref: 'General Procedure',
      covered_step_refs: ['general'],
      critical_action: `Frontline ${role} executes ${defaultAction}`,
      what_the_learner_should_see: `Clear physical view of ${role} demonstrating compliant technique.`,
      what_the_learner_should_understand: `Ensures compliance with standard operational quality and safety guidelines.`,
      on_screen_text: 'EXECUTE COMPLIANT WORKPLACE PROCEDURE',
      duration_seconds: 8,
      estimated_duration_seconds: 8,
      veo_prompt: buildVeoPrompt({
        role,
        process: processName,
        actionInstruction: defaultAction,
        stepIndex: 1,
      }),
      key_action: defaultAction,
    });
  }

  // =========================================================================
  // EXPLICIT COVERAGE LEDGER & NON-SILENCE GUARANTEE (NO SILENT OMISSIONS)
  // Every unassigned control, decision, exception, escalation, safety rule,
  // quality rule, and prerequisite is accounted for with an accountable disposition.
  // =========================================================================

  // 1. Account for remaining Critical Controls
  controls.forEach((ctrl, cIdx) => {
    if (claimedControlIndices.has(cIdx)) return;
    const ctrlRef = ctrl.source_ref || `ctrl-${cIdx + 1}`;
    const ledgerId = makeLedgerItemId('control', ctrl.source_ref, cIdx);
    
    if (!ctrl.rule || ctrl.rule.trim().length <= 3) {
      // Unresolved / ambiguous item requires instructional review
      const reason = `Critical control has ambiguous or empty source text and requires human instructional review.`;
      const item: VideoCoverageLedgerItem = {
        item_id: ledgerId,
        item_type: 'control',
        source_ref: ctrlRef,
        description: ctrl.rule || 'Empty control rule',
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
        reason,
        confidence: 'unresolved',
        coverage_status: 'planned',
        instructional_proof: 'Unresolved source text requiring instructional SME review',
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: 'control',
        description: ctrl.rule || 'Empty control rule',
        reason,
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
      });
    } else if (isProhibitiveRule(ctrl.rule)) {
      // Prohibitive / zero-tolerance constraints cannot be physically demonstrated as positive continuous action -> verified in Test Me
      const reason = `Statutory / compliance prohibition ("${ctrl.rule}") is verified via Test Me compliance check questions rather than procedural demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'control',
        source_ref: ctrlRef,
        description: ctrl.rule,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Test Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Evaluated via Test Me compliance check questions.',
      });
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: 'control',
        description: ctrl.rule,
        reason,
        disposition: 'assigned_to_test_me',
        assigned_mode: 'Test Me',
      });
    } else {
      // General quality or verification rule -> assigned to Guide Me practice
      const assoc = findBestSceneAssociation(`${ctrl.rule} ${ctrl.rationale || ''}`, ctrl.source_ref, stepClusters, steps);
      const reason = assoc?.isAmbiguous
        ? `Ambiguous multi-step association (candidate scenes: ${assoc.ambiguousCandidateIndices?.map(i => i + 1).join(', ')}); routed to Guide Me scenario rather than forced video guess.`
        : `Quality control requirement ("${ctrl.rule}") is practiced in Guide Me simulation scenarios.`;

      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'control',
        source_ref: ctrlRef,
        description: ctrl.rule,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Guide Me',
        reason,
        confidence: assoc?.isAmbiguous ? 'medium' : 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Practiced interactively in Guide Me simulation scenarios.',
      });
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: 'control',
        description: ctrl.rule,
        reason,
        disposition: 'assigned_to_guide_me',
        assigned_mode: 'Guide Me',
      });
    }
  });

  // 2. Account for remaining Decision Points (Contingency Branches)
  decisions.forEach((dec, dIdx) => {
    if (claimedDecisionIndices.has(dIdx)) return;
    const decRef = dec.source_ref || `dec-${dIdx + 1}`;
    const ledgerId = makeLedgerItemId('decision', dec.source_ref, dIdx);

    if (!dec.situation || dec.situation.trim().length <= 3) {
      const reason = `Decision point has ambiguous or empty source text and requires human instructional review.`;
      const item: VideoCoverageLedgerItem = {
        item_id: ledgerId,
        item_type: 'decision',
        source_ref: decRef,
        description: dec.situation || 'Empty decision point',
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
        reason,
        confidence: 'unresolved',
        coverage_status: 'planned',
        instructional_proof: 'Unresolved source text requiring instructional SME review',
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: decRef,
        item_type: 'decision',
        description: dec.situation || 'Empty decision point',
        reason,
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
      });
    } else {
      const reason = `Contingency branch dilemma ("${dec.situation}") is practiced interactively in Guide Me simulator choices rather than linear demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'decision',
        source_ref: decRef,
        description: dec.situation,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Guide Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Practiced interactively in Guide Me branching choices.',
      });
      excludedItems.push({
        item_ref: decRef,
        item_type: 'decision',
        description: dec.situation,
        reason,
        disposition: 'assigned_to_guide_me',
        assigned_mode: 'Guide Me',
      });
    }
  });

  // 3. Account for remaining Exceptions
  exceptions.forEach((exc, eIdx) => {
    if (claimedExceptionIndices.has(eIdx)) return;
    const excRef = exc.source_ref || `exc-${eIdx + 1}`;
    const ledgerId = makeLedgerItemId('exception', exc.source_ref, eIdx);

    if (!exc.trigger || exc.trigger.trim().length <= 3) {
      const reason = `Exception protocol has ambiguous or empty trigger text and requires human instructional review.`;
      const item: VideoCoverageLedgerItem = {
        item_id: ledgerId,
        item_type: 'exception',
        source_ref: excRef,
        description: exc.trigger || 'Empty exception trigger',
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
        reason,
        confidence: 'unresolved',
        coverage_status: 'planned',
        instructional_proof: 'Unresolved source text requiring instructional SME review',
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: excRef,
        item_type: 'exception',
        description: exc.trigger || 'Empty exception trigger',
        reason,
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
      });
    } else {
      const reason = `Exception handling protocol ("${exc.trigger}") is practiced in Guide Me real-world problem scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'exception',
        source_ref: excRef,
        description: exc.trigger,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Guide Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Practiced in Guide Me real-world problem scenarios.',
      });
      excludedItems.push({
        item_ref: excRef,
        item_type: 'exception',
        description: exc.trigger,
        reason,
        disposition: 'assigned_to_guide_me',
        assigned_mode: 'Guide Me',
      });
    }
  });

  // 4. Account for remaining Escalations
  escalations.forEach((esc, escIdx) => {
    if (claimedEscalationIndices.has(escIdx)) return;
    const escRef = esc.source_ref || `esc-${escIdx + 1}`;
    const ledgerId = makeLedgerItemId('escalation', esc.source_ref, escIdx);

    if (!esc.situation || esc.situation.trim().length <= 3) {
      const reason = `Escalation pathway has ambiguous or empty situation text and requires human instructional review.`;
      const item: VideoCoverageLedgerItem = {
        item_id: ledgerId,
        item_type: 'escalation',
        source_ref: escRef,
        description: esc.situation || 'Empty escalation situation',
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
        reason,
        confidence: 'unresolved',
        coverage_status: 'planned',
        instructional_proof: 'Unresolved source text requiring instructional SME review',
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: escRef,
        item_type: 'escalation',
        description: esc.situation || 'Empty escalation situation',
        reason,
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
      });
    } else {
      const reason = `Escalation reporting pathway ("${esc.situation}") is trained in Guide Me / Test Me scenario practice.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'escalation',
        source_ref: escRef,
        description: esc.situation,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Guide Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Trained in Guide Me / Test Me scenario practice.',
      });
      excludedItems.push({
        item_ref: escRef,
        item_type: 'escalation',
        description: esc.situation,
        reason,
        disposition: 'assigned_to_guide_me',
        assigned_mode: 'Guide Me',
      });
    }
  });

  // 5. Account for remaining Safety Rules
  safetyRules.forEach((safe, sIdx) => {
    if (claimedSafetyIndices.has(sIdx)) return;
    const safeRef = safe.source_ref || `safe-${sIdx + 1}`;
    const ledgerId = makeLedgerItemId('safety_rule', safe.source_ref, sIdx);

    if (!safe.rule || safe.rule.trim().length <= 3) {
      const reason = `Safety rule has ambiguous or empty text and requires human instructional review.`;
      const item: VideoCoverageLedgerItem = {
        item_id: ledgerId,
        item_type: 'safety_rule',
        source_ref: safeRef,
        description: safe.rule || 'Empty safety rule',
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
        reason,
        confidence: 'unresolved',
        coverage_status: 'planned',
        instructional_proof: 'Unresolved source text requiring instructional SME review',
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: safeRef,
        item_type: 'safety_rule',
        description: safe.rule || 'Empty safety rule',
        reason,
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
      });
    } else if (isProhibitiveRule(safe.rule)) {
      const reason = `Safety prohibition ("${safe.rule}") is verified via Test Me compliance check questions rather than procedural demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'safety_rule',
        source_ref: safeRef,
        description: safe.rule,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Test Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Verified via Test Me compliance check questions.',
      });
      excludedItems.push({
        item_ref: safeRef,
        item_type: 'safety_rule',
        description: safe.rule,
        reason,
        disposition: 'assigned_to_test_me',
        assigned_mode: 'Test Me',
      });
    } else {
      const reason = `Workplace safety protocol ("${safe.rule}") is practiced in Guide Me real-world safety scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'safety_rule',
        source_ref: safeRef,
        description: safe.rule,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Guide Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Practiced in Guide Me real-world safety scenarios.',
      });
      excludedItems.push({
        item_ref: safeRef,
        item_type: 'safety_rule',
        description: safe.rule,
        reason,
        disposition: 'assigned_to_guide_me',
        assigned_mode: 'Guide Me',
      });
    }
  });

  // 6. Account for remaining Quality Rules
  qualityRules.forEach((qual, qIdx) => {
    if (claimedQualityIndices.has(qIdx)) return;
    const qualRef = qual.source_ref || `qual-${qIdx + 1}`;
    const ledgerId = makeLedgerItemId('control', qual.source_ref, qIdx);

    if (!qual.rule || qual.rule.trim().length <= 3) {
      const reason = `Quality rule has ambiguous or empty text and requires human instructional review.`;
      const item: VideoCoverageLedgerItem = {
        item_id: ledgerId,
        item_type: 'control',
        source_ref: qualRef,
        description: qual.rule || 'Empty quality rule',
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
        reason,
        confidence: 'unresolved',
        coverage_status: 'planned',
        instructional_proof: 'Unresolved source text requiring instructional SME review',
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: qualRef,
        item_type: 'control',
        description: qual.rule || 'Empty quality rule',
        reason,
        disposition: 'unresolved_review_required',
        assigned_mode: 'Unresolved',
      });
    } else {
      const reason = `Quality execution standard ("${qual.rule}") is practiced in Guide Me simulation scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'control',
        source_ref: qualRef,
        description: qual.rule,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Guide Me',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Practiced in Guide Me simulation scenarios.',
      });
      excludedItems.push({
        item_ref: qualRef,
        item_type: 'control',
        description: qual.rule,
        reason,
        disposition: 'assigned_to_guide_me',
        assigned_mode: 'Guide Me',
      });
    }
  });

  // 7. Account for Prerequisites
  if (prerequisites && prerequisites.length > 0) {
    prerequisites.forEach((pre, idx) => {
      const preRef = pre.source_ref || `pre-${idx + 1}`;
      const ledgerId = makeLedgerItemId('control', pre.source_ref, idx);
      const reason = 'Pre-operational qualification verified in Know It orientation cards before physical floor entry.';
      
      coverageLedger.push({
        item_id: ledgerId,
        item_type: 'control',
        source_ref: preRef,
        description: pre.text,
        disposition: 'assigned_to_learning_mode',
        assigned_mode: 'Know It',
        reason,
        confidence: 'high',
        coverage_status: 'verified_instructional_coverage',
        instructional_proof: 'Pre-operational qualification verified in Know It orientation cards before physical floor entry.',
      });
      excludedItems.push({
        item_ref: preRef,
        item_type: 'control',
        description: pre.text,
        reason,
        disposition: 'assigned_to_know_it',
        assigned_mode: 'Know It',
      });
    });
  }

  // Calculate total duration as sum of planned scenes
  const totalDuration = plannedClips.reduce((sum, c) => sum + (c.duration_seconds || 8), 0);

  const plan: VideoDemonstrationPlan = {
    strategy: 'sequential_steps',
    total_clips: plannedClips.length,
    clips: plannedClips,
    total_estimated_duration_seconds: totalDuration,
    excluded_from_video: excludedItems,
    coverage_ledger: coverageLedger,
    unresolved_items: unresolvedItems.length > 0 ? unresolvedItems : undefined,
    validation_status: 'valid',
  };

  // Run rigorous validation check
  const validation = validateVideoPlan(plan, blueprint);
  plan.validation_status = validation.isValid ? 'valid' : 'invalid';
  if (!validation.isValid) {
    plan.validation_errors = validation.errors;
  }

  return plan;
}

/**
 * Builds concise on-screen training overlay (e.g., "VERIFY ID → LOG RECEIPT")
 */
function buildOnScreenText(
  steps: OperationalBlueprint['operational_steps'],
  controlRule?: string,
  escalationAction?: string
): string {
  if (escalationAction) {
    const cleanEsc = escalationAction.replace(/^notify\s+/i, '').replace(/^report to\s+/i, '').toUpperCase();
    return `ANOMALY DETECTED → ESCALATE TO ${cleanEsc.slice(0, 18)}`;
  }
  if (controlRule && controlRule.length < 25) {
    return controlRule.toUpperCase();
  }
  const firstVerb = steps[0]?.action_verb?.toUpperCase() || 'EXECUTE';
  const firstTarget = (steps[0]?.task_title || steps[0]?.instruction || '').split(/\s+/).slice(0, 2).join(' ').toUpperCase();
  if (steps.length > 1) {
    const secondVerb = steps[1]?.action_verb?.toUpperCase() || 'VERIFY';
    return `${firstVerb} ${firstTarget} → THEN ${secondVerb}`;
  }
  return `${firstVerb} ${firstTarget}`;
}

/**
 * Validates the VideoPlan against strict quality criteria and coverage ledger integrity.
 */
export function validateVideoPlan(
  plan: VideoDemonstrationPlan,
  blueprint: OperationalBlueprint
): VideoPlanValidationResult {
  const errors: string[] = [];
  const steps = blueprint.operational_steps || [];
  const controls = blueprint.critical_controls || [];
  const decisions = blueprint.decision_points || [];
  const exceptions = blueprint.exceptions || [];
  const escalations = blueprint.escalations || [];
  const prerequisites = blueprint.prerequisites || [];

  // 1. Every critical operational step must be covered
  const coveredStepIndices = new Set<number>();
  plan.clips.forEach(clip => {
    (clip.covered_step_refs || []).forEach(ref => {
      steps.forEach((step, idx) => {
        if (ref === step.source?.source_ref || ref === `step-${idx + 1}` || clip.key_action === step.instruction) {
          coveredStepIndices.add(idx);
        }
      });
    });
  });

  const uncoveredSteps: number[] = [];
  steps.forEach((_, idx) => {
    if (!coveredStepIndices.has(idx)) {
      uncoveredSteps.push(idx + 1);
    }
  });

  if (uncoveredSteps.length > 0) {
    errors.push(`Coverage Failure: Steps [${uncoveredSteps.join(', ')}] were silently omitted from the video plan.`);
  }

  // 2. Scene count must be > 0 and match clips array length
  if (!plan.clips || plan.clips.length === 0) {
    errors.push('Validation Failure: Video plan contains zero scenes.');
  }
  if (plan.total_clips !== plan.clips.length) {
    errors.push(`Integrity Failure: total_clips (${plan.total_clips}) does not match clips array length (${plan.clips.length}).`);
  }

  // 3. No duplicate scenes (each scene must have distinct title)
  const seenPurposes = new Set<string>();
  plan.clips.forEach((clip, idx) => {
    if (seenPurposes.has(clip.title.toLowerCase())) {
      errors.push(`Duplicate Scene Failure: Scene ${idx + 1} repeats title "${clip.title}".`);
    }
    seenPurposes.add(clip.title.toLowerCase());
  });

  // 4. Sequential order verification
  let lastSeenStepIndex = -1;
  plan.clips.forEach((clip, cIdx) => {
    (clip.covered_step_refs || []).forEach(ref => {
      steps.forEach((step, sIdx) => {
        if (ref === step.source?.source_ref || ref === `step-${sIdx + 1}`) {
          if (sIdx < lastSeenStepIndex) {
            errors.push(`Sequence Failure: Scene ${cIdx + 1} steps (${sIdx + 1}) violate chronological order after step (${lastSeenStepIndex + 1}).`);
          }
          lastSeenStepIndex = Math.max(lastSeenStepIndex, sIdx);
        }
      });
    });
  });

  // 5. Check each scene has non-empty required fields
  plan.clips.forEach((clip, idx) => {
    if (!clip.veo_prompt || clip.veo_prompt.trim().length < 20) {
      errors.push(`Prompt Failure: Scene ${idx + 1} has an empty or invalid veo_prompt.`);
    }
    if (!clip.purpose) {
      errors.push(`Pedagogical Failure: Scene ${idx + 1} is missing an instructional purpose.`);
    }
    if (!clip.what_the_learner_should_see) {
      errors.push(`Visual Failure: Scene ${idx + 1} is missing what_the_learner_should_see.`);
    }
    if (!clip.what_the_learner_should_understand) {
      errors.push(`Cognitive Failure: Scene ${idx + 1} is missing what_the_learner_should_understand.`);
    }
  });

  // 6. Explicit Coverage Ledger Completeness & Disambiguation Check
  if (plan.coverage_ledger) {
    const safetyRules = blueprint.safety_rules || [];
    const qualityRules = blueprint.quality_rules || [];
    const totalExpectedSourceItems = steps.length + controls.length + decisions.length + exceptions.length + escalations.length + prerequisites.length + safetyRules.length + qualityRules.length;
    
    // Check for duplicate ledger item IDs
    const seenLedgerIds = new Set<string>();
    plan.coverage_ledger.forEach(item => {
      if (seenLedgerIds.has(item.item_id)) {
        errors.push(`Ledger Duplicate Failure: Item "${item.item_id}" is registered multiple times in the coverage ledger.`);
      }
      seenLedgerIds.add(item.item_id);
    });

    // Check ledger completeness: zero silently omitted items
    if (plan.coverage_ledger.length !== totalExpectedSourceItems) {
      errors.push(`Ledger Completeness Failure: Coverage ledger recorded ${plan.coverage_ledger.length} items but expected ${totalExpectedSourceItems} source items.`);
    }

    // Verify instructional destination and accountability
    plan.coverage_ledger.forEach(item => {
      if (item.disposition === 'represented_in_video') {
        if (!item.assigned_scene_index || !item.assigned_scene_id) {
          errors.push(`Ledger Disposition Failure: Item "${item.item_id}" marked represented_in_video but missing assigned scene.`);
        } else {
          const clip = plan.clips.find(c => c.clip_index === item.assigned_scene_index);
          if (!clip) {
            errors.push(`Ledger Scene Failure: Item "${item.item_id}" references non-existent scene ${item.assigned_scene_index}.`);
          }
        }
      } else if (item.disposition === 'assigned_to_learning_mode') {
        if (!item.assigned_mode || !['Guide Me', 'Test Me', 'Know It'].includes(item.assigned_mode)) {
          errors.push(`Ledger Destination Failure: Item "${item.item_id}" marked assigned_to_learning_mode has invalid destination "${item.assigned_mode}".`);
        }
        if (!item.reason || item.reason.trim().length === 0) {
          errors.push(`Ledger Accountability Failure: Item "${item.item_id}" assigned to ${item.assigned_mode} without an instructional reason.`);
        }
      }
    });

    // 7. Unresolved Critical Items Blocking Check
    const unresolved = plan.coverage_ledger.filter(i => i.disposition === 'unresolved_review_required');
    if (unresolved.length > 0) {
      unresolved.forEach(u => {
        errors.push(`Unresolved Item Failure: Critical item "${u.item_id}" (${u.description.slice(0, 30)}) has unresolved instructional disposition.`);
      });
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    metrics: {
      totalSteps: steps.length,
      coveredStepsCount: coveredStepIndices.size,
      excludedItemsCount: (plan.excluded_from_video || []).length,
      scenesCount: plan.clips.length,
      totalEstimatedDuration: plan.total_estimated_duration_seconds || plan.clips.length * 8,
    },
  };
}
