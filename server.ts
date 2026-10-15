import express from 'express';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { planVideoDemonstration } from './src/utils/videoPlanEngine';
import {
  generateImage,
  getImageGenerationConfig,
  setRuntimeImageProvider,
  ImageProvider,
} from './src/services/imageGenerationService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractDocxTextFromBuffer(buffer: Buffer): string {
  try {
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compMethod = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const nameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
        const dataOffset = offset + 30 + nameLen + extraLen;

        if (name === 'word/document.xml' && compSize > 0 && dataOffset + compSize <= buffer.length) {
          const compressedData = buffer.subarray(dataOffset, dataOffset + compSize);
          let xmlStr = '';
          if (compMethod === 8) {
            xmlStr = zlib.inflateRawSync(compressedData).toString('utf8');
          } else if (compMethod === 0) {
            xmlStr = compressedData.toString('utf8');
          }
          const matches = xmlStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (matches && matches.length > 0) {
            return matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ').trim();
          }
          break;
        }
        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn('[extractDocxTextFromBuffer] Error parsing docx zip structure:', err);
  }
  return '';
}

const videosDir = path.resolve(process.cwd(), 'uploads', 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

function getSafeVideoPath(lessonId: string, clipIndex: number = 1): string {
  const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(videosDir, `${safeId}_clip_${clipIndex}.mp4`);
}

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

/**
 * Resolves the Gemini API Key dynamically from environment variables.
 * Checks GEMINI_API_KEY, GOOGLE_API_KEY, GEMINI_KEY, VITE_GEMINI_API_KEY, API_KEY.
 * Trims whitespace and quotes.
 */
function getApiKey(req?: express.Request): string | undefined {
  const headerKey = req ? (
    (typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : '') ||
    (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '')
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

  // Strip accidental surrounding single or double quotes
  const cleanKey = rawKey.replace(/^["']|["']$/g, '').trim();
  return cleanKey || undefined;
}

/**
 * Returns an initialized GoogleGenAI client instance or null if no key is present.
 */
function getGeminiClient(req?: express.Request): GoogleGenAI | null {
  const apiKey = getApiKey(req);
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const MODEL_PRO = process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview';
const MODEL_FAST = process.env.GEMINI_FAST_MODEL || 'gemini-3.8-flash';

// Health check endpoint to diagnose deployment status and API key detection
app.get('/api/health', (_req, res) => {
  const key = getApiKey();
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(key && key.length > 5),
    keyPrefix: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    nodeEnv: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// Temporary endpoint to list available models for the provided API key
app.get('/api/models', async (req, res) => {
  const ai = getGeminiClient(req);
  if (!ai) return res.json({ error: 'no key' });
  const out: string[] = [];
  try {
    for await (const m of await ai.models.list()) {
      if (m.name) out.push(m.name);
    }
    res.json({ success: true, models: out });
  } catch (err: any) {
    res.json({ success: false, error: err?.message || String(err) });
  }
});

// API Route: Extract Text from PDF/Image using Gemini Server Multimodal Engine
app.post('/api/pdf/extract', async (req, res) => {
  try {
    const { fileBase64, mimeType = 'application/pdf', filename = 'uploaded_document.pdf' } = req.body;

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'No fileBase64 data provided.' });
    }

    let textDirect: string | null = null;
    const lowerName = filename.toLowerCase();
    const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || mimeType.includes('word') || mimeType.includes('openxmlformats');

    if (isDocx) {
      try {
        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const extractedDocx = extractDocxTextFromBuffer(fileBuffer);
        if (extractedDocx && extractedDocx.length > 10) {
          textDirect = extractedDocx;
        } else {
          // Fallback to searching decoded text
          const decodedStr = fileBuffer.toString('utf-8');
          const xmlMatches = decodedStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (xmlMatches && xmlMatches.length > 0) {
            textDirect = xmlMatches.map((node) => node.replace(/<[^>]+>/g, '')).join(' ');
          }
        }
      } catch (e) {
        console.warn('[Server DOCX Extract] Buffer decode failed:', e);
      }
    }

    if (textDirect && textDirect.trim().length > 10) {
      const extractedText = textDirect.trim();
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      const pageCount = Math.max(1, Math.ceil(wordCount / 220));
      console.log(`[Server /api/pdf/extract SUCCESS] Direct docx extracted ${wordCount} words from '${filename}'`);
      return res.json({
        success: true,
        extractedText,
        wordCount,
        pageCount,
      });
    }

    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      console.warn('[Server PDF Extract] No Gemini API key detected on server.');
      return res.json({ success: false, useLocal: true, reason: 'GEMINI_API_KEY missing on server' });
    }

    let docPart: any;

    const cleanMime = mimeType.includes('image') ? mimeType : mimeType.includes('text') ? 'text/plain' : 'application/pdf';
    docPart = {
      inlineData: {
        mimeType: cleanMime,
        data: fileBase64,
      },
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
          responseMimeType: 'application/json',
        },
      });
    } catch (primaryErr: any) {
      console.warn(`[Server PDF Extract] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const outputText = response.text || '';
    let cleanJson = outputText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    const extractedText = parsed.extractedText || '';
    const wordCount = parsed.wordCount || extractedText.split(/\s+/).filter(Boolean).length;
    const pageCount = parsed.pageCount || Math.max(1, Math.ceil(wordCount / 220));

    console.log(`[Server /api/pdf/extract SUCCESS] Extracted ${wordCount} words from '${filename}' (${pageCount} pages)`);

    return res.json({
      success: true,
      extractedText,
      wordCount,
      pageCount,
    });
  } catch (err: any) {
    console.error('[Server /api/pdf/extract Error]:', err?.message || err);
    return res.json({ success: false, error: err?.message || 'Server PDF extraction failed' });
  }
});

// API Route: Generate Blueprint & Lesson from SOP Source Document
app.post('/api/gemini/generate-blueprint', async (req, res) => {
  try {
    const { rawText, fileBase64, mimeType, filename, fileHash, pageCount, wordCount } = req.body;

    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      console.warn('[Server /api/gemini/generate-blueprint] No Gemini API key found in environment.');
      return res.json({
        success: false,
        useLocalGenerator: true,
        reason: 'GEMINI_API_KEY is not configured on server. Fallback to local domain-neutral generator.',
      });
    }

    const parts: any[] = [];
    // Process the full document text without arbitrary character truncation
    const docText = rawText || '';

    // If text was already extracted, prioritize sending text directly (much faster and avoids payload limits)
    if (docText && docText.length > 50) {
      // Document text is available in docText
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
2. PREPARE: What must the worker check, arrange, confirm or understand before starting? (Tools, information, prerequisites, environment, customer/patient/order details).
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

CRITICAL ARCHITECTURAL & INSTRUCTIONAL DESIGN RULES:
1. INSTRUCTIONAL GROUPING (COHERENT TEACHING UNITS):
   - Do NOT output raw 1:1 line-item dumps for every bullet point in the SOP text.
   - Group related routine steps into coherent operational teaching units (e.g., Customer & Order Verification, Item Eligibility Inspection, Acceptance/Rejection Decision, Exception & Dispute Handling).
   - A complex SOP should synthesize into distinct, high-impact operational steps rather than a mechanical list of cards.
2. VISUAL PRESENTATION TYPE SELECTION (component):
   - Assign an appropriate interactive presentation mode for EACH operational step:
     * "code_match": For verifying or matching order ID, return ID, serial/IMEI number, barcode, or SKU code.
     * "photo_hotspot": For inspecting physical item condition, tamper seals, liquid damage, or packaging flaws.
     * "scene_pick": For right-vs-wrong visual comparisons (e.g. valid vs invalid return condition).
     * "number_choice": For quantities, unit counts, wait times, or measurements.
     * "choice_list": For general operational decisions, verbal protocols, or exception escalation routing.
3. CONCISE WORKPLACE LANGUAGE (NO RAW TEXT DUMPS):
   - NEVER output long, run-on paragraph sentences concatenating multiple SOP lines.
   - Summarize every choice title into a crisp, COMPLETE, 5-12 word action statement written in natural workplace language.
   - NEVER end a choice title on a dangling conjunction or preposition (e.g., 'and', 'or', 'to', 'with', 'for'). Ensure every title is a full, grammatically complete action phrase.
   - Keep scenario questions under 2 concise sentences focused on a single execution dilemma.
4. DEEP REALISM & UNCOMPROMISING SPECIFICITY:
   - Ground ALL extractions strictly in the operational facts of the provided SOP document.
   - Extract the TRUE frontline role (e.g. Pickup Associate, Delivery Partner, Quick Commerce Picker, Phlebotomist, Retail Cashier).
   - Every scenario question must put the worker in a concrete, high-stakes operational situation directly based on the SOP details.
   - NEVER generate generic questions like "What is your required action?" or "How should you complete this task?".
   - NEVER generate generic choices like "Skip step and proceed" or "Use unverified shortcut". Create REALISTIC frontline errors, tempting shortcuts, and common mistakes that real workers actually make on the floor!
5. THREE NUANCED CHOICES WITH EXPLICIT FAILURE MODES:
   - For EACH operational step, you MUST generate exactly 3 nuanced choices with short, complete, clear titles (5 to 12 words):
     * Choice 1 (isCorrect: true): Concise, complete, compliant SOP action title. Subtitle explaining why this is correct per SOP.
     * Choice 2 (isCorrect: false): Concise, complete, tempting operational shortcut title. Subtitle explicitly details the failure consequence.
     * Choice 3 (isCorrect: false): Concise, complete, unapproved workaround title. Subtitle details the regulatory, safety, or quality violation.
6. EXPERT COACH TIPS, SPECIFIC HINTS & LUCIDE VECTOR ICONS:
   - coach_tip: Guruji's practical wisdom directly referencing subtle details or compliance wisdom from the SOP.
   - hint: Specific clue pointing directly to the relevant section or physical indicator in the SOP.
   - target_code: Authentic code extracted from or reflecting the SOP (e.g., RET-PU-001, SKU-88421, FORM-Q7).
   - icon_key: Assign a domain-appropriate, clean Lucide vector icon key for each operational step.
7. METADATA VS OPERATIONAL CONTENT:
   - METADATA (DO NOT MAKE INTO STEPS): Administrative headers, document approval tables, version histories.
   - OPERATIONAL CONTENT (MUST DRIVE BLUEPRINT): Physical actions, system entries, verbal communications, verifications, decision points, exception handling, escalations.
8. AI VIDEO DIRECTOR RULES FOR VEO 3.2 LITE:
   For every clip in video_demonstration_plan.clips, formulate the "veo_prompt" as a dense 65-85 word single cinematic sentence.
9. MANDATORY OUTPUT FORMAT: Respond strictly with valid, un-truncated JSON conforming to the requested schema.`;

    const textPrompt = `Uploaded SOP Document: "${filename}" (${pageCount || 1} pages, ${wordCount || 100} words)
${docText ? `Document Text:\n"""\n${docText}\n"""\n` : ''}

Extract the complete OPERATIONAL BLUEPRINT as JSON with this exact schema:
{
  "document_identity": {
    "doc_title": "${filename ? filename.replace(/\.(txt|pdf|docx)$/i, '') : 'Operational Procedure'}",
    "doc_ref": "Extracted document reference or empty",
    "version": "Extracted version or empty",
    "department": "Extracted department or operations division"
  },
  "role": "Exact worker role described in SOP (e.g., Pickup Associate, Delivery Partner, Operations Associate)",
  "process": "Exact core operational process (e.g., Return Pickup Workflow, Order Fulfillment)",
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
      "instruction": "Specific, clear workplace action grounded in the SOP",
      "category": "DO" | "CHECK" | "KNOW" | "DECIDE" | "RESPOND" | "RECOVER" | "ESCALATE",
      "component": "code_match" | "photo_hotspot" | "scene_pick" | "number_choice" | "choice_list",
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
        "page_or_section": "Page 1 · Section 2",
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
          responseMimeType: 'application/json',
          maxOutputTokens: 32768,
          temperature: 0.25,
        },
      });
    } catch (primaryErr: any) {
      console.warn(`[Server LLM Blueprint] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          maxOutputTokens: 32768,
          temperature: 0.25,
        },
      });
    }

    const outputText = response.text || '';
    if (!outputText.trim()) {
      return res.json({ success: false, useLocalGenerator: true, error: 'Empty response received from LLM' });
    }

    const parsedData = cleanAndRepairJson(outputText);

    // Authoritative VideoPlan synthesis via Guruji VideoPlan engine
    try {
      parsedData.video_demonstration_plan = planVideoDemonstration(parsedData);
    } catch (vpErr) {
      console.warn('[Server Veo VideoPlan synthesis warning]:', vpErr);
    }

    console.log(`[Server /api/gemini/generate-blueprint SUCCESS] Extracted ${parsedData.operational_steps?.length || 0} high-fidelity steps from '${filename}'`);

    return res.json({
      success: true,
      blueprint: parsedData,
    });
  } catch (err: any) {
    console.error('[Server /api/gemini/generate-blueprint Error]:', err?.message || err);
    return res.json({
      success: false,
      useLocalGenerator: true,
      error: err?.message || 'Server error, falling back to local generator.',
    });
  }
});

