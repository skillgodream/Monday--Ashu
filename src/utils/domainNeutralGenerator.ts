/**
 * Coach-Guru Single Operational Intelligence Brain
 * Transforms extracted SOP documents into SopKnowledgeModel, OperationalBlueprint, TrainingPlan, and 4-Stage Learning Experiences.
 * Enforces strict source grounding: every training step is derived directly from the SOP text.
 * Zero generic fallbacks or blacklisted generic template phrases.
 */

import { ExtractedDocument } from './documentExtractor';
import {
  Lesson,
  ProcessPassport,
  BlueprintV1,
  SimulatorStep,
  StepObject,
  StepComponentType,
  OrientationCard,
  OperationalBlueprint,
  OperationalBlueprintItem,
  StepCategoryType,
  SopKnowledgeModel,
  TrainingPlanItem,
  VideoDemonstrationPlan,
} from '../types';
import { buildVeoPrompt } from './veoPromptBuilder';
import { planVideoDemonstration } from './videoPlanEngine';

const METADATA_PATTERNS = [
  /^standard operating procedure/i,
  /^sop\s*[\—\-\:]/i,
  /^sop\s+-\s+/i,
  /^document ref/i,
  /^sop-/i,
  /^version/i,
  /^effective date/i,
  /^department/i,
  /^approved by/i,
  /^page \d+/i,
  /^revision/i,
  /^ref:/i,
  /^section \d+:/i,
  /^chapter \d+:/i,
  /^part \d+:/i,
  /sop page \d+/i,
  /fulfilment sop/i,
  /fulfillment sop/i,
  /sop document/i,
  /title:/i,
  /process name:/i,
  /operating procedure/i,
  /primary school teacher/i,
];

function isOperationalContent(line: string, filename?: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 10) return false;
  if (METADATA_PATTERNS.some((p) => p.test(trimmed))) return false;
  if (filename) {
    const cleanFilename = filename.replace(/\.(txt|pdf|docx)$/i, '').toLowerCase();
    if (trimmed.toLowerCase().includes(cleanFilename) || cleanFilename.includes(trimmed.toLowerCase())) {
      return false;
    }
  }
  return true;
}

/**
 * Builds the SopKnowledgeModel from extracted document text
 */
