// server.ts
import express from "express";
import { GoogleGenAI as GoogleGenAI2, GenerateVideosOperation } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import { fileURLToPath } from "url";

// src/utils/veoPromptBuilder.ts
function getDomainPreset(text) {
  const lower = text.toLowerCase();
  if (lower.includes("posh") || lower.includes("compliance") || lower.includes("hr") || lower.includes("investigation") || lower.includes("committee") || lower.includes("legal") || lower.includes("policy") || lower.includes("complaint") || lower.includes("intake")) {
    return {
      environment: "executive private corporate meeting suite with frosted acoustic glass partitions, polished oak conference table, and organized file trays",
      lighting: "diffused natural morning daylight mixed with warm commercial recessed spotlights",
      camera: "slow cinematic right-to-left tracking dolly shot maintaining steady focal depth until the final frame"
    };
  }
  if (lower.includes("phlebotom") || lower.includes("blood") || lower.includes("sample") || lower.includes("patient") || lower.includes("lab") || lower.includes("specimen") || lower.includes("clinic") || lower.includes("hospital")) {
    return {
      environment: "sterile clinical preparation suite with stainless steel countertops, organized specimen racks, and digital centrifuge arrays",
      lighting: "crisp medical-grade neutral illumination with soft diffused fill",
      camera: "steady continuous forward camera drift gliding smoothly along the clinical preparation bench"
    };
  }
  if (lower.includes("retail") || lower.includes("cashier") || lower.includes("store") || lower.includes("checkout") || lower.includes("pos") || lower.includes("customer") || lower.includes("barcode")) {
    return {
      environment: "modern organized retail point-of-sale checkout counter with barcode scanner cradle and clean product shelving displays",
      lighting: "bright commercial overhead lighting balanced by warm ambient store glow",
      camera: "slow cinematic lateral tracking shot moving steadily across the checkout area"
    };
  }
  if (lower.includes("pick") || lower.includes("pack") || lower.includes("warehouse") || lower.includes("tote") || lower.includes("inventory") || lower.includes("logistics") || lower.includes("wms")) {
    return {
      environment: "well-lit fulfillment center staging aisle with high-bay metal racking, yellow safety bollards, and organized staging bins",
      lighting: "even industrial high-bay LED illumination with clean directional contrast",
      camera: "smooth continuous forward dolly shot gliding steadily down the aisle"
    };
  }
  if (lower.includes("hotel") || lower.includes("housekeep") || lower.includes("guest") || lower.includes("room") || lower.includes("linen") || lower.includes("suite")) {
    return {
      environment: "contemporary premium hospitality suite with tailored wood millwork, linen preparation station, and pristine surfaces",
      lighting: "warm ambient sunlight filtered through sheer curtains with warm architectural accents",
      camera: "slow cinematic lateral panning shot drifting smoothly across the room"
    };
  }
  return {
    environment: "modern professional operational facility with organized workstations, safety signage, and equipment staging bays",
    lighting: "clean commercial studio illumination with balanced soft natural daylight",
    camera: "subtle continuous camera tracking shot gliding steadily forward"
  };
}
function toContinuousAction(rawAction) {
  let clean = rawAction.trim().replace(/^Step \d+:\s*/i, "");
  clean = clean.replace(/^(please|ensure to|make sure to|always|must|should|verify that|check that)\s+/i, "");
  clean = clean.replace(/\b(close[s]?|shut[s]?)\s+the\s+laptop\b/gi, "keeping the laptop open as operational data flows").replace(/\b(press[es]?|push[es]?|hit[s]?)\s+(?:the\s+)?button\b/gi, "holding down the control button safely").replace(/\b(sit[s]?\s+down)\b/gi, "seated stationary while methodically analyzing").replace(/\b(stand[s]?\s+up)\b/gi, "standing alertly while inspecting").replace(/\b(shut[s]?\s+down|power[s]?\s+off)\b/gi, "steadily monitoring system status indicators").replace(/\b(finish[es]?|complete[s]?)\b/gi, "continuously verifying and logging final results");
  const verbMap = {
    receive: "receiving and cross-checking",
    verify: "methodically verifying and examining",
    inspect: "carefully inspecting and reviewing",
    check: "systematically checking and confirming",
    scan: "steadily scanning and logging",
    record: "precisely documenting and recording",
    review: "continuously reviewing and cross-referencing",
    prepare: "methodically preparing and staging",
    intake: "conducting formal intake and documenting",
    route: "securing and routing",
    pack: "carefully arranging and packing",
    place: "steadily positioning and securing",
    handle: "properly handling and managing",
    examine: "thoroughly examining and analyzing",
    log: "systematically logging and recording",
    confirm: "consistently confirming and validating",
    monitor: "continuously monitoring and observing",
    calibrate: "slowly calibrating and adjusting"
  };
  const words = clean.split(/\s+/);
  const firstWord = words[0]?.toLowerCase() || "";
  if (verbMap[firstWord]) {
    words[0] = verbMap[firstWord];
    clean = words.join(" ");
  } else if (!clean.toLowerCase().includes("ing")) {
    clean = `steadily executing ${clean}`;
  }
  return clean;
}
function buildVeoPrompt(options) {
  const { role = "frontline professional", process: process2 = "operational procedure", actionInstruction, criticalControl, decisionOrException } = options;
  const contextText = `${role} ${process2} ${actionInstruction} ${criticalControl || ""} ${decisionOrException || ""}`;
  const preset = getDomainPreset(contextText);
  let continuousAction = toContinuousAction(actionInstruction);
  if (criticalControl && !continuousAction.toLowerCase().includes(criticalControl.toLowerCase().slice(0, 15))) {
    continuousAction += ` while applying critical control (${criticalControl.replace(/\.$/, "")})`;
  } else if (decisionOrException && !continuousAction.toLowerCase().includes(decisionOrException.toLowerCase().slice(0, 15))) {
    continuousAction += ` while executing procedure (${decisionOrException.replace(/\.$/, "")})`;
  }
  return `Photorealistic 720p 16:9 cinematic instructional demonstration. A frontline ${role} is ${continuousAction} with steady, continuous hand movements. The setting is a ${preset.environment}. ${preset.lighting}. ${preset.camera}.`;
}