// Generic /api/coach endpoint implementing developer guide specification
app.post('/api/coach', async (req, res) => {
  const { prompt, systemInstruction, fileBase64, mimeType = 'application/pdf', maxOutputTokens = 4000, temperature = 0.3 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  const aiClient = getGeminiClient(req);
  if (!aiClient) {
    console.error('[API Error] GEMINI_API_KEY is not defined in deployment environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  try {
    const parts: any[] = [];
    if (fileBase64 && typeof fileBase64 === 'string') {
      const cleanMime = mimeType.includes('image')
        ? mimeType
        : mimeType.includes('text')
        ? 'text/plain'
        : 'application/pdf';
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: fileBase64,
        },
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
          systemInstruction: systemInstruction || 'You are an expert assistant. Respond strictly with valid JSON.',
          responseMimeType: 'application/json',
          maxOutputTokens,
          temperature,
        },
      });
    } catch (primaryErr: any) {
      console.warn(`[Server /api/coach] Primary model ${MODEL_PRO} failed, trying fallback ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || 'You are an expert assistant. Respond strictly with valid JSON.',
          responseMimeType: 'application/json',
          maxOutputTokens,
          temperature,
        },
      });
    }

    const rawText = response.text || '';
    if (!rawText.trim()) {
      return res.status(502).json({ error: 'Empty response received from LLM' });
    }

    try {
      const parsedData = cleanAndRepairJson(rawText);
      return res.status(200).json(parsedData);
    } catch (parseError: any) {
      console.error('[API Error /api/coach] cleanAndRepairJson failed:', parseError);
      return res.status(502).json({
        error: 'JSON_PARSE_ERROR',
        message: 'The model output was malformed or truncated.',
        details: parseError.message,
      });
    }
  } catch (error: any) {
    console.error('[API Error /api/coach] LLM generation failed:', error);
    return res.status(500).json({
      error: 'LLM_PROVIDER_ERROR',
      message: error.message || 'Failed to generate response',
    });
  }
});

// API Route: Generate Recommended Instruct Options for an SOP
app.post('/api/sop/instruct-options', async (req, res) => {
  try {
    const { filename = 'SOP Document', rawText = '', wordCount = 100, pageCount = 1 } = req.body;
    const aiClient = getGeminiClient(req);

    const defaultOptions = [
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

    if (!aiClient) {
      return res.json({ success: true, options: defaultOptions });
    }

    const prompt = `Analyze this SOP document: "${filename}" (${pageCount} pages, ${wordCount} words)
Document Text:
"""
${(rawText || '').slice(0, 16000)}
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
        systemInstruction: 'You are an expert instructional designer. Propose 3 tailored training structures grounded in the provided SOP. Respond strictly with valid JSON.',
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = cleanAndRepairJson(response.text || '{}');
    if (parsed && Array.isArray(parsed.options) && parsed.options.length > 0) {
      return res.json({ success: true, options: parsed.options });
    }

    return res.json({ success: true, options: defaultOptions });
  } catch (err: any) {
    console.warn('[Server /api/sop/instruct-options error]:', err?.message);
    return res.json({
      success: true,
      options: [
        {
          id: 'opt-standard',
          title: 'Standard Operational Flow',
          description: 'Balanced, step-by-step procedural training covering prerequisites, core execution, and verification.',
          focusAreas: ['End-to-End Procedural Flow', 'Task Verification', 'Standard Operations'],
          recommendedSteps: 5,
        },
        {
          id: 'opt-controls-exceptions',
          title: 'Critical Controls & Edge Cases',
          description: 'Emphasizes high-stakes safety rules, decision criteria, exception handling, and escalation protocols.',
          focusAreas: ['Critical Safety Controls', 'Exception Recovery', 'Escalations'],
          recommendedSteps: 6,
        },
        {
          id: 'opt-fast-track',
          title: 'Fast-Track Field Drill',
          description: 'Concise, high-velocity frontline drill focusing strictly on core physical and system actions.',
          focusAreas: ['Core Action Verbs', 'Fast Field Execution', 'Target Barcodes/Codes'],
          recommendedSteps: 4,
        },
      ],
    });
  }
});

// ==========================================================
// PROGRESSIVE SOP INTELLIGENCE CHAT API ROUTES
// ==========================================================

// Stage A/B: Prompt A — Extract SOP & Generate Extraction Report
app.post('/api/sop/extract-report', async (req, res) => {
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
${(rawText || '').slice(0, 32000)}
"""

Return JSON conforming strictly to:
{
  "extractionReport": {
    "documentIdentity": {
      "filename": "${filename}",
      "docTitle": "${(filename || 'Operational Procedure').replace(/\.(pdf|txt|docx)$/i, '')}",
      "uploadedAt": "${new Date().toISOString()}",
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
      return res.json({ success: false, fallback: true, reason: 'No API key on server' });
    }

    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: textPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        temperature: 0.2,
      },
    });

    const parsed = cleanAndRepairJson(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.warn('[Server /api/sop/extract-report error]:', err?.message);
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});

// Stage C: Prompt B — Adaptive Clarification Chat
app.post('/api/sop/clarification-chat', async (req, res) => {
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
      contents: `Session State:\n${JSON.stringify(session).slice(0, 16000)}\nLatest Answer:\n${JSON.stringify(latestAnswer)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = cleanAndRepairJson(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (err: any) {
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});

// Stage D: Prompt C — Learning Blueprint Generation
app.post('/api/sop/generate-blueprint', async (req, res) => {
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
      contents: `SOP: ${filename}\nReport:\n${JSON.stringify(extractionReport).slice(0, 8000)}\nSupplementary:\n${JSON.stringify(supplementaryInstructions)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = cleanAndRepairJson(response.text || '{}');
    return res.json({ success: true, learningBlueprint: parsed.learningBlueprint || parsed });
  } catch (err: any) {
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});

// Stage Transition & Approval Enforcement
app.post('/api/sop/approve-and-generate', async (req, res) => {
  try {
    const { session, approvedBy = 'Operations Reviewer' } = req.body;

    if (!session) {
      return res.status(400).json({ success: false, error: 'Missing session data' });
    }

    // Server-side enforcement: Check stage and unresolved blocking gaps
    if (session.currentStage !== 'BLUEPRINT_REVIEW' && session.currentStage !== 'APPROVED_FOR_GENERATION') {
      return res.status(422).json({
        success: false,
        error: `Stage transition rejected: Cannot generate training deck from stage '${session.currentStage}'. Explicit blueprint review is required.`,
      });
    }

    const blockingIssues = (session.unresolvedIssues || []).filter((i: any) => i.isBlocking && !i.resolved);
    if (blockingIssues.length > 0) {
      return res.status(422).json({
        success: false,
        error: `Generation blocked: ${blockingIssues.length} unresolved critical safety/compliance gap(s) must be resolved before proceeding.`,
      });
    }

    return res.json({
      success: true,
      stage: 'APPROVED_FOR_GENERATION',
      approvedBy,
      approvedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// ==========================================
// Google Veo Video Generation API Endpoints
// ==========================================


// 1. Start on-demand video generation
app.post('/api/generate-video', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { prompt, aspectRatio = '16:9', resolution = '720p' } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'A prompt is required for video generation.' });
    }

    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      return res.status(500).json({ success: false, error: 'Gemini API key is not configured on server or in request headers.' });
    }

    // Clean and bound prompt length to Veo supported limits
    const safePrompt = prompt.trim().slice(0, 2000);

    const VEO_MODELS = ['veo-3.1-fast-generate-preview', 'veo-3.1-lite-generate-preview'];
    let operation: any = null;
    let lastError: any = null;

    // Multi-lane routing with exponential backoff & jitter
    for (let attempt = 0; attempt < 2 && !operation; attempt++) {
      for (const modelName of VEO_MODELS) {
        try {
          console.log(`[Veo] Attempting video generation on model: ${modelName} (attempt ${attempt + 1})`);
          operation = await aiClient.models.generateVideos({
            model: modelName,
            prompt: safePrompt,
            config: {
              numberOfVideos: 1,
              resolution: resolution === '1080p' ? '1080p' : '720p',
              aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
            },
          });
          if (operation?.name) {
            console.log(`[Veo SUCCESS] Video generation initiated on ${modelName}:`, operation.name);
            break;
          }
        } catch (laneErr: any) {
          lastError = laneErr;
          const is429 = laneErr?.status === 429 || laneErr?.message?.includes('429') || laneErr?.message?.includes('RESOURCE_EXHAUSTED');
          console.warn(`[Veo Lane Warning] ${modelName} returned ${is429 ? '429 Rate Limit' : laneErr?.message?.slice(0, 60)}.`);
          // Backoff jitter delay before attempting alternate lane
          const backoffMs = (attempt + 1) * 2000 + Math.floor(Math.random() * 1500);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    if (!operation?.name) {
      throw lastError || new Error('Video generation failed on all available Veo model lanes.');
    }

    return res.status(200).json({ success: true, operationName: operation.name });
  } catch (error: any) {
    console.error('[Veo Generate Error]', error);
    let msg = error?.message || (typeof error === 'string' ? error : 'Failed to start video generation.');
    try {
      if (typeof msg === 'string' && msg.startsWith('{')) {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      }
    } catch (_) {}

    const isQuota =
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429 ||
      error?.code === 429;

    if (isQuota) {
      return res.status(429).json({
        success: false,
        isQuotaExceeded: true,
        error: 'Google Veo rate limit or daily quota reached (RESOURCE_EXHAUSTED). Video generation allows 1 request per minute on preview tiers. Please wait about 60 seconds and try again.',
      });
    }

    return res.status(500).json({ success: false, error: msg });
  }
});

// 2. Poll video generation status
app.post('/api/video-status', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { operationName } = req.body || {};
    if (!operationName) {
      return res.status(400).json({ success: false, error: 'operationName is required.' });
    }

    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      return res.status(500).json({ success: false, error: 'Gemini API key is not configured on server or in request headers.' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });

    let errObj: string | null = null;
    if (updated.error) {
      errObj = typeof updated.error === 'string' ? updated.error : (updated.error as any).message || JSON.stringify(updated.error);
    }

    return res.status(200).json({
      success: true,
      done: Boolean(updated.done),
      error: errObj,
    });
  } catch (error: any) {
    console.error('[Veo Status Error]', error);
    const msg = error?.message || (typeof error === 'string' ? error : 'Failed to check video status.');
    return res.status(500).json({ success: false, error: msg });
  }
});

// 3. Download / stream completed MP4 video and persist to server storage
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName, lessonId, clipIndex = 1 } = req.body;
    if (!operationName) {
      return res.status(400).json({ success: false, error: 'operationName is required.' });
    }

    const aiClient = getGeminiClient(req);
    const apiKey = getApiKey(req);
    if (!aiClient || !apiKey) {
      return res.status(500).json({ success: false, error: 'Gemini API key is not configured.' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });

    const downloadUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadUri) {
      return res.status(404).json({ success: false, error: 'Video URI not found in completed operation.' });
    }

    const videoRes = await fetch(downloadUri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ success: false, error: `Failed to fetch video file: ${videoRes.statusText}` });
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to server storage for cross-device persistence
    if (lessonId && typeof lessonId === 'string') {
      try {
        const destPath = getSafeVideoPath(lessonId, Number(clipIndex) || 1);
        await fs.promises.writeFile(destPath, buffer);
        console.log(`[Server Storage] Saved video clip to server disk: ${destPath}`);
      } catch (saveErr) {
        console.warn('[Server Storage] Failed to write video to server disk:', saveErr);
      }
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.send(buffer);
  } catch (error: any) {
    console.error('[Veo Download Error]', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to download video.' });
  }
});

