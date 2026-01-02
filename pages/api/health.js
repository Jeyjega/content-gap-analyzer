// /pages/api/health.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Simple check: try to fetch one analysis row (safe even if empty)
    const { data, error } = await supabase
      .from("analyses")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({ ok: false, error: error.message || error });
    }

    return res.status(200).json({
      ok: true,
      message: "Supabase connection OK",
      sampleRow: data?.[0] ?? null,
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
