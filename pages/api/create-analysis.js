// pages/api/create-analysis.js
import { createClient } from "@supabase/supabase-js";
import { incrementUsage, checkEntitlement } from "../../lib/entitlements";

function pickNiceTitle({ providedTitle, videoId, metadata, transcript }) {
  if (providedTitle && String(providedTitle).trim()) return String(providedTitle).trim();
  if (metadata && (metadata.title || metadata.name)) return metadata.title || metadata.name;

  if (transcript && String(transcript).trim()) {
    const plain = String(transcript).trim();
    return plain.length <= 120 ? plain : plain.slice(0, 120).trim() + "…";
  }

  return videoId ? `Analysis for ${videoId}` : "Analysis";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get auth token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    // 2. Authenticated client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check Entitlement (Analysis Limit)
    // We pass null for platform because 'analysis' is a global metric in checkEntitlement logic for TOTAL limit
    const { allowed, error: entitlementError, code } = await checkEntitlement(user.id, null);
    if (!allowed) {
      return res.status(403).json({ error: entitlementError, code, upgrade: true });
    }


    const {
      title,
      videoId,
      video_id,
      video_url,
      transcript,
      metadata,
      status,
      type
    } = req.body || {};

    const chosenVideoId = videoId ?? video_id ?? null;
    const isYoutube = !type || type === "youtube";

    if (isYoutube && (!chosenVideoId && !video_url)) {
      return res.status(400).json({ error: "Missing videoId or video_url" });
    }

    if (!transcript) {
      return res.status(400).json({ error: "Missing transcript" });
    }

    // Heuristic detection for interviews
    const isInterview = detectInterviewFormat(transcript);

    const niceTitle = pickNiceTitle({
      providedTitle: title,
      videoId: chosenVideoId,
      metadata,
      transcript
    });

    const finalType = type || "youtube";
    const finalMetadata = { ...(metadata || {}), type: finalType, is_interview: isInterview };

    const payload = {
      title: niceTitle,
      video_id: chosenVideoId ?? null,
      video_url: video_url || "https://placeholder.internal/text-analysis",
      transcript,
      metadata: finalMetadata,
      status: status ?? "created",
      created_at: new Date().toISOString()
      // user_id is automatically assigned by RLS default or trigger if set up correctly. 
      // If the RLS policy is to insert with auth.uid() = user_id, we can explicitly pass it or rely on default.
      // Safest is to explicitly pass user_id if column exists, OR rely on RLS check.
      // But typically RLS "allows" the insert, the default value sets the user_id.
      // If table has DEFAULT auth.uid(), we are good. If not, we SHOULD insert it manually here.
      // Let's explicitly insert user_id to be safe and compatible with standard RLS policies.
      // HOWEVER, if we pass user_id, RLS 'WITH CHECK' will validate it matches auth.uid().
    };

    // Explicitly add user_id to payload to satisfy NOT NULL if no default exists
    payload.user_id = user.id;

    const { data, error } = await supabase
      .from("analyses")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("create-analysis supabase error:", error);
      return res.status(500).json({
        error: "DB insert failed",
        details: error
      });
    }

    // Increment usage stats for Freemium enforcement
    await incrementUsage(user.id, 'analysis');

    return res.status(200).json({ analysisId: data.id, analysis: data, is_interview: isInterview });

  } catch (err) {
    console.error("create-analysis unexpected error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err instanceof Error ? err.message : err
    });
  }
}

/**
 * Heuristic to detect if a transcript is likely an interview/podcast with multiple speakers.
 */
function detectInterviewFormat(text) {
  if (!text || text.length < 100) return false;

  // 1. Check for Speaker Labels (e.g., "Host:", "Guest:", "John:", "Speaker 1:")
  // Look for patterns like "Name:" at start of lines or sentences
  const speakerLabelRegex = /^[A-Z][a-z]+(\s[A-Z][a-z]+)?:\s/gm;
  const speakerMatches = (text.match(speakerLabelRegex) || []).length;

  // 2. Check for frequent question marks indicative of Q&A
  const questionMarkCount = (text.match(/\?/g) || []).length;
  const questionDensity = questionMarkCount / (text.length / 1000); // Questions per 1000 chars

  // Thresholds
  const hasManyLabels = speakerMatches > 5;
  const isHighQuestionDensity = questionDensity > 2.5; // e.g. >2-3 questions per 1k chars usually implies dialogue

  return hasManyLabels || isHighQuestionDensity;
}