// 4. Stream saved video from server storage (supports full range-requests / scrubbing)
app.get('/api/videos/stream/:lessonId/:clipIndex', (req, res) => {
  try {
    const { lessonId, clipIndex } = req.params;
    const filePath = getSafeVideoPath(lessonId, Number(clipIndex) || 1);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Video not found on server storage.' });
    }

    // res.sendFile handles byte range requests, Content-Range, Content-Length automatically
    return res.sendFile(filePath, {
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('[Video Stream Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to stream video.' });
  }
});

// 5. Check which clips are saved on the server for a lesson
app.get('/api/videos/check/:lessonId', (req, res) => {
  try {
    const { lessonId } = req.params;
    const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const existingClips: number[] = [];

    // Check up to 10 clips
    for (let i = 1; i <= 10; i++) {
      const p = path.join(videosDir, `${safeId}_clip_${i}.mp4`);
      if (fs.existsSync(p)) {
        existingClips.push(i);
      }
    }

    return res.json({
      success: true,
      clips: existingClips,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to check video storage.' });
  }
});

// 6. Delete saved videos for a lesson (e.g. when regenerating)
app.delete('/api/videos/:lessonId', (req, res) => {
  try {
    const { lessonId } = req.params;
    const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, '_');

    for (let i = 1; i <= 10; i++) {
      const p = path.join(videosDir, `${safeId}_clip_${i}.mp4`);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) {}
      }
    }

    return res.json({ success: true, message: 'Server video storage cleared.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete videos.' });
  }
});

