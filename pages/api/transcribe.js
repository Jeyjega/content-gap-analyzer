// pages/api/transcribe.js
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const TMP_DIR = "/tmp";

function safeRemove(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    // ignore
  }
}

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
 * Whisper Transcription
 */
async function transcribeFileWithOpenAI(filePath) {
  const OpenAI = (await import("openai")).OpenAI;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    if (client.audio?.transcriptions?.create) {
      const resp = await client.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        response_format: "text",
      });
      return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
    }
  } catch (e) { console.warn("Whisper v4 method failed", e.message); }

  try {
    if (client.transcriptions?.create) {
      const resp = await client.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        response_format: "text",
      });
      return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
    }
  } catch (e) { }

  throw new Error("OpenAI transcription failed.");
}

/**
 * Config
 */
export const config = {
  maxDuration: 60, // Return 504 if > 60s
};

export const dynamic = 'force-dynamic';

/**
 * Main handler
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

  try {
    console.log(`Starting Proxy Transaction for Video ID: ${videoId}`);

    const ytdlMod = await import("@distube/ytdl-core");
    const ytdl = ytdlMod?.default ?? ytdlMod;

    // 1. Create Authenticated Proxy Agent with Cookies, PO Token, and Visitor Data
    let agent = undefined;

    // Prepare agent creation options
    const agentOptions = [];
    if (process.env.PROXY_URL) agentOptions.push({ uri: process.env.PROXY_URL });

    // Check for cookies
    let cookies = [];
    if (process.env.YOUTUBE_COOKIES_JSON) {
      try {
        cookies = JSON.parse(process.env.YOUTUBE_COOKIES_JSON);
      } catch (e) { console.error("Bad cookies JSON", e); }
    }

    // Try to create the agent
    if (process.env.PROXY_URL && ytdl.createProxyAgent) {
      agent = ytdl.createProxyAgent({ uri: process.env.PROXY_URL }, cookies);
      console.log("YouTube Proxy Agent created.");
    } else if (cookies.length > 0 && ytdl.createAgent) {
      agent = ytdl.createAgent(cookies);
      console.log("YouTube Cookie Agent created (no proxy).");
    }

    const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 2. Prepare YTDL Options with Tokens and forced WEB client
    const ytdlOptions = {
      agent,
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25, // 32MB buffer to prevent timeouts
      playerClients: ["WEB"], // Force WEB client as requested
    };

    // Inject PO Token and Visitor Data if available
    if (process.env.YOUTUBE_PO_TOKEN) {
      ytdlOptions.poToken = process.env.YOUTUBE_PO_TOKEN;
    }
    if (process.env.YOUTUBE_VISITOR_DATA) {
      ytdlOptions.visitorData = process.env.YOUTUBE_VISITOR_DATA;
    }

    // 3. Fetch Metadata (Title) - Pass options here too
    let metadata = null;
    try {
      const info = await ytdl.getInfo(safeUrl, ytdlOptions);
      const title = info?.videoDetails?.title ?? (info?.title ?? null);
      if (title) metadata = { title };
      console.log("Metadata fetched:", title);
    } catch (e) {
      console.warn("Metadata fetch failed:", e.message);
    }

    // 4. Stream Audio -> Buffer
    console.log("Streaming audio...");
    const audioStream = ytdl(safeUrl, ytdlOptions);

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length > 50 * 1024 * 1024) {
      throw new Error("Audio too large for serverless processing (>50MB)");
    }

    const tmpFile = path.join(TMP_DIR, `audio_${videoId}_${Date.now()}.mp3`);
    fs.writeFileSync(tmpFile, audioBuffer);
    console.log("Audio buffered to:", tmpFile);

    // 5. Send to Whisper
    try {
      console.log("Sending to OpenAI Whisper...");
      const transcript = await transcribeFileWithOpenAI(tmpFile);
      safeRemove(tmpFile);

      if (transcript && transcript.length > 0) {
        return res.status(200).json({ source: "whisper", transcript, metadata });
      } else {
        throw new Error("Whisper returned empty transcript");
      }
    } catch (openErr) {
      safeRemove(tmpFile);
      throw openErr;
    }

  } catch (err) {
    console.error("Transcription failed:", err.message);
    return res.status(500).json({ // 500 here, 504 handled by Vercel platform if >60s
      error: "Transcription failed",
      details: err.message
    });
  }
}
