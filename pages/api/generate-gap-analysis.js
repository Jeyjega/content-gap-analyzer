import { createClient } from "@supabase/supabase-js";
import { openai } from "../../lib/openaiServer";

/* =====================================================
   SAFE HELPERS (CRITICAL — DO NOT REMOVE)
===================================================== */

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeString(v) {
  return typeof v === "string" ? v : "";
}

function detectInterviewFormat(text) {
  if (!text || text.length < 200) return false;

  const speakerLabels =
    (text.match(/^[A-Z][a-z]+(\s[A-Z][a-z]+)?:/gm) || []).length;

  const questions = (text.match(/\?/g) || []).length;

  return speakerLabels > 5 || questions / (text.length / 1000) > 2.5;
}

/* =====================================================
   API HANDLER
===================================================== */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    /* ===============================
       AUTH
    =============================== */

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    /* ===============================
       INPUT
    =============================== */

    const analysisId =
      req.body.analysisId || req.body.analysis_id || req.body.id;

    if (!analysisId) {
      return res.status(400).json({ error: "Missing analysisId" });
    }

    /* ===============================
       LOAD ANALYSIS
    =============================== */

    const { data: analysis, error: loadErr } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (loadErr || !analysis) {
      return res.status(500).json({ error: "Failed to load analysis" });
    }

    const transcript = safeString(analysis.transcript);

    if (transcript.length < 200) {
      return res.status(400).json({ error: "Transcript too short" });
    }

    /* =====================================================
       STEP 1 — GAP ANALYSIS (JSON)
    ====================================================== */

    const analysisPrompt = `
You are a senior content strategist.

Analyze the content and return ONLY valid JSON:

{
  "summary": "1–2 paragraph summary",
  "gaps": [
    { "title": "...", "suggestion": "...", "priority": "Critical | Medium | Minor" }
  ],
  "titles": ["...", "...", "..."],
  "keywords": ["...", "..."]
}

Rules:
- Gap count must scale with content length
- Do NOT invent gaps
- Output JSON only
`;

    const step1 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: analysisPrompt },
        { role: "user", content: transcript.slice(0, 4000) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000,
    });

    let parsedRaw;
    try {
      parsedRaw = JSON.parse(step1.choices[0].message.content);
    } catch {
      parsedRaw = {};
    }

    /* 🔒 HARD NORMALIZATION — THIS FIXES DASHBOARD CRASH */

    const parsedAnalysis = {
      summary: safeString(parsedRaw.summary),
      gaps: ensureArray(parsedRaw.gaps),
      titles: ensureArray(parsedRaw.titles),
      keywords: ensureArray(parsedRaw.keywords),
    };

    /* =====================================================
       STEP 2 — SCRIPT GENERATION
    ====================================================== */

    const isInterview = detectInterviewFormat(transcript);
    const outputFormat =
      req.body.outputFormat || (isInterview ? "preserve" : "monologue");

    let systemPrompt;

    if (outputFormat === "preserve") {
      systemPrompt = `
You are an editorial reconstruction engine.

Rules:
- Preserve interview structure
- Do NOT start mid-thought
- Do NOT smooth language
- Maintain original order
- Include proper opening and ending
- No headings, no explanations
`;
    } else {
      systemPrompt = `
You are a senior content strategist.

Create a COMPLETE derivative monologue:
- Clear introduction
- Full body
- Natural conclusion
- Preserve author voice
`;
    }

    const userPrompt = `
BEGINNING ANCHOR (DO NOT SKIP):
${transcript.slice(0, 1200)}

--------------------------------

FULL TRANSCRIPT:
${transcript}
`;

    const step2 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 6000,
    });

    const finalScript = safeString(
      step2.choices?.[0]?.message?.content
    ).trim();

    /* =====================================================
       FINAL PAYLOAD (SAFE)
    ====================================================== */

    const finalPayload = {
      ...parsedAnalysis,
      suggested_script: finalScript,
    };

    // FIXED: Storing as object (if JSONB column) or letting Supabase handle conversion
    await supabase
      .from("analyses")
      .update({ generated_script: finalPayload })
      .eq("id", analysisId);

    return res.status(200).json({
      analysisId,
      parsed: finalPayload,
    });
  } catch (err) {
    console.error("generate-gap-analysis error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}