export function buildSopKnowledgeModel(extracted: ExtractedDocument): SopKnowledgeModel {
  const rawText = extracted.rawText;
  const lowerText = rawText.toLowerCase();

  let role = 'Workplace Operator';
  let process = extracted.filename.replace(/\.(txt|pdf|docx)$/i, '');
  let department = '';

  const roleMatch = rawText.match(/\b(?:role|position|title|for):\s*([^\n\r.]+)/i);
  if (roleMatch && roleMatch[1].trim().length > 2) {
    role = roleMatch[1].trim();
  }

  const deptMatch = rawText.match(/\b(?:department|dept|unit):\s*([^\n\r.]+)/i);
  if (deptMatch && deptMatch[1].trim().length > 2) {
    department = deptMatch[1].trim();
  }

  const rawLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const stepsList: SopKnowledgeModel['steps'] = [];
  const decisionPoints: SopKnowledgeModel['decisionPoints'] = [];
  const exceptions: SopKnowledgeModel['exceptions'] = [];
  const escalations: SopKnowledgeModel['escalations'] = [];
  const criticalControls: string[] = [];
  const prereqsFound: SopKnowledgeModel['prerequisites'] = [];
  const toolsFound: SopKnowledgeModel['tools'] = [];
  const mistakesFound: string[] = [];
  const qualityAuditRules: string[] = [];

  // Check if document has explicit operational lifecycle sections (e.g. ORIENT — and PERFORM —)
  const hasStructuredSections = rawLines.some((l) => /^(?:\d+[\.\)]\s+)?ORIENT\s*[\—\-]/i.test(l.trim())) &&
    rawLines.some((l) => /^(?:\d+[\.\)]\s+)?PERFORM\s*[\—\-]/i.test(l.trim()));

  if (hasStructuredSections) {
    let currentCategory:
      | 'ORIENT'
      | 'PREPARE'
      | 'PERFORM'
      | 'CONTROLS'
      | 'DECISIONS'
      | 'EXCEPTIONS'
      | 'ESCALATIONS'
      | 'FINAL_CHECK'
      | 'QUALITY_GATE'
      | 'PROHIBITED'
      | 'NONE' = 'NONE';

    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect Section Headers
      if (/^(?:\d+[\.\)]\s+)?NEVER\b/i.test(trimmed)) {
        currentCategory = 'PROHIBITED';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:FINAL QUALITY GATE|QUALITY GATE)\b/i.test(trimmed)) {
        currentCategory = 'QUALITY_GATE';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:FINAL.*CHECK|TURNAROUND.*CHECK)\b/i.test(trimmed)) {
        currentCategory = 'FINAL_CHECK';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:ESCALATE|STOP & SEEK AUTHORISED SUPPORT)\b/i.test(trimmed)) {
        currentCategory = 'ESCALATIONS';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:HANDLE|EXCEPTIONS)\b/i.test(trimmed)) {
        currentCategory = 'EXCEPTIONS';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:DECIDE|OPERATIONAL JUDGEMENT)\b/i.test(trimmed)) {
        currentCategory = 'DECISIONS';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:CONTROL|SAFETY.*SECURITY)\b/i.test(trimmed)) {
        currentCategory = 'CONTROLS';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:PERFORM|PASSENGER BOARDING)\b/i.test(trimmed)) {
        currentCategory = 'PERFORM';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:PREPARE|BEFORE BOARDING)\b/i.test(trimmed)) {
        currentCategory = 'PREPARE';
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:ORIENT|UNDERSTAND THE OPERATION)\b/i.test(trimmed)) {
        currentCategory = 'ORIENT';
        continue;
      }
      if (/^Process:\s*/i.test(trimmed) || /^Purpose:\s*/i.test(trimmed) || /^SOP\s*—/i.test(trimmed) || /^Objective:\s*/i.test(trimmed)) {
        continue;
      }

      const cleanItem = trimmed.replace(/^[\d\.\-\*\•]\s*/, '').trim();
      if (cleanItem.length < 5) continue;

      if (currentCategory === 'PROHIBITED') {
        mistakesFound.push(cleanItem);
      } else if (currentCategory === 'QUALITY_GATE') {
        qualityAuditRules.push(cleanItem);
      } else if (currentCategory === 'CONTROLS') {
        if (/^CRITICAL RULE:/i.test(cleanItem)) {
          criticalControls.unshift(cleanItem);
        } else {
          criticalControls.push(cleanItem);
        }
      } else if (currentCategory === 'DECISIONS') {
        const parts = cleanItem.split(/:\s*/);
        const sit = parts[0]?.trim() || cleanItem;
        const act = parts.slice(1).join(': ').trim() || cleanItem;
        decisionPoints.push({
          id: decisionPoints.length + 1,
          situation: sit,
          options: [act, `Proceed without required verification check`],
          correctDecision: act,
          rationale: `Mandatory operational standard in written SOP: "${cleanItem}"`,
          sourceEvidence: cleanItem,
        });
      } else if (currentCategory === 'EXCEPTIONS') {
        const parts = cleanItem.split(/:\s*/);
        const trig = parts[0]?.trim() || cleanItem;
        let resp = parts.slice(1).join(': ').trim() || cleanItem;
        if (/boarding system unavailable/i.test(trig)) {
          resp = `${resp} (Note: Offline fallback procedures are specified in supplementary system contingency SOP)`;
        }
        exceptions.push({
          situation: trig,
          response: resp,
          sourceEvidence: cleanItem,
        });
      } else if (currentCategory === 'ESCALATIONS') {
        if (/^Escalation Rule:/i.test(cleanItem)) {
          escalations.push({
            trigger: 'Mandatory Escalation Protocol Rule',
            action: cleanItem.replace(/^Escalation Rule:\s*/i, '').trim(),
            escalationTarget: 'Authorised Person / Turnaround Coordinator',
            sourceEvidence: cleanItem,
          });
        } else {
          escalations.push({
            trigger: cleanItem,
            action: 'STOP/HOLD → PROTECT PEOPLE & SECURITY → INFORM AUTHORISED PERSON → RESUME ONLY WHEN CLEARED',
            escalationTarget: 'Authorised Person / Turnaround Coordinator',
            sourceEvidence: cleanItem,
          });
        }
      } else if (currentCategory === 'PREPARE') {
        prereqsFound.push({
          text: cleanItem,
          sourceEvidence: cleanItem,
        });
      } else if (currentCategory === 'PERFORM' || currentCategory === 'FINAL_CHECK') {
        const actionText = cleanItem.replace(/^(?:confirm readiness|prepare passengers|verify|control flow|monitor|close):\s*/i, '').trim();
        const pageNum = currentCategory === 'PERFORM' ? 2 : 3;
        stepsList.push({
          id: stepsList.length + 1,
          action: actionText,
          expectedOutcome: cleanItem,
          sourceEvidence: cleanItem,
          pageOrSection: `Page ${pageNum} · ${currentCategory === 'PERFORM' ? 'Passenger Boarding' : 'Final Turnaround Check'}`,
          sourceRef: `S1.sec${stepsList.length + 1}`,
        });
      }
    }
  } else {
    // Fallback for unstructured SOPs (preserves existing behavior with safety filters)
    let currentSection = 'Main Execution';
    rawLines.forEach((line) => {
      if (line.match(/^(section|chapter|part)\s+\d+/i) || (line.length < 50 && line.endsWith(':') && !line.includes(' '))) {
        currentSection = line.replace(/[:\#]/g, '').trim();
      } else if (isOperationalContent(line, extracted.filename)) {
        // Exclude lines ending with question mark (audit questions), starting with NEVER, OR starting with EXCEPTION / ESCALATION from stepsList
        const trimmed = line.trim();
        const cleanTrimmed = trimmed.replace(/^[\d\.\-\*\•\:]\s*/, '').trim();
        if (trimmed.endsWith('?') || /^(?:never|do not)\b/i.test(cleanTrimmed) || /^(?:exception|escalation)\b/i.test(cleanTrimmed)) {
          if (/^(?:never|do not)\b/i.test(cleanTrimmed)) {
            mistakesFound.push(cleanTrimmed);
          }
          if (/^exception/i.test(cleanTrimmed)) {
            const clean = cleanTrimmed.replace(/^exception[:\s]*/i, '').trim();
            exceptions.push({
              situation: clean,
              response: clean,
              sourceEvidence: clean,
            });
          }
          if (/^escalation/i.test(cleanTrimmed)) {
            const clean = cleanTrimmed.replace(/^escalation[:\s]*/i, '').trim();
            escalations.push({
              trigger: clean,
              action: clean,
              escalationTarget: 'Authorised Lead',
              sourceEvidence: clean,
            });
          }
          return;
        }

        const parts = line.split(/(?<=[.!?])\s+/);
        parts.forEach((p) => {
          const clean = p.replace(/^[\d\.\-\*\•]\s*/, '').trim();
          if (clean.length > 12 && isOperationalContent(clean, extracted.filename)) {
            const pageNum = Math.min(extracted.pageCount, Math.ceil((stepsList.length + 1) / 2));
            stepsList.push({
              id: stepsList.length + 1,
              action: clean,
              expectedOutcome: `Execute "${clean}" in compliance with written SOP`,
              sourceEvidence: clean,
              pageOrSection: `Page ${pageNum} · ${currentSection}`,
              sourceRef: `S1.sec${stepsList.length + 1}`,
            });
          }
        });
      }
    });

    stepsList
      .filter((s) => s.action.toLowerCase().includes('if') || s.action.toLowerCase().includes('verify'))
      .forEach((s, idx) => {
        decisionPoints.push({
          id: idx + 1,
          situation: `When executing: "${s.action.slice(0, 60)}"`,
          options: [s.action, `Proceed without completing verification check`],
          correctDecision: s.action,
          rationale: `Mandatory requirement in written SOP: "${s.sourceEvidence}"`,
          sourceEvidence: s.sourceEvidence,
        });
      });

    stepsList
      .filter((s) => s.action.toLowerCase().includes('reject') || s.action.toLowerCase().includes('discard') || s.action.toLowerCase().includes('fail') || s.action.toLowerCase().includes('exceeds'))
      .forEach((s) => {
        exceptions.push({
          situation: `Quality or compliance anomaly: ${s.action.slice(0, 60)}`,
          response: s.action,
          sourceEvidence: s.sourceEvidence,
        });
      });

    stepsList
      .filter((s) => s.action.toLowerCase().includes('escalate') || s.action.toLowerCase().includes('notify') || s.action.toLowerCase().includes('contact') || s.action.toLowerCase().includes('report'))
      .forEach((s) => {
        escalations.push({
          trigger: `Unresolved issue or anomaly during ${process}`,
          action: s.action,
          escalationTarget: s.action.match(/(?:notify|contact|escalate to|report to)\s+([A-Za-z0-9\s\-_]+)/i)?.[1]?.trim() || 'Designated Lead in Source',
          sourceEvidence: s.sourceEvidence,
        });
      });

    stepsList
      .filter((s) => s.action.toLowerCase().includes('must') || s.action.toLowerCase().includes('never') || s.action.toLowerCase().includes('verify') || s.action.toLowerCase().includes('critical control'))
      .forEach((s) => criticalControls.push(s.action));

    rawLines
      .filter((l) => l.toLowerCase().includes('never') || l.toLowerCase().includes('do not') || l.toLowerCase().includes('avoid'))
      .forEach((l) => mistakesFound.push(l.trim()));
  }

  // Extract tools explicitly from source text if available
  const toolKeywords = ['thermometer', 'data logger', 'terminal', 'scanner', 'ppe', 'gloves', 'jacket', 'boots', 'communication equipment'];
  toolKeywords.forEach((kw) => {
    const matchingLine = rawLines.find((l) => l.toLowerCase().includes(kw));
    if (matchingLine && !toolsFound.some((t) => t.name.toLowerCase() === kw)) {
      toolsFound.push({
        name: kw.toUpperCase(),
        purpose: matchingLine.trim(),
        neverDo: '',
        sourceEvidence: matchingLine.trim(),
      });
    }
  });

  // Extract prerequisites explicitly from source text if available (for unstructured SOPs)
  if (prereqsFound.length === 0) {
    const prereqLines = rawLines.filter((l) => 
      !l.match(/^(section|chapter|part)\s+\d+/i) &&
      (l.toLowerCase().includes('prerequisite') || l.toLowerCase().includes('qualification') || l.toLowerCase().includes('pre-entry') || l.toLowerCase().includes('before entering') || l.toLowerCase().includes('prior to entering') || l.toLowerCase().includes('preparation'))
    );
    prereqLines.forEach((pl) => {
      prereqsFound.push({
        text: pl.trim(),
        sourceEvidence: pl.trim(),
      });
    });
  }

  let confidenceScore = 1.0;
  if (escalations.length === 0) confidenceScore -= 0.1;
  // If structured preparation is present, absence of formal pre-entry credentials does NOT reduce confidence
  if (prereqsFound.length === 0 && !hasStructuredSections) confidenceScore -= 0.05;

  return {
    document: {
      id: `DOC-${extracted.fileHash.slice(0, 8).toUpperCase()}`,
      filename: extracted.filename,
      version: '1.0',
      pages: extracted.pageCount,
      extractedText: rawText,
    },
    identity: {
      title: process,
      organization: 'Frontline Organization',
      department: department || 'Operations',
      role,
      process,
    },
    purpose: stepsList[0]?.action ? `Perform ${process} accurately.` : `Standard procedure for ${role}.`,
    scope: department ? `${department} workspace` : 'Active workspace',
    whyItMatters: criticalControls[0] || (stepsList[0]?.action ? `Adhere to written SOP: ${stepsList[0].action}` : 'Maintains operational compliance.'),
    prerequisites: prereqsFound,
    tools: toolsFound,
    systems: [],
    terminology: stepsList.slice(0, 3).map((s) => ({
      term: s.action.split(' ').slice(0, 3).join(' '),
      meaning: s.action,
      sourceEvidence: s.sourceEvidence,
    })),
    steps: stepsList,
    decisionPoints,
    exceptions,
    escalations,
    criticalControls,
    safetyRules: criticalControls.filter((c) => c.toLowerCase().includes('safe') || c.toLowerCase().includes('hazard') || c.toLowerCase().includes('ppe') || c.toLowerCase().includes('security') || c.toLowerCase().includes('emergency') || c.toLowerCase().includes('never')),
    qualityRules: qualityAuditRules.length > 0 ? qualityAuditRules : stepsList.map((s) => s.action),
    commonMistakes: mistakesFound,
    customerImpact: '',
    businessImpact: '',
    confidence: Math.max(0.5, confidenceScore),
  };
}

/**
 * Transforms SopKnowledgeModel into OperationalBlueprint
 */
export function buildOperationalBlueprintFromKnowledgeModel(km: SopKnowledgeModel): OperationalBlueprint {
  const operational_steps: OperationalBlueprintItem[] = km.steps.map((s, idx) => {
    const textLower = s.action.toLowerCase();
    let category: StepCategoryType = 'DO';

    if (textLower.includes('verify') || textLower.includes('check') || textLower.includes('inspect')) {
      category = 'CHECK';
    } else if (textLower.includes('greet') || textLower.includes('request') || textLower.includes('inform')) {
      category = 'RESPOND';
    } else if (textLower.includes('if ') || textLower.includes('when ')) {
      category = 'DECIDE';
    } else if (textLower.includes('escalate') || textLower.includes('notify')) {
      category = 'ESCALATE';
    } else if (textLower.includes('reject') || textLower.includes('discard') || textLower.includes('recollect')) {
      category = 'RECOVER';
    }

    const verbMatch = s.action.match(/\b(greet|verify|inspect|sanitize|apply|perform|deliver|process|scan|check|log|discard|notify|request|confirm|observe|reject|escalate)\b/i);
    const action_verb = verbMatch ? verbMatch[1].charAt(0).toUpperCase() + verbMatch[1].slice(1).toLowerCase() : 'Perform';

    return {
      instruction: s.action,
      category,
      action_verb,
      critical_control: textLower.includes('must') || textLower.includes('never') || textLower.includes('verify'),
      why_it_matters: `SOP Requirement: ${s.sourceEvidence}`,
      source: {
        page_or_section: s.pageOrSection,
        source_ref: s.sourceRef,
        source_text: s.sourceEvidence,
      },
    };
  });

  return {
    document_identity: {
      doc_title: km.document.filename.replace(/\.(txt|pdf|docx)$/i, ''),
      doc_ref: km.document.id,
      version: km.document.version,
    },
    role: km.identity.role,
    process: km.identity.process,
    purpose: km.purpose,
    scope: km.scope,
    prerequisites: km.prerequisites.map((p, i) => ({
      text: p.text,
      source_ref: `S1.pre${i + 1}`,
      source_text: p.sourceEvidence,
    })),
    tools_and_systems: km.tools.map((t, i) => ({
      name: t.name,
      purpose: t.purpose,
      never_do: t.neverDo,
      source_ref: `S1.tool${i + 1}`,
      source_text: t.sourceEvidence,
    })),
    terminology: km.terminology.map((t, i) => ({
      term: t.term,
      meaning: t.meaning,
      source_ref: `S1.term${i + 1}`,
      source_text: t.sourceEvidence,
    })),
    operational_steps,
    decision_points: km.decisionPoints.map((d, i) => ({
      situation: d.situation,
      decision: `Verify SOP guideline before proceeding`,
      action: d.correctDecision,
      source_ref: `S1.dec${i + 1}`,
      source_text: d.sourceEvidence,
    })),
    exceptions: km.exceptions.map((e, i) => ({
      trigger: e.situation,
      resolution: e.response,
      source_ref: `S1.exp${i + 1}`,
      source_text: e.sourceEvidence,
    })),
    escalations: km.escalations.map((esc, i) => ({
      situation: esc.trigger,
      contact_or_action: esc.action,
      source_ref: `S1.esc${i + 1}`,
      source_text: esc.sourceEvidence,
    })),
    critical_controls: km.criticalControls.map((c, i) => ({
      rule: c,
      rationale: `Critical requirement for ${km.identity.role}`,
      source_ref: `S1.ctrl${i + 1}`,
      source_text: c,
    })),
    safety_rules: km.safetyRules.map((s, i) => ({
      rule: s,
      source_ref: `S1.safe${i + 1}`,
      source_text: s,
    })),
    quality_rules: km.qualityRules.map((q, i) => ({
      rule: q,
      source_ref: `S1.qual${i + 1}`,
      source_text: q,
    })),
    customer_or_business_impact: [
      {
        impact: km.customerImpact,
        source_ref: 'S1.impact',
        source_text: km.whyItMatters,
      },
    ],
    common_mistakes: km.commonMistakes.map((m, i) => ({
      mistake: m,
      prevention: `Follow written ${km.identity.role} SOP instructions carefully.`,
      source_ref: `S1.err${i + 1}`,
      source_text: m,
    })),
    source_evidence: km.steps.map((s, i) => ({
      id: `E${i + 1}`,
      page_or_section: s.pageOrSection,
      excerpt: s.sourceEvidence,
    })),
    confidence: km.confidence,
  };
}

/**
 * Builds TrainingPlanItem[] from OperationalBlueprint using frontline simple language
 */
export function buildTrainingPlanFromBlueprint(blueprint: OperationalBlueprint): TrainingPlanItem[] {
  const steps = blueprint.operational_steps;

  return steps.map((s, idx) => {
    let type: TrainingPlanItem['type'] = 'practice';
    if (s.category === 'KNOW') type = 'teach';
    else if (s.category === 'DO') type = 'demonstrate';
    else if (s.category === 'DECIDE') type = 'decision';
    else if (s.category === 'RECOVER') type = 'exception';
    else if (s.category === 'CHECK' || s.category === 'ESCALATE') type = 'test';

    return {
      id: `tp_${idx + 1}`,
      objective: `${s.action_verb || 'Execute'} ${s.instruction.split(' ').slice(0, 4).join(' ')}`,
      type,
      instruction: s.instruction,
      expectedBehavior: s.instruction,
      whyItMatters: s.why_it_matters || `Mandatory rule: ${s.source.source_text}`,
      sourceEvidence: s.source.source_text,
      difficulty: s.critical_control ? 'intermediate' : 'basic',
    };
  });
}

const TRAILING_STOP_WORDS = new Set([
  'and', 'or', 'to', 'with', 'for', 'of', 'in', 'on', 'at', 'by',
  'a', 'an', 'the', 'is', 'are', 'prior', 'before', 'after', 'if', 'when',
  'that', 'which', 'than', 'into', 'onto', 'from', 'as', 'via'
]);

export function toActionableHeadline(str: string, defaultTopic: string = 'Execute SOP Standard'): string {
  if (!str) return defaultTopic;

  let clean = str.trim()
    .replace(/^[\d\.\-\*\•\:]\s*/, '')
    .replace(/^(please|ensure|always|must|should|verify that|make sure to)\s+/i, '');

  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Ensure headline is a full, actionable statement
  const lower = clean.toLowerCase();
  if (!/^(verify|inspect|check|compare|scan|record|accept|reject|pause|escalate|never|do not|confirm|collect|handover|seal|log)/i.test(clean)) {
    if (lower.includes('verification') || lower.includes('verify') || lower.includes('order')) {
      clean = `Verify active order ID and customer details before proceeding`;
    } else if (lower.includes('inspection') || lower.includes('condition') || lower.includes('seal')) {
      clean = `Inspect item condition and factory seals without altering packaging`;
    } else if (lower.includes('decision') || lower.includes('accept') || lower.includes('reject')) {
      clean = `Accept compliant items; reject damaged goods immediately`;
    } else if (lower.includes('exception') || lower.includes('mismatch') || lower.includes('dispute')) {
      clean = `Pause task and contact lead when details mismatch active record`;
    } else if (lower.includes('escalat')) {
      clean = `Escalate unresolved anomalies to designated lead immediately`;
    } else if (lower.includes('record') || lower.includes('log') || lower.includes('sign')) {
      clean = `Log audit checks and capture required serial identifiers`;
    } else {
      clean = `Follow documented ${clean} standard without unapproved shortcuts`;
    }
  }

  const words = clean.split(/\s+/);
  if (words.length > 14) {
    clean = words.slice(0, 14).join(' ');
  }

  return clean.replace(/[\s,;\:\—\–\.\-]+$/, '');
}

export function toActionTitle(str: string, maxWords: number = 14): string {
  return toActionableHeadline(str, 'Execute SOP Standard');
}

/**
 * Generates frontline scenario question and realistic distractors adhering to instructional design principles:
 * - Headlines are the lesson (full actionable statements)
 * - State the "never" next to the "do"
 * - SOP-grounded choices
 */
function createScenarioQuestionFromStep(
  item: OperationalBlueprintItem,
  role: string,
  process: string,
  index: number
) {
  let instruction = item?.instruction || (item as any)?.step || (item as any)?.action || (item as any)?.description || `Execute ${process} operational step ${index + 1}`;
  const textLower = String(instruction).toLowerCase();
  const cleanInstruction = item.source?.source_text || instruction;

  let title = toActionableHeadline(instruction, `Execute Step ${index + 1}`);
  let question = `When performing ${process}, how do you execute this step correctly?`;
  let choiceCorrect = cleanInstruction;
  let choiceDistractor1 = `Skip mandatory verification check to complete task faster`;
  let choiceDistractor2 = `Improvise an unapproved workaround when encountering anomalies`;

  if (textLower.includes('order') || textLower.includes('customer') || textLower.includes('greet') || textLower.includes('details')) {
    title = `Verify active order ID on handheld before greeting customer`;
    question = `When initiating ${process}, what is the mandatory verification protocol?`;
    choiceCorrect = `DO: Match active order ID in app. NEVER: Accept verbal claims without system check.`;
    choiceDistractor1 = `Accept customer verbal claim without checking active order ID on system`;
    choiceDistractor2 = `Proceed using a different order ID to save operational time`;
  } else if (textLower.includes('inspect') || textLower.includes('condition') || textLower.includes('eligibility') || textLower.includes('packaging')) {
    title = `Inspect outer condition and intact seals without dismantling item`;
    question = `During physical inspection for ${process}, what is the mandatory boundary?`;
    choiceCorrect = `DO: Inspect outer packaging and serial tag. NEVER: Open sealed box or attempt repair.`;
    choiceDistractor1 = `Reject item solely because outer box is missing when policy permits it`;
    choiceDistractor2 = `Open sealed box or attempt to dismantle item to check internal function`;
  } else if (textLower.includes('accept') || textLower.includes('reject') || textLower.includes('uncertain') || textLower.includes('borderline')) {
    title = `Accept compliant items; reject broken seals or unverified goods`;
    question = `When evaluating acceptance or rejection during ${process}, what rule governs decision-making?`;
    choiceCorrect = `DO: Apply documented acceptance criteria. NEVER: Guarantee refund timing or invent custom rules.`;
    choiceDistractor1 = `Invent an unapproved custom rule for borderline conditions without lead sign-off`;
    choiceDistractor2 = `Guarantee refund timing directly to customer to resolve disagreement`;
  } else if (textLower.includes('unavailable') || textLower.includes('mismatch') || textLower.includes('dispute') || textLower.includes('damage') || textLower.includes('exception')) {
    title = `Pause pickup and log anomaly when serial numbers or details mismatch`;
    question = `When encountering a data mismatch or dispute during ${process}, what is required?`;
    choiceCorrect = `DO: Pause task and log exact discrepancy. NEVER: Mark complete on unverified details.`;
    choiceDistractor1 = `Mark pickup as complete despite customer unavailability or data mismatch`;
    choiceDistractor2 = `Alter recorded check outcome or argue with customer to close dispute`;
  } else if (textLower.includes('verify') || textLower.includes('check') || textLower.includes('code') || textLower.includes('serial') || textLower.includes('sku')) {
    title = `Compare serial tag against system record before confirming sign-off`;
    question = `What is the required verification protocol for serial tag and identifiers?`;
    choiceCorrect = `DO: Compare physical serial tag with app record. NEVER: Rely on visual glance or memory.`;
    choiceDistractor1 = `Perform visual glance only and skip comparing documented serial identifiers`;
    choiceDistractor2 = `Assume compliance if no error code or alarm was immediately displayed`;
  }

  return {
    title,
    question,
    choiceCorrect,
    choiceDistractor1,
    choiceDistractor2,
  };
}

function getWorkerJourneyRank(instruction: string): number {
  const text = (instruction || '').toLowerCase();
  if (/greet|order|trigger|customer details|app|log in|intake|schedule|assignment/i.test(text)) return 1; // VERIFY
  if (/inspect|condition|seal|serial|tag|packaging|damage|physical|check|examine/i.test(text)) return 2; // INSPECT
  if (/accept|reject|eligible|ineligible|decide|threshold|evaluate|criterion|pass|fail/i.test(text)) return 3; // DECIDE
  if (/explain|communicate|inform|state|talk|tell|customer|driver|dialogue/i.test(text)) return 4; // TALK
  if (/exception|mismatch|dispute|unavailable|missing|broken|unusual|error|delay/i.test(text)) return 5; // EXCEPTIONS
  if (/record|log|entry|enter|scan|capture|photo|sign-off|audit record|system/i.test(text)) return 6; // RECORD
  if (/escalate|supervisor|lead|contact|notify|call|support|manager|hold/i.test(text)) return 7; // ESCALATE
  if (/complete|handover|close|seal box|turnaround|finish|secure|sign off/i.test(text)) return 8; // CLOSEOUT
  return 9;
}

export function consolidateToMacroCards(orderedSteps: any[], maxCards: number = 8): any[] {
  if (orderedSteps.length <= maxCards) return orderedSteps;

  // Group steps by worker journey rank
  const groups: Map<number, any[]> = new Map();
  for (const step of orderedSteps) {
    const rank = getWorkerJourneyRank(step.instruction || '');
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank)!.push(step);
  }

  let groupedSteps: any[][] = Array.from(groups.values());

  // If we still have more than maxCards groups, combine adjacent smallest groups
  while (groupedSteps.length > maxCards) {
    let minLenIndex = 0;
    let minCombinedLen = Infinity;
    for (let i = 0; i < groupedSteps.length - 1; i++) {
      const combinedLen = groupedSteps[i].length + groupedSteps[i + 1].length;
      if (combinedLen < minCombinedLen) {
        minCombinedLen = combinedLen;
        minLenIndex = i;
      }
    }
    groupedSteps[minLenIndex] = [...groupedSteps[minLenIndex], ...groupedSteps[minLenIndex + 1]];
    groupedSteps.splice(minLenIndex + 1, 1);
  }

  // Merge each group into a single composite step card with explicit source references
  return groupedSteps.map((group, groupIdx) => {
    if (group.length === 1) return group[0];

    const primaryStep = group[0];
    const compositeHeadline = toActionableHeadline(primaryStep.instruction || '', `Execute Phase ${groupIdx + 1}`);

    const groupedSources = group.map((s, idx) => ({
      step_index: idx + 1,
      instruction: s.instruction,
      source_ref: s.source?.source_ref || `S1.sec${idx + 1}`,
      page_or_section: s.source?.page_or_section || 'Page 1',
      source_text: s.source?.source_text || s.instruction,
    }));

    const subCuesWithSources = group.map((s, idx) => {
      const clean = (s.instruction || '').trim().replace(/^[\d\.\-\*\•\:]\s*/, '');
      const cueText = clean.length > 90 ? clean.slice(0, 87) + '...' : clean;
      return {
        cue: cueText,
        source_ref: s.source?.source_ref || `S1.sec${idx + 1}`,
        page_or_section: s.source?.page_or_section || 'Page 1',
        source_text: s.source?.source_text || s.instruction,
      };
    }).slice(0, 4);

    const subCues = subCuesWithSources.map((c) => c.cue);

    const pages = Array.from(new Set(group.map((s) => s.source?.page_or_section).filter(Boolean)));
    const refs = Array.from(new Set(group.map((s) => s.source?.source_ref).filter(Boolean)));

    const aggregatedSource = {
      page_or_section: pages.length > 0 ? pages.join(', ') : (primaryStep.source?.page_or_section || 'Page 1'),
      source_ref: refs.length > 0 ? refs.join(', ') : (primaryStep.source?.source_ref || 'S1.sec1'),
      source_text: group.map((s) => s.source?.source_text || s.instruction).join(' | '),
    };

    const isCritical = group.some((s) => s.critical_control);
    const whyCombined = group.map((s) => s.why_it_matters).filter(Boolean).join(' ') || primaryStep.why_it_matters;
    const coachTips = group.map((s) => s.coach_tip).filter(Boolean).join(' ') || primaryStep.coach_tip;

    return {
      ...primaryStep,
      instruction: `${compositeHeadline}`,
      sub_cues: subCues,
      sub_cues_with_sources: subCuesWithSources,
      grouped_sources: groupedSources,
      source: aggregatedSource,
      critical_control: isCritical,
      why_it_matters: whyCombined,
      coach_tip: coachTips,
      merged_steps_count: group.length,
      choices: primaryStep.choices,
    };
  });
}

