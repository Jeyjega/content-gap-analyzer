import { createClient } from "@supabase/supabase-js";
import { openai } from "../../lib/openaiServer";

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

    const parsedAnalysis = JSON.parse(gapResp.choices[0].message.content);
    const gaps = parsedAnalysis.gaps || [];

    // CRITICAL UPDATE: EMIT GAPS IMMEDIATELY
    res.write(JSON.stringify({
      status: "gaps_ready",
      gaps: parsedAnalysis.gaps,
      summary: parsedAnalysis.summary,
      titles: parsedAnalysis.titles,
      keywords: parsedAnalysis.keywords
    }) + "\n");

    // Also save interim result to DB (silent background save)
    await supabase
      .from("analyses")
      .update({
        summary: parsedAnalysis.summary,
        gaps: parsedAnalysis.gaps,
        titles: parsedAnalysis.titles,
        keywords: parsedAnalysis.keywords
      })
      .eq("id", aId);

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
      const monologueResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
🚫 GAPGENS MONOLOGUE — PRODUCTION MODE (FINAL)

You are converting an INTERVIEW TRANSCRIPT into a SINGLE-SPEAKER, FIRST-PERSON EXPERT MONOLOGUE.

This is a TRANSFORMATION TASK, not content creation.

⸻

🔹 AUTHORITATIVE INPUTS

Transcript (sole source of truth):
[TRANSCRIPT]

Identified Gaps (JSON, ordered):
[GAPS_JSON]

Original Word Count:
[COUNT]

⸻

🔹 NON-NEGOTIABLE OUTPUT CONSTRAINTS

1️⃣ LENGTH (STRICT)
	•	If [COUNT] ≥ 1,000 words:
	•	Final output must be 60%–80% of [COUNT] words
	•	If [COUNT] < 1,000 words:
	•	Final output must be the greater of:
	•	60%–80% of [COUNT], OR
	•	600–800 words (suitable for a 4–6 minute spoken monologue)
	•	Expansion is allowed ONLY by resolving the listed gaps using transcript material
	•	❌ Do NOT introduce new topics, stories, or advice

If output exceeds limits → CUT
If output is short → EXPAND ONLY via transcript-grounded gap resolution

⸻

2️⃣ SOURCE FIDELITY (CRITICAL)

You MAY:
	•	Rephrase
	•	Compress
	•	Reorder
	•	Add short glue sentences for flow

You MUST:
	•	Use ONLY ideas, examples, metrics, and stories present in the transcript
	•	Anchor EVERY gap resolution to transcript material

You MUST NOT:
❌ Invent advice, frameworks, steps, or philosophies
❌ Add domains not explicitly discussed (branding, legal, fundraising, hiring, networking, etc.)
❌ Generalize into generic startup or creator advice

If it is not in the transcript or implied by a listed gap → DO NOT ADD IT

⸻

3️⃣ SINGLE NARRATIVE SPINE (MANDATORY)
	•	Identify ONE core question or premise from the transcript
(e.g., “If I had to start a company again…”)
	•	State this spine clearly in the opening
	•	Every section must connect back to this spine
	•	❌ No secondary essays or parallel themes

⸻

🔹 STRUCTURE (STRICT — HEADINGS REQUIRED)

Use clear, descriptive headings.
Headings must reflect transcript language or gap topics.
No numbering. No clickbait. No “How to”.

Required Order:

HOOK
	•	Restate the core spine question
	•	Explicitly name ALL gaps (briefly, in natural language)
	•	Explain why these gaps matter to the spine

STORY / JOURNEY
	•	Reconstruct the speaker’s story from the transcript
	•	Use concrete events, decisions, mistakes, outcomes
	•	❌ No abstraction or filler

GAP RESOLUTION SECTIONS (ONE PER GAP, IN ORDER)
For EACH gap in [GAPS_JSON]:
	•	Use a heading derived from the gap topic
	•	Start with:
	•	an exact quote from the transcript, OR
	•	a faithful paraphrase if the transcript wording is fragmented
	•	Clearly expand and resolve the gap using:
	•	transcript examples
	•	transcript metrics
	•	transcript anecdotes
	•	❌ Do NOT merge gaps
	•	❌ Do NOT skip gaps
	•	❌ Do NOT invent missing information

SYNTHESIS
	•	Explain how these exact gaps connect
	•	Tie them back to the original spine
	•	Use transcript examples only
	•	❌ No new ideas

CLOSE + CTA
	•	Re-list ALL gaps resolved
	•	Reinforce the core insight
	•	Give ONE grounded action step implied by the transcript
	•	❌ No motivational clichés

⸻

🔹 VOICE & STYLE (STRICT)
	•	First-person only (“I learned…”, “What surprised me was…”)
	•	Sounds like the original speaker, not an AI
	•	Founder-to-founder / expert-to-expert
	•	Concrete > abstract
	•	Preserve cadence and phrasing patterns

AVOID COMPLETELY:
❌ Poetic or inspirational language
❌ LinkedIn essay tone
❌ Corporate whitepaper voice
❌ “In conclusion”, “To summarize”, “The key takeaway is”

⸻

🔹 PARAGRAPH & READABILITY RULES
	•	Paragraphs: 3–5 sentences max
	•	Spoken-language flow (recordable as 10–15 min video)
	•	Dense, valuable, no padding

⸻

🔹 METRICS & SPECIFICS
	•	If numbers appear in the transcript, quote them exactly
	•	Do NOT round, estimate, or modify figures

⸻

🔹 OPTIONAL YOUTUBE VISUAL CUES (LIGHT)

You MAY add occasional cues like:
	•	[Pause for emphasis]
	•	[Cut to B-roll]
	•	[Show graphic: workflow]
	•	[On-screen text: metric]

Do NOT overuse.

⸻

🔹 QUALITY GATE (INTERNAL — DO NOT OUTPUT)

Before responding, verify:
	•	□ Every gap has its own section
	•	□ Each gap is grounded in transcript material
	•	□ Length constraints are met
	•	□ One narrative spine throughout
	•	□ No new domains introduced
	•	□ Sounds human, not AI-generated

⸻

🔹 OUTPUT RULE (ABSOLUTE)

Return ONLY the final monologue script.

Plain text.
With headings.
No analysis.
No explanations.
No meta commentary.
`
          },
          {
            role: "user",
            content: finalScript
          }
        ],
        temperature: 0.15,
        max_tokens: 2200
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

    await supabase
      .from("analyses")
      .update({ generated_script: JSON.stringify(finalPayload) })
      .eq("id", aId);

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