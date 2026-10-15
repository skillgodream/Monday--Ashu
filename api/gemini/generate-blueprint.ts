import { GoogleGenAI } from '@google/genai';
import { planVideoDemonstration } from '../../src/utils/videoPlanEngine';

function getApiKey(req?: any): string | undefined {
  const headerKey = req ? (
    (typeof req.headers?.['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : '') ||
    (typeof req.headers?.['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '')
  ).trim() : '';

  const rawKey = (
    headerKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  return rawKey.replace(/^["']|["']$/g, '').trim() || undefined;
}

const MODEL_PRO = 'gemini-2.5-pro';
const MODEL_FAST = 'gemini-2.5-flash';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    console.warn('[Serverless /api/gemini/generate-blueprint] No Gemini API key found.');
    return res.json({
      success: false,
      useLocalGenerator: true,
      reason: 'GEMINI_API_KEY is not configured on server or in request headers. Fallback to local domain-neutral generator.',
    });
  }

  const { rawText, fileBase64, mimeType, filename, pageCount, wordCount } = req.body || {};

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = [];
    const docText = rawText ? rawText.slice(0, 48000) : '';

    if (docText && docText.length > 50) {
      // Document text is provided
    } else if (fileBase64 && typeof fileBase64 === 'string') {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBase64,
        },
      });
    }

    const systemInstruction = `You are a World-Class Lead Operational Intelligence Engineer and Instructional Designer for Guruji Work Coach.
LAW 3 — UNIVERSAL 8-STAGE OPERATIONAL LEARNING FRAMEWORK
The 8 stages are the Brain's universal framework for analysing and organising ANY SOP.
They are NOT a mandatory 8-slide structure.
The Brain must examine the SOP through all 8 stages and use only the stages that contain meaningful source-supported content. It may combine, expand or skip stages depending on the SOP.

1. ORIENT: What is the job/task? Why is it being done? What is the expected outcome? What is the worker responsible for?
2. PREPARE: What must the worker check, arrange, confirm or understand before starting? (Tools, information, prerequisites, environment, details).
3. PERFORM: What does the worker actually do? Extract the real operational steps and preserve their correct sequence.
4. CONTROL: What must the worker verify while performing the task? Include safety, quality, accuracy, compliance, customer, equipment or other critical controls.
5. DECIDE: Where does the worker need to make a judgement? Identify the condition, available actions and the correct SOP-supported response.
6. HANDLE: What happens when the normal process does not go as expected? Include exceptions, unusual conditions, missing information, failed checks or process deviations.
7. ESCALATE: When is the issue beyond the worker's authority or capability? Identify when to stop, who/what to escalate to and what must happen before continuing.
8. PROVE: What does the worker need to demonstrate to show that the critical learning has been understood? Use the most important steps, controls, decisions or exceptions from the SOP.

SYNTHESIS RULE:
SOP → analyse through 8 stages → identify meaningful content → remove duplication → preserve critical details → arrange progressively → create the required training pages.
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
   - Extract the TRUE frontline role and process described in the SOP without assuming an unrelated domain or industry.
   - Every scenario question must put the worker in a concrete, high-stakes operational situation directly based on the SOP details.
   - NEVER generate generic questions like "What is your required action?" or "How should you complete this task?".
   - NEVER generate generic choices like "Skip step and proceed" or "Use unverified shortcut". Create REALISTIC frontline errors, tempting shortcuts, and common mistakes that real workers actually make on the floor!
3. THREE NUANCED CHOICES WITH EXPLICIT FAILURE MODES:
   - For EACH operational step, you MUST generate exactly 3 nuanced choices with short, complete, clear titles (5 to 12 words):
     * Choice 1 (isCorrect: true): Concise, complete, compliant SOP action title. Subtitle explaining why this is correct per SOP.
     * Choice 2 (isCorrect: false): Concise, complete, tempting operational shortcut title. Subtitle explicitly details the failure consequence.
     * Choice 3 (isCorrect: false): Concise, complete, unapproved workaround title. Subtitle details the regulatory, safety, or quality violation.
4. EXPERT COACH TIPS, SPECIFIC HINTS & LUCIDE VECTOR ICONS:
   - coach_tip: Practical wisdom directly referencing subtle details, pitfalls, or mnemonic tips from the SOP.
   - hint: Specific reference to the SOP document section, visual cues, or indicators.
   - target_code: Authentic code extracted from or reflecting the SOP.
   - icon_key: Assign a domain-appropriate, clean Lucide vector icon key (e.g., ShieldAlert, ScanBarcode, FileCheck, ClipboardCheck, Users, CheckCircle, AlertTriangle, Scale, Lock).
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

    const textPrompt = `Uploaded SOP Document: "${filename || 'Operational Procedure'}" (${pageCount || 1} pages, ${wordCount || 100} words)
${docText ? `Document Text:\n"""\n${docText}\n"""\n` : ''}

Extract the complete OPERATIONAL BLUEPRINT as JSON with this exact schema:
{
  "document_identity": {
    "doc_title": "${filename ? filename.replace(/\.(txt|pdf|docx)$/i, '') : 'Operational Procedure'}",
    "doc_ref": "Extracted document reference or empty",
    "version": "Extracted version or empty",
    "department": "Extracted department or operations division"
  },
  "role": "Exact worker role described in SOP",
  "process": "Exact core operational process",
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
      "instruction": "Specific, clear workplace action grounded strictly in the SOP",
      "category": "DO" | "CHECK" | "KNOW" | "DECIDE" | "RESPOND" | "RECOVER" | "ESCALATE",
      "action_verb": "Primary action verb (e.g., Receive, Verify, Record, Forward)",
      "task_title": "Concise 2-4 word operational action title",
      "target_code": "Realistic code or form reference from SOP",
      "why_it_matters": "Specific operational reason and consequence on safety, quality, or compliance",
      "critical_control": true/false,
      "scenario_question": "Authentic, vivid frontline workplace simulation question grounded strictly in the SOP",
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
          "subtitle": "Failure mode consequence",
          "isCorrect": false
        },
        {
          "id": "c3",
          "title": "Unapproved workaround or bypassed compliance check",
          "subtitle": "Safety/compliance hazard: violates protocol",
          "isCorrect": false
        }
      ],
      "coach_tip": "Expert coach tip explaining insider nuances, memory cues, or compliance wisdom from the SOP",
      "hint": "Specific clue pointing directly to the relevant section or indicator in the SOP",
      "source": {
        "page_or_section": "Page 1 · Section 1",
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
        "veo_prompt": "Cinematic 720p 16:9 instructional video shot: Frontline professional executing compliant workplace procedure."
      }
    ]
  },
  "confidence": 0.98
}

