import { createClient } from "@supabase/supabase-js";
import { openai } from "../../lib/openaiServer";
import { checkEntitlement, incrementUsage, ensureFreemiumRecord } from "../../lib/entitlements";

export default async function handler(req, res) {
  const formatMode = req.body.formatMode || "interview";
  // allowed values: "interview" | "monologue"

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

    // Ensure Freemium Row
    await ensureFreemiumRecord(user.id);

    const aId = req.body.analysisId || req.body.analysis_id;
    if (!aId) {
      return res.status(400).json({ error: "Missing analysisId" });
    }

    /* -------------------------------------------
       FREEMIUM ENTITLEMENT CHECK
    ------------------------------------------- */
    // Determine target platform for derivative checks
    // If interview mode, we only check global analysis limits (platform = null/undefined)
    // If monologue mode, we check specific platform limits
    let targetPlatformForCheck = null;
    if (formatMode === "monologue") {
      // We need to resolve metadata to fallback to 'youtube' if not provided in body, 
      // but we haven't loaded analysis yet. 
      // Logic: Try body first. If missing, we defer deep check or load analysis early?
      // Let's load analysis first (it's cheap) OR just check body if typically provided.
      // req.body.targetPlatform is usually passed from UI for derivatives.
      targetPlatformForCheck = req.body.targetPlatform;
    }

    // However, we need to load analysis to get metadata if body is missing it, 
    // AND to trust the source of truth. 
    // But checking entitlement BEFORE DB load saves DB ops?
    // DB load is fast. Let's load analysis first to be robust, THEN check entitlement.

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

    // Refine targetPlatform logic now that we have metadata
    if (formatMode === "monologue") {
      targetPlatformForCheck = req.body.targetPlatform || analysis.metadata?.content_target || "youtube";
    }

    // PERFORM CHECK
    const { allowed, error: entitlementError } = await checkEntitlement(user.id, targetPlatformForCheck);

    if (!allowed) {
      console.warn(`Entitlement blocked for user ${user.id}: ${entitlementError}`);
      return res.status(403).json({ error: entitlementError, upgrade: true });
    }

    // TRACK USAGE IF REGENERATING WITH PLATFORM CHANGE (Freemium Fix)
    const currentPlatform = analysis.metadata?.content_target || "youtube";
    // Check if this is a platform switch regeneration
    // only relevant if regenerateScript is true (handled later in code, but we know intent here from body)
    // Actually we need to check regenerateScript flag here effectively.
    // But local flag 'regenerateScript' is defined lower down. Let's pull it up or check req.body directly.
    if (req.body.regenerateScript && targetPlatformForCheck !== currentPlatform) {
      console.log(`[Freemium] Platform switch detected: ${currentPlatform} -> ${targetPlatformForCheck}`);

      // 1. Increment Counters
      await incrementUsage(user.id, "analysis");
      if (targetPlatformForCheck === "youtube") {
        await incrementUsage(user.id, "youtube_derivative");
      }

      // 2. Update Metadata to prevent double-counting on subsequent identical regenerations
      // We only update content_target, preserving other metadata
      const newMetadata = { ...analysis.metadata, content_target: targetPlatformForCheck };
      await supabase.from("analyses").update({ metadata: newMetadata }).eq("id", aId);
    }

    const transcript = analysis?.transcript || "";
    const preserveInterviewMode = formatMode === "interview";

    if (transcript.length < 200) {
      return res.status(400).json({ error: "Transcript too short" });
    }

    // ENABLE STREAMING
    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    });

    console.log("FORMAT MODE:", formatMode);
    console.log("PRESERVE INTERVIEW MODE:", preserveInterviewMode);

    const originalLength = transcript.length;
    const targetLength = Math.floor(originalLength * 0.95);

    /* -------------------------------------------
       CALL 1 — GAP ANALYSIS
    ------------------------------------------- */


    let parsedAnalysis;
    const regenerateScript = req.body.regenerateScript === true;
    const clientGaps = req.body.gaps;

    /* -------------------------------------------
       CALL 1 — GAP ANALYSIS (OR SKIP)
    ------------------------------------------- */
    if (regenerateScript && Array.isArray(clientGaps)) {
      console.log("REGENERATING SCRIPT ONLY - Skipping Gap Analysis");
      parsedAnalysis = {
        summary: req.body.summary || "",
        gaps: clientGaps,
        titles: req.body.titles || [],
        keywords: req.body.keywords || []
      };
    } else {
      const gapPrompt = `
You are a senior content editor performing TRANSCRIPT-GROUNDED gap analysis with a focus on depth and detail.

Your task is to analyze the transcript and identify only gaps that are directly mentioned or clearly implied in the transcript but not fully explained by the speaker. A gap means missing explanation of something the speaker brought up. The transcript is the SOLE source of truth.

———

OUTPUT JSON ONLY in the following format:

{
  "summary": "...",
  "gaps": [
    {
      "title": "...",
      "suggestion": "...",
      "priority": "Critical | Medium | Minor",
      "evidence": "..."
    }
  ],
  "titles": ["...", "...", "...", "...", "..."],
  "keywords": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]
}


———

STRICT GAP & DETAIL RULES (NON-NEGOTIABLE):

1️⃣ Valid gaps only: A gap is valid only if the transcript explicitly mentions or clearly implies the topic and leaves important details unfinished. In other words, the speaker must have introduced the concept, decision, or claim, and not given the full explanation.

2️⃣ No invented or generic gaps: Do NOT create gaps for anything the speaker never mentioned or implied. Do not add generic “best practices” or broad advice not grounded in the transcript. Ignore common generic topics (e.g. budgeting tools, success stories, frameworks) unless the speaker directly referenced them. In short, every gap must stay strictly within the speaker’s words and hints.

3️⃣ Evidence required: Every gap must include a transcript quote (or faithful paraphrase) in the evidence field. This quote must directly support why the gap exists (e.g. it shows the speaker raised a point but didn’t elaborate). If you cannot find supporting text, do not invent the gap.

4️⃣ Short transcripts – few gaps: If the transcript is very short, output fewer gaps:

<300 words → 3–5 gaps max

300–600 words → 5–8 gaps max

5️⃣ Long transcripts – depth is key: If the transcript is longer, output many gaps. Never under-produce gaps for length:

2500 words: at least 12 gaps (prefer depth/detail gaps over new broad topics)

4000 words: target 18–25 gaps, splitting complex ideas into sub-gaps
If your initial gap list has fewer than ~10, re-scan the transcript specifically for under-explained decisions, assumptions, tradeoffs, or metrics to add more.

6️⃣ Do NOT: Invent new topics or advice that the speaker did not suggest. Do not merge distinct issues or repeat overlapping gaps. Each gap title must be distinct and focused on one missing detail.

7️⃣ Depth-check missing details: For every mentioned idea, ask: What is missing here? For example: if the speaker mentions a decision but gives no rationale, that missing “why” is a gap; if a process is mentioned with no steps, the missing steps are a gap; if an outcome is claimed without numbers, the missing metrics are a gap; if a belief or assumption is stated without justification, that is a gap; if a tradeoff or alternative is implied but not compared, that is a gap; if a constraint is mentioned without specifics (timeframe, scale, etc.), that is a gap. Any unexplained how/why/what/when around a mentioned topic should be flagged.

8️⃣ Idea-level decomposition: Break down each paragraph or complex sentence into pieces. A single idea or paragraph can yield multiple gaps if different aspects are under-explained. If an idea is repeated or appears in multiple contexts, examine each occurrence for new missing angles. In short, do not collapse repeated or compound ideas into one; extract each distinct missing element as its own gap.

———

IMPORTANT — SUGGESTION FIELD RULE:

The "suggestion" field MUST describe the missing explanation,
NOT propose adding new examples, tools, steps, or content.

❌ Do NOT write suggestions like:
- "Provide examples of..."
- "Explain tools or methods..."
- "Introduce ways to..."

✅ Instead, write suggestions like:
- "The speaker mentions X but does not explain how or why."
- "The rationale behind X is not clarified."
- "The tradeoff or reasoning for X is left unexplained."

If a detail does not exist in the transcript, the suggestion must
describe the absence — NOT propose adding new material.

———

LENGTH-BASED GAP SCALING (MANDATORY):

If transcript > 2500 words: identify at least 12 gaps (depth-focused).

If transcript > 4000 words: aim for 18–25 gaps, ensuring complex ideas are split across gaps.

If fewer than ~10 gaps result on first pass, re-examine the transcript for any subtle, under-explained assumptions or tradeoffs to increase count.

Never stop early: The number of gaps must scale with transcript length and complexity, focusing on missing detail at each step.

———

PRIORITY RULES:

Critical – a core idea or claim is mentioned but left unclear or incomplete (high impact gap).

Medium – a supporting point is mentioned briefly without necessary depth.

Minor – a clarifying detail that would help but isn’t essential to the main narrative.

———

SUMMARY RULES:

The summary must recount only what the speaker said, without interpretation or advice. (No extrapolation or new content in the summary.)

———

TITLE & KEYWORD RULES:

Titles must be drawn from the transcript language (phrase the missing detail as stated or implied by speaker). Provide exactly 5 title suggestions.

Keywords must be taken from or clearly implied by the transcript. Provide exactly 10 keywords.

Do not add any SEO/marketing terms or outside jargon not used by the speaker.

———

HARD EXCLUSION RULE:

If the speaker explicitly states they did NOT use a tool, system,
framework, or method, you MUST NOT create a gap requesting
tools, methods, or systems for that topic.

———

FINAL CHECK (DO NOT OUTPUT THIS):

Every gap has direct transcript evidence.

No invented topics or advice.

Gap count and depth match transcript length.

Each gap focuses on a missing detail or explanation.

Output is strictly grounded in the transcript.

Return JSON ONLY.
`;

      const gapResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: gapPrompt },
          { role: "user", content: transcript.slice(0, 4000) }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 3000
      });

      parsedAnalysis = JSON.parse(gapResp.choices[0].message.content);
    }

    const gaps = parsedAnalysis.gaps || [];

    // CRITICAL UPDATE: EMIT GAPS IMMEDIATELY
    res.write(JSON.stringify({
      status: "gaps_ready",
      gaps: parsedAnalysis.gaps,
      summary: parsedAnalysis.summary,
      titles: parsedAnalysis.titles,
      keywords: parsedAnalysis.keywords
    }) + "\n");

    // Also save interim result to DB (silent background save) - Skip if regenerating to avoid overhead or partial overwrites
    if (!regenerateScript) {
      await supabase
        .from("analyses")
        .update({
          summary: parsedAnalysis.summary,
          gaps: parsedAnalysis.gaps,
          titles: parsedAnalysis.titles,
          keywords: parsedAnalysis.keywords
        })
        .eq("id", aId);
    }

    /* -------------------------------------------
       CALL 2 — OUTLINE + HARD BUDGETS
    ------------------------------------------- */
    // Optional: Emit progress event
    res.write(JSON.stringify({ status: "script_generating" }) + "\n");

    const outlinePrompt = `
Create a STRICT outline for a derivative script.

Rules:
- Must resolve ALL gaps
- Total length ≈ ${targetLength} characters
- Opening + one section per gap + closing
- Budgets must sum approximately to target length

Output JSON ONLY:

{
  "opening_chars": number,
 "sections": [
  {
    "theme": "Finding real problems and early validation",
    "gaps_covered": ["Gap 1", "Gap 2", "Gap 3"],
    "chars": number
  }
]
  "closing_chars": number
}
`;

    const outlineResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: outlinePrompt },
        { role: "user", content: JSON.stringify(gaps) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1500
    });

    const outline = JSON.parse(outlineResp.choices[0].message.content);

    let finalScript = "";

    /* -------------------------------------------
       CALL 3 — OPENING (ABSOLUTE OVERRIDE)
    ------------------------------------------- */
    const openingResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: preserveInterviewMode ? `
🚫 FORMAT LOCK — INTERVIEW MODE (NON-NEGOTIABLE)

You are rewriting a REAL interview.

You MUST:
- Preserve speaker turns
- Use speaker labels (e.g. "Yang:", "Interviewer:")
- Maintain Q&A structure
- Rewrite only for clarity

You MUST NOT:
- Add narration
- Add scene-setting
- Add atmosphere or storytelling
- Write in third-person
- Write like an article or essay

If the output is not clearly an interview → REWRITE.

Start immediately in interview format.
` : `
Write a strong editorial opening (${outline.opening_chars} chars).
Re-establish context and themes.
`
        },
        {
          role: "user",
          content: preserveInterviewMode
            ? transcript
            : `
Convert the following interview into a SINGLE-SPEAKER FIRST-PERSON MONOLOGUE.
Do NOT summarize. Do NOT shorten. Preserve all reasoning.

Interview:
${transcript}
`
        }
      ],
      temperature: 0.3,
      max_tokens: 1200
    });

    const openingText = openingResp.choices[0].message.content.trim();
    finalScript += openingText + "\n\n";

    /* -------------------------------------------
       CALL 4..N — GAP SECTIONS (ROLLING CONTEXT)
    ------------------------------------------- */
    let rollingContext = openingText;

    for (const section of outline.sections) {
      const sectionResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: preserveInterviewMode
              ? `
🚫 FORMAT LOCK — INTERVIEW MODE (ABSOLUTE)

You are CONTINUING THE SAME INTERVIEW.

Current transcript (DO NOT repeat):
${rollingContext.slice(-2500)}

STRICT RULES:
- Output MUST be in Q&A interview format
- Preserve speaker labels exactly
- Each paragraph must belong to a speaker
- No narration
- No commentary
- No summaries
- No scene descriptions
- No sponsor inserts
- No introductions

Resolve these gaps THROUGH ANSWERS ONLY:
${section.gaps_covered.join(", ")}

Target length: ${section.chars} characters.

If this reads like an article → INVALID.
`
              : `
🚫 FORMAT LOCK — MONOLOGUE MODE (ABSOLUTE)

You are writing a SINGLE-SPEAKER MONOLOGUE.

STRICT RULES:
- NO interviewer
- NO questions
- NO Q&A
- NO dialogue
- NO speaker labels
- NO summaries
- NO instructional tone

VOICE RULES:
- First-person perspective
- Preserve original speaker’s reasoning and order
- Flow naturally like a thoughtful talk or essay
- Do NOT explain concepts like a teacher

Current progress (DO NOT repeat):
${rollingContext.slice(-2500)}

Resolve these gaps THROUGH CONTINUOUS REASONING:
${section.gaps_covered.join(", ")}

Target length: ${section.chars} characters.

If this contains questions or dialogue → INVALID.
`
          }
        ],
        temperature: 0.3,
        max_tokens: 1800
      });

      const sectionText = sectionResp.choices[0].message.content.trim();
      finalScript += sectionText + "\n\n";
      rollingContext += "\n\n" + sectionText;
    }
    /* -------------------------------------------
       FINAL CALL — CLOSING (ABSOLUTE OVERRIDE)
    ------------------------------------------- */
    const closingResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: preserveInterviewMode
            ? `
🚫 FORMAT LOCK — INTERVIEW MODE (CLOSING)

Write the FINAL exchange of the interview.

Rules:
- Maintain Q&A format
- No narration
- No summaries
- No new ideas
- End naturally with a final answer
`
            : `
🚫 FORMAT LOCK — MONOLOGUE MODE (CLOSING)

Write a FINAL MONOLOGUE CLOSING.

Rules:
- Single speaker only
- No questions
- No dialogue
- No summarizing language
- End with a complete, reflective final thought
`
        },
        { role: "user", content: finalScript.slice(-4000) }
      ],
      temperature: 0.3,
      max_tokens: 1200
    });

    finalScript += closingResp.choices[0].message.content.trim();

    /* -------------------------------------------
       FORMAT LAYER — MONOLOGUE (POST-PROCESS ONLY)
    ------------------------------------------- */

    let renderedScript = finalScript;

    if (formatMode === "monologue") {
      const metadata = analysis?.metadata || {};
      const targetPlatform = req.body.targetPlatform || metadata.content_target || "youtube";
      const wordCount = transcript.split(/\s+/).length;

      const systemPrompt = `
🧠 SYSTEM ROLE (ANTIGRAVITY)

You are GapGens Derivative Script Engine.

Your job is to generate a platform-optimized derivative script
using ONLY the transcript and the identified gaps.

This is a TRANSFORMATION task, not content creation.

You MUST respect:
	•	Transcript fidelity
	•	Gap integrity
	•	Platform-specific delivery rules

⸻

🔹 AUTHORITATIVE INPUTS (NON-NEGOTIABLE)

Transcript (sole source of truth):
[TRANSCRIPT]

Identified Gaps (JSON, ordered):
[GAPS_JSON]

Original Word Count:
${wordCount}

Target Platform (EXACT value, one of):
${targetPlatform}
Allowed values:
	•	youtube
	•	blog
	•	linkedin
	•	x

⸻

🔹 CRITICAL SEPARATION OF CONCERNS
	•	GAPS are platform-agnostic
	•	PLATFORM affects expression, not truth

You MUST:
	•	Resolve ALL gaps
	•	Use ONLY transcript material
	•	Adapt structure, tone, and density to the selected platform

You MUST NOT:
❌ Add new gaps
❌ Remove gaps
❌ Invent examples
❌ Introduce platform clichés
❌ Add advice not implied in the transcript

⸻

🔹 GLOBAL NON-NEGOTIABLE CONSTRAINTS

(Apply to ALL platforms)

1️⃣ SOURCE FIDELITY (ABSOLUTE)

You MAY:
	•	Rephrase
	•	Compress
	•	Reorder
	•	Add minimal glue for flow

You MUST:
	•	Use ONLY transcript ideas, examples, metrics, anecdotes
	•	Anchor EVERY gap resolution in transcript material

You MUST NOT:
❌ Add frameworks, tools, or steps not mentioned
❌ Generalize into generic creator advice
❌ Introduce new domains (branding, hiring, funding, etc.)

⸻

2️⃣ SINGLE NARRATIVE SPINE (MANDATORY)
	•	Identify ONE core question or premise from the transcript
	•	State it clearly at the start
	•	Every section must connect back to this spine
	•	❌ No parallel essays or side themes

⸻

CRITICAL CLARIFICATION — NO EXAMPLE COMPLETION

When resolving gaps, you MUST explain or clarify
what the speaker already said.

You MUST NOT:
- Add concrete examples unless the speaker explicitly gave them
- Add specific items (e.g., coffee, subscriptions, expenses)
  unless they appear verbatim or clearly in the transcript

If the transcript is abstract, the resolution MUST remain abstract.
If the transcript lacks examples, do NOT invent illustrative ones.

You MUST NOT introduce specific examples, items, or categories
(e.g., coffee, subscriptions, tools, habits, expenses)
UNLESS they appear explicitly in the transcript.

If the speaker used vague language
(e.g., “small habits”, “daily spending”, “minor expenses”),
you MUST preserve that vagueness
and explain the idea WITHOUT naming examples.

🔹 PLATFORM-SPECIFIC EXECUTION RULES

(This is the ONLY place platform logic applies)

⸻

▶️ IF [TARGET_PLATFORM] = youtube

Purpose: Spoken monologue for video

MANDATORY FORMAT RULES:
• Output MUST read as a continuous spoken monologue
• Add Timestamps (at the start of each paragraph) in the format [00:00] !Important!
• Paragraphs MUST be 3–5 sentences each
• Sentences MUST flow naturally across paragraphs
• Do NOT split sentences into standalone paragraphs
• Do NOT use atomic or thread-style decomposition

STRICTLY FORBIDDEN FOR YOUTUBE:
❌ One-sentence paragraphs
❌ Bullet-style rhythm
❌ X/Twitter atomic structure
❌ Essay-style sectioning
❌ LinkedIn compression rules

DEPTH REQUIREMENT (YOUTUBE ONLY):
• When resolving gaps, you MAY elaborate using transcript-grounded context
• Prefer concrete phrasing over compressed abstraction
• If a sentence sounds like a summary, expand it into lived explanation
• Spoken clarity > brevity

STRUCTURE (REQUIRED):
• Hook (spoken, natural)
• Add Timestamps (at the start of each paragraph) in the format [00:00] !Important!
• Story / Journey (chronological, narrative)
• Synthesis
• Close

STYLE:
• Conversational
• First-person
• Sounds like someone speaking on camera
• Natural pauses allowed, but not fragmentation

If output reads like a thread or bullet list → REWRITE as spoken monologue.

⸻

📝 IF [TARGET_PLATFORM] = blog

Purpose: Long-form written article
	•	Tone: Clear, analytical, grounded
	•	Structure:
	•	Clear section headers
	•	Logical progression
	•	Density:
	•	Slightly higher than YouTube
	•	Explicit reasoning allowed
	•	Formatting:
	•	Paragraphs 3–5 sentences
	•	No bullets unless transcript implies enumeration
	•	❌ No spoken cues
	•	❌ No “YouTube-style hooks”

  BLOG TERMINATION RULE (STRICT):
• Do NOT use conclusion phrases:
  – “In conclusion”
  – “Ultimately”
  – “This taught me”
  – “What I learned”
• End with a grounded observation, not a summary
• The final paragraph must advance clarity, not wrap up

BLOG DEPTH RULE:
• Prefer explicit reasoning over narrative reflection
• Replace spoken phrasing with written clarity where possible

OUTPUT FORMAT:
# Main Title

## Subtitle
[content]

## Subtitle 2
[content]

Creator bonus: 2min → SEO machine"

⸻

💼 IF [TARGET_PLATFORM] = linkedin

Purpose: Professional insight post / thought leadership

Tone:
• Reflective
• Credible  
• Insight-driven

Structure:
• Lines 1-5: Strong opening insight (130 chars max, 'see more' ready)
• Short paragraphs (2-3 sentences, 2 line breaks between)
• 3 bullets covering gaps (no emoji markers)
• 1 bold question at end
• Fewer sections, focus on implications

Length:
• 200-280 words (~30–50% of YouTube version)
• Compress without losing gap coverage

FORMATING: 
   - 2 line breaks (Enter Enter) between sections
   - **Bold headers** using **text** syntax  
   - Bullets start at line start (no indent)
   - Question on new line after bullets

LINE BREAKS:
   - After opening insight (line 4)
   - Before bullet section  
   - After bullets, before question


Style:
• First-person
• Executive clarity
• ❌ No emojis
• ❌ No motivational clichés  
• ❌ No hashtags (remove all)

**EXACT COPY-PASTE FORMAT:**

When I first [OPENING INSIGHT - 1 line]

[PAIN/GAP OBSERVATION - 1 line]

**Key realizations from tracking:**

• [GAP 1 filled - method detail]
• [GAP 2 filled - pattern insight] 
• [GAP 3 filled - intentionality shift]

**Solo creators: What's your biggest content bottleneck?**

REQUIREMENTS:
• First 5 lines = 130 chars max (standalone value)
• Exactly 3 bullets (plain bullets •)
• Bold question ending (**text** format)
• 2 line breaks between sections
• Zero editing needed for LinkedIn pasteons

⸻

🧵 IF [TARGET_PLATFORM] = x (FINAL — ATOMIC ENFORCEMENT)

Purpose:
Generate a native Twitter / X insight thread.
This is NOT a narrative, NOT an essay, NOT an explanatory post.

---

ABSOLUTE FORMAT RULES (NON-NEGOTIABLE)

• Each paragraph = ONE tweet
• Each tweet = ONE atomic insight
• Each tweet MUST be:
  - 1 sentence only
• No tweet may contain:
  - explanation
  - definition
  - reflection
  - interpretation
  - conclusion

If a sentence explains, defines, or interprets another idea → DELETE or SPLIT.

---

ATOMIC INSIGHT DEFINITION (STRICT)

An atomic insight:
• States ONE observation, action, or claim
• Does NOT explain why it matters
• Does NOT describe impact or transformation
• Does NOT interpret meaning

Allowed:
✔ “I started tracking small daily expenses.”
✔ “Those expenses added up faster than I expected.”

Forbidden:
❌ “This showed me why tracking matters.”
❌ “Which changed how I thought about money.”

---

MANDATORY SPLIT RULE

If ANY sentence includes:
• cause + effect
• action + outcome
• behavior + meaning
• insight + implication

→ SPLIT INTO SEPARATE TWEETS

No exceptions.

---

LANGUAGE HARD BANS (DELETE IF GENERATED)

The following phrases or patterns MUST NOT appear:

• “This taught me…”
• “I learned that…”
• “It helped me…”
• “Which meant…”
• “This shift…”
• “Ultimately…”
• “In summary…”
• “This transformed…”

---

STRUCTURE (THREAD LOGIC)

• Opening tweet:
  One declarative insight tied to the transcript spine

• Middle tweets:
  Sequential atomic insights resolving gaps
  (compressed, factual, non-reflective)

• Final tweet:
  A standalone factual insight
  ❌ Not a takeaway
  ❌ Not reflective
  ❌ Not a conclusion

---

STYLE RULES

• Declarative
• Factual
• Minimal adjectives
• No narrative flow
• No emotional framing

Each tweet should feel like it could stand alone in the feed.

---

STRICTLY FORBIDDEN

• Multi-sentence tweets
• Definitions
• Explanations
• Reflections
• Wrap-ups
• Emojis
• Hashtags
• “🧵 THREAD” labels
• Meta commentary

---

FINAL VALIDATION (MUST PASS)

Before output:
• Every tweet is 1 sentence
• No tweet explains another
• No reflective or interpretive language
• Output reads as native X insights

---

OUTPUT RULE (ABSOLUTE)

Return ONLY the X thread.
Plain text.
Paragraph-separated.
No analysis.
No explanations.
No meta text.
⸻

🔹 STRUCTURE REQUIREMENTS (ADAPTIVE)

You MUST include:
	•	A clear opening tied to the spine
	•	One section per gap (may be compressed depending on platform)
	•	A synthesis tying gaps together
	•	A grounded close (NO motivational CTA unless transcript implies it)

Headings:
	•	Required for YouTube / Blog
	•	Optional for LinkedIn
	•	❌ Not used for X (use paragraph breaks instead)

⸻

🔹 METRICS & SPECIFICS
	•	Quote numbers EXACTLY as stated
	•	Do NOT round or estimate
	•	If transcript lacks numbers → do not invent

⸻

🔹 QUALITY GATE (INTERNAL — DO NOT OUTPUT)

Before responding, verify:
	•	□ Every gap is resolved
	•	□ No new topics introduced
	•	□ Platform rules strictly followed
	•	□ Transcript remains the sole source of truth
	•	□ Output matches platform expectations

⸻

🔹 OUTPUT RULE (ABSOLUTE)

Return ONLY the final derivative script.
	•	Plain text
	•	No analysis
	•	No explanations
	•	No meta commentary
`;

      // Interpolate larger text blocks
      // Note: We use the original 'transcript' variable and 'gaps' array (converted to JSON)
      const finalSystemPrompt = systemPrompt
        .replace("[TRANSCRIPT]", transcript)
        .replace("[GAPS_JSON]", JSON.stringify(gaps, null, 2));

      const monologueResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: finalSystemPrompt
          },
          {
            role: "user",
            content: "Generate the derivative script now."
          }
        ],
        temperature: 0.15, // Low temp for fidelity
        max_tokens: 4000
      });

      renderedScript = monologueResp.choices[0].message.content.trim();
    }

    /* -------------------------------------------
       SAVE RESULT & STREAM END
    ------------------------------------------- */
    const finalPayload = {
      ...parsedAnalysis,
      suggested_script: renderedScript
    };

    const updatePayload = { generated_script: JSON.stringify(finalPayload) };

    // If regenerating with a new target, update the metadata too
    if (regenerateScript && req.body.targetPlatform) {
      const updatedMetadata = {
        ...analysis.metadata,
        content_target: req.body.targetPlatform
      };
      updatePayload.metadata = updatedMetadata;
    }

    await supabase
      .from("analyses")
      .update(updatePayload)
      .eq("id", aId);

    // Increment usage for Freemium YouTube limit
    if (formatMode === "monologue" && targetPlatformForCheck === "youtube") {
      await incrementUsage(user.id, "youtube_derivative");
    }

    // Emit Final Event
    res.write(JSON.stringify({ status: "script_ready", script: renderedScript }) + "\n");
    res.end();

  } catch (err) {
    console.error("Error in generate-gap-analysis:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Server error" });
    }
    res.write(JSON.stringify({ status: "error", message: "Stream interrupted" }) + "\n");
    res.end();
  }
}