import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { checkEntitlement, incrementUsage } from "../../lib/entitlements";

export const config = {
  maxDuration: 60, // Short timeout since it only does gaps analysis
};

const anthropic = new Anthropic();

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    /* -------------------------------------------
       AUTH
    ------------------------------------------- */
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const aId = req.body.analysisId || req.body.analysis_id;
    if (!aId) {
      return res.status(400).json({ error: "Missing analysisId" });
    }

    /* -------------------------------------------
       LOAD ANALYSIS
    ------------------------------------------- */
    const { data: analysis } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", aId)
      .single();

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    const transcript = analysis?.transcript || "";

    if (transcript.length < 200) {
      return res.status(400).json({ error: "Transcript too short" });
    }

    /* -------------------------------------------
       GAP ANALYSIS PASS
    ------------------------------------------- */
    // ── CLAUDE-OPTIMISED GAP ANALYSIS PROMPT ──────────────────────────────
    const gapSystemPrompt = `You are a senior content editor specialising in transcript-grounded gap analysis. Your task is to read a spoken transcript and identify every place where the speaker introduced a concept, claim, decision, or process but did not fully explain it.

<role_definition>
You surface MISSING EXPLANATIONS — things the speaker brought up but left incomplete. You do not invent topics, add generic advice, or introduce anything the speaker never mentioned.
</role_definition>

<output_format>
Respond with a single valid JSON object and nothing else — no markdown fences, no preamble, no trailing commentary.

{
  "summary": "string — recount only what the speaker said, no interpretation",
  "gaps": [
    {
      "title": "string — the specific missing detail, phrased from the speaker's own language",
      "suggestion": "string — describe the ABSENCE using the pattern below",
      "priority": "Critical | Medium | Minor",
      "evidence": "string — exact quote or faithful paraphrase showing the speaker raised the topic but stopped short"
    }
  ],
  "titles": ["string × 5 — drawn from transcript language"],
  "keywords": ["string × 10 — taken directly from transcript vocabulary"]
}
</output_format>

<gap_validity_rules>
A gap is valid ONLY when ALL three conditions are true:
1. The speaker explicitly mentioned or clearly implied the topic.
2. Important explanatory detail was left out.
3. You can quote or faithfully paraphrase the exact transcript moment that proves it.

Reject any gap that fails even one condition.
</gap_validity_rules>

<suggestion_field_rules>
The suggestion field MUST describe the absence — what the speaker left unexplained.

FORBIDDEN suggestion patterns:
- "Provide examples of…"
- "Explain tools or methods…"
- "Introduce steps for…"
- "Share how to…"

REQUIRED suggestion patterns:
- "The speaker mentions X but does not explain how or why."
- "The rationale behind X decision is not clarified."
- "The tradeoff between X and Y is left unaddressed."
- "The specific criteria used for X are not stated."
</suggestion_field_rules>

<gap_scaling_by_length>
Scale gap count strictly to transcript length:
- Under 300 words → 3–5 gaps maximum
- 300–600 words → 5–8 gaps
- 600–1500 words → 8–12 gaps
- 1500–2500 words → 12–16 gaps
- Over 2500 words → 16–25 gaps; split complex ideas into sub-gaps

After your first pass, if you have fewer than the minimum for your length tier, re-scan specifically for: unexplained decisions, unstated assumptions, missing tradeoffs, absent metrics, and skipped steps.
</gap_scaling_by_length>

<depth_decomposition>
Break every compound sentence or paragraph into atomic ideas. Each distinct missing element earns its own gap entry. A single paragraph can yield multiple gaps if different aspects are under-explained. Do not collapse separate omissions into one.

Ask these probing questions for every speaker claim:
- What is the missing "why" behind this decision?
- What steps were skipped in this process?
- What metrics or numbers were implied but not given?
- What assumption is stated without justification?
- What tradeoff or alternative was hinted at but not compared?
- What constraint (time, scale, resource) was mentioned without specifics?
</depth_decomposition>

<hard_exclusions>
- Do NOT create gaps for topics the speaker explicitly said they did not use.
- Do NOT add generic best-practice advice (budgeting tools, success frameworks, etc.) unless the speaker named them.
- Do NOT invent evidence. If you cannot find a supporting quote, discard the gap.
- Do NOT repeat overlapping gaps. Each gap title must be distinct.
</hard_exclusions>

<priority_definitions>
Critical — a core claim or central idea is mentioned but left materially unclear.
Medium — a supporting point is touched on without necessary depth.
Minor — a clarifying detail that would help but is not essential to the main narrative.
</priority_definitions>`;

    const gapUserMessage = `Analyse the following transcript and return the JSON gap report.\n\n<transcript>\n${transcript.slice(0, 4000)}\n</transcript>`;

    const gapResp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      temperature: 0.2,
      system: [{ type: "text", text: gapSystemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: gapUserMessage }]
    });

    let gapResponseText = gapResp.content[0].text;
    const jsonMatch = gapResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      gapResponseText = jsonMatch[0];
    }
    const parsedAnalysis = JSON.parse(gapResponseText);

    // Save to DB
    await supabase
      .from("analyses")
      .update({
        summary: parsedAnalysis.summary,
        gaps: parsedAnalysis.gaps,
        titles: parsedAnalysis.titles,
        keywords: parsedAnalysis.keywords
      })
      .eq("id", aId);

    // Return the JSON directly (no NDJSON stream needed here)
    return res.status(200).json({
      status: "gaps_ready",
      gaps: parsedAnalysis.gaps,
      summary: parsedAnalysis.summary,
      titles: parsedAnalysis.titles,
      keywords: parsedAnalysis.keywords
    });

  } catch (err) {
    console.error("Error in analyze-gaps:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
