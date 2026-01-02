// pages/api/update-analysis.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    let body = req.body;
    // ... Next.js usually parses JSON.

    const analysisId = body.analysisId || body.analysis_id || body.id;
    const generated_script = body.generated_script ?? body.generatedScript ?? body.script;
    const status = body.status ?? null;

    if (!analysisId) return res.status(400).json({ error: "analysisId is required" });

    if (generated_script === undefined && status === null) {
      return res.status(400).json({ error: "Nothing to update (provide generated_script and/or status)" });
    }

    const updates = {};
    if (typeof generated_script === "string") updates.generated_script = generated_script;
    if (status !== null) updates.status = status;

    const { data, error } = await supabase
      .from("analyses")
      .update(updates)
      .eq("id", analysisId)
      .select("*"); // default RLS means user must own it

    if (error) {
      console.error("update-analysis supabase error:", error);
      return res.status(500).json({ error: "DB update failed", details: error });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Analysis not found or permission denied" });
    }

    return res.status(200).json({ updated: data.length, analysis: data[0] });
  } catch (err) {
    console.error("update-analysis handler unexpected error:", err);
    return res.status(500).json({ error: "Server error", details: err?.message ?? String(err) });
  }
}
