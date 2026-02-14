// pages/api/transcribe.js
import { generate } from "youtube-po-token-generator";
import { toFile } from "openai";

/**
 * Config
 */
export const config = {
  maxDuration: 60, // Standard limit (Hobby=10s/60s, Pro=300s)
  api: {
    bodyParser: true,
  },
};

// Force dynamic to prevent static generation
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
  } catch (e) {
    // not a URL
  }

  return { videoId: null, url: asString || null };
}

/**
 * Whisper Transcription (In-Memory)
 */
async function transcribeBufferWithOpenAI(audioBuffer) {
  const OpenAI = (await import("openai")).OpenAI;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Convert Buffer to File-like object
  const file = await toFile(audioBuffer, 'audio.mp3', { type: 'audio/mpeg' });

  try {
    if (client.audio?.transcriptions?.create) {
      const resp = await client.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "text",
      });
      return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
    }
  } catch (e) { console.warn("Whisper v4 method failed", e.message); }

  try {
    if (client.transcriptions?.create) {
      const resp = await client.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "text",
      });
      return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
    }
  } catch (e) { }

  throw new Error("OpenAI transcription failed.");
}

/**
 * Main handler (Node.js Runtime)
 * Reverted from Edge because @distube/ytdl-core uses Node.js 'http'/'net' modules which fail in Edge.
 * EROFS is fixed via saveDebugFile: false + memory buffering.
 */
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

  // START STREAMING RESPONSE
  // We send headers immediately to keep connection open
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });

  // Heartbeat Loop (Node.js style)
  const heartbeatInterval = setInterval(() => {
    res.write(" "); // Send space to keep alive
  }, 5000);

  try {
    console.log(`Starting Streaming Transaction for Video ID: ${videoId}`);

    const ytdlMod = await import("@distube/ytdl-core");
    const ytdl = ytdlMod?.default ?? ytdlMod;

    // 1. Generate Fresh PO Token & Visitor Data
    console.log("Generating fresh PO Token...");
    let generatedTokens = {};
    try {
      generatedTokens = await generate();
      console.log("PO Token generated successfully.");
    } catch (genErr) {
      console.error("Token generation failed:", genErr.message);
    }
    const { poToken, visitorData } = generatedTokens;

    // 2. Create Authenticated Proxy Agent
    let agent = undefined;
    let cookies = [];

    if (process.env.YOUTUBE_COOKIES_JSON) {
      try { cookies = JSON.parse(process.env.YOUTUBE_COOKIES_JSON); }
      catch (e) { console.error("Bad cookies JSON", e); }
    }

    if (process.env.PROXY_URL && ytdl.createProxyAgent) {
      agent = ytdl.createProxyAgent({ uri: process.env.PROXY_URL }, cookies);
      console.log("YouTube Proxy Agent created.");
    } else if (cookies.length > 0 && ytdl.createAgent) {
      agent = ytdl.createAgent(cookies);
      console.log("YouTube Cookie Agent created (no proxy).");
    }

    const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 3. Prepare YTDL Options
    const ytdlOptions = {
      agent,
      filter: "audioonly",
      quality: "lowestaudio",
      highWaterMark: 1 << 25, // 32MB
      playerClients: ["WEB"],
      poToken: poToken,
      visitorData: visitorData,
      saveDebugFile: false, // CRITICAL: PREVENTS EROFS
    };

    // 4. Fetch Metadata (Title)
    let metadata = null;
    try {
      const info = await ytdl.getInfo(safeUrl, ytdlOptions);
      const title = info?.videoDetails?.title ?? (info?.title ?? null);
      if (title) metadata = { title };
      console.log("Metadata fetched:", title);
    } catch (e) {
      console.warn("Metadata fetch failed (continuing to audio):", e.message);
    }

    // 5. Stream Audio -> In-Memory Buffer
    console.log("Streaming audio to memory...");
    const audioStream = ytdl(safeUrl, ytdlOptions);

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    console.log(`Audio buffered in memory. Size: ${audioBuffer.length} bytes`);

    if (audioBuffer.length > 50 * 1024 * 1024) {
      throw new Error("Audio too large for memory processing (>50MB)");
    }

    // 6. Send to Whisper
    console.log("Sending to OpenAI Whisper...");
    const transcript = await transcribeBufferWithOpenAI(audioBuffer);

    // Stop heartbeat
    clearInterval(heartbeatInterval);

    if (transcript && transcript.length > 0) {
      // Send final JSON
      const finalResponse = { source: "whisper", transcript, metadata };
      res.write(JSON.stringify(finalResponse));
    } else {
      throw new Error("Whisper returned empty transcript");
    }

  } catch (err) {
    clearInterval(heartbeatInterval);
    console.error("Transcription failed:", err.message);
    // Attempt to send error JSON if possible
    res.write(JSON.stringify({
      error: "Transcription failed",
      details: err.message
    }));
  } finally {
    res.end();
  }
}
