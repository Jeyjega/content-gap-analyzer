// pages/api/transcribe.js
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import youtubedl from "youtube-dl-exec";

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

async function transcribeWithOpenAI(filePath) {
  const OpenAI = (await import("openai")).OpenAI;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fileStream = fs.createReadStream(filePath);

  try {
    const resp = await client.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      response_format: "text",
    });
    return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
  } catch (e) {
    throw new Error(`OpenAI transcription failed: ${e.message}`);
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

  // We send headers immediately to keep connection open
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });

  const heartbeatInterval = setInterval(() => {
    res.write(" "); // Send space to keep alive
  }, 5000);

  const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `audio_${randomUUID()}.m4a`);
  const cookiesPath = path.join(tmpDir, `cookies_${randomUUID()}.txt`);
  let hasCookies = false;

  try {
    console.log(`Starting extraction for Video ID: ${videoId} using yt-dlp`);
    let metadata = { title: "YouTube Video" };

    // Support both cookies string format (Netscape) and YOUTUBE_COOKIES_JSON from previous versions
    let cookieContent = process.env.YOUTUBE_COOKIES_TXT || "";
    
    // If they have YOUTUBE_COOKIES_JSON, we map it back to a Netscape cookie format (Fallback logic if needed)
    // For simplicity, we prioritize YOUTUBE_COOKIES_TXT.
    if (cookieContent) {
      fs.writeFileSync(cookiesPath, cookieContent);
      hasCookies = true;
    }

    // 1. Fetch metadata
    try {
      console.log("Fetching metadata...");
      const infoArgs = {
        dumpJson: true,
        skipDownload: true,
        noPlaylist: true,
      };
      if (process.env.PROXY_URL) infoArgs.proxy = process.env.PROXY_URL;
      if (hasCookies) infoArgs.cookies = cookiesPath;

      const infoStr = await youtubedl(safeUrl, infoArgs);
      const info = typeof infoStr === 'string' ? JSON.parse(infoStr) : infoStr;
      if (info && info.title) {
        metadata.title = info.title;
      }
      console.log("Metadata fetched:", metadata.title);
    } catch (infoErr) {
      console.warn("Failed to extract metadata:", infoErr.message);
    }

    // 2. Download audio
    try {
      console.log(`Downloading audio to ${outputPath}...`);
      const dlArgs = {
        extractAudio: true,
        audioFormat: 'm4a',
        output: outputPath,
        noPlaylist: true,
      };
      if (process.env.PROXY_URL) dlArgs.proxy = process.env.PROXY_URL;
      if (hasCookies) dlArgs.cookies = cookiesPath;

      await youtubedl(safeUrl, dlArgs);

      if (!fs.existsSync(outputPath)) {
        throw new Error("yt-dlp completed but output file not found.");
      }
      console.log("Audio download finished successfully.");
    } catch (dlErr) {
      console.error("YouTube download/extraction failed:", dlErr.message);
      clearInterval(heartbeatInterval);
      res.write(JSON.stringify({
        error: "YouTube extraction failed or blocked. Please verify proxies or cookies.",
        code: "YOUTUBE_FETCH_ERROR",
        details: dlErr.message,
      }));
      return;
    }

    // 3. Send to Whisper
    console.log("Sending to OpenAI Whisper...");
    let transcript = "";
    try {
      transcript = await transcribeWithOpenAI(outputPath);
      console.log("Whisper transcription successful.");
    } catch (whisperErr) {
      console.error("Whisper API Error:", whisperErr.message);
      clearInterval(heartbeatInterval);
      res.write(JSON.stringify({
        error: "OpenAI Whisper failed.",
        code: "WHISPER_API_ERROR",
        details: whisperErr.message,
      }));
      return;
    } finally {
      // Clean up audio file
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }

    clearInterval(heartbeatInterval);

    if (transcript && transcript.length > 0) {
      const finalResponse = { source: "whisper", transcript, metadata };
      res.write(JSON.stringify(finalResponse));
    } else {
      res.write(JSON.stringify({
        error: "Whisper returned empty transcript",
        code: "WHISPER_API_ERROR"
      }));
    }

  } catch (err) {
    clearInterval(heartbeatInterval);
    console.error("General system error:", err.message);
    res.write(JSON.stringify({
      error: "Unexpected system error during transcription",
      code: "SYSTEM_ERROR",
      details: err.message
    }));
  } finally {
    // Clean up cookies file
    if (hasCookies && fs.existsSync(cookiesPath)) {
      try {
        fs.unlinkSync(cookiesPath);
      } catch (e) {
        // ignore
      }
    }
    clearInterval(heartbeatInterval);
    res.end();
  }
}
