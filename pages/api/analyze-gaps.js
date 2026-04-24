import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  maxDuration: 60,
};

const anthropic = new Anthropic();

/**
 * Parse plain-text gap output into structured JSON.
 * Expected format per gap:
 *   [NN] GAP TITLE
 *   Severity: CRITICAL | MEDIUM | MINOR
 *   Category: <category name>
 *   Description: <2-4 sentences>
 */
function parseGapText(text) {
  const gaps = [];
  // Split on gap markers like [01], [02], etc.
  const blocks = text.split(/\[(\d{2})\]/);

  for (let i = 1; i < blocks.length; i += 2) {
    const body = blocks[i + 1] || "";
    const lines = body.split("\n").map(l => l.trim()).filter(Boolean);

    if (!lines.length) continue;

    const title = lines[0].trim();
    let severity = "MINOR";
    let category = "";
    let description = "";
    let inDescription = false;
    const descLines = [];

    for (const line of lines.slice(1)) {
      if (/^severity:/i.test(line)) {
        const match = line.match(/CRITICAL|MEDIUM|MINOR/i);
        if (match) severity = match[0].toUpperCase();
        inDescription = false;
      } else if (/^category:/i.test(line)) {
        category = line.replace(/^category:\s*/i, "").trim();
        inDescription = false;
      } else if (/^description:/i.test(line)) {
        descLines.push(line.replace(/^description:\s*/i, "").trim());
        inDescription = true;
      } else if (inDescription) {
        descLines.push(line);
      }
    }

    description = descLines.join(" ").trim();

    if (title) {
      gaps.push({ title, severity, category, description });
    }
  }

  return gaps;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    /* AUTH */
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization" });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const aId = req.body.analysisId || req.body.analysis_id;
    if (!aId) return res.status(400).json({ error: "Missing analysisId" });

    /* LOAD ANALYSIS */
    const { data: analysis } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", aId)
      .single();

    if (!analysis) return res.status(404).json({ error: "Analysis not found" });

    const transcript = analysis?.transcript || "";
    if (transcript.length < 200) return res.status(400).json({ error: "Transcript too short" });

    const targetPlatform = req.body.targetPlatform || analysis?.metadata?.content_target || "youtube";

    /* ENGINE 1 — GAP ANALYSER PROMPT (GapGens v2.0) */
    const gapSystemPrompt = `You are GapGens Gap Analyser — a senior content strategist and structural editor with 20 years of experience identifying exactly why content fails to build authority, trust, and action.

Your job is to read the transcript provided and identify every gap that weakens the content. You are not summarising. You are diagnosing.

A gap is any place where the content makes a claim, implies a result, references an idea, or asks the audience to trust the speaker — without giving them the evidence, context, mechanism, or specificity to actually do so.

You identify gaps across these categories:

CATEGORY 1 — EVIDENCE GAPS
The content makes a claim without data, source, example, or proof.
Example: "Most people fail at this" — fails counted? Source? Study?

CATEGORY 2 — MECHANISM GAPS
The content states a result but never explains how it is achieved.
Example: "This strategy doubled my revenue" — what specifically caused the doubling?

CATEGORY 3 — CONTEXT GAPS
The content assumes the audience has background knowledge they may not have.
Terms, concepts, or situations introduced without sufficient grounding.

CATEGORY 4 — UNANCHORED CLAIM GAPS
Vague quantifiers used where specificity is required.
Trigger words: "pretty fast", "a lot", "very quickly", "most people", "significantly", "huge results", "in no time", "many experts", "recently".
Every one of these must be flagged as a gap.

CATEGORY 5 — STRUCTURAL GAPS
The content is missing a section that the audience expects and needs.
Examples: No clear hook. No stakes established. No call to action.
Promised a framework but only delivered 2 of 5 steps.

CATEGORY 6 — CREDIBILITY GAPS
The speaker makes claims about their authority or results without grounding them in verifiable specifics.
Example: "I've worked with hundreds of brands" — which brands? What results?

CATEGORY 7 — TRANSITION GAPS
Ideas jump without logical connection. The audience is expected to make a conceptual leap the content never bridges.

OUTPUT FORMAT — follow this format exactly for every gap identified:

[01] GAP TITLE
Severity: CRITICAL / MEDIUM / MINOR
Category: [Gap category name from above]
Description: Exactly what is missing and precisely why it matters to the audience. Be specific. Reference the exact moment or line in the content where the gap occurs. Two to four sentences maximum.

Severity definitions:
CRITICAL — The gap directly undermines the core claim, promise, or credibility of the content. Without resolving it, the audience cannot trust or act on the content.
MEDIUM   — The gap weakens authority or clarity but does not break the core argument. Resolution strengthens conviction.
MINOR    — The gap is an opportunity to add depth or specificity. Missing it reduces richness but does not damage trust.

Rules:
- Number gaps sequentially starting at [01]
- Do not group multiple gaps under one ID
- Do not output anything before the first gap
- Do not output any summary or closing statement after the last gap
- Minimum gaps to identify: 5
- Maximum gaps to identify: 12
- If fewer than 5 genuine gaps exist, note that the content is strong and identify what minor improvements remain`;

    const gapUserMessage = `Analyse this transcript and identify all content and structural gaps.
Target platform: ${targetPlatform}

TRANSCRIPT:
${transcript.slice(0, 6000)}`;

    const gapResp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      temperature: 0.2,
      system: [{ type: "text", text: gapSystemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: gapUserMessage }]
    });

    const rawGapText = gapResp.content[0].text;
    const gaps = parseGapText(rawGapText);

    // Fallback: generate summary from first gap descriptions
    const summary = gaps.length > 0
      ? `${gaps.length} content gaps identified. Key issues: ${gaps.filter(g => g.severity === "CRITICAL").map(g => g.title).slice(0, 2).join(", ") || gaps[0]?.title}.`
      : "Gap analysis complete.";

    // Generate title suggestions from transcript
    const titleWords = transcript.split(/\s+/).slice(0, 50).join(" ");
    const titles = []; // Kept empty to avoid extra API call; can be populated if needed
    const keywords = []; // Same

    // Save to DB
    await supabase
      .from("analyses")
      .update({
        summary,
        gaps,
        titles,
        keywords,
      })
      .eq("id", aId);

    return res.status(200).json({
      status: "gaps_ready",
      gaps,
      summary,
      titles,
      keywords,
    });

  } catch (err) {
    console.error("Error in analyze-gaps:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
