// pages/api/analysis/[id].js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL env (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL).");
}
if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // reduce retries/timeouts in dev if helpful:
  global: {
    fetch: globalThis.fetch,
  },
});

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    // debug: show that we have a URL (not the key)
    console.log(`[analysis API] fetching analysis id=${id} supabaseUrlPresent=${!!SUPABASE_URL}`);

    // fetch analysis
    const { data: analysis, error: aErr } = await supabaseAdmin
      .from("analyses")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();

    if (aErr) {
      console.error("fetch analysis error:", aErr);
      return res.status(500).json({ error: "DB error", details: aErr });
    }

    // fetch chunks (if table exists)
    let chunks = [];
    try {
      const { data: cdata, error: cErr } = await supabaseAdmin
        .from("chunks")
        .select("id, chunk_index, chunk_text, embedding, created_at")
        .eq("analysis_id", id)
        .order("chunk_index", { ascending: true });

      if (cErr) {
        // non-fatal: log and continue with empty chunks
        console.warn("chunks fetch warning:", cErr);
      } else {
        chunks = cdata || [];
      }
    } catch (e) {
      console.warn("chunks fetch skipped (exception):", e?.message || e);
    }

    return res.status(200).json({ analysis, chunks });
  } catch (err) {
    console.error("analysis handler error:", err);
    // If err is from fetch failing, include hint:
    const isFetchErr = String(err?.message || "").toLowerCase().includes("fetch failed");
    return res.status(500).json({
      error: "server error",
      details: err?.message ?? String(err),
      hint: isFetchErr
        ? "fetch failed: check SUPABASE_URL and network connectivity from this machine. Try 'curl <your-supabase-url>' from the terminal."
        : undefined,
    });
  }
}
