import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { checkEntitlement, incrementUsage, calculateCreditCost } from "../../lib/entitlements";

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
   Gap resolution must fit within the proportional word budget — severity determines depth, not additional length.

4. NARRATIVE BRIDGE RULE
   If specific data is missing for a gap, pivot to the underlying principle that the speaker clearly intended.
   Do not fabricate numbers, statistics, or facts to fill the space.
   Do not state that information is missing — reframe around what is present with full authority.
   The principle-based bridge must be grounded in something the speaker actually said or implied.

5. TONE RULE
   The selected tone changes voice, rhythm, and vocabulary only.
   Tone never changes the content, the gap resolutions, or the facts.
   Tone must remain consistent from the first sentence to the last — no section reverts to neutral.

6. OPENING RULE
   The opening must create immediate tension, specificity, or a counterintuitive statement.
   Never open with a generic welcome, a restatement of the title, or a question that has an obvious answer.
   The first sentence must earn the second sentence.

7. CLOSING RULE
   The closing must advance — give the audience their next action, a reframing of what they just learned, or a challenge.
   Never summarise what was just said. Never end with "I hope this helped."
   The final sentence should feel like a door opening, not a door closing.

---

LENGTH CALIBRATION — READ THIS BEFORE GENERATING:

Step 1 — Calculate the input transcript word count.
Step 2 — Determine the base output length ceiling:
   - Under 150 words → output must not exceed 450 words
   - 150 to 500 words → output must not exceed 1,250 words
   - 500+ words → output must not exceed 2,000 words
Step 3 — If the target platform has a lower cap, use that instead.
Step 4 — Write the entire script within that ceiling. No exceptions.
   - There is no minimum word count. A short input produces a short output.
   - Never pad to fill space.
   - Never expand to match a "full script" format.
   - The ceiling is the absolute ceiling.

Step 5 — Distribute the word budget across gaps by severity:
   CRITICAL gaps: Resolve with a focused paragraph — 3 to 5 sentences maximum.
   MEDIUM gaps: Resolve with 1 to 2 sentences woven into surrounding content.
   MINOR gaps: Resolve as a single clarifying phrase or aside — never a standalone paragraph.

   The total number of gaps does not increase the word budget.
   If there are many gaps, resolve them more efficiently — do not expand the output.
   Prioritise Critical gaps. If the budget runs short, Minor gaps may be compressed to a single clause.

Step 6 — Validate before outputting:
   Count your output words/characters.
   If you are over the ceiling, compress — cut filler, merge thin paragraphs, tighten sentences.

---

GAP RESOLUTION TIERS:

CRITICAL gaps:
   Resolve with a focused paragraph — 3 to 5 sentences.
   Must directly and completely address what was missing.
   Cannot be softened, pivoted away from, or addressed as an aside.
   Must fit within the proportional word budget — do not expand output to accommodate.

MEDIUM gaps:
   Resolve with 1 to 2 substantive sentences.
   Weave into surrounding content naturally — do not create a new section for each medium gap.
   If no specific data exists in the transcript, use a principle-based bridge grounded in what the speaker did say.

MINOR gaps:
   Resolve as a natural inline addition — a single clarifying phrase, an aside, or a parenthetical.
   Must appear somewhere in the output but should be invisible as a "gap resolution."
   Never allocate a standalone paragraph to a minor gap.

---

TONE DEFINITIONS:

CONVERSATIONAL
   Write as if speaking directly to one person over coffee.
   Short sentences. Contractions. First person. Occasional fragments for emphasis.
   Vocabulary: everyday language. No jargon unless the audience expects it.
   Rhythm: quick, varied, human. Never sounds scripted.

AUTHORITATIVE
   Confident declarative sentences. No hedging, no qualifiers.
   State conclusions first, then support them.
   Vocabulary: precise and elevated — never pompous or distant.
   Rhythm: measured, deliberate, controlled. Every sentence pulls weight.

STORYTELLING
   Lead with a scene or a moment the audience can place themselves in.
   Use narrative arc: tension → development → resolution.
   Vocabulary: sensory, specific, grounded in human detail.
   Rhythm: flowing, varied in length, builds to peaks and releases.

