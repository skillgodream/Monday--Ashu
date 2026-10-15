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

const META_LINE = /^(standard operating procedure|sop\b|document ref|doc ref|version|effective date|approved by|page \d+|revision|department|title:)/i;

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

/** Reads the lesson from whichever shape is available (operationalBlueprint first, then blueprint/passport). */
function collect(lessonIn: Lesson): KData {
  const lesson: any = lessonIn;
  const op: any = lesson.operationalBlueprint;
  const bp: any = lesson.blueprint;
  const pp: any = lesson.passport?.fields;
  const km: any = lesson.knowledgeModel;

  const topic = prettyTopic(op?.process || op?.document_identity?.doc_title || lesson.title || 'Training');
  const role = clip(op?.role || km?.identity?.role || bp?.meta?.role || '', 60);
  const purpose = clip(op?.purpose || lesson.description || km?.purpose || '', 220);

  // ---- steps
  let steps: KStep[] = [];
  if (Array.isArray(op?.operational_steps) && op.operational_steps.length) {
    steps = op.operational_steps.map((s: any) => ({
      title: s.task_title || shortTitle(s.instruction || ''),
      text: s.instruction || '',
      why: s.why_it_matters,
      tip: s.coach_tip,
      ref: s.source?.page_or_section,
      critical: !!s.critical_control,
      question: s.scenario_question,
      choices: s.choices,
    }));
  } else if (Array.isArray(bp?.scenarios?.watch)) {
    steps = bp.scenarios.watch.map((s: any) => ({
      title: s.title || shortTitle(s.taskItem || ''),
      text: s.taskItem || s.title || '',
      why: s.why,
      tip: s.coachTip,
      ref: s.page_or_section,
      critical: s.priority === 'High Priority',
      question: s.question,
      choices: s.choices,
    }));
  }
  steps = steps.filter((s) => s.text && s.text.trim().length >= 10 && !META_LINE.test(s.text.trim()));

  // ---- prerequisites & tools
  const prereqs = uniq(
    (op?.prerequisites || [])
      .map((p: any) => clip(p?.text, 110))
      .filter((t: string) => t && !FILLER_PREREQ.test(t))
  );

  const toolsRaw: any[] = op?.tools_and_systems?.length ? op.tools_and_systems : pp?.tools || [];
  const tools = uniq(
    toolsRaw
      .filter((t) => t?.name && !FILLER_TOOL.test(String(t.name)))
      .map((t) => clip(t.purpose ? `${t.name} — ${t.purpose}` : t.name, 110))
  );

  // ---- critical controls
  let controls: KData['controls'] = (op?.critical_controls || [])
    .filter((c: any) => c?.rule)
    .map((c: any) => ({ rule: c.rule, why: FILLER_WHY.test(c.rationale || '') ? undefined : c.rationale }));

  if (!controls.length && pp?.golden_rules?.length) {
    controls = pp.golden_rules.filter((g: any) => g?.text).map((g: any) => ({ rule: g.text }));
  }
  if (!controls.length && op?.safety_rules?.length) {
    controls = op.safety_rules.filter((s: any) => s?.rule).map((s: any) => ({ rule: s.rule }));
  }
  if (!controls.length) {
    controls = steps.filter((s) => s.critical).map((s) => ({ rule: s.text, why: s.why }));
  }

  // ---- mistakes
  let mistakes: KData['mistakes'] = [];
  if (op?.common_mistakes?.length) {
    mistakes = op.common_mistakes
      .filter((m: any) => m?.mistake)
      .map((m: any) => ({ mistake: m.mistake, fix: m.prevention }));
  } else if (Array.isArray(bp?.common_mistakes)) {
    mistakes = bp.common_mistakes
      .map((m: any) => (typeof m === 'string' ? { mistake: m } : { mistake: m?.mistake, fix: m?.prevention }))
      .filter((m: any) => m.mistake);
  }

  return {
    topic,
    role,
    purpose,
    steps,
    prereqs,
    tools,
    controls,
    mistakes,
    exceptions: (op?.exceptions || [])
      .filter((e: any) => e?.trigger && e?.resolution)
      .map((e: any) => ({ trigger: e.trigger, resolution: e.resolution })),
    escalations: (op?.escalations || [])
      .filter((e: any) => e?.situation && e?.contact_or_action)
      .map((e: any) => ({ situation: e.situation, action: e.contact_or_action })),
    decisions: (op?.decision_points || [])
      .filter((d: any) => d?.situation && (d?.action || d?.decision))
      .map((d: any) => ({ situation: d.situation, action: d.action || d.decision })),
    rawText: lesson.sourceMeta?.rawText || '',
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
      title: 'What should you do?',
      content: clip(q, 260),
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

  /* 4. BEFORE YOU START (Dynamic chunking for prereqs & tools without 6-item cap) */
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
        content: 'Make sure you have these in place before you begin.',
        fl: chunk,
      });
    }
  }

  /* 5. PROCESS OVERVIEW + 6. PROCESS STEPS (Dynamic overview chunking without 9-step cap) */
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
          title: totalOverviewPages > 1 ? `${d.steps.length} Steps, Start to Finish (${pageNum}/${totalOverviewPages})` : `${d.steps.length} Steps, Start to Finish`,
          content: 'Here is the flow. Next, we go through each step.',
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

  /* 7. DECISION POINTS (Dynamic chunking without 4-item cap) */
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
        title: 'When You Need to Decide',
        ic: 'check',
        items,
        content: items.join('\n'),
        evidenceSource: 'SOP decision points',
      });
    }
  }

  /* 8. CRITICAL RULES (All controls included without 3-rule cap) */
  d.controls.forEach((c) => {
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
  });

  /* 9. DO / DON'T (Dynamic chunking without 3-mistake cap) */
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
        title: totalMistakePages > 1 ? `Do and Don’t (${pageNum}/${totalMistakePages})` : 'Do and Don’t',
        content: 'Common mistakes and how to avoid them.',
        dos: effectiveDos,
        donts,
        comparison: { do: effectiveDos, dont: donts },
      });
    }
  }

  /* 10. EXCEPTIONS (Dynamic chunking without 4-exception cap) */
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
        title: 'When Things Don’t Go to Plan',
        ic: 'warn',
        items,
        content: items.join('\n'),
        evidenceSource: 'SOP exceptions',
      });
    }
  }

  /* 11. ESCALATION (Dynamic chunking without 4-escalation cap) */
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
        title: 'When to Escalate',
        ic: 'warn',
        items,
        content: items.join('\n'),
        evidenceSource: 'SOP escalation',
      });
    }
  }

  /* 12. CHECK YOURSELF (AI-written scenarios only; never templated ones) */
  let scenarioCount = 0;
  d.steps.forEach((s, i) => {
    if (scenarioCount >= 2) return;
    const pair = scenarioSlides(s, i + 1, d.topic);
    if (pair) {
      slides.push(...pair);
      scenarioCount++;
    }
  });

  /* Last resort: if nothing structured was found, show real lines from the SOP rather than invented content */
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
        title: 'Key Points From the Document',
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
    content: `You’ve completed the Training deck overview for ${d.topic}.`,
    next: 'Next: Show Me',
    nb: 'See the steps in action, then practise them with a coach.',
  });

  /* ================================================================ *
   * FINAL COVERAGE CHECK                                             *
   * ================================================================ */
  const missingItems: string[] = [];

  d.steps.forEach((s) => {
    const found = slides.some((sl) =>
      (sl.title && sl.title.toLowerCase().includes(s.title.toLowerCase())) ||
      (sl.content && sl.content.toLowerCase().includes(s.text.toLowerCase())) ||
      (sl.items && sl.items.some((item) => item.toLowerCase().includes(s.text.toLowerCase()) || item.toLowerCase().includes(s.title.toLowerCase()))) ||
      (sl.fl && sl.fl.some((f) => f.toLowerCase().includes(s.title.toLowerCase())))
    );
    if (!found) missingItems.push(`Step: ${s.title} (${s.text})`);
  });

  d.controls.forEach((c) => {
    const found = slides.some((sl) =>
      (sl.title && sl.title.toLowerCase().includes(c.rule.toLowerCase().slice(0, 20))) ||
      (sl.content && sl.content.toLowerCase().includes(c.rule.toLowerCase().slice(0, 20))) ||
      (sl.gurujiCoaching && sl.gurujiCoaching.explanation.toLowerCase().includes(c.rule.toLowerCase().slice(0, 20)))
    );
    if (!found) missingItems.push(`Control: ${c.rule}`);
  });

  allPrep.forEach((p) => {
    const found = slides.some((sl) => sl.fl && sl.fl.some((f) => f.toLowerCase().includes(p.toLowerCase().slice(0, 20))));
    if (!found) missingItems.push(`Prereq/Tool: ${p}`);
  });

  d.mistakes.forEach((m) => {
    const found = slides.some((sl) =>
      (sl.donts && sl.donts.some((dt) => dt.toLowerCase().includes(m.mistake.toLowerCase().slice(0, 20)))) ||
      (sl.dos && sl.dos.some((ds) => m.fix && ds.toLowerCase().includes(m.fix.toLowerCase().slice(0, 20))))
    );
    if (!found) missingItems.push(`Mistake: ${m.mistake}`);
  });

  d.decisions.forEach((dec) => {
    const found = slides.some((sl) => sl.items && sl.items.some((i) => i.toLowerCase().includes(dec.situation.toLowerCase().slice(0, 20))));
    if (!found) missingItems.push(`Decision: ${dec.situation}`);
  });

  d.exceptions.forEach((exc) => {
    const found = slides.some((sl) => sl.items && sl.items.some((i) => i.toLowerCase().includes(exc.trigger.toLowerCase().slice(0, 20))));
    if (!found) missingItems.push(`Exception: ${exc.trigger}`);
  });

  d.escalations.forEach((esc) => {
    const found = slides.some((sl) => sl.items && sl.items.some((i) => i.toLowerCase().includes(esc.situation.toLowerCase().slice(0, 20))));
    if (!found) missingItems.push(`Escalation: ${esc.situation}`);
  });

  if (missingItems.length > 0) {
    console.warn('[KnowIt Planner Coverage Warning] Unrepresented source items detected in deck:', missingItems);
  }

  // Diagnostic
  console.log('[KnowIt planner]', {
    lessonId: lesson.id,
    topic: d.topic,
    role: d.role,
    steps: d.steps.length,
    prereqs: d.prereqs.length,
    tools: d.tools.length,
    controls: d.controls.length,
    mistakes: d.mistakes.length,
    exceptions: d.exceptions.length,
    escalations: d.escalations.length,
    decisions: d.decisions.length,
    changes: changes.length,
    scenarios: scenarioCount,
    slides: slides.length,
    missingItemsCount: missingItems.length,
  });

  return { lessonId: lesson.id, title: lesson.title, slides };
}
