import { Lesson } from '../types';
import { TeachMePlan, Slide } from './types';

/* ------------------------------------------------------------------ *
 * Helpers                                                            *
 * ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  'and', 'or', 'to', 'with', 'for', 'of', 'in', 'on', 'at', 'by', 'a', 'an', 'the',
  'is', 'are', 'if', 'when', 'that', 'which', 'than', 'into', 'from', 'as', 'via',
]);

/** Trim, strip list markers, and shorten at a word boundary without dangling words. */
function clip(input: unknown, max = 140): string {
  let s = String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(\d+[.)]|[-*•])\s+/, '');
  if (s.length <= max) return s;
  s = s.slice(0, max);
  const sp = s.lastIndexOf(' ');
  if (sp > max * 0.6) s = s.slice(0, sp);
  const words = s.split(' ');
  while (words.length > 3 && STOP_WORDS.has(words[words.length - 1].toLowerCase().replace(/[^\w]/g, ''))) {
    words.pop();
  }
  return words.join(' ').replace(/[\s,;:.\-—–]+$/, '') + '…';
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = x.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function prettyTopic(raw: unknown): string {
  return clip(
    String(raw ?? '')
      .replace(/\.(pdf|docx?|txt|md)$/i, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+SOP$/i, '')
      .trim(),
    80
  );
}

