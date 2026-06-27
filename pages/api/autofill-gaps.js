import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  maxDuration: 60,
};

const anthropic = new Anthropic();

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

    const { originalScript, criticalGaps } = req.body;
    if (!originalScript || !criticalGaps || !Array.isArray(criticalGaps)) {
      return res.status(400).json({ error: "Missing originalScript or criticalGaps array" });
    }

    if (criticalGaps.length === 0) {
      return res.status(200).json({});
    }

    const gapsListText = criticalGaps
      .map((g, i) => `[${i + 1}] ID: ${g.id || ""}\nTitle: ${g.title}\nDescription: ${g.description}\nCategory: ${g.category}`)
      .join("\n\n");

    const systemPrompt = `You are an AI assistant helping a content creator fill in missing facts for a narrative script. Based on the provided original script and the list of missing critical gaps, invent highly realistic, plausible, and specific mock data (e.g., realistic revenue numbers, specific marketing tactics, logical timelines) to resolve each gap.
You must output ONLY raw, valid JSON. Do not include any markdown formatting, do not use \`\`\`json code blocks, and do not include any conversational text.
Ensure you use the EXACT gap.title or gap.id (from the provided list) as the keys in the JSON object, matching the casing and text exactly.
Each key's value must be a single plain-text string containing the mock answer (e.g., "The product cost $49 on launch day. Out of 5,000 unique visitors, 120 signed up for a trial and 15 converted to paid subscribers."). Do NOT use nested objects, arrays, or JSON structures for the values. All values MUST be string types.
CRITICAL: You must be extremely concise to save tokens. Provide a direct, short answer for each gap. Limit every single value to a maximum of 1 to 2 short sentences (under 20 words per gap). Do not write paragraphs.`;

    const userMessage = `Original Script:\n${originalScript.slice(0, 8000)}\n\nCritical Gaps:\n${gapsListText}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      temperature: 0.2,
      system: [{ type: "text", text: systemPrompt }],
      messages: [{ role: "user", content: userMessage }]
    });

    let responseText = response.content[0].text.trim();
    
    // Clean up potential markdown formatting if wrapped
    // 1. Remove leading ```json or ```
    responseText = responseText.replace(/^\s*```(?:json)?\s*/i, "");
    // 2. Locate trailing ``` and remove everything after it
    const closingIndex = responseText.lastIndexOf("```");
    if (closingIndex !== -1) {
      responseText = responseText.substring(0, closingIndex);
    }
    responseText = responseText.trim();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Claude autofill response as JSON. Raw response text was:", responseText);
      throw new Error(`JSON parse error: ${parseError.message}. Raw response: ${responseText}`);
    }
    return res.status(200).json(data);

  } catch (err) {
    console.error("Error in autofill-gaps API:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
