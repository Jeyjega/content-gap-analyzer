// pages/api/transcribe.js
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import * as xml2js from "xml2js";

const TMP_DIR = "/tmp";

/**
 * Helpers
 */
function toPlainText(transcriptArray) {
  if (!Array.isArray(transcriptArray)) return "";
  return transcriptArray.map((t) => (t.text ? t.text : "")).join(" ").replace(/\s+/g, " ").trim();
}

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
 * Try to fetch video metadata (title) using ytdl-core.
 */
async function getVideoMetadata(videoId, url, agent) {
  const safeUrl = url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);

  try {
    const ytdlMod = await import("@distube/ytdl-core");
    const ytdl = ytdlMod?.default ?? ytdlMod;
    if (typeof ytdl === "function" && safeUrl) {
      const options = agent ? { agent } : {};
      const info = await ytdl.getInfo(safeUrl, options);
      const title = info?.videoDetails?.title ?? (info?.title ?? null);
      if (title) return { title, info }; // Return full info for fallback use
    }
  } catch (e) {
    console.warn("Metadata fetch failed:", e.message);
  }
  return null;
}

/**
 * Whisper Transcription
 */
async function transcribeFileWithOpenAI(filePath) {
  const OpenAI = (await import("openai")).OpenAI;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Try standard v4+ method
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

  // Try older methods or loose shape
  try {
    if (client.transcriptions?.create) { // v3
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
  maxDuration: 60, // As requested by user
};

export const dynamic = 'force-dynamic';

/**
 * Main handler
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 1. Prepare YTDL Agent with Cookies to bypass "Sign in to confirm you're not a bot"
  let agent = undefined;
  if (process.env.YOUTUBE_COOKIES_JSON) {
    try {
      const cookies = JSON.parse(process.env.YOUTUBE_COOKIES_JSON);
      const ytdlMod = await import("@distube/ytdl-core");
      // @distube/ytdl-core exports createAgent
      if (ytdlMod.createAgent) {
        agent = ytdlMod.createAgent(cookies);
        console.log("YouTube Agent created with cookies.");
      }
    } catch (e) {
      console.error("Failed to create YouTube agent from cookies:", e.message);
    }
  }

  const input = normalizeInput(req.body || {});
  if (!input || (!input.url && !input.videoId)) {
    return res.status(400).json({ error: "Missing YouTube URL or ID." });
  }

  const videoId = input.videoId || extractVideoId(input.url);
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL or ID." });
  }

  // Optimize: Get metadata & info once if possible
  let metadata = null;
  let ytdlInfo = null;

  try {
    const metaRes = await getVideoMetadata(videoId, input.url, agent);
    if (metaRes) {
      metadata = { title: metaRes.title };
      ytdlInfo = metaRes.info;
      console.log("MetaData fetched:", metadata.title);
    }
  } catch (e) {
    console.log("Metadata verification failed:", e.message);
  }

  // --- METHOD 1: youtube-transcript ---
  // (Doesn't use cookies usually, acts as guest, but it's the fastest)
  try {
    console.log("Method 1: youtube-transcript");
    const mod = await import("youtube-transcript");
    const YoutubeTranscript = mod?.YoutubeTranscript ?? mod?.default?.YoutubeTranscript ?? mod?.default ?? mod; // Handle ESM/CJS weirdness

    if (YoutubeTranscript && typeof YoutubeTranscript.fetchTranscript === "function") {
      const arr = await YoutubeTranscript.fetchTranscript(videoId);
      const text = toPlainText(arr);
      if (text && text.length > 50) {
        return res.status(200).json({ source: "captions", transcript: text, metadata });
      }
    }
  } catch (err) {
    console.log("Method 1 failed:", err.message);
  }

  // --- METHOD 2: ytdl-core Audio Stream -> Whisper ---
  // Only if we have OpenAI key
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log("Method 2: ytdl-core -> Whisper");
      const ytdlMod = await import("@distube/ytdl-core");
      const ytdl = ytdlMod?.default ?? ytdlMod;

      const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const options = {
        filter: "audioonly",
        quality: "lowestaudio", // lowestaudio is usually sufficient for speech and faster
      };
      if (agent) options.agent = agent;

      const audioStream = ytdl(safeUrl, options);

      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      // Limit buffer size to avoid Vercel memory limits (e.g. < 50MB) (approx check)
      if (audioBuffer.length > 50 * 1024 * 1024) {
        throw new Error("Audio too large for serverless processing");
      }

      const tmpFile = path.join(TMP_DIR, `audio_${videoId}_${Date.now()}.mp3`);
      fs.writeFileSync(tmpFile, audioBuffer);

      try {
        const transcript = await transcribeFileWithOpenAI(tmpFile);
        safeRemove(tmpFile);
        if (transcript && transcript.length > 50) {
          return res.status(200).json({ source: "whisper", transcript, metadata });
        }
      } catch (openErr) {
        safeRemove(tmpFile);
        console.error("Whisper failed:", openErr.message);
      }

    } catch (err) {
      console.log("Method 2 failed:", err.message);
    }
  }

  // --- METHOD 3: fallback to manual caption fetching via ytdl info ---
  try {
    console.log("Method 3: Direct Caption Parse from YtDl Info");
    // If we already have ytdlInfo from metadata step, use it. Otherwise fetch.
    if (!ytdlInfo) {
      try {
        const ytdlMod = await import("@distube/ytdl-core");
        const ytdl = ytdlMod?.default ?? ytdlMod;
        const options = agent ? { agent } : {};
        ytdlInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, options);
      } catch (e) { }
    }

    if (ytdlInfo && ytdlInfo.player_response && ytdlInfo.player_response.captions) {
      const tracks = ytdlInfo.player_response.captions.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        // Prefer English
        const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
        const baseUrl = enTrack.baseUrl;
        if (baseUrl) {
          const fetchMod = await import("node-fetch");
          const fetch = fetchMod.default || fetchMod;

          const xmlResp = await fetch(baseUrl);
          const xmlText = await xmlResp.text();

          if (xmlText) {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xmlText);

            // Extract text from <text> nodes
            // structure: { transcript: { text: [ { _: "Hello", $: { start: "0", dur: "1" } } ] } }
            if (result && result.transcript && result.transcript.text) {
              const lines = result.transcript.text.map(item => item._).filter(Boolean);
              const fullText = lines.join(" ").replace(/\s+/g, " ").trim();

              if (fullText.length > 50) {
                return res.status(200).json({ source: "ytdl-captions-fallback", transcript: fullText, metadata });
              }
            }
          }
        }
      }
    }

  } catch (err) {
    console.log("Method 3 failed:", err.message);
  }

  return res.status(500).json({
    error: "Transcription failed",
    details: "All methods (captions, whisper, fallback) failed. Please try a different video."
  });
}
