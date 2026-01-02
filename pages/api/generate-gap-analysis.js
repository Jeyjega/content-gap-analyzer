// pages/api/generate-gap-analysis.js
import { createClient } from "@supabase/supabase-js";
import { openai } from "../../lib/openaiServer";

/**
 * small util: cosine similarity
 */
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}
function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) return -1;
  return dot(a, b) / (norm(a) * norm(b));
}

/**
 * parse embedding field (support strings saved like "[0.1,0.2]" or arrays)
 */
function parseEmbeddingField(val) {
  if (val == null) return null;
  if (Array.isArray(val)) return val;
  try {
    // sometimes stored as string with quotes in DB
    if (typeof val === "string") {
      // trim and attempt JSON.parse
      const trimmed = val.trim();
      if (trimmed.startsWith("[")) {
        return JSON.parse(trimmed);
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Heuristic to detect if a transcript is likely an interview/podcast with multiple speakers.
 */
function detectInterviewFormat(text) {
  if (!text || text.length < 100) return false;

  // 1. Check for Speaker Labels (e.g., "Host:", "Guest:", "John:", "Speaker 1:")
  // Look for patterns like "Name:" at start of lines or sentences
  const speakerLabelRegex = /^[A-Z][a-z]+(\s[A-Z][a-z]+)?:\s/gm;
  const speakerMatches = (text.match(speakerLabelRegex) || []).length;

  // 2. Check for frequent question marks indicative of Q&A
  const questionMarkCount = (text.match(/\?/g) || []).length;
  const questionDensity = questionMarkCount / (text.length / 1000); // Questions per 1000 chars

  // Thresholds
  const hasManyLabels = speakerMatches > 5;
  const isHighQuestionDensity = questionDensity > 2.5; // e.g. >2-3 questions per 1k chars usually implies dialogue

  return hasManyLabels || isHighQuestionDensity;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    const { analysisId, analysis_id, id } = req.body || {};
    const aId = analysisId || analysis_id || id;
    if (!aId) return res.status(400).json({ error: "Missing analysisId" });

    // 1) Fetch analysis row (RLS enforces ownership)
    const { data: analysisRows, error: aErr } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", aId)
      .limit(1)
      .single();

    if (aErr || !analysisRows) {
      console.error("generate-gap-analysis: fetch analysis error", aErr);
      return res.status(500).json({ error: "Failed to load analysis (or permission denied)", details: aErr });
    }

    const transcript = analysisRows.transcript || "";
    if (!transcript || transcript.trim().length < 20) {
      return res.status(400).json({ error: "Transcript missing or too short" });
    }

    // 2) Fetch chunks for analysis (RLS should enforce access to chunks via analysis_id ownership or standard policies)
    const { data: chunkRows, error: cErr } = await supabase
      .from("chunks")
      .select("*")
      .eq("analysis_id", aId)
      .order("chunk_index", { ascending: true })
      .limit(1000);

    if (cErr) {
      console.error("generate-gap-analysis: fetch chunks error", cErr);
      return res.status(500).json({ error: "Failed to load chunks", details: cErr });
    }

    // 3) Choose top-k most relevant chunks:
    let selectedChunks = [];
    if (Array.isArray(chunkRows) && chunkRows.length > 0) {
      // Try to parse chunk embeddings (first available)
      const parsedEmbeddings = chunkRows.map((r) => {
        const e = parseEmbeddingField(r.embedding ?? r.embedding_vector ?? r.vector);
        return { row: r, embedding: e };
      });

      // find if many chunks have embeddings with same length
      const anyEmbedding = parsedEmbeddings.find((p) => Array.isArray(p.embedding));
      if (anyEmbedding) {
        // compute embedding for the transcript (one vector)
        let transcriptEmbedding;
        try {
          const embResp = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: transcript,
          });
          transcriptEmbedding = embResp?.data?.[0]?.embedding;
        } catch (err) {
          console.error("generate-gap-analysis: openai embed error", err);
          transcriptEmbedding = null;
        }

        if (transcriptEmbedding) {
          // compute cos sim for each chunk (if parse succeeded)
          const sims = parsedEmbeddings
            .map((p) => {
              const emb = p.embedding;
              return {
                row: p.row,
                sim: emb ? cosine(emb, transcriptEmbedding) : -1,
                text: p.row.chunk_text ?? p.row.text ?? "",
              };
            })
            .sort((a, b) => b.sim - a.sim);

          // pick top 6 by similarity but also ensure we keep unique/long enough
          selectedChunks = sims.slice(0, 6).map((s) => ({ index: s.row.chunk_index, text: s.text }));
        }
      }

      // fallback if no embeddings or embedding step failed:
      if (!selectedChunks || selectedChunks.length === 0) {
        // choose the largest chunks by length
        const byLen = chunkRows
          .map((r) => ({ index: r.chunk_index, text: r.chunk_text ?? r.text ?? "", len: (r.chunk_text ?? r.text ?? "").length }))
          .sort((a, b) => b.len - a.len);
        selectedChunks = byLen.slice(0, 6).map((c) => ({ index: c.index, text: c.text }));
      }
    }

    const type = analysisRows.type || analysisRows.metadata?.type || "youtube";
    const chunksContext = selectedChunks.map((c, i) => `Chunk ${i + 1} (index=${c.index}):\n${c.text}`).join("\n\n---\n\n");
    const userContent = `
Content Type: ${type}
Transcript/Text (truncated to first 3000 chars):\n${transcript.slice(0, 3000)}

Representative chunks:\n${chunksContext}
`;

    // ============================================
    // STEP 1: ANALYSIS, GAPS, & METADATA (JSON)
    // ============================================

    const systemPromptAnalysis = `
You are a senior content strategist, editorial reviewer, and instructional designer.
You analyze long-form scripts (YouTube, educational videos, blogs) using TEXT ONLY.

Your task is to analyze the content and output a purely structured JSON response containing:
1. A concise Summary.
2. A list of Identified Content Gaps (count must scale with content depth).
3. 3 Suggested Titles.
4. 10 High-Intent Keywords.

GAP IDENTIFICATION RULES:
- The number of gaps MUST be proportional to the content length and complexity.
- Short scripts: 5–8 gaps
- Medium scripts: 8–15 gaps
- Long or complex scripts: 15–25 gaps
- Do NOT force gaps that are already well covered.

You SHOULD prioritize gaps across these dimensions when applicable:
- Target audience clarity
- Quantified pain or stakes
- Specific personas or examples
- Frameworks or structured systems
- Mechanisms or comparisons
- Behavioral triggers or habits
- Metrics or proof
- Calls to action

OUTPUT FORMAT (JSON ONLY):
{
  "summary": "1–2 short paragraphs summarizing the content value.",
  "gaps": [
    { "title": "Short gap title", "suggestion": "Concrete, actionable fix.", "priority": "Critical | Medium | Minor" }
  ],
  "titles": ["Title 1", "Title 2", "Title 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "..."]
}

STRICT RULES:
- Output valid JSON only
- Each gap must be real and justified
- Do NOT repeat similar gaps
`;

    let step1Completion;
    try {
      step1Completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPromptAnalysis },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.2,
      });
    } catch (err) {
      console.error("Step 1 (Analysis) failed", err);
      throw new Error("Analysis generation failed");
    }

    const analysisJsonRaw = step1Completion.choices[0].message.content;
    let parsedAnalysis = {};
    try {
      parsedAnalysis = JSON.parse(analysisJsonRaw);
    } catch (e) {
      console.error("JSON Parse Error Step 1", e);
      parsedAnalysis = { summary: "Error parsing analysis", gaps: [], titles: [], keywords: [] };
    }

    // ============================================
    // STEP 2: SCRIPT REWRITE (TEXT)
    // ============================================

    // 1. Auto-Detect Format
    const originalTranscriptLength = transcript.length;
    const isInterview = detectInterviewFormat(transcript);

    // 2. Determine Output Format
    // Default: 'monologue' for solo, 'preserve' for interviews (unless overridden)
    // In valid request body, user could pass { outputFormat: 'monologue' | 'preserve' }
    // For now, we stick to the smart default logic requested.
    let outputFormat = req.body.outputFormat;

    if (!outputFormat) {
      outputFormat = isInterview ? "preserve" : "monologue";
    }

    // 3. Determine Output Mode & Construct Prompts
    let outputMode = "derive"; // default
    if (outputFormat === "preserve") {
      outputMode = "preserve";
    } else if (isInterview) {
      // Logic: If it IS an interview, default to preserve unless explicitly 'monologue' was requested (which maps to derive)
      // But per requirements: "If isInterview === true → outputMode = 'preserve'"
      outputMode = "preserve";
    }

    // Allow override if user explicitly requested 'monologue' (derive mode)
    if (req.body.outputFormat === "monologue") {
      outputMode = "derive";
    }

    let systemPromptToUse = "";

    if (outputMode === "preserve") {
      // STEP 4: PRESERVE MODE (Authenticity & Length) — DEPTH PRESERVATION UPGRADE
      systemPromptToUse = `
INPUT DATA:
- Original Transcript Length: ${originalTranscriptLength} characters
- Original Transcript (provided below as context)

You are an editorial reconstruction engine.
Your goal is to RECONSTRUCT the interview with MAXIMAL DEPTH and fidelity.

CONFIG:
- Mode: PRESERVE (Interview Style)
- Goal: Deepen and Clarify (Do NOT Summarize)

� CRITICAL FAILURE TO AVOID:
Do NOT compress multi-part answers into single "clean" responses.
If a speaker explains A, then gives an example B, then reflects on C...
You MUST output them as distinct conversational beats or sequential paragraphs.
COLLAPSING IDEAS = FAILURE.

🔒 MANDATORY RULES:

1. **ANSWER DECOMPRESSION (THE GOLDEN RULE)**
   - If the original answer contained multiple ideas, milestones, or examples, they MUST remain distinct.
   - You may split a long monologue into a back-and-forth if it aids clarity (i.e., have the interviewer ask a short clarifying question to bridge topics).
   - NEVER smooth over the "messiness" of real thought if it contains valuable nuance.

2. **DEPTH PRESERVATION**
   - The output length must be ≥ Original Length.
   - If the original was vague, use the "Identified Content Gaps" (if any) to expanding the reasoning, BUT keep it in the speaker's voice.
   - Do NOT turn specific stories into general advice.

3. **STRUCTURAL INTEGRITY**
   - Locate the true beginning (ignoring ads/intros).
   - Maintain the chronological flow of the conversation.
   - Preserve the "Thinking Process" (how they got to the answer), not just the conclusion.

4. **NARRATIVE OUTPUT FORMAT**
   - Pure dialogue/transcript format.
   - No "Key Takeaways" sections.
   - No "Summary" headers.
   - Just the raw, high-fidelity conversation.

✅ FINAL CHECK:
- Did I compress any answers? (If yes, EXPAND them).
- Is the tone documentary and authentic?
- Is the detail level equal to or greater than the source?

Produce the reconstructed interview now.
`;
    } else {
      // STEP 5: DERIVE MODE (Secondary/Monologue) — PREMIUM CONTENT MODE
      systemPromptToUse = `
You are a senior content strategist and subject-matter expert.
Your task is to create a PREMIUM, LONG-FORM DERIVATIVE ASSET based on the provided content.

INPUT DATA:
- Original Transcript Length: ${originalTranscriptLength} characters
- Original Transcript (provided below)
- Identified Content Gaps:
${JSON.stringify(parsedAnalysis.gaps || [], null, 2)}

CONFIG:
- Mode: PREMIUM DERIVE (Paid-Tier Quality)
- Format: Masterclass / Thought Leadership Article
- Length Goal: 60–80% of original transcript length (Minimum)

⭐ PRIMARY OBJECTIVE:
Generate a piece of content so valuable that it justifies payment.
It must be significantly MORE detailed, structured, and useful than the original transcript.
It is NOT a summary. It is a value-expansion.

🔒 MANDATORY 3-PHASE STRUCTURE:

PHASE 1 — AUTHORITATIVE OPENING (2–3 Strong Paragraphs):
- Write a NEW, ORIGINAL opening.
- Establish the speaker’s authority or perspective.
- Clearly define the problem space and WHY this matters now.
- Frame the value proposition (what the reader gains).
- RULES: No "So/And/But" starts. No "Earlier/The time" temporal markers. No floating pronouns.

PHASE 2 — GAP-DRIVEN EXPANSION (THE CORE):
- This section must provide the bulk of the length.
- Address EVERY identified content gap.
- EXPAND each gap with:
  • Context & Explanation
  • Concrete Examples
  • Frameworks or Mental Models
  • Consequences of ignoring it
- Do NOT label gaps. Resolve them naturally in the narrative.
- If a gap is important, spend MULTIPLE paragraphs on it.
- Never collapse multiple gaps into one brief mention.

PHASE 3 — SYNTHESIS & TAKEAWAY:
- Synthesize all ideas into a cohesive conclusion.
- Provide a forward-looking insight or reflection.
- Ensure a strong sense of closure (no abrupt stops).

QUALITY & STYLE RULES:
- Maintain a confident, thoughtful, and educational tone.
- Prefer explanation over assertion.
- Use generous transitions to link ideas.
- No headings, no bullet lists, no meta-commentary.

✅ FINAL INTERNAL CHECK (REQUIRED):
- Is it LONG and substantial?
- Is every gap meaningfully resolved?
- Does the opening stand alone?
- Could this be published immediately?

Only then produce the final output.
`;
    }

    let step2Completion;
    try {
      step2Completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPromptToUse },
          { role: "user", content: `Original Transcript Context (Full Content):\n${transcript.slice(0, 15000)}` },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      });
    } catch (err) {
      console.error("Step 2 (Script) failed", err);
      // Fallback if step 2 fails: empty script
      parsedAnalysis.suggested_script = "Script generation unavailable.";
    }

    const scriptText = step2Completion?.choices?.[0]?.message?.content || "";

    // ============================================
    // FINAL ASSEMBLY & SAVE
    // ============================================

    const finalResult = {
      ...parsedAnalysis,
      suggested_script: scriptText.trim()
    };

    // Update DB
    try {
      const updatePayload = { generated_script: JSON.stringify(finalResult) };
      await supabase.from("analyses").update(updatePayload).eq("id", aId);
    } catch (e) {
      console.warn("generate-gap-analysis: update error", e);
    }

    return res.status(200).json({
      analysisId: aId,
      parsed: finalResult,
      selectedChunks,
      raw_output: JSON.stringify(finalResult), // Keeping raw_output as JSON string for consistency
    });

  } catch (err) {
    console.error("generate-gap-analysis outer error", err);
    return res.status(500).json({ error: "Server error", details: err?.message ?? String(err) });
  }
}