// ==========================================
// IMAGE GENERATION API ROUTES (FLUX.1 Schnell & Imagen 3)
// ==========================================

// Get configuration, active engine, and status
app.get('/api/image-generation/config', (_req, res) => {
  try {
    const config = getImageGenerationConfig();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Toggle provider at runtime ('flux' | 'imagen' | 'auto')
app.post('/api/image-generation/toggle-provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (provider === 'flux' || provider === 'imagen') {
      setRuntimeImageProvider(provider);
    } else if (provider === null || provider === 'auto' || provider === 'default') {
      setRuntimeImageProvider(null);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "flux", "imagen", or "auto".',
      });
    }
    const updatedConfig = getImageGenerationConfig();
    return res.json({ success: true, config: updatedConfig });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Generate image via active provider (FLUX.1 Schnell or Imagen)
app.post(['/api/image-generation/generate', '/api/generate-image'], async (req, res) => {
  try {
    const {
      prompt,
      role,
      stepTitle,
      aspectRatio = '16:9',
      provider,
      falApiKey,
      geminiApiKey,
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A non-empty prompt string is required.',
      });
    }

    const headerGeminiKey = (
      (typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : '') ||
      (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '')
    ).trim();

    const headerFalKey = (
      typeof req.headers['x-fal-key'] === 'string' ? req.headers['x-fal-key'] : ''
    ).trim();

    const result = await generateImage({
      prompt,
      role,
      stepTitle,
      aspectRatio,
      provider: provider as ImageProvider | undefined,
      geminiApiKey: geminiApiKey || headerGeminiKey || undefined,
      falApiKey: falApiKey || headerFalKey || undefined,
    });

    if (!result.success) {
      return res.status(result.error?.includes('not configured') ? 400 : 502).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    console.error('[Image Generation Route Error]', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while generating image.',
    });
  }
});

