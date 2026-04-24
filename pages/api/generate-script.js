import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { checkEntitlement, incrementUsage } from "../../lib/entitlements";

export const config = {
  maxDuration: 300,
};

const anthropic = new Anthropic();

export default async function handler(req, res) {
  const formatMode = req.body.formatMode || "interview";
  const tone = req.body.tone || "The Academic";

  // Handle CORS preflight
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

    let targetPlatformForCheck = null;
    if (formatMode === "monologue") {
      targetPlatformForCheck = req.body.targetPlatform || analysis.metadata?.content_target || "youtube";
    }

    const currentPlatform = analysis.metadata?.content_target || "youtube";
    const isPlatformSwitch = req.body.regenerateScript && targetPlatformForCheck !== currentPlatform;
    const isSamePlatformRegen = req.body.regenerateScript && targetPlatformForCheck === currentPlatform;

    if (!isSamePlatformRegen) {
      const { allowed, error: entitlementError, code } = await checkEntitlement(user.id, targetPlatformForCheck);
      if (!allowed) {
        console.warn(`Entitlement blocked for user ${user.id}: ${entitlementError}`);
        return res.status(403).json({ error: entitlementError, code, upgrade: true });
      }
    }

    if (isPlatformSwitch) {
      console.log(`[Freemium] Platform switch detected: ${currentPlatform} -> ${targetPlatformForCheck}`);
      await incrementUsage(user.id, "analysis");
      if (targetPlatformForCheck === "youtube") {
        await incrementUsage(user.id, "youtube_derivative");
      }
    }

    const newMetadata = { ...analysis.metadata, content_target: targetPlatformForCheck };
    await supabase.from("analyses").update({ metadata: newMetadata }).eq("id", aId);

    const transcript = analysis?.transcript || "";
    const preserveInterviewMode = formatMode === "interview";

    if (transcript.length < 200) {
      return res.status(400).json({ error: "Transcript too short" });
    }

    const gaps = req.body.gaps || analysis.gaps || [];

    // ENABLE STREAMING
    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    });

    res.write(JSON.stringify({ status: "script_generating" }) + "\n");

    const originalLength = transcript.length;
    const targetLength = Math.floor(originalLength * 0.95);

    const TONE_RULES = {
      "Conversational": "CONVERSATIONAL: Short punchy sentences, contractions, direct address. Sounds like a real person talking. No corporate phrasing.",
      "Authoritative": "AUTHORITATIVE: Every sentence is declarative. No hedging words like might, could, perhaps. The speaker has done this and is not asking permission.",
      "Storytelling": "STORYTELLING: Narrative and chronological. Sensory and specific. Short sentences land emotional beats. No abstract thesis statements.",
      "Educational": "EDUCATIONAL: Premise then explanation then example. Defines before using. Anticipates confusion. No assumed knowledge.",
      "Professional": "PROFESSIONAL: Confident and polished. No slang. Structured argument. No motivational clichés.",
      "Motivational": "MOTIVATIONAL: Action-oriented and forward-looking. Builds momentum. Grounded in what actually happened. No toxic positivity or hustle clichés.",
      "Witty": "WITTY: Unexpected word choices. Dry observations. Short sentences land the point. Never forced. Clarity is never sacrificed for a joke.",
      "Analytical": "ANALYTICAL: Logical progression. Each sentence advances the argument. Acknowledges tradeoffs. No emotional appeals or vague generalisations."
    };

    const selectedToneRule = TONE_RULES[tone] || TONE_RULES["Analytical"];

    const toneRule = `\n<tone_rule>\n${selectedToneRule}\n\nCONSISTENCY RULE:\nThe selected tone must be present in every paragraph from the first word to the last. If any paragraph drifts out of tone, rewrite it before outputting. A script that sounds casual for two paragraphs then formal for one has failed tone application.\n</tone_rule>\n`;

    const lengthConstraint = `\nCrucial Length Constraint: Analyze the word count and pacing of the original input transcript. You must ensure the final 'Derivative Script' closely matches the length and duration of the original video. If the original is a short 5-minute video, the derivative script must be concise. Do not add unnecessary filler or fluff to artificially lengthen the output.\n`;

    /* -------------------------------------------
       CHECK FOR ADVANCED FORMAT SINGLE-PASS
    ------------------------------------------- */
    const advancedFormatMap = {
      "x_thread": "x_thread",
      "linkedin_carousel": "carousel",
      "email_newsletter": "email"
    };

    const targetPlatform = targetPlatformForCheck;
    let renderedScript = "";
    const advancedTarget = advancedFormatMap[targetPlatform];

    if (advancedTarget) {
      console.log(`[Advanced Format] Generating single pass for: ${advancedTarget} with Tone: ${tone}`);

      const wordCount = transcript.split(/\s+/).length;

      const advancedSystemPrompt = `You are GapGen's Advanced Format Engine. Your job is a single-pass transformation: take the transcript and identified gaps, and produce a platform-ready derivative directly in the target format.

<absolute_rules>
- This is a TRANSFORMATION task, not content creation.
- Use ONLY ideas, examples, and facts present in the transcript.
- Resolve ALL identified gaps.
- Never invent examples, tools, frameworks, or steps not mentioned by the speaker.
- Never add advice not implied in the transcript.
- Preserve the speaker's level of abstraction — if the transcript is vague, stay vague.
- Quote numbers exactly as stated; do not estimate or infer.
</absolute_rules>${toneRule}${lengthConstraint}

<inputs>
<transcript>
${transcript}
</transcript>
<gaps>
${JSON.stringify(gaps, null, 2)}
</gaps>
<word_count>${wordCount}</word_count>
<target_platform>${advancedTarget}</target_platform>
</inputs>

${advancedTarget === "x_thread" ? `
<format_rules platform="x_thread">
<purpose>A native X/Twitter insight thread of atomic, standalone observations.</purpose>
<structure>
- Opening tweet: one declarative statement tied to the transcript's core premise.
- Middle tweets: one atomic insight per gap, in logical order.
- Final tweet: a standalone factual observation — not a takeaway, not a conclusion.
</structure>
<atomic_definition>
An atomic insight states ONE observation, action, or fact.
It does NOT explain why it matters, describe impact, or imply cause and effect.
</atomic_definition>
<split_rule>
If any sentence contains cause + effect, action + outcome, or insight + implication — SPLIT it into two separate tweets.
</split_rule>
<hard_bans>
Banned phrases (delete any tweet containing these):
- "This taught me" / "I learned that" / "I realized"
- "Which meant" / "Which led to" / "Resulting in"
- "This helped" / "This changed" / "Ultimately"
- Emojis, hashtags, thread labels like "🧵"
</hard_bans>
<validation_gate>
Before outputting, check every tweet:
1. Exactly one sentence? If not → split or delete.
2. Free of explanation, reflection, or interpretation? If not → delete.
3. No cause-effect in a single tweet? If not → split.
4. No banned phrases? If not → delete.
A short thread that passes all checks is always better than a longer invalid one.
</validation_gate>
<output_rule>Plain text only. Paragraph-separated tweets. No labels, no meta commentary.</output_rule>
</format_rules>
` : ""}

${advancedTarget === "carousel" ? `
<format_rules platform="carousel">
<purpose>A LinkedIn visual carousel of strong, slide-ready declarative statements.</purpose>
<structure>
- Slide 1: The transcript's core observation, stated plainly — no framing, no hooks.
- Slides 2–N: One gap or underdeveloped idea per slide, as a factual statement.
- Final slide: A grounded factual synthesis — not a takeaway, not a lesson.
</structure>
<slide_rules>
Each slide must be:
- ONE declarative sentence (two only if the transcript explicitly requires it).
- Self-contained — no reliance on adjacent slides.
- A CLOSED STATEMENT: states what existed, what happened, or what was observed.
- Free of explanation, evaluation, cause-and-effect, or impact language.
A slide is invalid if it could be followed by "which means…", "because…", or "resulting in…".
Delete invalid slides. Do not rewrite to soften.
</slide_rules>
<banned_words>
Delete any slide containing: "This showed", "This revealed", "Which led to", "Resulting in", "This helped", "This improved", "In order to", "Ultimately", "This means", "impacted", "revealed", "indicated", "highlighted", "disrupted", "clarified", "resulted", "led to".
</banned_words>
<style>
- Add a bold slide header to each slide.
- Professional, neutral, precise tone.
- No emojis, no bullet points, no marketing language, no calls to action (unless verbatim from transcript).
</style>
<output_rule>Plain text. Paragraph-separated slides. Bold headers. No analysis, no meta commentary.</output_rule>
</format_rules>
` : ""}

${advancedTarget === "email" ? `
<format_rules platform="email">
<purpose>A first-person, insight-driven email written entirely in the speaker's voice — a continuation of their internal experience, not a reflection on it.</purpose>
<structure>
- Subject line: specific and informational, drawn from the transcript's core premise. Not promotional. Not clickbait.
- Body: 3–5 sentence paragraphs, neutral observational tone, first-person only ("I", "my").
</structure>
<voice_rules>
Write as if the speaker is still inside the experience — describing what they did, recorded, observed, or left undefined. Not looking back on it.
Forbidden constructions (delete any sentence containing these):
- "I realized…" / "I noticed that I lacked…" / "I see now…"
- "This showed me…" / "This made it difficult…" / "This prompted me to consider…"
- "could improve" / "could enhance" / "might help"
- Any sentence that evaluates, diagnoses, or describes a lesson learned.
Required approach: describe actions, observations, and states. Leave meaning implicit.
</voice_rules>
<gap_resolution_rule>
Resolve gaps by clarifying what the speaker did, noticed, or considered — not by naming or describing the gap. Never mention "missing", "lack of", "opportunity", or "underdeveloped".
</gap_resolution_rule>
<ending_rule>
End with a grounded observation or a state the speaker found themselves in. Not a takeaway. Not a summary. No "In conclusion", "Overall", or "This show".
</ending_rule>
<output_rule>Plain text. Subject line on first line, then body. No analysis, no meta commentary.</output_rule>
</format_rules>
` : ""}

Generate the ${advancedTarget} now. Return ONLY the final output — no explanations, no analysis, no meta text.`;

      const advancedResp = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        temperature: 0.3,
        system: [{ type: "text", text: advancedSystemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Generate the ${advancedTarget} derivative now using the specified tone.` }]
      });

      renderedScript = advancedResp.content[0].text.trim();

    } else {

      /* -------------------------------------------
         CALL 2 — OUTLINE + HARD BUDGETS
      ------------------------------------------- */
      // ── CLAUDE-OPTIMISED OUTLINE PROMPT ───────────────────────────────────
      const outlineSystemPrompt = `You are a script architect. Create a strict structural outline for a derivative script that resolves every identified gap.

<rules>
- Every gap must be assigned to exactly one section.
- Character budgets must sum to approximately ${targetLength} characters total.
- Group thematically related gaps into the same section where logical.
- Output valid JSON only — no markdown, no preamble.
</rules>

<output_format>
{
  "opening_chars": number,
  "sections": [
    {
      "theme": "string — the unifying idea of this section",
      "gaps_covered": ["gap title 1", "gap title 2"],
      "chars": number
    }
  ],
  "closing_chars": number
}
</output_format>`;

      const outlineResp = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        temperature: 0.2,
        system: [{ type: "text", text: outlineSystemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(gaps) }]
      });

      let outlineText = outlineResp.content[0].text;
      const outlineMatch = outlineText.match(/\{[\s\S]*\}/);
      if (outlineMatch) {
        outlineText = outlineMatch[0];
      }
      const outline = JSON.parse(outlineText);

      let finalScript = "";

      /* -------------------------------------------
         CALL 3 — OPENING
      ------------------------------------------- */
      const openingSystemPrompt = preserveInterviewMode
        ? `You are rewriting the opening of a real interview transcript for clarity and completeness.
<format_lock>FORMAT: INTERVIEW — ABSOLUTE</format_lock>
<rules>
- Preserve all speaker turns exactly as they appear.
- Use the original speaker labels (e.g. "Host:", "Guest:", or names as given).
- Maintain the Q&A structure throughout.
- Rewrite only for clarity — do not add narration, scene-setting, atmosphere, or third-person commentary.
- Output must be unmistakably an interview. If it reads like an article or essay, rewrite it.
- Begin immediately with the first speaker label.
</rules>${toneRule}`
        : `You are writing the opening section of a first-person spoken monologue.
<format_lock>FORMAT: MONOLOGUE — ABSOLUTE</format_lock>
<rules>
- Single speaker, first-person voice throughout.
- No interviewer, no questions, no Q&A structure, no speaker labels.
- Flow naturally like a thoughtful talk — not a teacher explaining concepts.
- Establish the core premise and set up the narrative spine.
- Target length: ${outline.opening_chars} characters.
</rules>${toneRule}`;

      const openingUserMessage = preserveInterviewMode
        ? transcript
        : `Convert the following interview into the opening of a single-speaker first-person monologue. Preserve all reasoning — do not summarise or shorten.\n\n<interview>\n${transcript}\n</interview>`;

      const openingResp = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        temperature: 0.3,
        system: [{ type: "text", text: openingSystemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: openingUserMessage }]
      });

      const openingText = openingResp.content[0].text.trim();
      finalScript += openingText + "\n\n";

      /* -------------------------------------------
         CALLS 4..N — GAP SECTIONS (ROLLING CONTEXT)
      ------------------------------------------- */
      let rollingContext = openingText;

      for (const section of outline.sections) {
        const sectionSystemPrompt = preserveInterviewMode
          ? `You are continuing the same interview transcript.
<format_lock>FORMAT: INTERVIEW — ABSOLUTE</format_lock>
<context_so_far>
${rollingContext.slice(-2500)}
</context_so_far>
<rules>
- Continue directly after the existing transcript — do not repeat any of it.
- Every paragraph must belong to a named speaker.
- Maintain Q&A format with exact speaker labels.
- Resolve the assigned gaps through answers only — not narration or commentary.
- No summaries, scene descriptions, or sponsor inserts.
- Target length: ${section.chars} characters.
- If the output does not read as a transcript interview → it is invalid.
</rules>${toneRule}
<gaps_to_resolve>
${section.gaps_covered.join(", ")}
</gaps_to_resolve>`
          : `You are continuing a single-speaker first-person monologue.
<format_lock>FORMAT: MONOLOGUE — ABSOLUTE</format_lock>
<context_so_far>
${rollingContext.slice(-2500)}
</context_so_far>
<rules>
- Continue directly after the existing text — do not repeat any of it.
- Single speaker only. No interviewer, no questions, no dialogue, no speaker labels.
- Resolve the assigned gaps through continuous first-person reasoning.
- Preserve the original speaker's voice, reasoning order, and level of abstraction.
- Use the Narrative Bridge technique: when resolving a gap, acknowledge the concept ("The system relied on X…") and immediately pivot to the next available transcript fact. Never say "I didn't mention" or "this wasn't elaborated."
- Target length: ${section.chars} characters.
- If the output contains questions, dialogue, or speaker labels → it is invalid.
</rules>${toneRule}
<gaps_to_resolve>
${section.gaps_covered.join(", ")}
</gaps_to_resolve>`;

        const sectionResp = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          temperature: 0.3,
          system: [{ type: "text", text: sectionSystemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: "Continue the script now, resolving the assigned gaps." }]
        });

        const sectionText = sectionResp.content[0].text.trim();
        finalScript += sectionText + "\n\n";
        rollingContext += "\n\n" + sectionText;
      }

      /* -------------------------------------------
         FINAL CALL — CLOSING
      ------------------------------------------- */
      const closingSystemPrompt = preserveInterviewMode
        ? `You are writing the closing exchange of an interview transcript.
<format_lock>FORMAT: INTERVIEW — CLOSING</format_lock>
<rules>
- Maintain Q&A format with speaker labels.
- No narration, no summaries, no new ideas.
- End naturally with a final answer that feels like a genuine conversation close.
</rules>${toneRule}`
        : `You are writing the closing section of a first-person spoken monologue.
<format_lock>FORMAT: MONOLOGUE — CLOSING</format_lock>
<rules>
- Single speaker only. No questions, no dialogue.
- Do not summarise what came before.
- End with a complete, grounded final thought — not a motivational call to action.
- No "In conclusion", "Ultimately", "What I learned", or wrap-up phrases.
</rules>${toneRule}`;

      const closingResp = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        temperature: 0.3,
        system: [{ type: "text", text: closingSystemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: finalScript.slice(-4000) }]
      });

      finalScript += closingResp.content[0].text.trim();

      /* -------------------------------------------
         FORMAT LAYER — MONOLOGUE (POST-PROCESS)
      ------------------------------------------- */
      renderedScript = finalScript;

      if (formatMode === "monologue") {
        const metadata = analysis?.metadata || {};
        const resolvedPlatform = req.body.targetPlatform || metadata.content_target || "youtube";
        const wordCount = transcript.split(/\s+/).length;

        // ── CLAUDE-OPTIMISED DERIVATIVE SCRIPT PROMPT ─────────────────────
        const derivativeSystemPrompt = `You are GapGen's Derivative Script Engine. 
You think and write like a senior content strategist with 15 years of experience 
turning raw transcripts into platform-native content that feels authoritative, 
specific, and human — never like AI output. Your job is transformation, not 
generation.

<absolute_constraints>
- TRANSFORMATION only — not content creation.
- Use ONLY ideas, examples, metrics, and anecdotes present in the transcript.
- Resolve ALL identified gaps inline within the narrative.
- Never add frameworks, tools, or steps not mentioned in the transcript.
- Never generalise into generic creator advice.
- Never introduce new domains (branding, hiring, funding, etc.) not present 
  in the transcript.
- Quote numbers exactly as stated — do not round, estimate, or infer.
- Preserve the speaker's level of abstraction — if they were vague, stay vague.
- Write for a real human who will read or watch this — not for an AI evaluator.
- Never substitute, autocomplete, or infer proper nouns. 
  Every person's name, film title, and work referenced must 
  appear exactly as spoken in the transcript — even if a more 
  recognisable version exists.
</absolute_constraints>${toneRule}${lengthConstraint}

<gap_resolution_tiers>
Gaps are resolved differently based on severity:
CRITICAL gaps: Must be addressed with a full paragraph or dedicated spoken beat.
MEDIUM gaps: Must be woven into the narrative as a clear, substantive sentence or two.
MINOR gaps: Can be resolved inline as a natural aside or contextual detail.
</gap_resolution_tiers>

<narrative_bridge_rule>
When resolving a gap, seamlessly weave the concept into the narrative.
CRITICAL: If a gap asks for specific metrics, numbers, or baselines that are 
NOT in the transcript, DO NOT invent them and DO NOT admit they are missing.
Instead, PIVOT to the underlying principle.
NEVER use phrases like: "I haven't shared," "I didn't track," "I didn't 
explain," "What I haven't spelled out," or "I forgot to mention." Speak 
with absolute, unbroken authority at all times.
</narrative_bridge_rule>

<narrative_spine_rule>
Identify ONE core premise from the transcript. State it clearly near the 
start. Every section must connect back to this spine. No parallel themes 
or side essays.
</narrative_spine_rule>

<voice_and_quality_standard>
Write like a senior content strategist, not like an AI assistant. 
Specifically:
- Every sentence must earn its place — cut anything that restates what 
  was just said.
- Prefer concrete over abstract. If the sentence could appear in any 
  script on any topic, rewrite it until it could only appear in this one.
- Vary sentence rhythm. Short declarative sentences carry weight. 
  Longer sentences build context. Never string five long sentences in a row.
- The opening line must create immediate tension or specificity — 
  never start with a broad universal statement.
- Transitions between sections must carry argumentative logic, not just 
  chronological sequence. ("The reason this matters" not "Next up").
- The closing must leave the reader/viewer with a single, clear, 
  actionable or memorable thought — not a summary of what was just said.
</voice_and_quality_standard>

<audience_anchor_rule>
Before writing, identify who this content is for based on the transcript's 
tone, vocabulary, and subject matter. Write every sentence as if you can 
picture that specific person reading or watching. This means:
- Use vocabulary they would use, not vocabulary that sounds impressive.
- Address pain points they actually feel, not ones you assume they have.
- Never write a sentence that requires the reader to already agree with 
  the premise to find it useful.
</audience_anchor_rule>

<inputs>
<transcript>
${transcript}
</transcript>
<gaps>
${JSON.stringify(gaps, null, 2)}
</gaps>
<word_count>${wordCount}</word_count>
<target_platform>${resolvedPlatform}</target_platform>
</inputs>

${resolvedPlatform === "youtube" ? `
<platform_rules platform="youtube">
<purpose>Spoken monologue for video — continuous, natural, camera-ready.</purpose>
<structure>
1. Hook — spoken, natural, creates specific tension in the first sentence.
2. Spine statement — one clear premise the whole script serves.
3. Story/Journey — chronological narrative with timestamps at each paragraph.
4. Synthesis — connect the gap resolutions back to the spine explicitly.
5. Close — one grounded final thought. No motivational CTA unless the transcript implies it.
</structure>
<timestamp_rule>
Format: [MM:SS] at the start of every paragraph. Increment by 30-45 seconds per paragraph.
</timestamp_rule>
<format_rules>
- Each paragraph: 3–5 sentences that flow naturally when spoken aloud.
- Do NOT use one-sentence paragraphs, bullet rhythms, or atomic thread-style decomposition.
- When resolving gaps, prefer concrete spoken explanation over compressed abstraction.
</format_rules>
<hard_bans>
- One-sentence paragraphs
- Bullet-style rhythm
- Essay-style section headers
- Thread-style atomic structure
</hard_bans>
</platform_rules>
` : ""}

${resolvedPlatform === "blog" ? `
<platform_rules platform="blog">
<purpose>Long-form written article — analytical, grounded, reader-first.</purpose>
<structure>
- Clear section headers (## Heading syntax).
- Logical progression from premise through gap resolutions to synthesis.
- Paragraphs: 3–5 sentences each.
- No spoken cues ("you know", "right", "so").
</structure>
<termination_rule>
Do NOT use: "In conclusion", "Ultimately", "This taught me", "What I learned". End with a grounded observation that advances understanding — not a wrap-up.
</termination_rule>
</platform_rules>
` : ""}

${resolvedPlatform === "linkedin" ? `
<platform_rules platform="linkedin">
<purpose>Professional insight post — reflective, credible, thought-leadership tone.</purpose>
<structure>
- Lines 1–4: Strong opening insight.
- Short paragraphs: 2–3 sentences, double line-break between each.
- 3 bullet points covering key gap resolutions.
- 1 bold question at the end on its own line.
</structure>
<hard_bans>
- Emojis
- Hashtags
- Motivational clichés
- "This showed me" / "I learned"
</hard_bans>
</platform_rules>
` : ""}

${resolvedPlatform === "x" ? `
<platform_rules platform="x">
<purpose>Native X/Twitter insight thread — atomic, declarative, feed-ready.</purpose>
<atomic_definition>
One tweet = one sentence = one atomic observation, action, or fact.
</atomic_definition>
<structure>
- Opening tweet: one declarative statement tied to the transcript spine.
- Middle tweets: one atomic insight per gap, sequential.
- Final tweet: a standalone factual observation — not a takeaway.
</structure>
<split_rule>
Any sentence with cause + effect, action + outcome, or insight + implication MUST be split into two tweets.
</split_rule>
<hard_bans>
"I learned" / "This taught me" / "Ultimately" / "In summary" / emojis / hashtags / "🧵"
</hard_bans>
<validation_gate>
1. Exactly one sentence?
2. No explanation or reflection?
3. No cause-effect in single tweet?
4. No banned phrases?
Delete if any rule violated.
</validation_gate>
</platform_rules>
` : ""}

<universal_validation_gate>
Before outputting, verify: gap resolution, specific non-generic paragraphs, no summary close, and tone compliance.
Return ONLY the final derivative script. Plain text. 
No analysis, no explanations, no meta commentary.
</universal_validation_gate>`;
        const monologueResp = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          temperature: 0.15,
          system: [{ type: "text", text: derivativeSystemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: "Generate the derivative script now." }]
        });

        renderedScript = monologueResp.content[0].text.trim();
      }
    }

    /* -------------------------------------------
       SAVE RESULT & STREAM END
    ------------------------------------------- */
    const finalPayload = {
      summary: req.body.summary || analysis.summary || "",
      gaps: gaps,
      titles: req.body.titles || analysis.titles || [],
      keywords: req.body.keywords || analysis.keywords || [],
      suggested_script: renderedScript
    };

    const updatePayload = { generated_script: JSON.stringify(finalPayload) };

    if (req.body.targetPlatform) {
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

    if (formatMode === "monologue" && targetPlatformForCheck === "youtube") {
      await incrementUsage(user.id, "youtube_derivative");
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
