import fetch from "node-fetch";
import { ApifyClient } from "apify-client";
import { YoutubeTranscript } from "youtube-transcript";

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: true,
  },
};

export const dynamic = 'force-dynamic';

function extractVideoId(urlOrId) {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();

  if (/^[A-Za-z0-9_-]{8,}$/.test(s) && !s.includes("http")) {
    return s;
  }

  const vMatch = s.match(/[?&]v=([^&]+)/);
  if (vMatch && vMatch[1]) return vMatch[1];

  const shortMatch = s.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  const shortsMatch = s.match(/\/shorts\/([^?&/]+)/);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  return null;
}

function normalizeInput(body = {}) {
  const possibleUrls = [body.url, body.videoUrl, body.youtubeUrl, body.youtube_url].filter(Boolean);
  const raw = possibleUrls.length > 0 ? possibleUrls[0] : body.videoId || body.id || "";
  const asString = String(raw || "").trim();

  const idFromInput = extractVideoId(asString);
  if (idFromInput) {
    return {
      videoId: idFromInput,
      url: `https://www.youtube.com/watch?v=${idFromInput}`,
    };
  }

  try {
    if (asString.startsWith("http")) {
      const u = new URL(asString);
      const v = u.searchParams.get("v");
      if (v) {
        return { videoId: v, url: `https://www.youtube.com/watch?v=${v}` };
      }
      if (u.hostname && u.hostname.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id) return { videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
      }
      return { videoId: null, url: `${u.origin}${u.pathname}` };
    }
  } catch (e) {}

  return { videoId: null, url: asString || null };
}

async function getYouTubeMetadata(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await res.text();
    let duration = null;
    let title = "YouTube Video";
    
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    if (durationMatch && durationMatch[1]) {
      duration = parseInt(durationMatch[1], 10);
    }
    
    const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    }
    
    return { duration, title };
  } catch (e) {
    console.warn("Could not fetch YouTube metadata", e);
    return { duration: null, title: "YouTube Video" };
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const input = normalizeInput(req.body || {});
  if (!input || (!input.url && !input.videoId)) {
    return res.status(400).json({ error: "Missing YouTube URL or ID." });
  }

  const videoId = input.videoId || extractVideoId(input.url);
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL or ID." });
  }

  const videoUrl = input.url || `https://www.youtube.com/watch?v=${videoId}`;

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });

  const heartbeatInterval = setInterval(() => {
    res.write(" "); // Send space to keep alive
  }, 5000);

  try {
    console.log(`Starting transcription extraction for Video ID: ${videoId}`);
    
    const metadata = await getYouTubeMetadata(videoId);

    let finalTranscript = "";
    let source = "";

    // Step 1: Free captions (youtube-transcript)
    console.log("Step 1: Attempting free captions via youtube-transcript...");
    try {
      const ytTranscript = await YoutubeTranscript.fetchTranscript(videoId);
      if (ytTranscript && ytTranscript.length > 0) {
        finalTranscript = ytTranscript.map(t => t.text).join(" ");
        source = "youtube-transcript";
        console.log("Step 1 succeeded: youtube-transcript extracted captions.");
      } else {
        throw new Error("youtube-transcript returned empty array.");
      }
    } catch (step1Err) {
      console.log(`Step 1 failed: ${step1Err.message}`);
      
      // Step 2: Apify fallback
      console.log("Step 2: Attempting Apify fallback extraction...");
      try {
        if (!process.env.APIFY_API_TOKEN) {
          throw new Error("Missing APIFY_API_TOKEN");
        }
        const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
        
        const run = await client.actor("akash9078/youtube-transcript-extractor").call({
          videoUrl: videoUrl
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (items && items.length > 0) {
          const item = items[0];
          // Try different possible keys for transcript text
          const extractedText = item.transcript || item.text || item.transcriptText || item.fullText;
          if (extractedText) {
            finalTranscript = extractedText;
            source = "apify-extractor";
            console.log("Step 2 succeeded: Apify actor extracted transcript.");
          } else {
            throw new Error("Apify dataset item did not contain transcript text.");
          }
        } else {
          throw new Error("Apify run returned empty dataset.");
        }
      } catch (step2Err) {
        console.log(`Step 2 failed: ${step2Err.message}`);
        throw new Error("This video could not be transcribed. Please try another video.");
      }
    }

    clearInterval(heartbeatInterval);

    res.write(JSON.stringify({
      source,
      transcript: finalTranscript,
      metadata
    }));
  } catch (err) {
    clearInterval(heartbeatInterval);
    console.error("Transcription pipeline error:", err.message);
    
    let code = err.code || "SYSTEM_ERROR";
    if (code !== "VIDEO_TOO_LONG") {
       code = "TRANSCRIPTION_ERROR";
    }

    res.write(JSON.stringify({
      error: err.message,
      code: code,
      details: err.message
    }));
  } finally {
    clearInterval(heartbeatInterval);
    res.end();
  }
}