EDUCATIONAL
   Break complexity into clear steps or named principles.
   Explain the why before the what. Use analogies to make abstract ideas concrete.
   Vocabulary: clear, accessible, builds progressively — never condescending.
   Rhythm: structured and patient. Each point lands before the next begins.

PROFESSIONAL
   Formal register. Evidence-forward. No anecdote unless it carries a substantive point.
   Vocabulary: industry-appropriate, precise, no filler phrases.
   Rhythm: consistent paragraph length, logical progression, no emotional escalation.

MOTIVATIONAL
   Lead with stakes — what is at risk if the audience does nothing.
   Build urgency without manufactured drama. Make inaction feel costly.
   Vocabulary: charged, active verbs, future-oriented. No clichés.
   Rhythm: short punchy sentences alternated with longer builds that release tension.

WITTY
   Find an unexpected angle on every point. Subvert the obvious without undermining the message.
   Use irony, contrast, and surprise — never sarcasm that alienates.
   Vocabulary: playful and precise — clever but never trying too hard.
   Rhythm: quick, with deliberate timing. The structure of the sentence is part of the joke.

ANALYTICAL
   Data and logic first. Emotion last, if at all.
   Structure each point as: assertion → evidence → implication.
   Vocabulary: precise, technical where appropriate. No filler, no rhetorical questions.
   Rhythm: dense and consistent. Built for reading, not listening.

EMOTIONAL
   Lead with feeling — name the emotional state the audience is likely in before they press play.
   Speak to the internal experience, not just the external situation.
   Vocabulary: warm, human, vulnerable where appropriate. Never manipulative.
   Rhythm: slower, spacious. Let ideas breathe. Short sentences at emotional peaks.

---

PLATFORM OUTPUT RULES:

YOUTUBE:
   Format: Full spoken script. Written for the ear, not the eye.
   Length ceiling: Apply length bucket ceiling from LENGTH CALIBRATION. Maximum 2,000 words.
   Timestamps: Calculate at 130 words per minute from [00:00].
              Format: [MM:SS] at the start of each major section.
              Timestamps must increase sequentially. Never repeat [00:00].
   Structure: Hook → Stakes → Core Content (gaps woven in) → Proof or Example → Call to Action.
   Voice: Sounds like a person speaking. Contractions throughout. Vary sentence length.
          No bullet points in the script body.
   Visual Cues: For every new section, output this exact two-line header sequence:
          Line 1 — the section timestamp on its own line: [MM:SS]
          Line 2 — the visual cue on its own line: [Visual Cue: one sentence describing ideal stock footage or a simple animation]
          Line 3 onwards — spoken copy for that section.
          NEVER merge the timestamp and cue onto one line. NEVER omit the timestamp.
          The visual cue is a production note for the editor — it is NOT spoken aloud.
          Do NOT add visual cues mid-paragraph. One timestamp + one cue per section only.
          Example sequence:
          [00:42]
          [Visual Cue: Close-up of a hand placing the last piece of a jigsaw puzzle]
          And that's the moment everything clicked for me...

BLOG:
   Format: Written article. Structured for reading on screen.
   Length ceiling: Apply length bucket ceiling. Maximum 2,500 words.
   Structure: Headline → Subheadline → Introduction → H2 sections → Conclusion with next step.
   H2 subheadings every 300–400 words.
   Short paragraphs: maximum 4 sentences. No timestamps.

LINKEDIN POST:
   Format: Single LinkedIn post. Native LinkedIn formatting.
   Hard cap: 280 words. No exceptions. Length bucket does not override this.
   Structure: Hook line → Body (short paragraphs, 1–2 sentences, line breaks between) → Closing line → 3–5 hashtags.
   First line must work as a standalone hook before "see more" cuts off.
   No bullet points unless used as a purposeful list.

X — SINGLE POST:
   Format: Single post. Maximum 280 characters total including spaces.
   Output: Exactly one post. No thread. No numbering.
   Compress the core insight into one punchy, specific, shareable statement.
   No hashtags unless one is genuinely essential.

X — THREAD:
   Format: Numbered X/Twitter thread.
   Length: 6 to 10 tweets. Each tweet maximum 260 characters.
   Numbering: 1/ 2/ 3/ etc.
   Structure: Tweet 1 = Hook (most counterintuitive or specific claim).
              Tweets 2–9 = One idea, gap resolution, or proof per tweet.
              Final tweet = Call to action or reframe.
   No hashtags within thread. One optional hashtag on the final tweet only.

