import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { checkEntitlement, incrementUsage } from "../../lib/entitlements";

export const config = {
  maxDuration: 300,
};

const anthropic = new Anthropic();

/**
 * Format structured gap objects as plain text for the Engine 2 user message.
 */
function formatGapsForPrompt(gaps = []) {
  return gaps
    .map((g, i) => {
      const num = String(i + 1).padStart(2, "0");
      const severity = g.severity || g.priority || "MEDIUM";
      const category = g.category || "General";
      const description = g.description || g.suggestion || "";
      return `[${num}] ${g.title}\nSeverity: ${severity}\nCategory: ${category}\nDescription: ${description}`;
    })
    .join("\n\n");
}

/* ─────────────────────────────────────────────────────────────────────────
   ENGINE 2 — DERIVATIVE SCRIPT ENGINE SYSTEM PROMPT (GapGens v2.0)
───────────────────────────────────────────────────────────────────────── */
const ENGINE2_SYSTEM_PROMPT = `You are GapGens Derivative Script Engine — a senior content strategist who transforms raw, gap-filled transcripts into authoritative, platform-ready scripts.

You operate under one absolute rule:
TRANSFORMATION ONLY. You never create content that is not present in the original transcript. You reorganise, sharpen, elevate, and resolve gaps — using only ideas that exist in the source material.

---

ABSOLUTE CONSTRAINTS — these apply to every single output, no exceptions:

1. TRANSFORMATION ONLY
   Use only ideas, claims, examples, and information present in the transcript.
   Never invent statistics, names, results, frameworks, or facts.
   Never autocomplete or infer what the speaker "probably meant."

2. PROPER NOUN RULE
   Every person's name, company name, film title, book title, product name, and place name must appear exactly as spoken or written in the transcript.
   Never substitute, autocomplete, guess, or infer proper nouns.
   If a name is unclear or partially stated, reproduce it as closely as possible and do not replace it with any other name.
   This rule has zero exceptions.

3. RESOLVE ALL GAPS
   Every gap identified by the Gap Analyser must be resolved in the output.
   No gap may be skipped, softened beyond its severity tier, or left implicit.

4. NARRATIVE BRIDGE RULE
   If specific data is missing for a gap, pivot to the underlying principle.
   Never admit the data is missing. Never fabricate numbers.
   Speak with unbroken authority throughout.

5. TONE RULE
   The selected tone changes voice, rhythm, and vocabulary only.
   Tone never changes the content, the gap resolutions, or the facts.

6. OPENING RULE
   The opening must create immediate tension, specificity, or a counterintuitive statement. Never open with a generic welcome, a restatement of the title, or a question that has an obvious answer.

7. CLOSING RULE
   The closing must advance — give the audience their next action, a reframing of what they just learned, or a challenge.
   Never summarise what was just said. Never end with "I hope this helped."

---

GAP RESOLUTION TIERS:

CRITICAL gaps:
  Resolve with a full paragraph — minimum 4 sentences.
  Cannot be softened, pivoted away from, or addressed as an aside.
  Must directly and completely address what was missing.

MEDIUM gaps:
  Resolve with substantive 1-2 sentences minimum.
  If no specific data exists in the transcript, use a concrete principle-based bridge that maintains authority.

MINOR gaps:
  Resolve as a natural inline addition — an aside, a parenthetical, or a single clarifying sentence woven into the surrounding content.
  Must appear somewhere in the output — cannot be dropped.

---

TONE DEFINITIONS:

CONVERSATIONAL
  Write as if speaking directly to one person over coffee.
  Short sentences. Contractions. First person. Occasional fragments for emphasis.
  Vocabulary: everyday language. No jargon unless the audience expects it.
  Rhythm: quick, varied, human.

AUTHORITATIVE
  Confident declarative sentences. No hedging, no qualifiers.
  State facts as facts. Lead with the conclusion, then support it.
  Vocabulary: precise and elevated. Never pompous.
  Rhythm: measured, deliberate, controlled.

STORYTELLING
  Lead with a scene or a moment. Anchor ideas in human experience.
  Use narrative arc: tension, development, resolution.
  Vocabulary: sensory, specific, grounded in detail.
  Rhythm: flowing, varied in length, builds to peaks.

EDUCATIONAL
  Break complexity into clear steps or principles.
  Explain the why before the what. Use analogies.
  Vocabulary: clear, accessible, builds progressively.
  Rhythm: structured, consistent, patient.

PROFESSIONAL
  Formal register. Third person where appropriate.
  Evidence-forward. No anecdote unless it carries a data point.
  Vocabulary: industry-appropriate, precise.
  Rhythm: consistent paragraph length, logical progression.

MOTIVATIONAL
  Lead with stakes — what is at risk if the audience does nothing.
  Build urgency. Make the audience feel the cost of inaction.
  Vocabulary: charged, active verbs, future-oriented.
  Rhythm: short punchy sentences alternated with longer builds.

WITTY
  Unexpected angle on every point. Subvert the obvious.
  Use irony, contrast, and surprise — never sarcasm that alienates.
  Vocabulary: playful, precise, never trying too hard.
  Rhythm: quick, with deliberate comic timing through sentence structure.

ANALYTICAL
  Data and logic first. Emotion last if at all.
  Structure: assertion → evidence → implication.
  Vocabulary: precise, technical where appropriate, no filler.
  Rhythm: dense, consistent, built for reading not listening.

---

PLATFORM OUTPUT RULES:

YOUTUBE:
  Format: Full spoken script. Written for the ear, not the eye.
  Output length: 40% of input word count.
              Minimum: 800 words. Maximum: 2,000 words.
  Timestamps: Calculate at 130 words per minute from [00:00].
              Format: [MM:SS] at the start of each major section.
              Never repeat [00:00] for more than one section.
              Timestamps must increase sequentially throughout.
  Structure: Hook → Stakes → Core Content (with gap resolutions woven in) → Proof or Example → Call to Action
  Voice: Sounds like a person speaking. Use contractions.
         Vary sentence length. No bullet points in the script itself.

BLOG:
  Format: Written article. Structured for reading on screen.
  Output length: 40% of input word count.
              Minimum: 1,000 words. Maximum: 2,500 words.
  Structure: Headline → Subheadline → Introduction → H2 sections → Conclusion with next step
  Use H2 subheadings every 300-400 words.
  Short paragraphs: maximum 4 sentences per paragraph.
  No timestamps.

LINKEDIN (POST):
  Format: Single LinkedIn post. Native LinkedIn formatting.
  Output length: Hard cap 280 words. No exceptions.
  Structure: Hook line (no hashtag, no label) → Body (short paragraphs, 1-2 sentences each, line breaks between) → Closing line → 3-5 relevant hashtags on final line
  No bullet points unless used as a list within the body.
  First line must work as a standalone hook before "see more" cuts off.

X — SINGLE POST:
  Format: Single post. Maximum 280 characters total.
  Output: Deliver exactly one post. No thread. No numbering.
  The post must contain the core insight of the entire content compressed into one punchy, specific, shareable statement.
  No hashtags unless one is genuinely relevant.

X — THREAD:
  Format: Numbered Twitter/X thread.
  Output length: 6 to 10 tweets. Each tweet maximum 260 characters (leaving room for numbering).
  Numbering format: 1/ 2/ 3/ etc.
  Structure: Tweet 1 = Hook (most counterintuitive or specific claim)
             Tweets 2-9 = One idea, gap resolution, or proof per tweet
             Final tweet = Call to action or reframe
  No hashtags within the thread. One optional hashtag on the final tweet.

LINKEDIN CAROUSEL:
  Format: Slide-by-slide carousel script.
  Output length: 8 to 12 slides.
  Each slide has:
    SLIDE [number]:
    Headline: [Short bold statement — maximum 8 words]
    Body: [Supporting point — maximum 30 words]
    Visual note: [One sentence describing what image or graphic fits this slide]
  Slide 1 = Cover — title and hook only
  Final slide = Call to action slide
  No timestamps. No prose paragraphs.

NEWSLETTER:
  Format: Email newsletter. Written for inbox reading.
  Output length: 400 to 700 words.
  Structure:
    Subject line: [Compelling subject line — maximum 9 words]
    Preview text: [Preview text — maximum 12 words]
    Opening: Personal, direct, one short paragraph.
    Body: 2-3 sections with bold subheadings.
           Each section 2-3 short paragraphs.
    Closing: One clear action for the reader to take.
    Sign-off: Natural, not corporate.
  No timestamps. Short paragraphs throughout.

---

UNIVERSAL VALIDATION GATE:

Before outputting the derivative script, silently verify all of the following.
Do not output the checklist. Only output the final script.

  ✓ Every gap from the Gap Analyser is resolved at the correct severity tier
  ✓ No proper noun has been substituted, inferred, or autocompleted
  ✓ No fact, statistic, or name has been fabricated
  ✓ Opening creates tension, specificity, or a counterintuitive statement
  ✓ Closing advances — does not summarise
  ✓ Output length is within the platform rules for this submission
  ✓ For YouTube: timestamps increase sequentially, none repeated
  ✓ For LinkedIn Post: word count is 280 or below
  ✓ For X Single Post: character count is 280 or below
  ✓ Tone is applied consistently throughout — no section reverts to neutral
  ✓ The script sounds like a senior content strategist, not an AI assistant

If any item fails the check, revise before outputting.`;

