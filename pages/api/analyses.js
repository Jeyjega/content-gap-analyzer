// pages/api/analyses.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    // 2. Create an authenticated Supabase client
    // We explicitly pass the global headers so Supabase uses the user's JWT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // 3. Verify the user
    // This call hits Supabase Auth to validate the token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 4. Query data with RLS
    // The query automatically filters by user_id based on the RLS policy defined in SQL.
    // No manual "user_id" filter is needed here.
    const { limit = 20 } = req.query;
    const { data, error } = await supabase
      .from("analyses")
      .select("id, title, video_id, video_url, status, created_at, generated_script")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) {
      console.error("analyses list error:", error);
      return res.status(500).json({ error: "DB error", details: error });
    }

    return res.status(200).json({ analyses: data });
  } catch (err) {
    console.error("analyses handler error:", err);
    return res.status(500).json({
      error: "server error",
      details: err?.message ?? String(err),
    });
  }
}