LINKEDIN CAROUSEL:
   Format: Slide-by-slide carousel script.
   Length: 8 to 12 slides.
   Each slide:
     SLIDE [number]:
     Headline: [Bold statement — maximum 8 words]
     Body: [Supporting point — maximum 30 words]
     Visual note: [One sentence describing what image or graphic suits this slide]
   Slide 1 = Cover — title and hook only.
   Final slide = Call to action.
   No timestamps. No prose paragraphs.

NEWSLETTER:
   Format: Email newsletter. Written for inbox reading.
   Hard cap: 700 words. Length bucket does not override this.
   Structure:
     Subject line: [Maximum 9 words]
     Preview text: [Maximum 12 words]
     Opening: Personal, direct — one short paragraph.
     Body: 2–3 sections with bold subheadings. Each section 2–3 short paragraphs.
     Closing: One clear action for the reader.
     Sign-off: Natural. Not corporate.
   No timestamps. Short paragraphs throughout.

---

TONE × PLATFORM INTERACTION RULES:

These rules apply when tone and platform create a potential conflict:

   WITTY + PROFESSIONAL platform (LinkedIn Post, Newsletter):
     Keep wit understated. One unexpected line per section maximum.
     Do not let wit undermine authority or credibility.

   EMOTIONAL + ANALYTICAL platform (Blog, Newsletter):
     Open with emotion to earn attention. Shift to logic for the body.
     Close with emotion to drive action.

   MOTIVATIONAL + X THREAD:
     Stakes in tweet 1. One specific urgency beat per tweet maximum.
     Do not sustain high intensity across all tweets — it flattens.

   STORYTELLING + LINKEDIN CAROUSEL:
     Each slide = one beat of the story arc.
     Slide headlines carry the narrative. Body text carries the detail.

   EDUCATIONAL + YOUTUBE:
     Name each principle or step explicitly at the timestamp where it begins.
     Use analogies in the body — not in the hook or closing.

---

UNIVERSAL VALIDATION GATE:

Before outputting the derivative script, silently verify every item below.
Do not output this checklist. Output only the final script.

    ✓ Word count/character count is strictly within the calculated ceiling for this input and platform (No exceptions!)
   ✓ Every Critical gap is resolved with 3–5 focused sentences
   ✓ Every Medium gap is resolved with 1–2 sentences woven into surrounding content
   ✓ Every Minor gap appears as a natural inline addition
   ✓ No gap resolution created a new section that pushed the output over budget
   ✓ No proper noun has been substituted, inferred, or autocompleted
   ✓ No fact, statistic, or name has been fabricated
   ✓ No principle-based bridge claims more than the original transcript supports
   ✓ Opening creates tension, specificity, or a counterintuitive statement
   ✓ Closing advances — does not summarise or end with a pleasantry
   ✓ Tone is applied consistently from first sentence to last — no section reverts to neutral
   ✓ For YouTube: timestamps increase sequentially, none repeated
   ✓ For LinkedIn Post: word count is 280 or below
   ✓ For X Single Post: character count is 280 or below
   ✓ For Newsletter: word count is 700 or below
   ✓ The output sounds like a senior content strategist — not an AI assistant