// Explicitly prevent SPA route swallowing for all /api endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API_ENDPOINT_NOT_FOUND',
    message: `API endpoint ${req.method} ${req.path} not found on server`,
  });
});

// Static files in production / Vite middlewares in development
const distPath = path.resolve(process.cwd(), 'dist');

const indexHtmlExists = fs.existsSync(path.join(distPath, 'index.html'));
const isProduction = process.env.NODE_ENV === 'production' || (indexHtmlExists && process.env.NODE_ENV !== 'development');

if (isProduction) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Express server running on http://0.0.0.0:${PORT}`);
});

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
        // Lookahead check: is this double-quote closing the property/value, or an interior unescaped quote?
        const rest = str.slice(i + 1).trimStart();
        if (rest.startsWith(':') || rest.startsWith(',') || rest.startsWith('}') || rest.startsWith(']')) {
          result += ch;
          inString = false;
        } else {
          // Interior unescaped quote -> escape it
          result += '\\"';
        }
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
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

function repairTruncatedJson(jsonStr: string): string {
  let text = jsonStr.trim();

  // Strip trailing markdown fences if present
  text = text.replace(/```$/g, '').trim();

  // Strip incomplete keys or values at end of truncated JSON string
  text = text.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
  text = text.replace(/,?\s*"[^"]*$/, '');
  text = text.replace(/[,:\s]+$/, '');

  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' || ch === ']') {
        if (stack.length > 0) stack.pop();
      }
    }
  }

  // If ended mid-string, terminate string
  if (inString) {
    text += '"';
  }

  // Remove trailing punctuation again after string closure
  text = text.replace(/[,:\s]+$/, '');

  // Close all unclosed objects and arrays in stack order
  while (stack.length > 0) {
    const opening = stack.pop();
    if (opening === '{') {
      text += '}';
    } else if (opening === '[') {
      text += ']';
    }
  }

  // Strip invalid trailing commas before closing braces/brackets
  text = text.replace(/,\s*([\}\]])/g, '$1');

  return text;
}

function extractJsonBlock(text: string): string {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  
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
  const stack: string[] = [];
  
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' || ch === ']') {
        const top = stack[stack.length - 1];
        if ((ch === '}' && top === '{') || (ch === ']' && top === '[')) {
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

function cleanAndRepairJson(rawText: string): any {
  if (!rawText || !rawText.trim()) throw new Error('Empty text response from model');

  let text = rawText.trim();

  // Strip markdown codeblock enclosures
  text = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  text = extractJsonBlock(text);

  // Attempt 1: Direct JSON parse
  try {
    return JSON.parse(text);
  } catch (e1) {
    // Attempt 2: Sanitize control characters inside strings
    try {
      const sanitized = sanitizeJsonString(text);
      return JSON.parse(sanitized);
    } catch (e2) {
      // Attempt 3: Repair truncated JSON with sanitization
      try {
        const sanitized = sanitizeJsonString(text);
        const repaired = repairTruncatedJson(sanitized);
        return JSON.parse(repaired);
      } catch (e3) {
        // Attempt 4: Repair raw truncated JSON
        try {
          const repairedRaw = repairTruncatedJson(text);
          return JSON.parse(repairedRaw);
        } catch (e4) {
          console.error('[cleanAndRepairJson FAIL] Unrepairable JSON response from LLM:', text.slice(0, 300));
          throw new Error('MALFORMED_LLM_JSON_OUTPUT');
        }
      }
    }
  }
}