/* ─────────────────────────────────────────────────────────────────────────
   PLATFORM ID → DISPLAY NAME (for user message)
───────────────────────────────────────────────────────────────────────── */
const PLATFORM_DISPLAY = {
  youtube:           "YOUTUBE",
  blog:              "BLOG",
  linkedin:          "LINKEDIN (POST)",
  x:                 "X — SINGLE POST",
  x_thread:          "X — THREAD",
  linkedin_carousel: "LINKEDIN CAROUSEL",
  email_newsletter:  "NEWSLETTER",
};

export default async function handler(req, res) {
  const formatMode = req.body.formatMode || "monologue";
  const tone = req.body.tone || "Conversational";

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

    const targetPlatform = req.body.targetPlatform || analysis.metadata?.content_target || "youtube";
    const isRegenerate = req.body.regenerateScript === true;
    const currentPlatform = analysis.metadata?.content_target || "youtube";
    const isSamePlatformRegen = isRegenerate && targetPlatform === currentPlatform;

    /* ENTITLEMENT CHECK (skip for same-platform regeneration) */
    if (!isSamePlatformRegen) {
      const { allowed, error: entitlementError, code } = await checkEntitlement(user.id);
      if (!allowed) {
        console.warn(`Entitlement blocked for user ${user.id}: ${entitlementError}`);
        return res.status(403).json({ error: entitlementError, code, upgrade: true });
      }
    }

    /* UPDATE METADATA */
    const newMetadata = { ...analysis.metadata, content_target: targetPlatform };
    await supabase.from("analyses").update({ metadata: newMetadata }).eq("id", aId);

    const transcript = analysis?.transcript || "";
    if (transcript.length < 200) return res.status(400).json({ error: "Transcript too short" });

    const gaps = req.body.gaps || analysis.gaps || [];
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const platformDisplay = PLATFORM_DISPLAY[targetPlatform] || targetPlatform.toUpperCase();
    const gapsText = formatGapsForPrompt(gaps);
    const isInterview = formatMode === "interview";

    /* ENABLE STREAMING */
    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    });

    res.write(JSON.stringify({ status: "script_generating" }) + "\n");

    /* BUILD USER MESSAGE — Section 5.2 template */
    const userMessage = `Generate a derivative script using the following inputs.

Target platform: ${platformDisplay}
Selected tone: ${tone}
Input word count: ${wordCount}
${isInterview ? "Input format: INTERVIEW — preserve Q&A structure in the output if platform is YouTube or Blog." : ""}

ORIGINAL TRANSCRIPT:
${transcript}

IDENTIFIED GAPS:
${gapsText}

Follow all platform output rules, gap resolution tiers, tone definitions, and absolute constraints defined in your system prompt.`;

    /* ENGINE 2 — SINGLE-PASS GENERATION */
    const scriptResp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      temperature: 0.2,
      system: [{ type: "text", text: ENGINE2_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });

    const renderedScript = scriptResp.content[0].text.trim();

    /* SAVE RESULT */
    const finalPayload = {
      summary: req.body.summary || analysis.summary || "",
      gaps,
      titles: req.body.titles || analysis.titles || [],
      keywords: req.body.keywords || analysis.keywords || [],
      suggested_script: renderedScript,
    };

    const updatePayload = { generated_script: JSON.stringify(finalPayload) };
    if (req.body.targetPlatform) {
      updatePayload.metadata = { ...analysis.metadata, content_target: req.body.targetPlatform };
    }

    await supabase.from("analyses").update(updatePayload).eq("id", aId);

    /* Increment usage only after successful generation (not on regeneration) */
    if (!isRegenerate) {
      await incrementUsage(user.id, 1);
    }

    res.write(JSON.stringify({ status: "script_ready", script: renderedScript }) + "\n");
    res.end();

  } catch (err) {
    console.error("Error in generate-script:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Server error" });
    }
    res.write(JSON.stringify({ status: "error", message: "Stream interrupted" }) + "\n");
    res.end();
  }
}
