// pages/api/create-embeddings.js
import { createClient } from "@supabase/supabase-js";
import { openai } from "../../lib/openaiServer";

/**
 * Utility: split into batches
 */
function batchesOf(arr = [], n = 50) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const analysisId = body.analysisId || body.analysis_id || body.analysis || null;
    const chunks = Array.isArray(body.chunks) ? body.chunks : null;

    if (!analysisId) return res.status(400).json({ error: "Missing analysisId" });
    if (!chunks || chunks.length === 0) return res.status(400).json({ error: "Missing chunks (empty array)" });

    // Verify ownership of the analysis BEFORE inserting chunks
    // The authenticated client will only find the analysis if RLS permits
    const { data: analysis, error: aErr } = await supabase
      .from("analyses")
      .select("id")
      .eq("id", analysisId)
      .single();

    if (aErr || !analysis) {
      return res.status(404).json({ error: "Analysis not found or permission denied" });
    }

    // Decide whether we need to call OpenAI for embeddings
    const firstHasEmbedding = !!(chunks[0] && (chunks[0].embedding || chunks[0].embedding_vector || chunks[0].vector));
    let rowsToInsert = [];

    if (!firstHasEmbedding) {
      // Create embeddings in batches
      const texts = chunks.map((c) => (c && c.text) || "");
      const textBatches = batchesOf(texts, 100); // 100 per request, adjust if needed

      const embeddings = [];
      for (let i = 0; i < textBatches.length; i++) {
        const batch = textBatches[i];
        // call OpenAI embeddings API
        try {
          const resp = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: batch,
          });
          // resp.data is an array with embedding vectors
          if (!resp || !Array.isArray(resp.data)) {
            throw new Error("OpenAI embeddings response missing data");
          }
          for (const d of resp.data) embeddings.push(d.embedding);
        } catch (err) {
          console.error("openai.embeddings.create error:", err);
          return res.status(500).json({ error: "OpenAI embeddings failed", details: err?.message ?? String(err) });
        }
      }

      if (embeddings.length !== texts.length) {
        console.error("embedding count mismatch", { expected: texts.length, got: embeddings.length });
        return res.status(500).json({ error: "Embedding count mismatch", details: { expected: texts.length, got: embeddings.length } });
      }

      // Build rows to insert
      rowsToInsert = chunks.map((c, i) => ({
        analysis_id: analysisId,
        chunk_index: typeof c.index === "number" ? c.index : i,
        chunk_text: c.text ?? "",
        embedding: embeddings[i], // if your column is vector(1536) pgvector accepts a JS array
      }));
    } else {
      // Client provided embeddings inline
      rowsToInsert = chunks.map((c, i) => ({
        analysis_id: analysisId,
        chunk_index: typeof c.index === "number" ? c.index : i,
        chunk_text: c.text ?? "",
        embedding: c.embedding ?? c.embedding_vector ?? c.vector ?? null,
      }));
    }

    // Insert rows: attempt in one batch, fallback to chunked inserts if necessary
    try {
      // Using authenticated client for insert -> enforces RLS/policies
      // Ensure 'chunks' table permits INSERT for authenticated users where analysis_id belongs to them?
      // Usually chunks are child table. If RLS on chunks checks `analysis_id` -> `analyses.user_id`, we are good.
      // If chunks has generic insert policy "authenticated users can insert", we are good but less secure.
      // Ideally "insert if (select user_id from analyses where id=new.analysis_id) == auth.uid()"
      const { data, error } = await supabase.from("chunks").insert(rowsToInsert).select();

      if (error) {
        console.error("supabase insert error (single batch):", error);
        // If single-batch failed due to size, try chunked inserts of 200 rows
        const smallBatches = batchesOf(rowsToInsert, 200);
        const insertedRows = [];
        for (let bi = 0; bi < smallBatches.length; bi++) {
          const b = smallBatches[bi];
          const { data: d, error: e } = await supabase.from("chunks").insert(b).select();
          if (e) {
            console.error(`supabase insert failed on batch ${bi + 1}/${smallBatches.length}`, e);
            return res.status(500).json({ error: "Failed to save chunks", details: e });
          }
          if (d) insertedRows.push(...d);
        }
        return res.status(200).json({ inserted: insertedRows.length, rows: insertedRows });
      }

      // success path
      return res.status(200).json({ inserted: (data && data.length) || 0, rows: data || [] });
    } catch (err) {
      console.error("create-embeddings handler error", err);
      return res.status(500).json({ error: "Server error creating embeddings", details: err?.message ?? String(err) });
    }
  } catch (err) {
    console.error("create-embeddings outer error", err);
    return res.status(500).json({ error: "Server error creating embeddings", details: err?.message ?? String(err) });
  }
}