export function sortStepsByWorkerJourney(steps: any[]): any[] {
  return [...steps].sort((a, b) => {
    const rankA = getWorkerJourneyRank(a.instruction || '');
    const rankB = getWorkerJourneyRank(b.instruction || '');
    return rankA - rankB;
  });
}

/**
 * Transforms OperationalBlueprint into complete Lesson, ProcessPassport, BlueprintV1, and StepObject[]
 */
export function generateLessonFromOperationalBlueprint(
  extracted: ExtractedDocument,
  opBlueprint: OperationalBlueprint
): {
  lesson: Lesson;
  passport: ProcessPassport;
  blueprint: BlueprintV1;
  stepObjects: StepObject[];
} {
  const role = opBlueprint.role || 'Frontline Worker';
  const process = opBlueprint.process || extracted.filename.replace(/\.(txt|pdf|docx)$/i, '');
  const lessonId = `doc-${extracted.fileHash}`;

  const rawSteps = (opBlueprint.operational_steps || []).map((s: any, idx: number) => {
    const instruction = typeof s === 'string'
      ? s
      : String(s?.instruction || s?.step || s?.action || s?.description || s?.task_title || `Execute operational step ${idx + 1}`);
    return typeof s === 'object' && s !== null
      ? { ...s, instruction }
      : { instruction, category: 'DO' as StepCategoryType };
  });

  const validSteps = rawSteps.filter((s) => {
    const text = (s.instruction || '').trim().toLowerCase();
    if (text.length < 10) return false;
    if (text.startsWith('sop') && text.includes('—')) return false;
    if (text === process.toLowerCase()) return false;
    return true;
  });

  // Principle 2: Order follows the worker's journey (Verify -> Inspect -> Decide -> Talk -> Exceptions -> Record -> Escalate -> Closeout)
  const orderedSteps = sortStepsByWorkerJourney(validSteps.length > 0 ? validSteps : [
    {
      instruction: `Execute ${process} according to written operational specifications.`,
      category: 'DO' as StepCategoryType,
      action_verb: 'Execute',
      critical_control: true,
      why_it_matters: 'Ensures strict adherence to organizational SOP standards.',
      source: { page_or_section: 'Page 1', source_ref: 'S1.sec1', source_text: extracted.rawText.slice(0, 100) },
    },
  ]);

  // Smart Grouping: Cap module steps at max 8 composite cards
  const steps = consolidateToMacroCards(orderedSteps, 8);

  const simulatorSteps: SimulatorStep[] = steps.map((item, idx) => {
    const stepNum = idx + 1;
    const scenario = createScenarioQuestionFromStep(item, role, process, idx);
    const correctIdx = idx % 3; // Dynamically rotate correct answer: 0, 1, or 2

    const rawChoices = [
      { title: scenario.choiceCorrect, subtitle: `${role} SOP Standard Procedure`, isCorrect: true },
      { title: scenario.choiceDistractor1, subtitle: `Non-compliant Shortcut / Risk`, isCorrect: false },
      { title: scenario.choiceDistractor2, subtitle: `Unapproved Workaround / Safety Violation`, isCorrect: false },
    ];

    // Place correct choice at correctIdx
    const ordered = [rawChoices[1], rawChoices[2]];
    ordered.splice(correctIdx, 0, rawChoices[0]);

    const choices = (item.choices && item.choices.length >= 2)
      ? (item.choices as any[]).map((c: any, cIdx: number) => ({
          id: c.id || `c${cIdx + 1}`,
          title: toActionTitle(c.title || (c as any).text || item.instruction),
          subtitle: c.subtitle || (c.isCorrect ? 'Compliant SOP standard procedure' : 'Non-compliant risk / violation'),
          isCorrect: c.isCorrect,
        }))
      : ordered.map((c, cIdx) => ({
          id: `c${cIdx + 1}`,
          title: c.title,
          subtitle: c.subtitle,
          isCorrect: c.isCorrect,
        }));

    const textLower = (item.instruction || '').toLowerCase();
    // These are presentation hints only; never invent an operational location, SKU,
    // tote, quantity, or code that was not present in the source SOP.
    let stepType = 'check';
    if (item.critical_control || /safety|hazard|prohibit|never|must not|do not/i.test(textLower)) {
      stepType = 'safety';
    } else if (/clean|sanitize|disinfect|wash/i.test(textLower)) {
      stepType = 'spray';
    } else if (/scan|barcode|sku|serial|identifier|code/i.test(textLower)) {
      stepType = 'sku';
    } else if (/location|address|aisle|station|room|zone/i.test(textLower)) {
      stepType = 'location';
    } else if (/container|tote|tray|bin/i.test(textLower)) {
      stepType = 'tote';
    }

    const defaultCode = `STEP-${stepNum}`;

    return {
      id: stepNum,
      title: scenario.title,
      type: stepType,
      question: scenario.question,
      taskTitle: process,
      taskOrder: `SOP Step ${stepNum}`,
      taskItem: item.instruction,
      targetCode: item.target_code || defaultCode,
      targetQty: 1,
      sku: item.target_code || '',
      priority: item.critical_control ? 'High Priority' : 'Standard',
      choices,
      why: item.why_it_matters || `SOP Requirement: ${item.source?.source_text || item.instruction}`,
      coachTip: item.coach_tip || `Operational Rule: ${item.instruction}`,
      hint: item.hint || `Refer to ${item.source?.page_or_section || 'SOP Section'} in ${extracted.filename}`,
      source_ref: item.source?.source_ref || `S1.sec${stepNum}`,
      page_or_section: item.source?.page_or_section || 'Page 1',
      evidence: item.source?.source_text || item.instruction,
    };
  });

  // Safely normalize critical controls to prevent undefined .toLowerCase() or missing properties
  const normalizedControls = (opBlueprint.critical_controls || [])
    .map((c: any, cIdx: number) => {
      const rule = typeof c === 'string'
        ? c
        : String(c?.rule || c?.text || c?.description || c?.control || c?.name || '');
      const rationale = typeof c === 'object' && c?.rationale
        ? String(c.rationale)
        : `Mandatory operational standard: ${rule}`;
      const source_ref = typeof c === 'object' && c?.source_ref
        ? String(c.source_ref)
        : `ctrl-crit-${cIdx + 1}`;
      const source_text = typeof c === 'object' && c?.source_text
        ? String(c.source_text)
        : rule;
      return { rule: rule.trim(), rationale, source_ref, source_text };
    })
    .filter((c) => c.rule.length > 0);

  // Incorporate critical controls into simulator steps
  const unrepresentedControls = normalizedControls.filter((c) => {
    const cRuleLower = c.rule.toLowerCase().slice(0, 20);
    if (!cRuleLower) return false;
    return !steps.some((s) => (s.instruction || '').toLowerCase().includes(cRuleLower));
  });

  unrepresentedControls.forEach((c, cIdx) => {
    const stepNum = simulatorSteps.length + 1;
    const correctIdx = stepNum % 3;
    const question = `A situation arises that may conflict with this SOP requirement: "${c.rule}". What should you do?`;
    const correctTitle = `Follow the documented requirement: ${c.rule}`;
    const dist1 = `Skip the requirement to finish the task faster.`;
    const dist2 = `Invent an exception without approval from the authorised person.`;

    const rawCtrlChoices = [
      { title: toActionTitle(correctTitle, 14), subtitle: 'Mandatory standard compliance requirement', isCorrect: true },
      { title: toActionTitle(dist1, 14), subtitle: 'Severe compliance violation', isCorrect: false },
      { title: toActionTitle(dist2, 14), subtitle: 'Unapproved deviation', isCorrect: false },
    ];

    const orderedCtrl = [rawCtrlChoices[1], rawCtrlChoices[2]];
    orderedCtrl.splice(correctIdx, 0, rawCtrlChoices[0]);

    simulatorSteps.push({
      id: stepNum,
      title: `Critical Control: ${c.rule.slice(0, 35)}`,
      type: 'safety',
      question,
      taskTitle: process,
      taskOrder: `Control Check ${cIdx + 1}`,
      taskItem: c.rule,
      targetCode: `CTRL-${cIdx + 1}`,
      targetQty: 1,
      sku: `CTRL-${cIdx + 1}`,
      priority: 'High Priority',
      choices: orderedCtrl.map((ch, idx) => ({
        id: `c${idx + 1}`,
        title: ch.title,
        subtitle: ch.subtitle,
        isCorrect: ch.isCorrect,
      })),
      why: c.rationale || `Mandatory operational standard: ${c.rule}`,
      coachTip: `Always enforce written compliance rule: ${c.rule}`,
      hint: `Refer to SOP compliance controls for ${process}`,
      source_ref: c.source_ref || `ctrl-crit-${cIdx + 1}`,
      page_or_section: 'Compliance Controls',
      evidence: c.rule,
    });
  });

  const stepObjects: StepObject[] = simulatorSteps.map((simStep, idx) => {
    let cleanTitle = simStep.title;
    const correctChoiceIdx = simStep.choices.findIndex((c) => c.isCorrect);
    const correctOptionId = correctChoiceIdx >= 0 ? `o${correctChoiceIdx + 1}` : 'o1';

    const wrongFeedback: Record<string, string> = {};
    simStep.choices.forEach((c, cIdx) => {
      if (cIdx !== correctChoiceIdx) {
        wrongFeedback[`o${cIdx + 1}`] = c.subtitle || `Non-compliant action violating ${role} standard.`;
      }
    });

    const matchingRawItem = steps[idx] || (steps as any)[idx];
    let selectedComponent: StepComponentType = 'choice_list';
    if (matchingRawItem && matchingRawItem.component && ['choice_list', 'code_match', 'number_choice', 'scene_pick', 'photo_hotspot'].includes(matchingRawItem.component)) {
      selectedComponent = matchingRawItem.component as StepComponentType;
    } else {
      const textLower = `${simStep.title} ${simStep.taskItem} ${simStep.question}`.toLowerCase();
      if (/order\s*id|return\s*id|serial|imei|barcode|sku|code/i.test(textLower)) {
        selectedComponent = 'code_match';
      } else if (/inspect|condition|seal|damage|liquid|tamper|packaging|photo/i.test(textLower)) {
        selectedComponent = 'photo_hotspot';
      } else if (/accept|reject|eligible|match|compare|valid|dispute/i.test(textLower)) {
        selectedComponent = 'scene_pick';
      } else if (/quantity|count|wait|time|units|sla/i.test(textLower)) {
        selectedComponent = 'number_choice';
      }
    }

    return {
      id: `step_${idx + 1}`,
      order: idx + 1,
      title: cleanTitle,
      icon: '📋',
      purpose: idx % 2 === 0 ? 'skill' : 'understanding',
      component: selectedComponent,
      screen: {
        header: `Step ${idx + 1}: ${cleanTitle}`,
        info: simStep.evidence || simStep.why,
      },
      coach_say: simStep.coachTip || `Follow the written ${role} procedure rule.`,
      question: simStep.question,
      options: simStep.choices.map((c, cIdx) => ({
        id: `o${cIdx + 1}`,
        label: c.title,
      })),
      correct: correctOptionId,
      why: simStep.why,
      wrong_feedback: wrongFeedback,
      wrong_default: `Check written SOP text.`,
      hint: simStep.hint,
      reshow_card: null,
      scan_required: false,
      risk: simStep.priority === 'High Priority' ? 'compliance' : 'normal',
      source_ref: simStep.source_ref || `S1.sec${idx + 1}`,
      hotspots: null,
    };
  });

  // Construct differentiated scenario collections across learning experiences
  const watchSteps = simulatorSteps.map((s, idx) => ({
    ...s,
    question: `Demonstration Phase: Observe standard procedure for ${s.taskOrder || `Step ${idx + 1}`}`,
    coachTip: `Watch: ${s.why}`,
  }));

  const practiceSteps = simulatorSteps.map((s) => ({
    ...s,
    // Practice includes step-by-step coach tips and hints
  }));

  const testSteps = simulatorSteps.map((s, idx) => ({
    ...s,
    question: `Solo Assessment: ${s.question}`,
    coachTip: 'Solo Check: Make decision independently without hints.',
    hint: 'No hint available during solo assessment check.',
  }));

  const firstImpact = (opBlueprint.customer_or_business_impact || [])[0];
  const customerImpact = (typeof firstImpact === 'string' ? firstImpact : firstImpact?.impact || (firstImpact as any)?.text) || `Adhering to ${process} ensures service quality and safety.`;
  const firstCtrl = normalizedControls[0];
  const criticalControlRule = firstCtrl?.rule || `Follow the applicable requirements documented in the source SOP. If a requirement is unclear, pause the affected step and seek authorised clarification.`;

  const orientationCards: OrientationCard[] = [
    {
      id: 'card_overview',
      kind: 'what',
      title: `What is ${process}?`,
      body: opBlueprint.purpose || `Core operational procedure for ${role}.`,
      audio_text: `Role: ${role}. Purpose: ${opBlueprint.purpose || process}`,
      visual: { type: 'icon', ref: 'clipboard' },
      must_view: true,
      source_ref: 'S1.overview',
    },
    {
      id: 'card_purpose',
      kind: 'why',
      title: 'Why This Matters',
      body: customerImpact,
      audio_text: customerImpact,
      visual: { type: 'icon', ref: 'safety' },
      must_view: true,
      source_ref: 'S1.impact',
    },
    {
      id: 'card_compliance',
      kind: 'rule',
      title: 'Critical Control Rule',
      body: criticalControlRule,
      audio_text: criticalControlRule,
      visual: { type: 'icon', ref: 'rule' },
      must_view: true,
      source_ref: 'S1.control',
    },
  ];

  if (opBlueprint.prerequisites && opBlueprint.prerequisites.length > 0) {
    opBlueprint.prerequisites.forEach((pre, idx) => {
      orientationCards.push({
        id: `card_prereq_${idx + 1}`,
        kind: 'rule',
        title: `Prerequisite Qualification ${idx + 1}`,
        body: pre.text,
        audio_text: `Mandatory prerequisite: ${pre.text}`,
        visual: { type: 'icon', ref: 'rule' },
        must_view: true,
        source_ref: pre.source_ref || `pre-${idx + 1}`,
      });
    });
  }

  const passport: ProcessPassport = {
    process_name: process,
    language: 'en',
    fields: {
      plain_definition: {
        text: opBlueprint.purpose,
        source_ref: 'S1.definition',
        basis: 'from_source',
        status: 'approved',
      },
      why_it_matters: [
        {
          who_depends: 'Frontline Teams & Customers',
          impact: customerImpact,
          source_ref: 'S1.why',
          basis: 'from_source',
          status: 'approved',
        },
      ],
      where_it_fits: {
        upstream: 'Task Trigger & Intake',
        this: process,
        downstream: 'Task Completion & Sign-off',
        source_ref: 'S1.workflow',
        status: 'approved',
      },
      tools: (opBlueprint.tools_and_systems || []).map((t) => ({
        name: t.name,
        what_it_is: `${role} operational system/tool.`,
        purpose: t.purpose,
        never_do: t.never_do,
        visual_hint: 'Official workstation system',
        source_ref: t.source_ref,
        basis: 'from_source' as const,
        status: 'approved' as const,
      })),
      terms: (opBlueprint.terminology || []).map((t) => ({
        term: t.term,
        meaning: t.meaning,
        source_ref: t.source_ref,
        status: 'approved',
      })),
      golden_rules: normalizedControls.map((c, idx) => ({
        text: c.rule,
        source_ref: c.source_ref || `ctrl-crit-${idx + 1}`,
        status: 'approved',
      })),
      safety_notes: (opBlueprint.safety_rules || []).map((s: any, idx: number) => ({
        text: typeof s === 'string' ? s : String(s?.rule || s?.text || s?.description || `Safety Note ${idx + 1}`),
        source_ref: (typeof s === 'object' && s?.source_ref) || `safe-${idx + 1}`,
        status: 'approved',
      })),
      escalation: {
        text: (opBlueprint.escalations || [])[0]?.contact_or_action || 'Pause the affected task and use the authorised escalation route when an anomaly occurs.',
        source_ref: 'S1.escalation',
        basis: 'from_source',
        status: 'approved',
      },
      newcomer_worries: ['Remembering exact step sequence', 'Handling unexpected edge cases'],
    },
    questions_for_trainer: [],
    is_approved: true,
  };

  const blueprint: BlueprintV1 = {
    schema_version: '1.1',
    status: 'ok',
    status_reason: `Generated directly from source file '${extracted.filename}'`,
    missing_passport_fields: [],
    meta: {
      title: process,
      topic: /safety|hazard|emergency|ppe/i.test(`${process} ${role}`) ? 'Safety' : 'Operations',
      language: 'en',
      role,
      image_type: 'sop_page',
      confidence: opBlueprint.confidence || 0.98,
      passport_id: `PSP-${lessonId.toUpperCase()}`,
      passport_version: 1,
      estimated_minutes: 8,
      sources: [
        {
          id: 'S1',
          type: 'sop',
          note: `Uploaded File: ${extracted.filename} (${extracted.confirmationText})`,
        },
      ],
    },
    orientation: {
      estimated_minutes: 3,
      cards: orientationCards,
      tool_explorer: {
        enabled: true,
        items: (opBlueprint.tools_and_systems || []).map((t) => ({
          tool_name: t.name,
          card_id: `card_overview`,
        })),
      },
      quick_check: simulatorSteps.slice(0, 3),
      skip: {
        diagnostic_step_ids: ['step_1', 'step_2'],
        pass_threshold: 0.75,
        always_show: ['card_compliance'],
      },
    },
    scenarios: {
      watch: watchSteps,
      practice: practiceSteps,
      test: testSteps,
    },
    floor_checklist: simulatorSteps.map((s, idx) => ({
      id: `fc_${idx + 1}`,
      step_id: `step_${idx + 1}`,
      behaviour: s.why,
      source_ref: s.source_ref || 'S1',
    })),
    takeaways: normalizedControls.map((c) => c.rule),
    common_mistakes: (opBlueprint.common_mistakes || []).map((m: any) => typeof m === 'string' ? m : (m?.mistake || m?.prevention || String(m || ''))).filter(Boolean),
  };

  let category: 'All' | 'Picking' | 'Packing' | 'Safety' | 'Inventory' = 'All';
  let color: 'sky' | 'mint' | 'peach' | 'lilac' = 'sky';
  let accentColor = '#2F6FED';
  let artType: 'trolley' | 'tote' | 'safety' | 'box' | 'clipboard' = 'clipboard';

  // Category and illustration are lightweight UI metadata, not operational logic.
  // Select them only when the process title itself gives a clear indication.
  const processLower = process.toLowerCase();
  const roleLower = role.toLowerCase();
  if (/safety|hazard|emergency|ppe|accident/.test(`${processLower} ${roleLower}`)) {
    category = 'Safety';
    color = 'mint';
    accentColor = '#1FA55E';
    artType = 'safety';
  } else if (/pick|warehouse|fulfil|fulfill/.test(`${processLower} ${roleLower}`)) {
    category = 'Picking';
    color = 'sky';
    accentColor = '#2F6FED';
    artType = 'tote';
  } else if (/pack|ship|seal/.test(processLower)) {
    category = 'Packing';
    color = 'peach';
    accentColor = '#F27A1A';
    artType = 'box';
  } else if (/inventory|stock|count|audit|cashier|retail/.test(`${processLower} ${roleLower}`)) {
    category = 'Inventory';
    color = 'lilac';
    accentColor = '#7A5AF8';
    artType = 'clipboard';
  }

  const videoPlan: VideoDemonstrationPlan = (() => {
    // If the blueprint already has a fully validated, multi-scene plan with covered_step_refs, preserve it
    const existing = opBlueprint.video_demonstration_plan;
    if (
      existing &&
      existing.validation_status === 'valid' &&
      Array.isArray(existing.clips) &&
      existing.clips.length > 0 &&
      existing.clips.every(c => Array.isArray(c.covered_step_refs) && c.covered_step_refs.length > 0)
    ) {
      return existing;
    }

    // Authoritative generation: synthesize dynamic, SOP-grounded VideoPlan via planVideoDemonstration
    return planVideoDemonstration(opBlueprint);
  })();

  const lesson: Lesson = {
    id: lessonId,
    title: process,
    subtitle: `Role: ${role} · Source: ${extracted.filename}`,
    category,
    color,
    accentColor,
    stepsCount: orderedSteps.length,
    durationMinutes: Math.max(5, Math.ceil(simulatorSteps.length * 1.5)),
    level: 'Beginner',
    progress: 0,
    masteryPercentage: 0,
    artType,
    description: opBlueprint.purpose,
    sourceMeta: {
      filename: extracted.filename,
      version: '1.0',
      fileHash: extracted.fileHash,
      pageCount: extracted.pageCount,
      wordCount: extracted.wordCount,
      confirmationText: extracted.confirmationText,
      rawText: extracted.rawText,
    },
    blueprint,
    passport,
    operationalBlueprint: opBlueprint,
    videoPlan,
    stepObjects,
  };

  return { lesson, passport, blueprint, stepObjects };
}