function shortTitle(text: string, words = 5): string {
  const w = text.replace(/\s+/g, ' ').trim().split(' ').slice(0, words);
  while (w.length > 2 && STOP_WORDS.has(w[w.length - 1].toLowerCase())) w.pop();
  const t = w.join(' ').replace(/[,;:.\-—–]+$/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const META_LINE = /^(standard operating procedure|sop\b|document ref|doc ref|version|effective date|approved by|page \d+|revision|department|title:|controlled copy|ret-pu-sop|return pickup|field associate|delivery partner|document id)/i;

/** Filler text produced by the local (non-Gemini) generator. Never show it as content. */
const FILLER_WHY = /^(sop requirement:|mandatory rule:|critical requirement for|operational rule:)/i;
const FILLER_TOOL = /(workstation & tools|pos \/ lims|management system)$/i;
const FILLER_PREREQ = /^check workstation, tools, and written sop guide/i;

/** Sentences in the SOP that signal something changed. */
const CHANGE_RE =
  /\b(now must|no longer|replaces|replaced|instead of|going forward|effective (from|date)|updated|revised|changed|changes|new rule|new process|new requirement|new step|from now on)\b/i;

function detectChanges(rawText: string): string[] {
  if (!rawText) return [];
  const lines = rawText
    .split(/\n+|(?<=[.!?])\s+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 20 && l.length <= 240 && !META_LINE.test(l) && CHANGE_RE.test(l));
  return uniq(lines.map((l) => clip(l, 170))).slice(0, 4);
}

/* ------------------------------------------------------------------ *
 * Normalised content model                                           *
 * ------------------------------------------------------------------ */

interface KStep {
  title: string;
  text: string;
  why?: string;
  tip?: string;
  ref?: string;
  critical?: boolean;
  question?: string;
  choices?: Array<{ id?: string; title?: string; text?: string; subtitle?: string; isCorrect?: boolean }>;
}

interface KData {
  topic: string;
  role: string;
  purpose: string;
  steps: KStep[];
  prereqs: string[];
  tools: string[];
  controls: Array<{ rule: string; why?: string }>;
  mistakes: Array<{ mistake: string; fix?: string }>;
  exceptions: Array<{ trigger: string; resolution: string }>;
  escalations: Array<{ situation: string; action: string }>;
  decisions: Array<{ situation: string; action: string }>;
  rawText: string;
}

import { buildCanonicalTaskModel } from '../utils/canonicalTaskModel';

/** Reads the lesson by building the Canonical Task Model (CTM) to ensure 100% source fidelity. */
function collect(lessonIn: Lesson): KData {
  const ctm = buildCanonicalTaskModel(lessonIn.operationalBlueprint, lessonIn, lessonIn.sourceMeta?.rawText);

  const topic = prettyTopic(ctm.process || ctm.documentIdentity.docTitle || lessonIn.title || 'Training');
  const role = clip(ctm.role, 60);
  const purpose = clip(ctm.purpose, 220);

  // ---- steps
  const steps: KStep[] = ctm.steps
    .map((s) => ({
      title: s.title || shortTitle(s.instruction || ''),
      text: s.instruction || '',
      why: s.whyItMatters,
      tip: s.coachTip,
      ref: s.source?.pageOrSection,
      critical: !!s.criticalControl,
      question: s.scenarioQuestion,
      choices: s.choices,
    }))
    .filter((s) => s.text && s.text.trim().length >= 10 && !META_LINE.test(s.text.trim()));

  // ---- prerequisites & tools
  const prereqs = uniq(
    ctm.prerequisites
      .map((p) => clip(p.text, 110))
      .filter((t) => t && !FILLER_PREREQ.test(t))
  );

  const tools = uniq(
    ctm.toolsAndSystems
      .filter((t) => t.name && !FILLER_TOOL.test(String(t.name)))
      .map((t) => clip(t.purpose ? `${t.name} — ${t.purpose}` : t.name, 110))
  );

  // ---- critical controls
  const controls: KData['controls'] = ctm.controls
    .filter((c) => c.rule)
    .map((c) => ({
      rule: c.rule,
      why: c.rationale && !FILLER_WHY.test(c.rationale) ? c.rationale : undefined,
    }));

  // ---- mistakes
  const mistakes: KData['mistakes'] = ctm.prohibitedActions
    .filter((m) => m.mistake)
    .map((m) => ({ mistake: m.mistake, fix: m.prevention }));

  // ---- exceptions, escalations, decisions
  const exceptions = ctm.exceptionsAndEscalations
    .filter((e) => e.type === 'exception' && e.trigger && e.resolutionOrAction)
    .map((e) => ({ trigger: e.trigger, resolution: e.resolutionOrAction }));

  const escalations = ctm.exceptionsAndEscalations
    .filter((e) => e.type === 'escalation' && e.trigger && e.resolutionOrAction)
    .map((e) => ({ situation: e.trigger, action: e.resolutionOrAction }));

  const decisions = ctm.decisions
    .filter((d) => d.situation && d.compliantAction)
    .map((d) => ({ situation: d.situation, action: d.compliantAction }));

  return {
    topic,
    role,
    purpose,
    steps,
    prereqs,
    tools,
    controls,
    mistakes,
    exceptions,
    escalations,
    decisions,
    rawText: ctm.rawText || lessonIn.sourceMeta?.rawText || '',
  };
}

/* ------------------------------------------------------------------ *
 * Slide builders                                                     *
 * ------------------------------------------------------------------ */

function usefulWhy(why: string | undefined, text: string): string | null {
  if (!why) return null;
  const w = why.trim();
  if (!w || FILLER_WHY.test(w) || w.toLowerCase() === text.trim().toLowerCase()) return null;
  return clip(w, 150);
}

function usefulTip(tip: string | undefined): string | null {
  if (!tip) return null;
  const t = tip.trim();
  return t && !FILLER_WHY.test(t) ? clip(t, 150) : null;
}

/** Deterministically moves the correct answer so it isn't always first. */
function arrangeChoices<T extends { isCorrect: boolean }>(choices: T[], seed: number): T[] {
  const correct = choices.filter((c) => c.isCorrect);
  const wrong = choices.filter((c) => !c.isCorrect);
  if (correct.length !== 1) return choices;
  const pos = seed % choices.length;
  const out = [...wrong];
  out.splice(pos, 0, correct[0]);
  return out;
}

function scenarioSlides(step: KStep, seed: number, topic: string): Slide[] | null {
  const q = (step.question || '').trim();
  const raw = (step.choices || []).filter((c) => (c.title || c.text || '').trim());
  if (q.length < 25 || /^how do you execute step/i.test(q)) return null;
  if (raw.length < 2 || raw.filter((c) => c.isCorrect).length !== 1) return null;

  const base = raw.map((c, i) => ({
    id: c.id || `c${i + 1}`,
    text: clip(c.title || c.text, 120),
    isCorrect: !!c.isCorrect,
    feedback: c.subtitle
      ? clip(c.subtitle, 160)
      : c.isCorrect
      ? 'Correct. This is what the SOP requires.'
      : 'Not quite. This breaks the SOP.',
  }));

  const choices = arrangeChoices(base, seed).map((c) => ({ ...c, why: c.feedback }));

  return [
    {
      type: 'REAL_WORLD_SCENARIO',
      title: shortTitle(step.title || topic, 6),
      content: clip(q, 260),
      ic: 'wipe',
      evidenceSource: step.ref || 'SOP',
    },
    {
      type: 'DECISION',
      tag: 'DECISION POINT',
      title: 'What should you Do?',
      content: clip(q, 260),
      img:
        (step as any).img ||
        'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=800&q=80',
      opts: choices.map((c) => ({ t: c.text, why: c.feedback, ok: c.isCorrect ? 1 : 0 })),
      choices,
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Main entry                                                         *
 * ------------------------------------------------------------------ */

export function planKnowItSlides(lesson: Lesson): TeachMePlan {
  const d = collect(lesson);
  const slides: Slide[] = [];

  /* 1. TOPIC */
  slides.push({
    type: 'WELCOME',
    tag: 'Training deck',
    title: d.topic,
    role: d.role ? `Role: ${d.role}` : undefined,
    content: d.purpose || `Training based on ${(lesson as any).sourceMeta?.filename || 'your uploaded SOP'}.`,
    cta: "Let's Begin",
  });

  /* 2. OBJECTIVE */
  let objectives: string[] = uniq(d.steps.map((s) => clip(s.title, 70)));
  if (!objectives.length) objectives = d.controls.map((c) => clip(c.rule, 100));
  if (!objectives.length) objectives = [`Understand ${d.topic}`];
  slides.push({
    type: 'OBJECTIVES',
    title: 'What You Will Learn',
    lead: 'By the end of this training, you will be able to:',
    items: objectives,
    content: objectives.join('\n'),
  });

  /* 3. WHAT HAS CHANGED (only when the SOP itself says so) */
  const changes = detectChanges(d.rawText);
  if (changes.length) {
    slides.push({
      type: 'TEACH_STEP',
      step: 'What has changed',
      title: 'What’s New in This Process',
      ic: 'warn',
      items: changes,
      content: changes.join('\n'),
      evidenceSource: 'From the SOP',
    });
  }


  /* 4. BEFORE YOU START (Dynamic chunking for prereqs & tools) */
  const allPrep = uniq([...d.prereqs, ...d.tools]);
  if (allPrep.length) {
    const prepChunkSize = 6;
    const totalPrepPages = Math.ceil(allPrep.length / prepChunkSize);
    for (let i = 0; i < allPrep.length; i += prepChunkSize) {
      const chunk = allPrep.slice(i, i + prepChunkSize);
      const pageNum = Math.floor(i / prepChunkSize) + 1;
      slides.push({
        type: 'SECTION_INTRO',
        sec: 'Before you start',
        title: totalPrepPages > 1 ? `Get Ready (${pageNum}/${totalPrepPages})` : 'Get Ready',
        content: `Required prerequisites and preparation for ${d.topic}.`,
        fl: chunk,
      });
    }
  }

  /* 5. PROCESS OVERVIEW + 6. PROCESS STEPS */
  if (d.steps.length) {
    if (d.steps.length > 1) {
      const overviewChunkSize = 9;
      const totalOverviewPages = Math.ceil(d.steps.length / overviewChunkSize);
      for (let i = 0; i < d.steps.length; i += overviewChunkSize) {
        const chunk = d.steps.slice(i, i + overviewChunkSize);
        const pageNum = Math.floor(i / overviewChunkSize) + 1;
        slides.push({
          type: 'SECTION_INTRO',
          sec: 'The process',
          title: totalOverviewPages > 1 ? `Process Flow (${pageNum}/${totalOverviewPages})` : 'The Process Flow',
          content: `Key operational stages of ${d.topic}.`,
          fl: chunk.map((s) => clip(s.title, 60)),
        });
      }
    }

    const group = d.steps.length <= 6 ? 1 : 2;
    const total = Math.ceil(d.steps.length / group);
    for (let i = 0; i < d.steps.length; i += group) {
      const chunk = d.steps.slice(i, i + group);
      const n = Math.floor(i / group) + 1;
      let items: string[];
      if (group === 1) {
        const s = chunk[0];
        const why = usefulWhy(s.why, s.text);
        const tip = usefulTip(s.tip);
        items = [clip(s.text, 170)];
        if (why) items.push(`Why it matters: ${why}`);
        if (tip) items.push(`Tip: ${tip}`);
      } else {
        items = chunk.map((s) => clip(s.text, 170));
      }
      slides.push({
        type: 'TEACH_STEP',
        step: `Step ${n} of ${total}`,
        title: clip(chunk.map((s) => s.title).join(' & '), 60),
        ic: 'check',
        items,
        content: items.join('\n'),
        evidenceSource: chunk[0].ref || 'SOP',
      });
    }
  }

  /* 7. DECISION POINTS */
  if (d.decisions.length) {
    const decisionChunkSize = 4;
    const totalDecisionPages = Math.ceil(d.decisions.length / decisionChunkSize);
    for (let i = 0; i < d.decisions.length; i += decisionChunkSize) {
      const chunk = d.decisions.slice(i, i + decisionChunkSize);
      const pageNum = Math.floor(i / decisionChunkSize) + 1;
      const items = chunk.map((x) => `${clip(x.situation, 90)} → ${clip(x.action, 90)}`);
      slides.push({
        type: 'TEACH_STEP',
        step: totalDecisionPages > 1 ? `Decision points (${pageNum}/${totalDecisionPages})` : 'Decision points',
        title: 'Decision Logic',
        ic: 'check',
        items,
        content: items.join('\n'),
        evidenceSource: 'SOP decision points',
      });
    }
  }

  /* 8. CRITICAL RULES */
  if (d.controls.length) {
    const controlChunkSize = d.controls.length <= 8 ? 1 : 3;
    for (let i = 0; i < d.controls.length; i += controlChunkSize) {
      const chunk = d.controls.slice(i, i + controlChunkSize);
      if (chunk.length === 1) {
        const c = chunk[0];
        const rule = clip(c.rule, 150);
        const why = c.why ? clip(c.why, 160) : 'Do not skip or work around this rule.';
        slides.push({
          type: 'IMPORTANT_RULE',
          title: rule,
          why,
          ic: 'warn',
          slash: 1,
          content: rule,
          gurujiCoaching: {
            explanation: rule,
            whyItMatters: why,
            nextMove: 'If you cannot follow this, stop and check with your supervisor.',
          },
        });
      } else {
        const rulesList = chunk.map((c, idx) => `${idx + 1}. ${clip(c.rule, 120)}`);
        const why = 'Mandatory controls to ensure process safety, compliance, and quality.';
        slides.push({
          type: 'IMPORTANT_RULE',
          title: clip(chunk.map((c) => c.rule).join(' & '), 70),
          why,
          ic: 'warn',
          slash: 1,
          content: rulesList.join('\n'),
          items: rulesList,
          gurujiCoaching: {
            explanation: rulesList.join(' | '),
            whyItMatters: why,
            nextMove: 'If you cannot follow these rules, stop and check with your supervisor.',
          },
        });
      }
    }
  }

  /* 9. DO / DON'T */
  if (d.mistakes.length) {
    const mistakeChunkSize = 3;
    const totalMistakePages = Math.ceil(d.mistakes.length / mistakeChunkSize);
    for (let i = 0; i < d.mistakes.length; i += mistakeChunkSize) {
      const chunk = d.mistakes.slice(i, i + mistakeChunkSize);
      const pageNum = Math.floor(i / mistakeChunkSize) + 1;
      const donts = chunk.map((m) => clip(m.mistake, 110));
      const dos = chunk.filter((m) => m.fix).map((m) => clip(m.fix!, 110));
      const effectiveDos = dos.length ? dos : ['Follow SOP instructions carefully.'];
      slides.push({
        type: 'DO_DONT',
        title: totalMistakePages > 1 ? `Common Mistakes (${pageNum}/${totalMistakePages})` : 'Common Mistakes',
        content: 'Avoid these common mistakes to maintain process quality.',
        dos: effectiveDos,
        donts,
        comparison: { do: effectiveDos, dont: donts },
      });
    }
  }

  /* 10. EXCEPTIONS */
  if (d.exceptions.length) {
    const exceptionChunkSize = 4;
    const totalExceptionPages = Math.ceil(d.exceptions.length / exceptionChunkSize);
    for (let i = 0; i < d.exceptions.length; i += exceptionChunkSize) {
      const chunk = d.exceptions.slice(i, i + exceptionChunkSize);
      const pageNum = Math.floor(i / exceptionChunkSize) + 1;
      const items = chunk.map((e) => `${clip(e.trigger, 90)} → ${clip(e.resolution, 100)}`);
      slides.push({
        type: 'TEACH_STEP',
        step: totalExceptionPages > 1 ? `Exceptions (${pageNum}/${totalExceptionPages})` : 'Exceptions',
        title: 'Exceptions and Resolutions',
        ic: 'warn',
        items,
        content: items.join('\n'),
        evidenceSource: 'SOP exceptions',
      });
    }
  }

  /* 11. ESCALATION */
  if (d.escalations.length) {
    const escalationChunkSize = 4;
    const totalEscalationPages = Math.ceil(d.escalations.length / escalationChunkSize);
    for (let i = 0; i < d.escalations.length; i += escalationChunkSize) {
      const chunk = d.escalations.slice(i, i + escalationChunkSize);
      const pageNum = Math.floor(i / escalationChunkSize) + 1;
      const items = chunk.map((e) => `${clip(e.situation, 90)} → ${clip(e.action, 100)}`);
      slides.push({
        type: 'TEACH_STEP',
        step: totalEscalationPages > 1 ? `Escalation (${pageNum}/${totalEscalationPages})` : 'Escalation',
        title: 'Escalation Procedures',
        ic: 'warn',
        items,
        content: items.join('\n'),
        evidenceSource: 'SOP escalation',
      });
    }
  }

  /* 12. CHECK YOURSELF */
  let scenarioCount = 0;
  d.steps.forEach((s, i) => {
    if (scenarioCount >= 2) return;
    const pair = scenarioSlides(s, i + 1, d.topic);
    if (pair) {
      slides.push(...pair);
      scenarioCount++;
    }
  });

  /* Last resort: if nothing structured was found, show real lines from the SOP */
  const hasBody = slides.length > 2;
  if (!hasBody && d.rawText) {
    const lines = uniq(
      d.rawText
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l.length >= 25 && !META_LINE.test(l))
        .map((l) => clip(l, 150))
    );
    if (lines.length) {
      slides.push({
        type: 'TEACH_STEP',
        step: 'From the SOP',
        title: 'Key Information',
        ic: 'check',
        items: lines,
        content: lines.join('\n'),
        evidenceSource: (lesson as any).sourceMeta?.filename || 'SOP',
      });
    }
  }

  /* 13. KEY TAKEAWAYS */
  const takeaways = uniq([
    ...d.controls.map((c) => clip(c.rule, 110)),
    ...d.escalations.map((e) => `Escalate: ${clip(e.situation, 90)}`),
    ...d.steps.map((s) => clip(s.text, 110)),
  ]);
  if (takeaways.length) {
    slides.push({
      type: 'KEY_TAKEAWAYS',
      title: 'Key Takeaways',
      items: takeaways,
      content: takeaways.join('\n'),
    });
  }

  /* 14. COMPLETION */
  slides.push({
    type: 'COMPLETION',
    title: 'Great Job!',
    content: `You have successfully completed the overview for ${d.topic}.`,
    next: 'Next: Show Me',
    nb: 'See the steps in action, then practise them with a coach.',
  });

  /**
   * Intelligently enforces deck limit while preserving typed slide boundaries and pedagogical order.
   * Never merges heterogeneous slide types or concatenates titles with '& & &'.
   */
  function enforceDeckSlideLimit(slidesList: Slide[], maxDeckSlides = 18): Slide[] {
    if (slidesList.length <= maxDeckSlides) return slidesList;

    // Milestone slides
    const welcome = slidesList.find((s) => s.type === 'WELCOME');
    const objectives = slidesList.find((s) => s.type === 'OBJECTIVES');
    const completion = slidesList.find((s) => s.type === 'COMPLETION');
    const takeaways = slidesList.find((s) => s.type === 'KEY_TAKEAWAYS');

    // Categorize middle slides by type to avoid cross-type contamination
    const prepIntros = slidesList.filter((s) => s.type === 'SECTION_INTRO' && s.sec === 'Before you start');
    const processIntros = slidesList.filter((s) => s.type === 'SECTION_INTRO' && s.sec === 'The process');
    const otherIntros = slidesList.filter((s) => s.type === 'SECTION_INTRO' && s.sec !== 'Before you start' && s.sec !== 'The process');
    const teachSteps = slidesList.filter((s) => s.type === 'TEACH_STEP');
    const rules = slidesList.filter((s) => s.type === 'IMPORTANT_RULE');
    const doDonts = slidesList.filter((s) => s.type === 'DO_DONT');
    const scenarios = slidesList.filter((s) => s.type === 'REAL_WORLD_SCENARIO');
    const decisions = slidesList.filter((s) => s.type === 'DECISION');

    // Consolidate process overview intros if excessive (max 2 slides, max 8 items each)
    let finalProcessIntros = processIntros;
    if (processIntros.length > 2) {
      const allFlow = uniq(processIntros.flatMap((s) => s.fl || []));
      const maxPerSlide = 8;
      const targetTotal = maxPerSlide * 2;
      let sampledFlow = allFlow;
      if (allFlow.length > targetTotal) {
        const stepInterval = (allFlow.length - 1) / (targetTotal - 1);
        sampledFlow = Array.from({ length: targetTotal }, (_, i) => allFlow[Math.round(i * stepInterval)]);
      }
      const mid = Math.ceil(sampledFlow.length / 2);
      finalProcessIntros = [
        {
          type: 'SECTION_INTRO',
          sec: 'The process',
          title: 'Process Flow (Part 1)',
          content: `Key operational stages of ${d.topic}.`,
          fl: sampledFlow.slice(0, mid),
        },
        {
          type: 'SECTION_INTRO',
          sec: 'The process',
          title: 'Process Flow (Part 2)',
          content: `Key operational stages of ${d.topic}.`,
          fl: sampledFlow.slice(mid),
        },
      ];
    }

    // Consolidate prep intros if excessive (max 2 slides, max 6 items each)
    let finalPrepIntros = prepIntros;
    if (prepIntros.length > 2) {
      const allPrepItems = uniq(prepIntros.flatMap((s) => s.fl || []));
      const maxPerSlide = 6;
      const targetTotal = maxPerSlide * 2;
      const sampledPrep = allPrepItems.slice(0, targetTotal);
      const mid = Math.ceil(sampledPrep.length / 2);
      finalPrepIntros = [
        {
          type: 'SECTION_INTRO',
          sec: 'Before you start',
          title: 'Get Ready (Part 1)',
          content: `Prerequisites and tools for ${d.topic}.`,
          fl: sampledPrep.slice(0, mid),
        },
        {
          type: 'SECTION_INTRO',
          sec: 'Before you start',
          title: 'Get Ready (Part 2)',
          content: `Prerequisites and tools for ${d.topic}.`,
          fl: sampledPrep.slice(mid),
        },
      ];
    }


    // Consolidate rules if excessive (> 3)
    let finalRules = rules;
    if (rules.length > 3) {
      const chunkCount = 2;
      const chunkSize = Math.ceil(rules.length / chunkCount);
      finalRules = [];
      for (let i = 0; i < rules.length; i += chunkSize) {
        const chunk = rules.slice(i, i + chunkSize);
        const combinedRules = chunk.map((r, idx) => `${idx + 1}. ${clip(r.title, 120)}`);
        finalRules.push({
          type: 'IMPORTANT_RULE',
          title: clip(chunk.map((r) => r.title).join(' & '), 65),
          why: 'Mandatory operational controls to maintain quality and safety standards.',
          ic: 'warn',
          slash: 1,
          content: combinedRules.join('\n'),
          items: combinedRules,
        });
      }
    }

    // Calculate budget for teachSteps
    const fixedCount =
      (welcome ? 1 : 0) +
      (objectives ? 1 : 0) +
      (completion ? 1 : 0) +
      (takeaways ? 1 : 0) +
      finalPrepIntros.length +
      finalProcessIntros.length +
      otherIntros.length +
      finalRules.length +
      doDonts.length +
      scenarios.length +
      decisions.length;

    const availableForTeachSteps = Math.max(3, maxDeckSlides - fixedCount);
    let finalTeachSteps: Slide[] = teachSteps;

    if (teachSteps.length > availableForTeachSteps) {
      const stepChunkSize = Math.ceil(teachSteps.length / availableForTeachSteps);
      finalTeachSteps = [];
      const totalGroups = Math.ceil(teachSteps.length / stepChunkSize);

      for (let i = 0; i < teachSteps.length; i += stepChunkSize) {
        const chunk = teachSteps.slice(i, i + stepChunkSize);
        const groupNum = Math.floor(i / stepChunkSize) + 1;
        const allItems = uniq(chunk.flatMap((s) => s.items || (s.content ? [s.content] : [])));
        const firstTitle = chunk[0].title;
        const lastTitle = chunk[chunk.length - 1].title;
        const groupTitle = chunk.length > 1 && firstTitle !== lastTitle
          ? clip(`${firstTitle} to ${lastTitle}`, 65)
          : firstTitle;

        finalTeachSteps.push({
          type: 'TEACH_STEP',
          step: `Steps (${groupNum}/${totalGroups})`,
          title: groupTitle,
          ic: 'check',
          items: allItems,
          content: allItems.join('\n'),
          evidenceSource: chunk[0].evidenceSource || 'SOP',
        });
      }
    }

    // Assemble cleanly in logical pedagogical sequence
    const result: Slide[] = [];
    if (welcome) result.push(welcome);
    if (objectives) result.push(objectives);
    result.push(...finalPrepIntros);
    result.push(...finalProcessIntros);
    result.push(...otherIntros);
    result.push(...finalTeachSteps);
    result.push(...finalRules);
    result.push(...doDonts);
    result.push(...scenarios);
    result.push(...decisions);
    if (takeaways) result.push(takeaways);
    if (completion) result.push(completion);

    return result;
  }

  const finalSlides = enforceDeckSlideLimit(slides, 18);

  // Diagnostic
  console.log('[KnowIt planner]', {
    lessonId: lesson.id,
    topic: d.topic,
    slides: finalSlides.length,
  });

  return { lessonId: lesson.id, title: lesson.title, slides: finalSlides };
}