// src/utils/videoPlanEngine.ts
function clusterStepsIntoScenes(steps) {
  if (!steps || steps.length === 0) return [];
  const clusters = [];
  if (steps.length <= 3) {
    steps.forEach((step, idx) => {
      clusters.push({
        title: step.task_title || `Step ${idx + 1}`,
        steps: [step],
        phase: idx === 0 ? "setup_and_intake" : idx === steps.length - 1 ? "verification_and_handoff" : "core_execution"
      });
    });
    return clusters;
  }
  let currentGroup = [];
  let currentTitle = "";
  let currentPhase = "setup_and_intake";
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const cat = step.category || "DO";
    const isEscalationOrException = cat === "ESCALATE" || cat === "RECOVER" || cat === "RESPOND" || /escalat|damage|hazard|reject|incident/i.test(step.instruction);
    const isDecisionOrControl = cat === "DECIDE" || cat === "CHECK" || step.critical_control || /verif|inspect|check|ratio|dwell/i.test(step.instruction);
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    let stepPhase = "core_execution";
    if (isFirst || i <= 1 && /greet|arriv|intake|identif|receiv|order|book/i.test(step.instruction)) {
      stepPhase = "setup_and_intake";
    } else if (/prep|sanitiz|dilut|clean|station|tray|glove|swab/i.test(step.instruction)) {
      stepPhase = "inspection_and_prep";
    } else if (isEscalationOrException) {
      stepPhase = "exception_and_escalation";
    } else if (isDecisionOrControl) {
      stepPhase = "control_and_decision";
    } else if (isLast || /handover|sign-off|discharg|complet|log|handoff/i.test(step.instruction)) {
      stepPhase = "verification_and_handoff";
    }
    if (currentGroup.length > 0) {
      const shouldSplit = currentGroup.length >= 2 || currentPhase !== stepPhase;
      if (shouldSplit) {
        clusters.push({
          title: currentTitle,
          steps: currentGroup,
          phase: currentPhase
        });
        currentGroup = [];
      }
    }
    if (currentGroup.length === 0) {
      currentPhase = stepPhase;
      currentTitle = step.task_title || `Scene ${clusters.length + 1}: ${stepPhase.replace(/_/g, " ")}`;
    }
    currentGroup.push(step);
  }
  if (currentGroup.length > 0) {
    clusters.push({
      title: currentTitle,
      steps: currentGroup,
      phase: currentPhase
    });
  }
  return clusters;
}
var STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "have",
  "must",
  "when",
  "then",
  "into",
  "after",
  "before",
  "should",
  "ensure",
  "using",
  "under",
  "over",
  "each",
  "every",
  "will",
  "been",
  "being",
  "standard",
  "procedure",
  "this",
  "that",
  "these",
  "those",
  "such",
  "only",
  "more",
  "most",
  "some",
  "any",
  "all",
  "both",
  "between",
  "through",
  "during"
]);
var GENERIC_WORDS = /* @__PURE__ */ new Set([
  "patient",
  "customer",
  "safety",
  "process",
  "procedure",
  "standard",
  "protocol",
  "operation",
  "operational",
  "frontline",
  "service",
  "system",
  "action",
  "check",
  "ensure",
  "verify",
  "verifying",
  "perform",
  "performing",
  "practice",
  "guideline",
  "compliance",
  "compliant",
  "requirement",
  "require",
  "correct",
  "proper",
  "appropriate",
  "manner",
  "method",
  "methodical",
  "carefully",
  "always",
  "never",
  "routine",
  "rule",
  "rules",
  "step",
  "steps",
  "item",
  "items",
  "work",
  "worker",
  "staff",
  "employee",
  "department",
  "role",
  "unit",
  "area",
  "room",
  "time",
  "date",
  "form"
]);
function extractSpecificKeywords(text) {
  if (!text) return [];
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !GENERIC_WORDS.has(w));
}
function isProhibitiveRule(text) {
  if (!text) return false;
  return /\b(zero\s+tolerance|zero|never|prohibit|prohibited|forbidden|not\s+permitted|cannot|ban|banned|refuse|strictly\s+avoided|do\s+not|don't)\b/i.test(text);
}
function matchesStepRef(step, stepIdx, sourceRef) {
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
function makeLedgerItemId(type, sourceRef, idx) {
  const cleanRef = sourceRef?.trim() || "";
  if (cleanRef && !cleanRef.includes(" ") && cleanRef.startsWith(`${type}-`)) {
    return cleanRef;
  }
  return `${type}:${cleanRef || idx + 1}`;
}
function findBestSceneAssociation(itemText, itemSourceRef, stepClusters, steps) {
  if (itemSourceRef && itemSourceRef.trim().length > 0) {
    const structuredMatches = [];
    stepClusters.forEach((cluster, cIdx) => {
      const hasDirectRef = cluster.steps.some((s) => matchesStepRef(s, steps.indexOf(s), itemSourceRef));
      if (hasDirectRef) {
        structuredMatches.push(cIdx);
      }
    });
    if (structuredMatches.length > 0) {
      return {
        clusterIndex: structuredMatches[0],
        matchType: "structured",
        confidence: "high"
      };
    }
  }
  const specificItemKeywords = Array.from(new Set(extractSpecificKeywords(itemText)));
  if (specificItemKeywords.length < 2) {
    return null;
  }
  const scores = [];
  stepClusters.forEach((cluster, cIdx) => {
    const clusterText = `${cluster.title} ${cluster.steps.map((s) => `${s.task_title || ""} ${s.instruction}`).join(" ")}`;
    const clusterKeywords = new Set(extractSpecificKeywords(clusterText));
    const matchedWords = specificItemKeywords.filter((w) => clusterKeywords.has(w));
    if (matchedWords.length >= 2) {
      scores.push({ clusterIndex: cIdx, score: matchedWords.length, matchedWords });
    }
  });
  if (scores.length === 0) {
    return null;
  }
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > 1 && scores[0].score === scores[1].score) {
    return {
      isAmbiguous: true,
      ambiguousCandidateIndices: scores.map((s) => s.clusterIndex),
      matchedWords: scores[0].matchedWords
    };
  }
  return {
    clusterIndex: scores[0].clusterIndex,
    matchType: "semantic",
    confidence: scores[0].score >= 3 ? "high" : "medium",
    matchedWords: scores[0].matchedWords
  };
}
function planVideoDemonstration(blueprint) {
  const steps = blueprint.operational_steps || [];
  const controls = blueprint.critical_controls || [];
  const decisions = blueprint.decision_points || [];
  const exceptions = blueprint.exceptions || [];
  const escalations = blueprint.escalations || [];
  const safetyRules = blueprint.safety_rules || [];
  const qualityRules = blueprint.quality_rules || [];
  const prerequisites = blueprint.prerequisites || [];
  const role = blueprint.role || "frontline professional";
  const processName = blueprint.process || blueprint.document_identity?.doc_title || "Standard Operating Procedure";
  const excludedItems = [];
  const coverageLedger = [];
  const unresolvedItems = [];
  const stepClusters = clusterStepsIntoScenes(steps);
  const plannedClips = [];
  const claimedControlIndices = /* @__PURE__ */ new Set();
  const claimedDecisionIndices = /* @__PURE__ */ new Set();
  const claimedExceptionIndices = /* @__PURE__ */ new Set();
  const claimedEscalationIndices = /* @__PURE__ */ new Set();
  const claimedSafetyIndices = /* @__PURE__ */ new Set();
  const claimedQualityIndices = /* @__PURE__ */ new Set();
  const assignedControlByScene = /* @__PURE__ */ new Map();
  const assignedDecisionByScene = /* @__PURE__ */ new Map();
  const assignedExceptionByScene = /* @__PURE__ */ new Map();
  const assignedEscalationByScene = /* @__PURE__ */ new Map();
  const assignedSafetyByScene = /* @__PURE__ */ new Map();
  const assignedQualityByScene = /* @__PURE__ */ new Map();
  controls.forEach((ctrl, cIdx) => {
    if (isProhibitiveRule(ctrl.rule)) return;
    const text = `${ctrl.rule} ${ctrl.rationale || ""}`;
    const res = findBestSceneAssociation(text, ctrl.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedControlByScene.has(res.clusterIndex)) {
        assignedControlByScene.set(res.clusterIndex, { ctrl, index: cIdx });
        claimedControlIndices.add(cIdx);
      }
    }
  });
  decisions.forEach((dec, dIdx) => {
    if (!dec.situation || dec.situation.trim().length <= 3) return;
    const text = `${dec.situation} ${dec.decision || ""}`;
    const res = findBestSceneAssociation(text, dec.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedDecisionByScene.has(res.clusterIndex)) {
        assignedDecisionByScene.set(res.clusterIndex, { dec, index: dIdx });
        claimedDecisionIndices.add(dIdx);
      }
    }
  });
  exceptions.forEach((exc, eIdx) => {
    if (!exc.trigger || exc.trigger.trim().length <= 3) return;
    const text = `${exc.trigger} ${exc.resolution || ""}`;
    const res = findBestSceneAssociation(text, exc.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedExceptionByScene.has(res.clusterIndex)) {
        assignedExceptionByScene.set(res.clusterIndex, { exc, index: eIdx });
        claimedExceptionIndices.add(eIdx);
      }
    }
  });
  escalations.forEach((esc, escIdx) => {
    if (!esc.situation || esc.situation.trim().length <= 3) return;
    const text = `${esc.situation} ${esc.contact_or_action || ""}`;
    const res = findBestSceneAssociation(text, esc.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedEscalationByScene.has(res.clusterIndex)) {
        assignedEscalationByScene.set(res.clusterIndex, { esc, index: escIdx });
        claimedEscalationIndices.add(escIdx);
      }
    }
  });
  safetyRules.forEach((safe, sIdx) => {
    if (!safe.rule || safe.rule.trim().length <= 3 || isProhibitiveRule(safe.rule)) return;
    const res = findBestSceneAssociation(safe.rule, safe.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedSafetyByScene.has(res.clusterIndex)) {
        assignedSafetyByScene.set(res.clusterIndex, { safe, index: sIdx });
        claimedSafetyIndices.add(sIdx);
      }
    }
  });
  qualityRules.forEach((qual, qIdx) => {
    if (!qual.rule || qual.rule.trim().length <= 3 || isProhibitiveRule(qual.rule)) return;
    const res = findBestSceneAssociation(qual.rule, qual.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedQualityByScene.has(res.clusterIndex)) {
        assignedQualityByScene.set(res.clusterIndex, { qual, index: qIdx });
        claimedQualityIndices.add(qIdx);
      }
    }
  });
  stepClusters.forEach((cluster, clusterIdx) => {
    const sceneIndex = clusterIdx + 1;
    const sceneId = `scene-${sceneIndex}`;
    const primaryStep = cluster.steps[0];
    const coveredRefs = cluster.steps.map((s, idx) => s.source?.source_ref || `step-${steps.indexOf(s) + 1}`);
    const combinedActions = cluster.steps.map((s) => s.instruction).join(" and ");
    const primaryTaskTitle = cluster.steps.map((s) => s.task_title).filter(Boolean).join(" & ") || cluster.title;
    cluster.steps.forEach((step) => {
      const stepIdx = steps.indexOf(step);
      const stepRef = step.source?.source_ref || `step-${stepIdx + 1}`;
      coverageLedger.push({
        item_id: makeLedgerItemId("step", stepRef, stepIdx),
        item_type: "step",
        source_ref: stepRef,
        description: step.instruction,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated as core procedural action in Scene ${sceneIndex}.`
      });
    });
    const matchedControlObj = assignedControlByScene.get(clusterIdx);
    const matchedControl = matchedControlObj?.ctrl;
    if (matchedControl && matchedControlObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("control", matchedControl.source_ref, matchedControlObj.index),
        item_type: "control",
        source_ref: matchedControl.source_ref || `ctrl-${matchedControlObj.index + 1}`,
        description: matchedControl.rule,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Demonstrated directly in Scene ${sceneIndex} as active procedural control.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Observed in Scene ${sceneIndex} prompt and learner observation cues.`
      });
    }
    const matchedDecisionObj = assignedDecisionByScene.get(clusterIdx);
    const matchedDecision = matchedDecisionObj?.dec;
    if (matchedDecision && matchedDecisionObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("decision", matchedDecision.source_ref, matchedDecisionObj.index),
        item_type: "decision",
        source_ref: matchedDecision.source_ref || `dec-${matchedDecisionObj.index + 1}`,
        description: matchedDecision.situation,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Illustrated in Scene ${sceneIndex} decision cue.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated in Scene ${sceneIndex} decision cue.`
      });
    }
    const matchedExceptionObj = assignedExceptionByScene.get(clusterIdx);
    const matchedException = matchedExceptionObj?.exc;
    if (matchedException && matchedExceptionObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("exception", matchedException.source_ref, matchedExceptionObj.index),
        item_type: "exception",
        source_ref: matchedException.source_ref || `exc-${matchedExceptionObj.index + 1}`,
        description: matchedException.trigger,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Visualized in Scene ${sceneIndex} exception resolution cue.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Visualized in Scene ${sceneIndex} exception prompt and resolution cue.`
      });
    }
    const matchedEscalationObj = assignedEscalationByScene.get(clusterIdx);
    const matchedEscalation = matchedEscalationObj?.esc;
    if (matchedEscalation && matchedEscalationObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("escalation", matchedEscalation.source_ref, matchedEscalationObj.index),
        item_type: "escalation",
        source_ref: matchedEscalation.source_ref || `esc-${matchedEscalationObj.index + 1}`,
        description: matchedEscalation.situation,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Highlighted in Scene ${sceneIndex} escalation cue.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Highlighted in Scene ${sceneIndex} escalation cue.`
      });
    }
    const matchedSafetyObj = assignedSafetyByScene.get(clusterIdx);
    const matchedSafety = matchedSafetyObj?.safe;
    if (matchedSafety && matchedSafetyObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("safety_rule", matchedSafety.source_ref, matchedSafetyObj.index),
        item_type: "safety_rule",
        source_ref: matchedSafety.source_ref || `safe-${matchedSafetyObj.index + 1}`,
        description: matchedSafety.rule,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Demonstrated in Scene ${sceneIndex} procedural safety precautions.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated in Scene ${sceneIndex} procedural safety precautions.`
      });
    }
    const matchedQualityObj = assignedQualityByScene.get(clusterIdx);
    const matchedQuality = matchedQualityObj?.qual;
    if (matchedQuality && matchedQualityObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("control", matchedQuality.source_ref, matchedQualityObj.index),
        item_type: "control",
        source_ref: matchedQuality.source_ref || `qual-${matchedQualityObj.index + 1}`,
        description: matchedQuality.rule,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Demonstrated in Scene ${sceneIndex} quality execution standard.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated in Scene ${sceneIndex} quality execution standard.`
      });
    }
    const purpose = cluster.steps.length === 1 ? `Demonstrate ${cluster.steps[0].instruction}` : `Demonstrate sequential execution of ${cluster.steps[0].task_title || "initial action"} followed by ${cluster.steps[cluster.steps.length - 1].task_title || "verification"}`;
    const criticalAction = `Frontline ${role} executes ${combinedActions}`;
    let controlOrDecision;
    if (matchedControl) {
      controlOrDecision = `Critical Control: ${matchedControl.rule}`;
    } else if (matchedDecision) {
      controlOrDecision = `Decision Point: In situation "${matchedDecision.situation}", choose "${matchedDecision.decision}"`;
    }
    let exceptionOrEscalation;
    if (matchedEscalation) {
      exceptionOrEscalation = `Escalation: ${matchedEscalation.situation} -> ${matchedEscalation.contact_or_action}`;
    } else if (matchedException) {
      exceptionOrEscalation = `Exception Resolution: ${matchedException.trigger} -> ${matchedException.resolution}`;
    }
    let whatLearnerShouldSee = `Clear physical view of ${role} performing ${cluster.steps[0].instruction}${cluster.steps[1] ? ` and then ${cluster.steps[1].instruction}` : ""} with authentic equipment.`;
    if (matchedControl) {
      whatLearnerShouldSee += ` Learner explicitly observes execution of mandatory control: "${matchedControl.rule}".`;
    }
    if (matchedException) {
      whatLearnerShouldSee += ` Learner explicitly observes exception management: in response to "${matchedException.trigger}", immediately "${matchedException.resolution}".`;
    }
    const whatLearnerShouldUnderstand = cluster.steps[0].why_it_matters || matchedControl?.rationale || `Ensures compliance with standard operational quality and safety guidelines.`;
    const onScreenText = buildOnScreenText(cluster.steps, matchedControl?.rule, matchedEscalation?.contact_or_action);
    const veoPrompt = buildVeoPrompt({
      role,
      process: processName,
      taskTitle: primaryTaskTitle,
      actionInstruction: combinedActions,
      stepIndex: sceneIndex,
      criticalControl: matchedControl?.rule,
      decisionOrException: matchedException?.resolution || matchedDecision?.action
    });
    const clipDuration = 8;
    let distinctTitle = primaryTaskTitle;
    if (plannedClips.some((p) => p.title.toLowerCase() === distinctTitle.toLowerCase())) {
      distinctTitle = `Scene ${sceneIndex}: ${distinctTitle}`;
    }
    plannedClips.push({
      clip_index: sceneIndex,
      scene_id: sceneId,
      title: distinctTitle,
      purpose,
      step_ref: `Steps ${coveredRefs.join(", ")}`,
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
      tool_or_hazard: cluster.steps.find((s) => s.target_code)?.target_code
    });
  });
  if (plannedClips.length === 0) {
    const defaultAction = blueprint.process || "Perform standard operational procedure";
    plannedClips.push({
      clip_index: 1,
      scene_id: "scene-1",
      title: "Operational Procedure Overview",
      purpose: `Demonstrate ${defaultAction}`,
      step_ref: "General Procedure",
      covered_step_refs: ["general"],
      critical_action: `Frontline ${role} executes ${defaultAction}`,
      what_the_learner_should_see: `Clear physical view of ${role} demonstrating compliant technique.`,
      what_the_learner_should_understand: `Ensures compliance with standard operational quality and safety guidelines.`,
      on_screen_text: "EXECUTE COMPLIANT WORKPLACE PROCEDURE",
      duration_seconds: 8,
      estimated_duration_seconds: 8,
      veo_prompt: buildVeoPrompt({
        role,
        process: processName,
        actionInstruction: defaultAction,
        stepIndex: 1
      }),
      key_action: defaultAction
    });
  }
  controls.forEach((ctrl, cIdx) => {
    if (claimedControlIndices.has(cIdx)) return;
    const ctrlRef = ctrl.source_ref || `ctrl-${cIdx + 1}`;
    const ledgerId = makeLedgerItemId("control", ctrl.source_ref, cIdx);
    if (!ctrl.rule || ctrl.rule.trim().length <= 3) {
      const reason = `Critical control has ambiguous or empty source text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "control",
        source_ref: ctrlRef,
        description: ctrl.rule || "Empty control rule",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: "control",
        description: ctrl.rule || "Empty control rule",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else if (isProhibitiveRule(ctrl.rule)) {
      const reason = `Statutory / compliance prohibition ("${ctrl.rule}") is verified via Test Me compliance check questions rather than procedural demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: ctrlRef,
        description: ctrl.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Test Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Evaluated via Test Me compliance check questions."
      });
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: "control",
        description: ctrl.rule,
        reason,
        disposition: "assigned_to_test_me",
        assigned_mode: "Test Me"
      });
    } else {
      const assoc = findBestSceneAssociation(`${ctrl.rule} ${ctrl.rationale || ""}`, ctrl.source_ref, stepClusters, steps);
      const reason = assoc?.isAmbiguous ? `Ambiguous multi-step association (candidate scenes: ${assoc.ambiguousCandidateIndices?.map((i) => i + 1).join(", ")}); routed to Guide Me scenario rather than forced video guess.` : `Quality control requirement ("${ctrl.rule}") is practiced in Guide Me simulation scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: ctrlRef,
        description: ctrl.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: assoc?.isAmbiguous ? "medium" : "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced interactively in Guide Me simulation scenarios."
      });
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: "control",
        description: ctrl.rule,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  decisions.forEach((dec, dIdx) => {
    if (claimedDecisionIndices.has(dIdx)) return;
    const decRef = dec.source_ref || `dec-${dIdx + 1}`;
    const ledgerId = makeLedgerItemId("decision", dec.source_ref, dIdx);
    if (!dec.situation || dec.situation.trim().length <= 3) {
      const reason = `Decision point has ambiguous or empty source text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "decision",
        source_ref: decRef,
        description: dec.situation || "Empty decision point",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: decRef,
        item_type: "decision",
        description: dec.situation || "Empty decision point",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Contingency branch dilemma ("${dec.situation}") is practiced interactively in Guide Me simulator choices rather than linear demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "decision",
        source_ref: decRef,
        description: dec.situation,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced interactively in Guide Me branching choices."
      });
      excludedItems.push({
        item_ref: decRef,
        item_type: "decision",
        description: dec.situation,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  exceptions.forEach((exc, eIdx) => {
    if (claimedExceptionIndices.has(eIdx)) return;
    const excRef = exc.source_ref || `exc-${eIdx + 1}`;
    const ledgerId = makeLedgerItemId("exception", exc.source_ref, eIdx);
    if (!exc.trigger || exc.trigger.trim().length <= 3) {
      const reason = `Exception protocol has ambiguous or empty trigger text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "exception",
        source_ref: excRef,
        description: exc.trigger || "Empty exception trigger",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: excRef,
        item_type: "exception",
        description: exc.trigger || "Empty exception trigger",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Exception handling protocol ("${exc.trigger}") is practiced in Guide Me real-world problem scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "exception",
        source_ref: excRef,
        description: exc.trigger,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced in Guide Me real-world problem scenarios."
      });
      excludedItems.push({
        item_ref: excRef,
        item_type: "exception",
        description: exc.trigger,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  escalations.forEach((esc, escIdx) => {
    if (claimedEscalationIndices.has(escIdx)) return;
    const escRef = esc.source_ref || `esc-${escIdx + 1}`;
    const ledgerId = makeLedgerItemId("escalation", esc.source_ref, escIdx);
    if (!esc.situation || esc.situation.trim().length <= 3) {
      const reason = `Escalation pathway has ambiguous or empty situation text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "escalation",
        source_ref: escRef,
        description: esc.situation || "Empty escalation situation",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: escRef,
        item_type: "escalation",
        description: esc.situation || "Empty escalation situation",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Escalation reporting pathway ("${esc.situation}") is trained in Guide Me / Test Me scenario practice.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "escalation",
        source_ref: escRef,
        description: esc.situation,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Trained in Guide Me / Test Me scenario practice."
      });
      excludedItems.push({
        item_ref: escRef,
        item_type: "escalation",
        description: esc.situation,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  safetyRules.forEach((safe, sIdx) => {
    if (claimedSafetyIndices.has(sIdx)) return;
    const safeRef = safe.source_ref || `safe-${sIdx + 1}`;
    const ledgerId = makeLedgerItemId("safety_rule", safe.source_ref, sIdx);
    if (!safe.rule || safe.rule.trim().length <= 3) {
      const reason = `Safety rule has ambiguous or empty text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "safety_rule",
        source_ref: safeRef,
        description: safe.rule || "Empty safety rule",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: safeRef,
        item_type: "safety_rule",
        description: safe.rule || "Empty safety rule",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else if (isProhibitiveRule(safe.rule)) {
      const reason = `Safety prohibition ("${safe.rule}") is verified via Test Me compliance check questions rather than procedural demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "safety_rule",
        source_ref: safeRef,
        description: safe.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Test Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Verified via Test Me compliance check questions."
      });
      excludedItems.push({
        item_ref: safeRef,
        item_type: "safety_rule",
        description: safe.rule,
        reason,
        disposition: "assigned_to_test_me",
        assigned_mode: "Test Me"
      });
    } else {
      const reason = `Workplace safety protocol ("${safe.rule}") is practiced in Guide Me real-world safety scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "safety_rule",
        source_ref: safeRef,
        description: safe.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced in Guide Me real-world safety scenarios."
      });
      excludedItems.push({
        item_ref: safeRef,
        item_type: "safety_rule",
        description: safe.rule,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  qualityRules.forEach((qual, qIdx) => {
    if (claimedQualityIndices.has(qIdx)) return;
    const qualRef = qual.source_ref || `qual-${qIdx + 1}`;
    const ledgerId = makeLedgerItemId("control", qual.source_ref, qIdx);
    if (!qual.rule || qual.rule.trim().length <= 3) {
      const reason = `Quality rule has ambiguous or empty text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "control",
        source_ref: qualRef,
        description: qual.rule || "Empty quality rule",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: qualRef,
        item_type: "control",
        description: qual.rule || "Empty quality rule",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Quality execution standard ("${qual.rule}") is practiced in Guide Me simulation scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: qualRef,
        description: qual.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced in Guide Me simulation scenarios."
      });
      excludedItems.push({
        item_ref: qualRef,
        item_type: "control",
        description: qual.rule,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  if (prerequisites && prerequisites.length > 0) {
    prerequisites.forEach((pre, idx) => {
      const preRef = pre.source_ref || `pre-${idx + 1}`;
      const ledgerId = makeLedgerItemId("control", pre.source_ref, idx);
      const reason = "Pre-operational qualification verified in Know It orientation cards before physical floor entry.";
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: preRef,
        description: pre.text,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Know It",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Pre-operational qualification verified in Know It orientation cards before physical floor entry."
      });
      excludedItems.push({
        item_ref: preRef,
        item_type: "control",
        description: pre.text,
        reason,
        disposition: "assigned_to_know_it",
        assigned_mode: "Know It"
      });
    });
  }
  const totalDuration = plannedClips.reduce((sum, c) => sum + (c.duration_seconds || 8), 0);
  const plan = {
    strategy: "sequential_steps",
    total_clips: plannedClips.length,
    clips: plannedClips,
    total_estimated_duration_seconds: totalDuration,
    excluded_from_video: excludedItems,
    coverage_ledger: coverageLedger,
    unresolved_items: unresolvedItems.length > 0 ? unresolvedItems : void 0,
    validation_status: "valid"
  };
  const validation = validateVideoPlan(plan, blueprint);
  plan.validation_status = validation.isValid ? "valid" : "invalid";
  if (!validation.isValid) {
    plan.validation_errors = validation.errors;
  }
  return plan;
}
function buildOnScreenText(steps, controlRule, escalationAction) {
  if (escalationAction) {
    const cleanEsc = escalationAction.replace(/^notify\s+/i, "").replace(/^report to\s+/i, "").toUpperCase();
    return `ANOMALY DETECTED \u2192 ESCALATE TO ${cleanEsc.slice(0, 18)}`;
  }
  if (controlRule && controlRule.length < 25) {
    return controlRule.toUpperCase();
  }
  const firstVerb = steps[0]?.action_verb?.toUpperCase() || "EXECUTE";
  const firstTarget = (steps[0]?.task_title || steps[0]?.instruction || "").split(/\s+/).slice(0, 2).join(" ").toUpperCase();
  if (steps.length > 1) {
    const secondVerb = steps[1]?.action_verb?.toUpperCase() || "VERIFY";
    return `${firstVerb} ${firstTarget} \u2192 THEN ${secondVerb}`;
  }
  return `${firstVerb} ${firstTarget}`;
}
function validateVideoPlan(plan, blueprint) {
  const errors = [];
  const steps = blueprint.operational_steps || [];
  const controls = blueprint.critical_controls || [];
  const decisions = blueprint.decision_points || [];
  const exceptions = blueprint.exceptions || [];
  const escalations = blueprint.escalations || [];
  const prerequisites = blueprint.prerequisites || [];
  const coveredStepIndices = /* @__PURE__ */ new Set();
  plan.clips.forEach((clip) => {
    (clip.covered_step_refs || []).forEach((ref) => {
      steps.forEach((step, idx) => {
        if (ref === step.source?.source_ref || ref === `step-${idx + 1}` || clip.key_action === step.instruction) {
          coveredStepIndices.add(idx);
        }
      });
    });
  });
  const uncoveredSteps = [];
  steps.forEach((_, idx) => {
    if (!coveredStepIndices.has(idx)) {
      uncoveredSteps.push(idx + 1);
    }
  });
  if (uncoveredSteps.length > 0) {
    errors.push(`Coverage Failure: Steps [${uncoveredSteps.join(", ")}] were silently omitted from the video plan.`);
  }
  if (!plan.clips || plan.clips.length === 0) {
    errors.push("Validation Failure: Video plan contains zero scenes.");
  }
  if (plan.total_clips !== plan.clips.length) {
    errors.push(`Integrity Failure: total_clips (${plan.total_clips}) does not match clips array length (${plan.clips.length}).`);
  }
  const seenPurposes = /* @__PURE__ */ new Set();
  plan.clips.forEach((clip, idx) => {
    if (seenPurposes.has(clip.title.toLowerCase())) {
      errors.push(`Duplicate Scene Failure: Scene ${idx + 1} repeats title "${clip.title}".`);
    }
    seenPurposes.add(clip.title.toLowerCase());
  });
  let lastSeenStepIndex = -1;
  plan.clips.forEach((clip, cIdx) => {
    (clip.covered_step_refs || []).forEach((ref) => {
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
  if (plan.coverage_ledger) {
    const safetyRules = blueprint.safety_rules || [];
    const qualityRules = blueprint.quality_rules || [];
    const totalExpectedSourceItems = steps.length + controls.length + decisions.length + exceptions.length + escalations.length + prerequisites.length + safetyRules.length + qualityRules.length;
    const seenLedgerIds = /* @__PURE__ */ new Set();
    plan.coverage_ledger.forEach((item) => {
      if (seenLedgerIds.has(item.item_id)) {
        errors.push(`Ledger Duplicate Failure: Item "${item.item_id}" is registered multiple times in the coverage ledger.`);
      }
      seenLedgerIds.add(item.item_id);
    });
    if (plan.coverage_ledger.length !== totalExpectedSourceItems) {
      errors.push(`Ledger Completeness Failure: Coverage ledger recorded ${plan.coverage_ledger.length} items but expected ${totalExpectedSourceItems} source items.`);
    }
    plan.coverage_ledger.forEach((item) => {
      if (item.disposition === "represented_in_video") {
        if (!item.assigned_scene_index || !item.assigned_scene_id) {
          errors.push(`Ledger Disposition Failure: Item "${item.item_id}" marked represented_in_video but missing assigned scene.`);
        } else {
          const clip = plan.clips.find((c) => c.clip_index === item.assigned_scene_index);
          if (!clip) {
            errors.push(`Ledger Scene Failure: Item "${item.item_id}" references non-existent scene ${item.assigned_scene_index}.`);
          }
        }
      } else if (item.disposition === "assigned_to_learning_mode") {
        if (!item.assigned_mode || !["Guide Me", "Test Me", "Know It"].includes(item.assigned_mode)) {
          errors.push(`Ledger Destination Failure: Item "${item.item_id}" marked assigned_to_learning_mode has invalid destination "${item.assigned_mode}".`);
        }
        if (!item.reason || item.reason.trim().length === 0) {
          errors.push(`Ledger Accountability Failure: Item "${item.item_id}" assigned to ${item.assigned_mode} without an instructional reason.`);
        }
      }
    });
    const unresolved = plan.coverage_ledger.filter((i) => i.disposition === "unresolved_review_required");
    if (unresolved.length > 0) {
      unresolved.forEach((u) => {
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
      totalEstimatedDuration: plan.total_estimated_duration_seconds || plan.clips.length * 8
    }
  };
}

// src/services/imageGenerationService.ts
import { GoogleGenAI } from "@google/genai";
var runtimeProviderOverride = null;
function getFalApiKey(overrideKey) {
  const raw = (overrideKey || process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.VITE_FAL_KEY || "").trim();
  const cleaned = raw.replace(/^["']|["']$/g, "").trim();
  return cleaned || void 0;
}
function getGeminiApiKey(overrideKey) {
  const raw = (overrideKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const cleaned = raw.replace(/^["']|["']$/g, "").trim();
  return cleaned || void 0;
}
function getActiveImageProvider() {
  if (runtimeProviderOverride) {
    return runtimeProviderOverride;
  }
  const envConfig = (process.env.IMAGE_GENERATION_PROVIDER || process.env.IMAGE_PROVIDER || "").toLowerCase().trim();
  if (envConfig.startsWith("imagen") || envConfig === "google") {
    return "imagen";
  }
  if (envConfig.startsWith("flux") || envConfig === "fal") {
    return "flux";
  }
  const hasFal = Boolean(getFalApiKey());
  const hasGemini = Boolean(getGeminiApiKey());
  if (hasFal) return "flux";
  if (hasGemini) return "imagen";
  return "flux";
}
function setRuntimeImageProvider(provider) {
  runtimeProviderOverride = provider;
}
function getImageGenerationConfig() {
  const currentProvider = getActiveImageProvider();
  const hasFal = Boolean(getFalApiKey());
  const hasGemini = Boolean(getGeminiApiKey());
  const fluxModel = process.env.FLUX_MODEL || "fal-ai/flux/schnell";
  const imagenModel = process.env.IMAGEN_MODEL || "imagen-3.0-generate-002";
  const available = [];
  if (hasFal) available.push("flux");
  if (hasGemini) available.push("imagen");
  if (available.length === 0) {
    available.push("flux", "imagen");
  }
  return {
    provider: currentProvider,
    activeModel: currentProvider === "flux" ? fluxModel : imagenModel,
    hasFalKey: hasFal,
    hasGeminiKey: hasGemini,
    availableProviders: available,
    models: {
      flux: fluxModel,
      imagen: imagenModel
    }
  };
}
function buildEnhancedSOPPrompt(prompt, role, stepTitle) {
  const roleName = role ? role.trim() : "professional workplace frontline specialist";
  const actionDescription = prompt.trim();
  const context = stepTitle ? `Action: "${stepTitle}". ` : "";
  return `Documentary photo of a ${roleName} in authentic workplace environment. ${context}${actionDescription}. Photorealistic, clear cinematic lighting, natural workplace depth, high resolution 4k, crisp authentic details. Zero burned-in text, zero watermarks, zero logos, natural human posture.`;
}
async function generateWithFluxSchnell(enhancedPrompt, aspectRatio, falKey) {
  const resolvedKey = getFalApiKey(falKey);
  if (!resolvedKey) {
    throw new Error(
      "FAL_KEY is not configured on the server. Please set FAL_KEY in your environment to use FLUX.1 Schnell."
    );
  }
  const model = process.env.FLUX_MODEL || "fal-ai/flux/schnell";
  const endpoint = `https://fal.run/${model}`;
  let imageSize = "landscape_16_9";
  if (aspectRatio === "1:1") imageSize = "square_hd";
  else if (aspectRatio === "9:16") imageSize = "portrait_16_9";
  else if (aspectRatio === "4:3") imageSize = "landscape_4_3";
  else if (aspectRatio === "3:4") imageSize = "portrait_4_3";
  const body = {
    prompt: enhancedPrompt,
    image_size: imageSize,
    num_inference_steps: 4,
    // Schnell optimal steps
    num_images: 1,
    enable_safety_checker: true,
    sync_mode: true
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${resolvedKey}`,
      "Content-Type": "application/json",
      "User-Agent": "aistudio-flux-service"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errorDetail = errJson.detail || errJson.message || errText;
      } catch {
        errorDetail = errText;
      }
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }
    throw new Error(`Fal.ai FLUX API returned status ${response.status}: ${errorDetail}`);
  }
  const data = await response.json();
  const images = data.images || [];
  if (!images.length || !images[0]?.url) {
    throw new Error("Fal.ai returned success response but no image URL was found.");
  }
  return {
    imageUrl: images[0].url,
    seed: data.seed
  };
}
async function generateWithImagen(enhancedPrompt, aspectRatio, geminiKey) {
  const resolvedKey = getGeminiApiKey(geminiKey);
  if (!resolvedKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY to use Gemini/Imagen."
    );
  }
  const ai = new GoogleGenAI({
    apiKey: resolvedKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-imagen-service"
      }
    }
  });
  const imagenModel = process.env.IMAGEN_MODEL || "imagen-3.0-generate-002";
  try {
    const response2 = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: `High-resolution documentary workplace photograph, 16:9 widescreen, photorealistic, clear natural lighting: ${enhancedPrompt}`
    });
    const parts = response2.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);
    if (imagePart?.inlineData?.data) {
      const mime = imagePart.inlineData.mimeType || "image/png";
      return {
        imageUrl: `data:${mime};base64,${imagePart.inlineData.data}`,
        model: "gemini-2.5-flash-image"
      };
    }
  } catch (flashErr) {
    console.warn("[ImageService] gemini-2.5-flash-image attempt failed, trying generateImages:", flashErr?.message);
  }
  const validRatios = [
    "1:1",
    "3:4",
    "4:3",
    "9:16",
    "16:9"
  ];
  const mappedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "16:9";
  const response = await ai.models.generateImages({
    model: imagenModel,
    prompt: enhancedPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: mappedRatio
    }
  });
  const generated = response?.generatedImages?.[0]?.image?.imageBytes;
  if (!generated) {
    throw new Error("Imagen returned success response but no image bytes were found.");
  }
  return {
    imageUrl: `data:image/jpeg;base64,${generated}`,
    model: imagenModel
  };
}
async function generateImage(options) {
  const startTime = Date.now();
  const provider = options.provider || getActiveImageProvider();
  const aspectRatio = options.aspectRatio || "16:9";
  const enhancedPrompt = buildEnhancedSOPPrompt(
    options.prompt,
    options.role,
    options.stepTitle
  );
  const fluxModel = process.env.FLUX_MODEL || "fal-ai/flux/schnell";
  const imagenModel = process.env.IMAGEN_MODEL || "imagen-3.0-generate-002";
  const targetModel = provider === "flux" ? fluxModel : imagenModel;
  try {
    if (provider === "flux") {
      const result = await generateWithFluxSchnell(
        enhancedPrompt,
        aspectRatio,
        options.falApiKey
      );
      return {
        success: true,
        provider: "flux",
        model: targetModel,
        imageUrl: result.imageUrl,
        seed: result.seed,
        originalPrompt: options.prompt,
        enhancedPrompt,
        durationMs: Date.now() - startTime
      };
    } else {
      const result = await generateWithImagen(
        enhancedPrompt,
        aspectRatio,
        options.geminiApiKey
      );
      return {
        success: true,
        provider: "imagen",
        model: result.model || targetModel,
        imageUrl: result.imageUrl,
        mimeType: "image/jpeg",
        originalPrompt: options.prompt,
        enhancedPrompt,
        durationMs: Date.now() - startTime
      };
    }
  } catch (primaryErr) {
    const errorMsg = primaryErr?.message || String(primaryErr);
    console.warn(`[ImageService] Primary provider ${provider} failed (${errorMsg}). Checking fallback options...`);
    if (provider === "flux" && getGeminiApiKey(options.geminiApiKey)) {
      console.warn(`[ImageService] FLUX failed. Seamlessly generating photorealistic visual with Google Gemini/Imagen...`);
      try {
        const fallbackResult = await generateWithImagen(
          enhancedPrompt,
          aspectRatio,
          options.geminiApiKey
        );
        return {
          success: true,
          provider: "imagen",
          model: fallbackResult.model || imagenModel,
          imageUrl: fallbackResult.imageUrl,
          mimeType: "image/jpeg",
          originalPrompt: options.prompt,
          enhancedPrompt,
          durationMs: Date.now() - startTime
        };
      } catch (fallbackErr) {
        console.error("[ImageService] Fallback to Gemini/Imagen also failed:", fallbackErr?.message);
      }
    }
    return {
      success: false,
      provider,
      model: targetModel,
      error: errorMsg,
      originalPrompt: options.prompt,
      enhancedPrompt,
      durationMs: Date.now() - startTime
    };
  }
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function extractDocxTextFromBuffer(buffer) {
  try {
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (buffer[offset] === 80 && buffer[offset + 1] === 75 && buffer[offset + 2] === 3 && buffer[offset + 3] === 4) {
        const compMethod = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const nameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLen);
        const dataOffset = offset + 30 + nameLen + extraLen;
        if (name === "word/document.xml" && compSize > 0 && dataOffset + compSize <= buffer.length) {
          const compressedData = buffer.subarray(dataOffset, dataOffset + compSize);
          let xmlStr = "";
          if (compMethod === 8) {
            xmlStr = zlib.inflateRawSync(compressedData).toString("utf8");
          } else if (compMethod === 0) {
            xmlStr = compressedData.toString("utf8");
          }
          const matches = xmlStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (matches && matches.length > 0) {
            return matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ").trim();
          }
          break;
        }
        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn("[extractDocxTextFromBuffer] Error parsing docx zip structure:", err);
  }
  return "";
}
var videosDir = path.resolve(process.cwd(), "uploads", "videos");
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}
function getSafeVideoPath(lessonId, clipIndex = 1) {
  const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(videosDir, `${safeId}_clip_${clipIndex}.mp4`);
}
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "15mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gemini-api-key");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
function getApiKey(req) {
  const headerKey = req ? ((typeof req.headers["x-gemini-api-key"] === "string" ? req.headers["x-gemini-api-key"] : "") || (typeof req.headers["authorization"] === "string" ? req.headers["authorization"].replace(/^Bearer\s+/i, "") : "")).trim() : "";
  const rawKey = (headerKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const cleanKey = rawKey.replace(/^["']|["']$/g, "").trim();
  return cleanKey || void 0;
}
function getGeminiClient(req) {
  const apiKey = getApiKey(req);
  if (!apiKey) return null;
  return new GoogleGenAI2({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var MODEL_PRO = process.env.GEMINI_PRO_MODEL || "gemini-3.1-pro-preview";
var MODEL_FAST = process.env.GEMINI_FAST_MODEL || "gemini-3.8-flash";
app.get("/api/health", (_req, res) => {
  const key = getApiKey();
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(key && key.length > 5),
    keyPrefix: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    nodeEnv: process.env.NODE_ENV || "development",
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/models", async (req, res) => {
  const ai = getGeminiClient(req);
  if (!ai) return res.json({ error: "no key" });
  const out = [];
  try {
    for await (const m of await ai.models.list()) {
      if (m.name) out.push(m.name);
    }
    res.json({ success: true, models: out });
  } catch (err) {
    res.json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/pdf/extract", async (req, res) => {
  try {
    const { fileBase64, mimeType = "application/pdf", filename = "uploaded_document.pdf" } = req.body;
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ success: false, error: "No fileBase64 data provided." });
    }
    let textDirect = null;
    const lowerName = filename.toLowerCase();
    const isDocx = lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || mimeType.includes("word") || mimeType.includes("openxmlformats");
    if (isDocx) {
      try {
        const fileBuffer = Buffer.from(fileBase64, "base64");
        const extractedDocx = extractDocxTextFromBuffer(fileBuffer);
        if (extractedDocx && extractedDocx.length > 10) {
          textDirect = extractedDocx;
        } else {
          const decodedStr = fileBuffer.toString("utf-8");
          const xmlMatches = decodedStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (xmlMatches && xmlMatches.length > 0) {
            textDirect = xmlMatches.map((node) => node.replace(/<[^>]+>/g, "")).join(" ");
          }
        }
      } catch (e) {
        console.warn("[Server DOCX Extract] Buffer decode failed:", e);
      }
    }
    if (textDirect && textDirect.trim().length > 10) {
      const extractedText2 = textDirect.trim();
      const wordCount2 = extractedText2.split(/\s+/).filter(Boolean).length;
      const pageCount2 = Math.max(1, Math.ceil(wordCount2 / 220));
      console.log(`[Server /api/pdf/extract SUCCESS] Direct docx extracted ${wordCount2} words from '${filename}'`);
      return res.json({
        success: true,
        extractedText: extractedText2,
        wordCount: wordCount2,
        pageCount: pageCount2
      });
    }
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      console.warn("[Server PDF Extract] No Gemini API key detected on server.");
      return res.json({ success: false, useLocal: true, reason: "GEMINI_API_KEY missing on server" });
    }
    let docPart;
    const cleanMime = mimeType.includes("image") ? mimeType : mimeType.includes("text") ? "text/plain" : "application/pdf";
    docPart = {
      inlineData: {
        mimeType: cleanMime,
        data: fileBase64
      }
    };
    const prompt = `You are a High-Fidelity Document & OCR Extraction Engine.
Extract the COMPLETE human-readable text from this document ("${filename}") word-for-word.
Preserve paragraph structure, headers, section numbers, bullet points, and original Unicode typography (curly quotes, dashes, accents, symbols).
Do NOT summarize. Return JSON:
{
  "extractedText": "Complete extracted text content here...",
  "pageCount": estimated total pages as integer,
  "wordCount": estimated total words as integer
}`;
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: MODEL_PRO,
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });
    } catch (primaryErr) {
      console.warn(`[Server PDF Extract] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });
    }
    const outputText = response.text || "";
    let cleanJson = outputText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(cleanJson);
    const extractedText = parsed.extractedText || "";
    const wordCount = parsed.wordCount || extractedText.split(/\s+/).filter(Boolean).length;
    const pageCount = parsed.pageCount || Math.max(1, Math.ceil(wordCount / 220));
    console.log(`[Server /api/pdf/extract SUCCESS] Extracted ${wordCount} words from '${filename}' (${pageCount} pages)`);
    return res.json({
      success: true,
      extractedText,
      wordCount,
      pageCount
    });
  } catch (err) {
    console.error("[Server /api/pdf/extract Error]:", err?.message || err);
    return res.json({ success: false, error: err?.message || "Server PDF extraction failed" });
  }
});
app.post("/api/gemini/generate-blueprint", async (req, res) => {
  try {
    const { rawText, fileBase64, mimeType, filename, fileHash, pageCount, wordCount, instructMode, selectedOptionId, customInstruction } = req.body;
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      console.warn("[Server /api/gemini/generate-blueprint] No Gemini API key found in environment.");
      return res.json({
        success: false,
        useLocalGenerator: true,
        reason: "GEMINI_API_KEY is not configured on server. Fallback to local domain-neutral generator."
      });
    }
    const parts = [];
    const docText = rawText || "";
    if (docText && docText.length > 50) {
    } else if (fileBase64 && typeof fileBase64 === "string") {
      parts.push({
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileBase64
        }
      });
    }
    const systemInstruction = `You are a World-Class Lead Operational Intelligence Engineer and Instructional Designer for Guruji Work Coach.
LAW 3 \u2014 UNIVERSAL 8-STAGE OPERATIONAL LEARNING FRAMEWORK
The 8 stages are the Brain's universal framework for analysing and organising ANY SOP.
They are NOT a mandatory 8-slide structure.
The Brain must examine the SOP through all 8 stages and use only the stages that contain meaningful source-supported content. It may combine, expand or skip stages depending on the SOP.

1. ORIENT: What is the job/task? Why is it being done? What is the expected outcome? What is the worker responsible for?
2. PREPARE: What must the worker check, arrange, confirm or understand before starting? (Tools, information, prerequisites, environment, customer/patient/order details).
3. PERFORM: What does the worker actually do? Extract the real operational steps and preserve their correct sequence.
4. CONTROL: What must the worker verify while performing the task? Include safety, quality, accuracy, compliance, customer, equipment or other critical controls.
5. DECIDE: Where does the worker need to make a judgement? Identify the condition, available actions and the correct SOP-supported response.
6. HANDLE: What happens when the normal process does not go as expected? Include exceptions, unusual conditions, missing information, failed checks or process deviations.
7. ESCALATE: When is the issue beyond the worker's authority or capability? Identify when to stop, who/what to escalate to and what must happen before continuing.
8. PROVE: What does the worker need to demonstrate to show that the critical learning has been understood? Use the most important steps, controls, decisions or exceptions from the SOP.

SYNTHESIS RULE:
SOP \u2192 analyse through 8 stages \u2192 identify meaningful content \u2192 remove duplication \u2192 preserve critical details \u2192 arrange progressively \u2192 create the required training pages.
- Do NOT force an SOP into all 8 stages.
- Do NOT create empty pages just because a stage exists.
- Do NOT invent content to fill a stage.
- The 8 stages control the Brain's thinking and sequencing; the SOP controls the actual content.

CRITICAL ARCHITECTURAL RULES:
1. CONCISE WORKPLACE LANGUAGE (NO RAW TEXT DUMPS):
   - NEVER output long, run-on paragraph sentences concatenating multiple SOP lines.
   - Summarize every choice title into a crisp, COMPLETE, 5-12 word action statement written in natural workplace language.
   - NEVER end a choice title on a dangling conjunction or preposition (e.g., 'and', 'or', 'to', 'with', 'for'). Ensure every title is a full, grammatically complete action phrase.
   - Keep scenario questions under 2 concise sentences focused on a single execution dilemma.
2. DEEP REALISM & UNCOMPROMISING SPECIFICITY:
   - Ground ALL extractions strictly in the operational facts of the provided SOP document.
   - Extract the TRUE frontline role (e.g. Quick Commerce Picker, Phlebotomist, Residential Housekeeping Specialist, Retail Cashier, Primary School Teacher, Aviation Gate Agent).
   - Every scenario question must put the worker in a concrete, high-stakes operational situation directly based on the SOP details (specific equipment, classroom prep, barcodes, shelf codes, temperatures, error codes, edge cases, exceptions).
   - NEVER generate generic questions like "What is your required action?" or "How should you complete this task?" or "Before taking the next step, what details must you verify?".
   - NEVER generate generic choices like "Skip step and proceed" or "Use unverified shortcut". Create REALISTIC frontline errors, tempting shortcuts, and common mistakes that real workers actually make on the floor!
3. THREE NUANCED CHOICES WITH EXPLICIT FAILURE MODES:
   - For EACH operational step, you MUST generate exactly 3 nuanced choices with short, complete, clear titles (5 to 12 words):
     * Choice 1 (isCorrect: true): Concise, complete, compliant SOP action title. Subtitle explaining why this is correct per SOP.
     * Choice 2 (isCorrect: false): Concise, complete, tempting operational shortcut title. Subtitle explicitly details the failure consequence (e.g., inventory mismatch, customer complaint, safety hazard).
     * Choice 3 (isCorrect: false): Concise, complete, unapproved workaround title. Subtitle details the regulatory, safety, or quality violation.
3. EXPERT COACH TIPS, SPECIFIC HINTS & LUCIDE VECTOR ICONS:
   - coach_tip: Guruji's practical wisdom directly referencing the subtle details, pitfalls, or mnemonic tips from the SOP.
   - hint: Specific reference to the SOP document section, visual cues, or indicators.
   - target_code: Authentic code extracted from or reflecting the SOP (e.g., LOC-A02-04, SKU-88421, FORM-Q7).
   - icon_key: Assign a domain-appropriate, clean Lucide vector icon key for each operational step, tool, and safety rule (e.g., ShieldAlert, ScanBarcode, Thermometer, Microscope, Boxes, FileCheck, Droplets, Sparkles, SprayCan, Syringe, ClipboardCheck, Users, CheckCircle, AlertTriangle, Zap, Scale, Truck, Lock, Settings). Match the icon meaningfully to the operational step \u2014 no arbitrary overfitting or underfitting.
5. METADATA VS OPERATIONAL CONTENT:
   - METADATA (DO NOT MAKE INTO STEPS): Administrative headers, document approval tables, version histories, ISO reference codes.
   - OPERATIONAL CONTENT (MUST DRIVE BLUEPRINT): Physical actions, system entries, verbal communications, verifications, decision points, exception handling, escalations.
6. AI VIDEO DIRECTOR RULES FOR VEO 3.2 LITE:
   For every clip in video_demonstration_plan.clips, formulate the "veo_prompt" as a dense 65-85 word single cinematic sentence following:
   [Visual Style] + [Detailed Subject with Active Continuous Movement] + [Enriched Background Environment] + [Studio Lighting/Mood] + [Continuous Camera Tracking]
   - BACKGROUND ENRICHMENT: Always build a detailed, authentic physical workspace (e.g. sleek executive conference suite with frosted acoustic glass partitions, sterile clinical preparation bench with specimen centrifuge racks, modern retail checkout counter, organized staging aisle). Never leave the background blank or abstract.
   - PACING & CONTINUOUS MOVEMENT: Use active progressive verbs (e.g., "steadily reviewing and logging", "methodically cross-verifying", "carefully inspecting with deliberate hand movements"). Actions must be continuous, steady-state, or looping to prevent abrupt cutoffs at the 8-second mark.
   - BAN COMPLETION VERBS: Do not use verbs indicating an end state (e.g., 'closes the laptop', 'presses the button', 'sits down'). Instead mandate continuous progressive action states (e.g., 'the laptop remains open as data flows', 'finger holding down the button safely', 'seated stationary while analyzing').
   - CAMERA WORK: End every prompt with fluid continuous camera motion (e.g., "slow cinematic lateral tracking shot gently drifting leftward", "subtle continuous forward camera drift maintaining steady focal depth").
7. MANDATORY OUTPUT FORMAT: Respond strictly with valid, un-truncated JSON conforming to the requested schema.`;
    const instructGuidance = instructMode ? `
INSTRUCT MODE GUIDANCE:
Selected Structure Option ID: ${selectedOptionId || "default"}
User Custom Instruction: "${customInstruction || "Emphasize document-grounded operational structure"}"
Prioritize and tailor task decomposition and focus areas according to this guidance while adhering strictly to source facts (no invention).
` : "";
    const textPrompt = `Uploaded SOP Document: "${filename}" (${pageCount || 1} pages, ${wordCount || 100} words)
${instructGuidance}
${docText ? `Document Text:
"""
${docText}
"""
` : ""}

Extract the complete OPERATIONAL BLUEPRINT as JSON with this exact schema:
{
  "document_identity": {
    "doc_title": "${filename ? filename.replace(/\.(txt|pdf|docx)$/i, "") : "Operational Procedure"}",
    "doc_ref": "Extracted document reference or empty",
    "version": "Extracted version or empty",
    "department": "Extracted department or operations division"
  },
  "role": "Exact worker role described in SOP (e.g., Compliance Officer, Operations Associate, Retail Cashier, Technician)",
  "process": "Exact core operational process (e.g., Incident Intake & Logging, Order Fulfillment, Blood Sample Collection)",
  "purpose": "1-2 sentence primary operational goal for the worker",
  "scope": "Applicable department or workspace boundaries",
  "prerequisites": [
    { "text": "Requirement before starting", "source_ref": "S1.pre1", "source_text": "Quote from text" }
  ],
  "tools_and_systems": [
    { "name": "Tool or system name", "purpose": "What it is used for", "never_do": "Key prohibition", "source_ref": "S1.tool1", "source_text": "Quote" }
  ],
  "terminology": [
    { "term": "Key term or code", "meaning": "Plain definition", "source_ref": "S1.term1", "source_text": "Quote" }
  ],
  "operational_steps": [
    {
      "instruction": "Specific, clear workplace action grounded in the SOP (e.g., Verify tote barcode against PDA screen before placing picked items)",
      "category": "DO" | "CHECK" | "KNOW" | "DECIDE" | "RESPOND" | "RECOVER" | "ESCALATE",
      "action_verb": "Primary action verb (e.g., Scan, Verify, Inspect, Place)",
      "task_title": "Concise 2-4 word operational action title (e.g., Scan Tote Barcode, Check Expiry Date, Inspect Packaging)",
      "target_code": "Realistic barcode / SKU / rack / equipment or form code from SOP (e.g., TOTE-B12, SKU-4029, LOC-A02-04)",
      "why_it_matters": "Specific operational reason and consequence on safety, quality, or process compliance",
      "critical_control": true/false,
      "scenario_question": "Authentic, vivid frontline workplace simulation question putting the worker directly into the dilemma or execution moment with exact details from the SOP",
      "choices": [
        {
          "id": "c1",
          "title": "Exact correct operational procedure according to the SOP",
          "subtitle": "Compliant SOP standard procedure",
          "isCorrect": true
        },
        {
          "id": "c2",
          "title": "Tempting shortcut or common frontline worker mistake",
          "subtitle": "Failure mode: causes inventory discrepancy / customer complaint / quality defect",
          "isCorrect": false
        },
        {
          "id": "c3",
          "title": "Unapproved workaround or bypassed safety/compliance check",
          "subtitle": "Safety/compliance hazard: violates mandatory protocol",
          "isCorrect": false
        }
      ],
      "coach_tip": "Master Coach Guruji tip explaining insider nuances, physical dexterity, memory cues, or compliance wisdom from the SOP",
      "hint": "Specific clue pointing directly to the relevant section or physical indicator in the SOP",
      "source": {
        "page_or_section": "Page 1 \xB7 Section 2",
        "source_ref": "S1.sec1",
        "source_text": "Exact verbatim quote from document text"
      }
    }
  ],
  "decision_points": [
    { "situation": "Condition triggering decision", "decision": "Decision choice", "action": "Required action", "source_ref": "S1.dec1", "source_text": "Quote" }
  ],
  "exceptions": [
    { "trigger": "Unexpected scenario or error", "resolution": "Corrective resolution", "source_ref": "S1.exp1", "source_text": "Quote" }
  ],
  "escalations": [
    { "situation": "When stuck or anomaly occurs", "contact_or_action": "Who to notify or call", "source_ref": "S1.esc1", "source_text": "Quote" }
  ],
  "critical_controls": [
    { "rule": "Mandatory non-negotiable rule", "rationale": "Why it is critical", "source_ref": "S1.ctrl1", "source_text": "Quote" }
  ],
  "safety_rules": [
    { "rule": "Safety or compliance rule", "source_ref": "S1.safe1", "source_text": "Quote" }
  ],
  "quality_rules": [
    { "rule": "Quality standard rule", "source_ref": "S1.qual1", "source_text": "Quote" }
  ],
  "customer_or_business_impact": [
    { "impact": "Who depends and impact", "source_ref": "S1.imp1", "source_text": "Quote" }
  ],
  "common_mistakes": [
    { "mistake": "Potential worker error", "prevention": "How to avoid it", "source_ref": "S1.err1", "source_text": "Quote" }
  ],
  "source_evidence": [
    { "id": "E1", "page_or_section": "Page 1", "excerpt": "Document excerpt" }
  ],
  "video_demonstration_plan": {
    "strategy": "sequential_steps",
    "total_clips": 3,
    "clips": [
      {
        "clip_index": 1,
        "step_ref": "Step 1: Receipt & Intake",
        "title": "Immediate Response & Intake",
        "duration_seconds": 8,
        "key_action": "Specific physical action from SOP",
        "veo_prompt": "Photorealistic 720p 16:9 cinematic instructional demonstration. A frontline specialist is methodically reviewing and cross-verifying intake documentation with continuous, deliberate hand movements. Setting is an executive private meeting suite with frosted acoustic glass partitions and polished oak conference desk. Soft natural morning daylight balanced by warm commercial recessed lighting. Slow cinematic lateral camera tracking shot gently drifting forward."
      }
    ]
  },
  "confidence": 0.98
}

The number of operational_steps must emerge naturally from the SOP's actual operational complexity. Do NOT force a fixed step count. A simple SOP should produce a concise task structure; a complex SOP must retain all distinct operational tasks without arbitrary truncation or merging.`;
    parts.push({ text: textPrompt });
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: MODEL_PRO,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 32768,
          temperature: 0.25
        }
      });
    } catch (primaryErr) {
      console.warn(`[Server LLM Blueprint] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 32768,
          temperature: 0.25
        }
      });
    }
    const outputText = response.text || "";
    if (!outputText.trim()) {
      return res.json({ success: false, useLocalGenerator: true, error: "Empty response received from LLM" });
    }
    const parsedData = cleanAndRepairJson(outputText);
    try {
      parsedData.video_demonstration_plan = planVideoDemonstration(parsedData);
    } catch (vpErr) {
      console.warn("[Server Veo VideoPlan synthesis warning]:", vpErr);
    }
    console.log(`[Server /api/gemini/generate-blueprint SUCCESS] Extracted ${parsedData.operational_steps?.length || 0} high-fidelity steps from '${filename}'`);
    return res.json({
      success: true,
      blueprint: parsedData
    });
  } catch (err) {
    console.error("[Server /api/gemini/generate-blueprint Error]:", err?.message || err);
    return res.json({
      success: false,
      useLocalGenerator: true,
      error: err?.message || "Server error, falling back to local generator."
    });
  }
});
app.post("/api/coach", async (req, res) => {
  const { prompt, systemInstruction, fileBase64, mimeType = "application/pdf", maxOutputTokens = 4e3, temperature = 0.3 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt in request body" });
  }
  const aiClient = getGeminiClient(req);
  if (!aiClient) {
    console.error("[API Error] GEMINI_API_KEY is not defined in deployment environment variables.");
    return res.status(500).json({ error: "Server configuration error: Missing API Key" });
  }
  try {
    const parts = [];
    if (fileBase64 && typeof fileBase64 === "string") {
      const cleanMime = mimeType.includes("image") ? mimeType : mimeType.includes("text") ? "text/plain" : "application/pdf";
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: fileBase64
        }
      });
    }
    parts.push({ text: prompt });
    const contentsPayload = parts.length > 1 ? { parts } : prompt;
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: MODEL_PRO,
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || "You are an expert assistant. Respond strictly with valid JSON.",
          responseMimeType: "application/json",
          maxOutputTokens,
          temperature
        }
      });
    } catch (primaryErr) {
      console.warn(`[Server /api/coach] Primary model ${MODEL_PRO} failed, trying fallback ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || "You are an expert assistant. Respond strictly with valid JSON.",
          responseMimeType: "application/json",
          maxOutputTokens,
          temperature
        }
      });
    }
    const rawText = response.text || "";
    if (!rawText.trim()) {
      return res.status(502).json({ error: "Empty response received from LLM" });
    }
    try {
      const parsedData = cleanAndRepairJson(rawText);
      return res.status(200).json(parsedData);
    } catch (parseError) {
      console.error("[API Error /api/coach] cleanAndRepairJson failed:", parseError);
      return res.status(502).json({
        error: "JSON_PARSE_ERROR",
        message: "The model output was malformed or truncated.",
        details: parseError.message
      });
    }
  } catch (error) {
    console.error("[API Error /api/coach] LLM generation failed:", error);
    return res.status(500).json({
      error: "LLM_PROVIDER_ERROR",
      message: error.message || "Failed to generate response"
    });
  }
});
app.post("/api/sop/instruct-options", async (req, res) => {
  try {
    const { filename = "SOP Document", rawText = "", wordCount = 100, pageCount = 1 } = req.body;
    const aiClient = getGeminiClient(req);
    const defaultOptions = [
      {
        id: "opt-standard",
        title: "Standard Operational Flow",
        description: "Balanced, step-by-step procedural training covering prerequisites, core execution, and verification.",
        focusAreas: ["End-to-End Procedural Flow", "Task Verification", "Standard Operations"],
        recommendedSteps: 5
      },
      {
        id: "opt-controls-exceptions",
        title: "Critical Controls & Edge Cases",
        description: "Emphasizes high-stakes safety rules, decision criteria, exception handling, and escalation protocols.",
        focusAreas: ["Critical Safety Controls", "Exception Recovery", "Escalations"],
        recommendedSteps: 6
      },
      {
        id: "opt-fast-track",
        title: "Fast-Track Field Drill",
        description: "Concise, high-velocity frontline drill focusing strictly on core physical and system actions.",
        focusAreas: ["Core Action Verbs", "Fast Field Execution", "Target Barcodes/Codes"],
        recommendedSteps: 4
      }
    ];
    if (!aiClient) {
      return res.json({ success: true, options: defaultOptions });
    }
    const prompt = `Analyze this SOP document: "${filename}" (${pageCount} pages, ${wordCount} words)
Document Text:
"""
${(rawText || "").slice(0, 16e3)}
"""

Recommend 3 distinct training structure options tailored specifically to this SOP document.
Return JSON:
{
  "options": [
    {
      "id": "opt-1",
      "title": "Clear 2-4 word option title (e.g. Standard Return Pickup, Critical Safety Drill)",
      "description": "1 sentence describing the training emphasis based on the document",
      "focusAreas": ["3 short bullet tags highlighting what this structure focuses on"],
      "recommendedSteps": estimated integer step count
    }
  ]
}`;
    const response = await aiClient.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert instructional designer. Propose 3 tailored training structures grounded in the provided SOP. Respond strictly with valid JSON.",
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    if (parsed && Array.isArray(parsed.options) && parsed.options.length > 0) {
      return res.json({ success: true, options: parsed.options });
    }
    return res.json({ success: true, options: defaultOptions });
  } catch (err) {
    console.warn("[Server /api/sop/instruct-options error]:", err?.message);
    return res.json({
      success: true,
      options: [
        {
          id: "opt-standard",
          title: "Standard Operational Flow",
          description: "Balanced, step-by-step procedural training covering prerequisites, core execution, and verification.",
          focusAreas: ["End-to-End Procedural Flow", "Task Verification", "Standard Operations"],
          recommendedSteps: 5
        },
        {
          id: "opt-controls-exceptions",
          title: "Critical Controls & Edge Cases",
          description: "Emphasizes high-stakes safety rules, decision criteria, exception handling, and escalation protocols.",
          focusAreas: ["Critical Safety Controls", "Exception Recovery", "Escalations"],
          recommendedSteps: 6
        },
        {
          id: "opt-fast-track",
          title: "Fast-Track Field Drill",
          description: "Concise, high-velocity frontline drill focusing strictly on core physical and system actions.",
          focusAreas: ["Core Action Verbs", "Fast Field Execution", "Target Barcodes/Codes"],
          recommendedSteps: 4
        }
      ]
    });
  }
});
app.post("/api/sop/extract-report", async (req, res) => {
  try {
    const { filename, rawText, wordCount, pageCount, fileHash, fileBase64, mimeType } = req.body;
    const aiClient = getGeminiClient(req);
    const systemInstruction = `You are analysing an uploaded operational SOP to prepare a source-grounded learning experience.
Extract what the document actually states. Identify the purpose, ordered operational tasks, prerequisites, decisions, exceptions, critical controls, completion conditions and evidence requirements.
Attach source references to each material requirement.
Separate explicit requirements from interpretations, ambiguities, contradictions and missing information.
Do not invent procedures, operational details, policy requirements or escalation authority. Do not assume a fixed number of tasks. Do not generate the learning deck at this stage.
Return structured, schema-valid data and a concise human-readable extraction report. Report limitations honestly.`;
    const textPrompt = `Analyse SOP document: "${filename}" (${pageCount || 1} pages, ${wordCount || 100} words)
Text:
"""
${(rawText || "").slice(0, 32e3)}
"""

Return JSON conforming strictly to:
{
  "extractionReport": {
    "documentIdentity": {
      "filename": "${filename}",
      "docTitle": "${(filename || "Operational Procedure").replace(/\.(pdf|txt|docx)$/i, "")}",
      "uploadedAt": "${(/* @__PURE__ */ new Date()).toISOString()}",
      "wordCount": ${wordCount || 100},
      "pageCount": ${pageCount || 1}
    },
    "documentPurpose": "Clear, extracted document purpose from text",
    "intendedOutcome": "Extracted primary operational outcome",
    "extractedRequirements": [
      {
        "id": "req-1",
        "type": "task" | "prerequisite" | "decision" | "exception" | "escalation" | "control" | "completion",
        "title": "Concise requirement title",
        "instruction": "Full instruction text",
        "category": "DO" | "CHECK" | "DECIDE" | "RECOVER" | "ESCALATE",
        "provenance": "VERBATIM_SOURCE",
        "sourceRef": "Section or Page number",
        "sourceText": "Exact quote from SOP",
        "isCriticalControl": true/false
      }
    ],
    "stepsCount": number of operational tasks,
    "prerequisitesCount": number of prerequisites,
    "decisionsCount": number of decision points,
    "exceptionsCount": number of exception rules,
    "criticalControlsCount": number of critical controls,
    "missingInfoCount": number of missing details,
    "contradictionsAndAmbiguities": [
      {
        "id": "amb-1",
        "topic": "Topic name",
        "description": "What is ambiguous or missing in the source",
        "severity": "critical" | "high" | "medium" | "low",
        "sourceRef": "Section name",
        "isBlocking": true/false
      }
    ],
    "coverageStatus": {
      "isComplete": true,
      "wordCount": ${wordCount || 100},
      "pageCount": ${pageCount || 1}
    }
  },
  "unresolvedIssues": [
    {
      "id": "issue-1",
      "category": "safety" | "conflict" | "decision_criteria" | "completion" | "training_preference",
      "description": "Description of unresolved issue",
      "severity": "high" | "medium" | "low",
      "isBlocking": false,
      "resolved": false
    }
  ],
  "clarificationQuestions": [
    {
      "questionId": "q-1",
      "questionText": "Targeted question to clarify unstated or ambiguous detail",
      "reason": "Why this question matters for training structure",
      "category": "decision_criteria",
      "sourceRef": "Section ref",
      "isMandatory": false,
      "consequenceOfLeavingUnanswered": "What happens if skipped",
      "status": "pending",
      "options": [
        { "id": "opt-1", "label": "Option label", "isCompliantWithSource": true }
      ]
    }
  ]
}`;
    if (!aiClient) {
      return res.json({ success: false, fallback: true, reason: "No API key on server" });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: textPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.2
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    return res.json({ success: true, ...parsed });
  } catch (err) {
    console.warn("[Server /api/sop/extract-report error]:", err?.message);
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});
app.post("/api/sop/clarification-chat", async (req, res) => {
  try {
    const { session, latestAnswer } = req.body;
    const aiClient = getGeminiClient(req);
    const systemInstruction = `You are clarifying the interpretation of an already-extracted SOP.
Use the current extraction report, unresolved issues, previous answers and approved supplementary instructions.
Ask only questions that materially affect correct task execution, safety, source interpretation, learning structure or assessment validity.
Prioritize critical issues. Ask the minimum number of useful questions. Do not ask for information already established by the source or a previous answer.
Never invent a missing process rule. If an answer introduces a new rule, record it as supplementary information. If it conflicts with a source requirement or exceeds the user's apparent authority, flag it for resolution instead of silently accepting it.
Return the next question, its reason, supporting references, answer options where useful, mandatory status and the updated unresolved-issues list.`;
    if (!aiClient) {
      return res.json({ success: false, fallback: true });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: `Session State:
${JSON.stringify(session).slice(0, 16e3)}
Latest Answer:
${JSON.stringify(latestAnswer)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    return res.json({ success: true, ...parsed });
  } catch (err) {
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});
app.post("/api/sop/generate-blueprint", async (req, res) => {
  try {
    const { session, filename, rawText, extractionReport, supplementaryInstructions } = req.body;
    const aiClient = getGeminiClient(req);
    const systemInstruction = `Create a learning blueprint from the validated SOP interpretation, the existing Canonical Task Model and approved clarification records.
Preserve operational order, prerequisites, decision criteria, exceptions, critical controls and completion conditions.
Map every proposed task and learning objective to its CTM requirement identifiers.
Identify any requirement that cannot yet be taught or assessed reliably.
Do not add unsupported procedural details. Do not omit critical controls for the sake of brevity. Do not generate the final four learning experiences until the blueprint is explicitly approved and all mandatory validations pass.`;
    if (!aiClient) {
      return res.json({ success: false, fallback: true });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: `SOP: ${filename}
Report:
${JSON.stringify(extractionReport).slice(0, 8e3)}
Supplementary:
${JSON.stringify(supplementaryInstructions)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    return res.json({ success: true, learningBlueprint: parsed.learningBlueprint || parsed });
  } catch (err) {
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});
app.post("/api/sop/approve-and-generate", async (req, res) => {
  try {
    const { session, approvedBy = "Operations Reviewer" } = req.body;
    if (!session) {
      return res.status(400).json({ success: false, error: "Missing session data" });
    }
    if (session.currentStage !== "BLUEPRINT_REVIEW" && session.currentStage !== "APPROVED_FOR_GENERATION") {
      return res.status(422).json({
        success: false,
        error: `Stage transition rejected: Cannot generate training deck from stage '${session.currentStage}'. Explicit blueprint review is required.`
      });
    }
    const blockingIssues = (session.unresolvedIssues || []).filter((i) => i.isBlocking && !i.resolved);
    if (blockingIssues.length > 0) {
      return res.status(422).json({
        success: false,
        error: `Generation blocked: ${blockingIssues.length} unresolved critical safety/compliance gap(s) must be resolved before proceeding.`
      });
    }
    return res.json({
      success: true,
      stage: "APPROVED_FOR_GENERATION",
      approvedBy,
      approvedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});
app.post("/api/generate-video", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { prompt, aspectRatio = "16:9", resolution = "720p" } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ success: false, error: "A prompt is required for video generation." });
    }
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini API key is not configured on server or in request headers." });
    }
    const safePrompt = prompt.trim().slice(0, 2e3);
    const VEO_MODELS = ["veo-3.1-fast-generate-preview", "veo-3.1-lite-generate-preview"];
    let operation = null;
    let lastError = null;
    for (let attempt = 0; attempt < 2 && !operation; attempt++) {
      for (const modelName of VEO_MODELS) {
        try {
          console.log(`[Veo] Attempting video generation on model: ${modelName} (attempt ${attempt + 1})`);
          operation = await aiClient.models.generateVideos({
            model: modelName,
            prompt: safePrompt,
            config: {
              numberOfVideos: 1,
              resolution: resolution === "1080p" ? "1080p" : "720p",
              aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
            }
          });
          if (operation?.name) {
            console.log(`[Veo SUCCESS] Video generation initiated on ${modelName}:`, operation.name);
            break;
          }
        } catch (laneErr) {
          lastError = laneErr;
          const is429 = laneErr?.status === 429 || laneErr?.message?.includes("429") || laneErr?.message?.includes("RESOURCE_EXHAUSTED");
          console.warn(`[Veo Lane Warning] ${modelName} returned ${is429 ? "429 Rate Limit" : laneErr?.message?.slice(0, 60)}.`);
          const backoffMs = (attempt + 1) * 2e3 + Math.floor(Math.random() * 1500);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
    if (!operation?.name) {
      throw lastError || new Error("Video generation failed on all available Veo model lanes.");
    }
    return res.status(200).json({ success: true, operationName: operation.name });
  } catch (error) {
    console.error("[Veo Generate Error]", error);
    let msg = error?.message || (typeof error === "string" ? error : "Failed to start video generation.");
    try {
      if (typeof msg === "string" && msg.startsWith("{")) {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      }
    } catch (_) {
    }
    const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || error?.status === 429 || error?.code === 429;
    if (isQuota) {
      return res.status(429).json({
        success: false,
        isQuotaExceeded: true,
        error: "Google Veo rate limit or daily quota reached (RESOURCE_EXHAUSTED). Video generation allows 1 request per minute on preview tiers. Please wait about 60 seconds and try again."
      });
    }
    return res.status(500).json({ success: false, error: msg });
  }
});
app.post("/api/video-status", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { operationName } = req.body || {};
    if (!operationName) {
      return res.status(400).json({ success: false, error: "operationName is required." });
    }
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini API key is not configured on server or in request headers." });
    }
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    let errObj = null;
    if (updated.error) {
      errObj = typeof updated.error === "string" ? updated.error : updated.error.message || JSON.stringify(updated.error);
    }
    return res.status(200).json({
      success: true,
      done: Boolean(updated.done),
      error: errObj
    });
  } catch (error) {
    console.error("[Veo Status Error]", error);
    const msg = error?.message || (typeof error === "string" ? error : "Failed to check video status.");
    return res.status(500).json({ success: false, error: msg });
  }
});
app.post("/api/video-download", async (req, res) => {
  try {
    const { operationName, lessonId, clipIndex = 1 } = req.body;
    if (!operationName) {
      return res.status(400).json({ success: false, error: "operationName is required." });
    }
    const aiClient = getGeminiClient(req);
    const apiKey = getApiKey(req);
    if (!aiClient || !apiKey) {
      return res.status(500).json({ success: false, error: "Gemini API key is not configured." });
    }
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    const downloadUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadUri) {
      return res.status(404).json({ success: false, error: "Video URI not found in completed operation." });
    }
    const videoRes = await fetch(downloadUri, {
      headers: { "x-goog-api-key": apiKey }
    });
    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ success: false, error: `Failed to fetch video file: ${videoRes.statusText}` });
    }
    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (lessonId && typeof lessonId === "string") {
      try {
        const destPath = getSafeVideoPath(lessonId, Number(clipIndex) || 1);
        await fs.promises.writeFile(destPath, buffer);
        console.log(`[Server Storage] Saved video clip to server disk: ${destPath}`);
      } catch (saveErr) {
        console.warn("[Server Storage] Failed to write video to server disk:", saveErr);
      }
    }
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length.toString());
    return res.send(buffer);
  } catch (error) {
    console.error("[Veo Download Error]", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to download video." });
  }
});
app.get("/api/videos/stream/:lessonId/:clipIndex", (req, res) => {
  try {
    const { lessonId, clipIndex } = req.params;
    const filePath = getSafeVideoPath(lessonId, Number(clipIndex) || 1);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Video not found on server storage." });
    }
    return res.sendFile(filePath, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    console.error("[Video Stream Error]", error);
    return res.status(500).json({ success: false, error: "Failed to stream video." });
  }
});
app.get("/api/videos/check/:lessonId", (req, res) => {
  try {
    const { lessonId } = req.params;
    const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const existingClips = [];
    for (let i = 1; i <= 10; i++) {
      const p = path.join(videosDir, `${safeId}_clip_${i}.mp4`);
      if (fs.existsSync(p)) {
        existingClips.push(i);
      }
    }
    return res.json({
      success: true,
      clips: existingClips
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to check video storage." });
  }
});
app.delete("/api/videos/:lessonId", (req, res) => {
  try {
    const { lessonId } = req.params;
    const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "_");
    for (let i = 1; i <= 10; i++) {
      const p = path.join(videosDir, `${safeId}_clip_${i}.mp4`);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (_) {
        }
      }
    }
    return res.json({ success: true, message: "Server video storage cleared." });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to delete videos." });
  }
});
app.get("/api/image-generation/config", (_req, res) => {
  try {
    const config = getImageGenerationConfig();
    return res.json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/image-generation/toggle-provider", (req, res) => {
  try {
    const { provider } = req.body;
    if (provider === "flux" || provider === "imagen") {
      setRuntimeImageProvider(provider);
    } else if (provider === null || provider === "auto" || provider === "default") {
      setRuntimeImageProvider(null);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "flux", "imagen", or "auto".'
      });
    }
    const updatedConfig = getImageGenerationConfig();
    return res.json({ success: true, config: updatedConfig });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post(["/api/image-generation/generate", "/api/generate-image"], async (req, res) => {
  try {
    const {
      prompt,
      role,
      stepTitle,
      aspectRatio = "16:9",
      provider,
      falApiKey,
      geminiApiKey
    } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "A non-empty prompt string is required."
      });
    }
    const headerGeminiKey = ((typeof req.headers["x-gemini-api-key"] === "string" ? req.headers["x-gemini-api-key"] : "") || (typeof req.headers["authorization"] === "string" ? req.headers["authorization"].replace(/^Bearer\s+/i, "") : "")).trim();
    const headerFalKey = (typeof req.headers["x-fal-key"] === "string" ? req.headers["x-fal-key"] : "").trim();
    const result = await generateImage({
      prompt,
      role,
      stepTitle,
      aspectRatio,
      provider,
      geminiApiKey: geminiApiKey || headerGeminiKey || void 0,
      falApiKey: falApiKey || headerFalKey || void 0
    });
    if (!result.success) {
      return res.status(result.error?.includes("not configured") ? 400 : 502).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error("[Image Generation Route Error]", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error while generating image."
    });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: "API_ENDPOINT_NOT_FOUND",
    message: `API endpoint ${req.method} ${req.path} not found on server`
  });
});
var distPath = path.resolve(process.cwd(), "dist");
var indexHtmlExists = fs.existsSync(path.join(distPath, "index.html"));
var isProduction = process.env.NODE_ENV === "production" || indexHtmlExists && process.env.NODE_ENV !== "development";
if (isProduction) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ success: false, error: "API route not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Express server running on http://0.0.0.0:${PORT}`);
});
function sanitizeJsonString(str) {
  let result = "";
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (isEscaped) {
        result += ch;
        isEscaped = false;
      } else if (ch === "\\") {
        result += ch;
        isEscaped = true;
      } else if (ch === '"') {
        const rest = str.slice(i + 1).trimStart();
        if (rest.startsWith(":") || rest.startsWith(",") || rest.startsWith("}") || rest.startsWith("]")) {
          result += ch;
          inString = false;
        } else {
          result += '\\"';
        }
      } else if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "	") {
        result += "\\t";
      } else {
        result += ch;
      }
    } else {
      result += ch;
      if (ch === '"') {
        inString = true;
      }
    }
  }
  return result;
}
function repairTruncatedJson(jsonStr) {
  let text = jsonStr.trim();
  text = text.replace(/```$/g, "").trim();
  text = text.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  text = text.replace(/,?\s*"[^"]*$/, "");
  text = text.replace(/[,:\s]+$/, "");
  let inString = false;
  let isEscaped = false;
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" || ch === "]") {
        if (stack.length > 0) stack.pop();
      }
    }
  }
  if (inString) {
    text += '"';
  }
  text = text.replace(/[,:\s]+$/, "");
  while (stack.length > 0) {
    const opening = stack.pop();
    if (opening === "{") {
      text += "}";
    } else if (opening === "[") {
      text += "]";
    }
  }
  text = text.replace(/,\s*([\}\]])/g, "$1");
  return text;
}
function extractJsonBlock(text) {
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = firstBrace < firstBracket ? firstBrace : firstBracket;
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  if (startIdx === -1) {
    return text;
  }
  let inString = false;
  let isEscaped = false;
  const stack = [];
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" || ch === "]") {
        const top = stack[stack.length - 1];
        if (ch === "}" && top === "{" || ch === "]" && top === "[") {
          stack.pop();
          if (stack.length === 0) {
            return text.slice(startIdx, i + 1);
          }
        }
      }
    }
  }
  return text.slice(startIdx);
}
function cleanAndRepairJson(rawText) {
  if (!rawText || !rawText.trim()) throw new Error("Empty text response from model");
  let text = rawText.trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  text = extractJsonBlock(text);
  try {
    return JSON.parse(text);
  } catch (e1) {
    try {
      const sanitized = sanitizeJsonString(text);
      return JSON.parse(sanitized);
    } catch (e2) {
      try {
        const sanitized = sanitizeJsonString(text);
        const repaired = repairTruncatedJson(sanitized);
        return JSON.parse(repaired);
      } catch (e3) {
        try {
          const repairedRaw = repairTruncatedJson(text);
          return JSON.parse(repairedRaw);
        } catch (e4) {
          console.error("[cleanAndRepairJson FAIL] Unrepairable JSON response from LLM:", text.slice(0, 300));
          throw new Error("MALFORMED_LLM_JSON_OUTPUT");
        }
      }
    }
  }
}