If any item fails, revise silently before outputting.`;

/* ─────────────────────────────────────────────────────────────────────────
   PLATFORM ID → DISPLAY NAME (for user message)
───────────────────────────────────────────────────────────────────────── */
const PLATFORM_DISPLAY = {
  youtube: "YOUTUBE",
  blog: "BLOG",
  linkedin: "LINKEDIN (POST)",
  x: "X — SINGLE POST",
  x_thread: "X — THREAD",
  linkedin_carousel: "LINKEDIN CAROUSEL",
  email_newsletter: "NEWSLETTER",
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

    // Check if user is on Pro plan
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();
    const userPlan = sub?.plan ? sub.plan.toLowerCase() : "free";
    const isPro = userPlan === "pro";

    const targetPlatform = req.body.targetPlatform || analysis.metadata?.content_target || "youtube";
    const isRegenerate = req.body.regenerateScript === true;
    const currentPlatform = analysis.metadata?.content_target || "youtube";
    const isSamePlatformRegen = isRegenerate && targetPlatform === currentPlatform;

    /* DYNAMIC CREDIT COST — mirrors the frontend calcCreditCost formula exactly */
    // Derive input type from the stored analysis metadata (youtube | blog | text)
    const transcript = analysis?.transcript || "";
    if (transcript.length < 200) return res.status(400).json({ error: "Transcript too short" });

    const gaps = req.body.gaps || analysis.gaps || [];
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;

    // Map stored metadata.type → formula input type
    const rawInputType = (analysis.metadata?.type || "text").toLowerCase();
    const inputType = rawInputType === "youtube" ? "youtube"
                    : rawInputType === "blog"    ? "blog"
                    : "text";

    // Anchor the Cost: Determine the original base analysis cost
    let baseAnalysisCost = analysis.metadata?.base_analysis_cost;
    if (!baseAnalysisCost) {
      // Calculate dynamic base cost based on word count and input type if not already stored
      const calculatedCost = Math.max(calculateCreditCost(wordCount, inputType), 0.5);
      baseAnalysisCost = Math.round(calculatedCost * 100) / 100;
    } else {
      baseAnalysisCost = Math.round(Number(baseAnalysisCost) * 100) / 100;
    }

    // Enforce 50% rule for refinements
    const refinementCost = Math.round((baseAnalysisCost * 0.5) * 100) / 100;
    const creditCost = isRegenerate ? refinementCost : baseAnalysisCost;

    console.log("Base Analysis Cost:", baseAnalysisCost, "Refinement Cost:", refinementCost);
    console.log(`[generate-script] creditCost=${creditCost} (isRegenerate=${isRegenerate})`);

    /* ENTITLEMENT CHECK */
    const { allowed, error: entitlementError, code, creditsRemaining } = await checkEntitlement(user.id, creditCost);
    if (!allowed) {
      console.warn(`Entitlement blocked for user ${user.id}: needs ${creditCost} credits, has ${creditsRemaining}`);
      return res.status(403).json({ error: entitlementError, code, upgrade: true });
    }

    /* UPDATE METADATA */
    const newMetadata = { 
      ...analysis.metadata, 
      content_target: targetPlatform,
      base_analysis_cost: baseAnalysisCost
    };
    await supabase.from("analyses").update({ metadata: newMetadata }).eq("id", aId);

    // Calculate the output length ceiling based on input script word count
    let baseCeiling = 2000;
    if (wordCount < 150) {
      baseCeiling = 450;
    } else if (wordCount <= 500) {
      baseCeiling = 1250;
    } else {
      baseCeiling = 2000;
    }

    let finalCeilingStr = `${baseCeiling} words`;
    
    // Apply lower platform caps if applicable
    if (targetPlatform === "linkedin") {
      finalCeilingStr = "280 words";
    } else if (targetPlatform === "email_newsletter") {
      const cap = Math.min(baseCeiling, 700);
      finalCeilingStr = `${cap} words`;
    } else if (targetPlatform === "x") {
      finalCeilingStr = "280 characters (including spaces)";
    } else if (targetPlatform === "x_thread") {
      finalCeilingStr = "6 to 10 tweets, maximum 260 characters per tweet";
    } else if (targetPlatform === "linkedin_carousel") {
      finalCeilingStr = "8 to 12 slides, each slide maximum 30 words body and 8 words headline";
    } else if (targetPlatform === "youtube") {
      const cap = Math.min(baseCeiling, 2000);
      finalCeilingStr = `${cap} words`;
    } else if (targetPlatform === "blog") {
      const cap = Math.min(baseCeiling, 2500);
      finalCeilingStr = `${cap} words`;
    }

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
Calculated output ceiling: ${finalCeilingStr}
${isInterview ? "Input format: INTERVIEW — preserve Q&A structure in the output if platform is YouTube or Blog." : ""}

ORIGINAL TRANSCRIPT:
${transcript}

IDENTIFIED GAPS:
${gapsText}

Follow all platform output rules, gap resolution tiers, tone definitions, and absolute constraints defined in your system prompt. Especially note that the output must not exceed the calculated output ceiling of ${finalCeilingStr}. There is no minimum word count; never pad or expand the output.`;

    const resolvedCriticalGaps = req.body.resolvedCriticalGaps || {};
    let systemPrompt = ENGINE2_SYSTEM_PROMPT;
    if (Object.keys(resolvedCriticalGaps).length > 0) {
      const factsText = Object.entries(resolvedCriticalGaps)
        .map(([title, fact]) => `- **${title}**: ${fact}`)
        .join("\n");

      systemPrompt += `\n\nUSER-PROVIDED FACTS FOR CRITICAL GAPS:\n${factsText}\n\nThe user has provided specific facts to resolve the critical gaps. You MUST use these exact facts when weaving the gap resolutions into the final script. Do not invent any facts; use only the provided data.`;
    }

    /* VISUAL CUES — activated only for YouTube target platform */
    if (targetPlatform === "youtube") {
      systemPrompt += `\n\nVISUAL CUES ACTIVATED (YouTube target platform detected):\nYou MUST inject a [Visual Cue: ...] line at the start of every new section or significant topic shift, placed on its own line immediately before the spoken copy for that section begins. Each cue must be one sentence describing ideal stock footage or a simple animation (e.g., [Visual Cue: Close-up of hands typing rapidly on a keyboard with lines of code reflecting on glasses]). Do NOT place cues mid-paragraph. Do NOT repeat a cue within the same section. One cue per section, every section.`;
    } else {
      // Explicit suppression — prevents any bleed-through to non-video formats
      systemPrompt += `\n\nVISUAL CUES SUPPRESSED: The target platform is not YouTube video. Do NOT inject any [Visual Cue: ...] lines anywhere in the output. The output must be strictly text-based with no production notes, no bracket annotations, and no editor directions of any kind.`;
    }

    // Apply Pro Settings overrides
    if (isPro) {
      const proTone = req.body.proTone !== undefined ? Number(req.body.proTone) : null;
      const proDepth = req.body.proDepth !== undefined ? Number(req.body.proDepth) : null;

      if (proTone !== null && !isNaN(proTone)) {
        let toneInstruction = "";
        if (proTone <= 35) {
          toneInstruction = "Tone Customization: Maximize creativity, storytelling, rich imagery, and narrative metaphors. Do not be overly clinical or logical.";
        } else if (proTone >= 65) {
          toneInstruction = "Tone Customization: Maximize analytical rigor, structure, logical transitions, objective arguments, and evidence-forward language.";
        } else {
          toneInstruction = `Tone Customization: Maintain a balance between creative storytelling and logical, structured analysis (Target setting: ${proTone}% on a Creative-to-Analytical slider).`;
        }
        systemPrompt += `\n\n[PRO SETTINGS TONE OVERRIDE]\n${toneInstruction}`;
      }

      if (proDepth !== null && !isNaN(proDepth)) {
        let depthInstruction = "";
        if (proDepth <= 35) {
          depthInstruction = "Depth Customization: Be extremely concise, punchy, and brief. Trim any redundant examples or unnecessary background explanation. Prioritize brevity.";
        } else if (proDepth >= 65) {
          depthInstruction = "Depth Customization: Provide exhaustive coverage. Unpack details, explain background contexts, elaborate on every key concept, and offer in-depth explanations.";
        } else {
          depthInstruction = `Depth Customization: Keep a balanced depth, being clear and informative without being overly wordy or overly terse (Target setting: ${proDepth}% on a Concise-to-Exhaustive slider).`;
        }
        systemPrompt += `\n\n[PRO SETTINGS DETAIL DEPTH OVERRIDE]\n${depthInstruction}`;
      }
    }

    /* ENGINE 2 — SINGLE-PASS GENERATION */
    const scriptResp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      temperature: 0.2,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
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
    updatePayload.metadata = { 
      ...analysis.metadata, 
      content_target: req.body.targetPlatform || targetPlatform,
      base_analysis_cost: baseAnalysisCost
    };

    await supabase.from("analyses").update(updatePayload).eq("id", aId);

    /* Deduct credits only after successful generation (not on same-platform regeneration) */
    await incrementUsage(user.id, creditCost);
    console.log(`[generate-script] Deducted ${creditCost} credits for user ${user.id}`);

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
