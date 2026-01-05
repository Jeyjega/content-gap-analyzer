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
    const preserveInterviewMode = formatMode === "interview"; // or derive from analysis if you have a flag
    if (transcript.length < 200) {
      return res.status(400).json({ error: "Transcript too short" });
    }

    console.log("FORMAT MODE:", formatMode);
    console.log("PRESERVE INTERVIEW MODE:", preserveInterviewMode);
    console.log(
      "OPENING INPUT TYPE:",
      preserveInterviewMode ? "INTERVIEW TRANSCRIPT" : "MONOLOGUE-SEED"
    );

    const originalLength = transcript.length;
    const targetLength = Math.floor(originalLength * 0.95);

    /* -------------------------------------------
       CALL 1 — GAP ANALYSIS
    ------------------------------------------- */
    const gapPrompt = `
You are a senior content strategist.

Analyze the transcript and return JSON ONLY:

{
  "summary": "...",
  "gaps": [
    { "title": "...", "suggestion": "...", "priority": "Critical|Medium|Minor" }
  ],
  "titles": ["...", "...", "..."],
  "keywords": ["...", "..."]
}

Rules:
- Gap count must scale with length
- Long content → 15–25 gaps
- Do NOT invent gaps
- Do NOT repeat gaps
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

    /* -------------------------------------------
       CALL 2 — OUTLINE + HARD BUDGETS
    ------------------------------------------- */
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
       SAVE RESULT
    ------------------------------------------- */
    const finalPayload = {
      ...parsedAnalysis,
      suggested_script: renderedScript
    };

    await supabase
      .from("analyses")
      .update({ generated_script: JSON.stringify(finalPayload) })
      .eq("id", aId);

    return res.status(200).json({
      analysisId: aId,
      parsed: finalPayload
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}