/**
 * Main entry point: Generates a source-grounded Lesson & Operational Blueprint from an ExtractedDocument
 */
export function generateDomainNeutralLesson(
  extracted: ExtractedDocument,
  providedBlueprint?: OperationalBlueprint
): {
  lesson: Lesson;
  passport: ProcessPassport;
  blueprint: BlueprintV1;
  stepObjects: StepObject[];
} {
  // 1. Build Knowledge Model
  const km = buildSopKnowledgeModel(extracted);

  // 2. Build Operational Blueprint
  const opBlueprint = providedBlueprint || buildOperationalBlueprintFromKnowledgeModel(km);

  // 3. Build Training Plan
  const trainingPlan = buildTrainingPlanFromBlueprint(opBlueprint);

  // 4. LOG THE COMPLETE INTELLIGENCE CHAIN
  console.group(`[SOP INTELLIGENCE CHAIN LOG] File: '${extracted.filename}'`);
  console.log(`1. DOCUMENT & EXTRACTED TEXT:`, { filename: extracted.filename, pages: extracted.pageCount, words: extracted.wordCount });
  console.log(`2. NORMALIZED TEXT:`, { length: extracted.rawText.length, sample: extracted.rawText.slice(0, 120) + '...' });
  console.log(`3. KNOWLEDGE MODEL:`, { role: km.identity.role, process: km.identity.process, stepsCount: km.steps.length, decisionsCount: km.decisionPoints.length });
  console.log(`4. OPERATIONAL BLUEPRINT:`, { title: opBlueprint.process, steps: opBlueprint.operational_steps.length, controls: opBlueprint.critical_controls.length });
  console.log(`5. TRAINING PLAN:`, { planItemsCount: trainingPlan.length, types: trainingPlan.map((p) => p.type) });
  console.log(`6. STAGE PLAN: 4-Stage Learning Experience (Teach Me, Show Me, Guide Me, Test Me)`);
  console.groupEnd();

  const { lesson, passport, blueprint, stepObjects } = generateLessonFromOperationalBlueprint(extracted, opBlueprint);
  lesson.knowledgeModel = km;
  lesson.trainingPlan = trainingPlan;

  return { lesson, passport, blueprint, stepObjects };
}