Generate between 5 to 9 comprehensive operational_steps covering the entire lifecycle of the SOP.`;

    parts.push({ text: textPrompt });

    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          maxOutputTokens: 32768,
          temperature: 0.25,
        },
      });
    } catch (primaryErr: any) {
      console.warn(`[Serverless LLM Blueprint] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      try {
        response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            maxOutputTokens: 32768,
            temperature: 0.25,
          },
        });
      } catch (fallbackErr: any) {
        console.warn(`[Serverless LLM Blueprint] Fallback model ${MODEL_FAST} failed, trying gemini-3.8-flash:`, fallbackErr?.message);
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            maxOutputTokens: 32768,
            temperature: 0.25,
          },
        });
      }
    }

    const outputText = response.text || '';
    if (!outputText.trim()) {
      return res.json({ success: false, useLocalGenerator: true, error: 'Empty response received from LLM' });
    }

    const parsedData = cleanAndRepairJson(outputText);

    // Auto-synthesize video_demonstration_plan if LLM omitted it
    if (!parsedData.video_demonstration_plan || !Array.isArray(parsedData.video_demonstration_plan.clips) || parsedData.video_demonstration_plan.clips.length === 0) {
    // Authoritative VideoPlan synthesis via Guruji VideoPlan engine
    try {
      parsedData.video_demonstration_plan = planVideoDemonstration(parsedData);
    } catch (vpErr) {
      console.warn('[Serverless Veo VideoPlan synthesis warning]:', vpErr);
    }

    console.log(`[Serverless /api/gemini/generate-blueprint SUCCESS] Extracted ${parsedData.operational_steps?.length || 0} high-fidelity steps from '${filename}'`);

    return res.status(200).json({
      success: true,
      blueprint: parsedData,
    });
  } catch (err: any) {
    console.error('[Serverless /api/gemini/generate-blueprint Error]:', err?.message || err);
    return res.json({
      success: false,
      useLocalGenerator: true,
      error: err?.message || 'Server error, falling back to local generator.',
    });
  }
}

function sanitizeJsonString(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (isEscaped) {
        result += ch;
        isEscaped = false;
      } else if (ch === '\\') {
        result += ch;
        isEscaped = true;
      } else if (ch === '"') {
        result += ch;
        inString = false;
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else if (ch.charCodeAt(0) < 32) {
        result += ' ';
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }
  return result;
}

function repairTruncatedJson(str: string): string {
  let text = str.trim();
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    text += '"';
  }

  text = text.replace(/[,:\s]+$/, '');

  while (stack.length > 0) {
    const opening = stack.pop();
    if (opening === '{') {
      text += '}';
    } else if (opening === '[') {
      text += ']';
    }
  }

  return text;
}

function cleanAndRepairJson(rawText: string): any {
  if (!rawText) throw new Error('Empty text response from model');

  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let startIdx = -1;
  let endChar = '';

  if (firstBrace !== -1 && firstBracket !== -1) {
    if (firstBrace < firstBracket) {
      startIdx = firstBrace;
      endChar = '}';
    } else {
      startIdx = firstBracket;
      endChar = ']';
    }
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = ']';
  }

  if (startIdx !== -1) {
    const lastIdx = text.lastIndexOf(endChar);
    if (lastIdx > startIdx) {
      text = text.slice(startIdx, lastIdx + 1);
    } else {
      text = text.slice(startIdx);
    }
  }

  const sanitized = sanitizeJsonString(text);

  try {
    return JSON.parse(sanitized);
  } catch (parseErr) {
    try {
      const repaired = repairTruncatedJson(sanitized);
      return JSON.parse(repaired);
    } catch (repairErr) {
      throw parseErr;
    }
  }
}
