import { createClient } from "@supabase/supabase-js";
import { openai } from "../../lib/openaiServer";

export default async function handler(req, res) {
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
    const preserveInterviewMode = true; // or derive from analysis if you have a flag
    if (transcript.length < 200) {
      return res.status(400).json({ error: "Transcript too short" });
    }

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
        { role: "user", content: transcript }
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
            content: preserveInterviewMode ? `
🚫 FORMAT LOCK — INTERVIEW MODE (ABSOLUTE)

You are CONTINUING THE SAME INTERVIEW.

Current transcript (DO NOT repeat):
${rollingContext.slice(-2500)}

STRICT RULES (NON-NEGOTIABLE):
- Output MUST be in Q&A interview format
- Preserve speaker labels exactly (e.g., Interviewer:, Yang:)
- Each paragraph MUST belong to a speaker
- NO narration
- NO third-person commentary
- NO scene setting
- NO sponsor lines
- NO re-introductions
- NO summaries
- NO meta commentary

Resolve these gaps THROUGH ANSWERS ONLY:
${section.gaps_covered.join(", ")}

Clarify reasoning through natural answers.
Do NOT turn this into an article.
Do NOT explain concepts like a teacher.

Target length: ${section.chars} characters.

If this reads like an essay, documentary, or narration → INVALID.
` : `
🚫 EDITORIAL MODE — NARRATIVE EXPANSION

You are rewriting a REAL conversation into a smooth, human, editorial narrative.

Rules:
- NO lists
- NO instructional tone
- NO topic resets
- NO summarizing voice
- Assume an intelligent reader

Current progress:
${rollingContext.slice(-2500)}

Section theme:
"${section.theme}"

Resolve these gaps IMPLICITLY:
${section.gaps_covered.join(", ")}

Target length: ${section.chars} characters.
`
          }
        ],
        temperature: 0.25,
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
          content: preserveInterviewMode ? `
🚫 FORMAT LOCK — INTERVIEW MODE (CLOSING)

You are writing the FINAL exchange of the SAME INTERVIEW.

STRICT RULES:
- Maintain Q&A interview format
- Preserve speaker labels exactly
- Each paragraph must belong to a speaker
- NO narration
- NO summarizing voice
- NO third-person commentary
- NO new ideas

End naturally with a final answer from the speaker.
This must feel like the interview ending organically.
` : `
🚫 ABSOLUTE END OVERRIDE (NON-NEGOTIABLE)

Write an editorial closing (${outline.closing_chars} chars).

Rules:
- Synthesize ALL gaps
- Tie back to the opening
- End with a COMPLETE, final thought
- NO abrupt stop
- NO new ideas
- NO questions at the end
`
        },
        { role: "user", content: finalScript.slice(-4000) }
      ],
      temperature: 0.3,
      max_tokens: 1200
    });

    finalScript += closingResp.choices[0].message.content.trim();

    /* -------------------------------------------
       SAVE RESULT
    ------------------------------------------- */
    const finalPayload = {
      ...parsedAnalysis,
      suggested_script: finalScript
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