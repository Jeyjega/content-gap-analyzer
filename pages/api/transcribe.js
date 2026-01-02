// pages/api/transcribe.js
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
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
 * Try to fetch video metadata (title) using ytdl-core first, falling back to yt-dlp -J.
 * Returns { title } or null.
 */
async function getVideoMetadata(videoId, url) {
  const safeUrl = url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);

  // Try ytdl-core
  try {
    const ytdlMod = await import("ytdl-core");
    const ytdl = ytdlMod?.default ?? ytdlMod;
    if (typeof ytdl === "function" && safeUrl) {
      try {
        const info = await ytdl.getInfo(safeUrl);
        const title = info?.videoDetails?.title ?? (info?.title ?? null);
        if (title) return { title };
      } catch (e) {
        // ignore and fallback
      }
    }
  } catch (e) {
    // ytdl not available — fallback
  }

  // Try yt-dlp -J (JSON metadata)
  try {
    // ensure yt-dlp exists
    await execFileAsync("which", ["yt-dlp"]);
    if (safeUrl) {
      const { stdout } = await execFileAsync("yt-dlp", ["-J", safeUrl], { maxBuffer: 1024 * 1024 * 10 });
      try {
        const info = JSON.parse(stdout);
        const title = info?.title ?? (info?.upload_date ? info?.title : null);
        if (title) return { title };
      } catch (e) {
        // parse error -> ignore
      }
    }
  } catch (e) {
    // no yt-dlp or failed -> ignore
  }

  return null;
}

/**
 * Try to call the OpenAI transcription endpoint in a few shapes to be
 * compatible with different openai SDK versions.
 */
async function transcribeFileWithOpenAI(filePath) {
  const OpenAI = (await import("openai")).OpenAI;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    if (client.audio && client.audio.transcriptions && typeof client.audio.transcriptions.create === "function") {
      const resp = await client.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        response_format: "text",
      });
      return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
    }
  } catch (e) {}

  try {
    if (typeof client.transcriptions?.create === "function") {
      const resp = await client.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        response_format: "text",
      });
      return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
    }
  } catch (e) {}

  try {
    if (client.audio && typeof client.audio === "object") {
      const keys = Object.keys(client.audio);
      for (const k of keys) {
        if (typeof client.audio[k] === "function" && k.toLowerCase().includes("create")) {
          const resp = await client.audio[k]({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
            response_format: "text",
          });
          return (typeof resp === "string" ? resp : (resp?.text ?? String(resp))).trim();
        }
      }
    }
  } catch (e) {}

  throw new Error("OpenAI client does not expose a recognized transcription method (or transcription failed). Update OpenAI SDK or inspect client shape.");
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Normalize body input
  const input = normalizeInput(req.body || {});
  if (!input || (!input.url && !input.videoId)) {
    return res.status(400).json({ error: "Missing YouTube URL or ID. Send { url | videoUrl | youtubeUrl | videoId } in request body." });
  }

  // If videoId is null, but url exists, try extracting id again
  const videoId = input.videoId || extractVideoId(input.url);
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL or ID. Could not extract videoId." });
  }

  // Try to obtain metadata early (title)
  let metadata = null;
  try {
    metadata = await getVideoMetadata(videoId, input.url);
    if (metadata) {
      console.log("fetched metadata:", metadata);
    }
  } catch (e) {
    console.log("metadata lookup failed (continuing):", e?.message || e);
  }

  // 1) youtube-transcript captions
  try {
    const mod = await import("youtube-transcript");
    const YoutubeTranscript = mod?.YoutubeTranscript ?? mod?.default?.YoutubeTranscript ?? mod?.default ?? mod;
    if (YoutubeTranscript && typeof YoutubeTranscript.fetchTranscript === "function") {
      try {
        const arr = await YoutubeTranscript.fetchTranscript(videoId);
        const text = toPlainText(arr);
        if (text && text.length > 10) {
          return res.status(200).json({ source: "captions", transcript: text, metadata });
        }
      } catch (err) {
        console.log("youtube-transcript fetch error (ok, fallback):", err?.message || err);
      }
    }
  } catch (err) {
    console.log("youtube-transcript import failed (ok):", err?.message || err);
  }

  // 2) ytdl-core streaming -> buffer -> whisper
  try {
    const ytdlMod = await import("ytdl-core");
    const ytdl = ytdlMod?.default ?? ytdlMod;
    if (typeof ytdl === "function") {
      try {
        const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // try to refresh metadata from ytdl (if we couldn't get it earlier)
        if (!metadata) {
          try {
            const info = await ytdl.getInfo(safeUrl);
            const title = info?.videoDetails?.title ?? (info?.title ?? null);
            if (title) metadata = { title };
          } catch (e) { /* ignore */ }
        }

        const audioStream = ytdl(safeUrl, { filter: "audioonly", quality: "highestaudio", highWaterMark: 1 << 25 });

        const chunks = [];
        for await (const chunk of audioStream) {
          chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        const tmpFile = path.join(TMP_DIR, `audio_${videoId}_${Date.now()}.mp3`);
        fs.writeFileSync(tmpFile, audioBuffer);

        try {
          const transcript = await transcribeFileWithOpenAI(tmpFile);
          safeRemove(tmpFile);
          if (transcript && transcript.length > 0) {
            return res.status(200).json({ source: "whisper", transcript, metadata });
          }
        } catch (openErr) {
          safeRemove(tmpFile);
          throw openErr;
        }
      } catch (err) {
        console.log("ytdl-core streaming failed, will fallback to yt-dlp:", err?.message || err);
      }
    }
  } catch (err) {
    console.log("ytdl-core import failed (ok):", err?.message || err);
  }

  // 3) fallback: use yt-dlp CLI to download mp3 then transcribe
  try {
    await execFileAsync("which", ["yt-dlp"]);
  } catch (e) {
    return res.status(500).json({ error: "Server misconfiguration", details: "yt-dlp not installed. Install yt-dlp and ffmpeg (eg: brew install yt-dlp ffmpeg)" });
  }

  const outPath = path.join(TMP_DIR, `audio_${videoId}_${Date.now()}.mp3`);
  try {
    await execFileAsync("yt-dlp", ["-x", "--audio-format", "mp3", "-o", outPath, `https://www.youtube.com/watch?v=${videoId}`], {
      maxBuffer: 1024 * 1024 * 200,
    });

    // after download we can also fetch metadata via yt-dlp -J if we don't have it
    if (!metadata) {
      try {
        const { stdout } = await execFileAsync("yt-dlp", ["-J", `https://www.youtube.com/watch?v=${videoId}`], {
          maxBuffer: 1024 * 1024 * 10,
        });
        try {
          const info = JSON.parse(stdout);
          if (info?.title) metadata = { title: info.title };
        } catch (e) {}
      } catch (e) {}
    }

    const transcript = await transcribeFileWithOpenAI(outPath);
    safeRemove(outPath);

    if (!transcript || transcript.length < 3) {
      return res.status(500).json({ error: "Transcription returned empty result" });
    }

    return res.status(200).json({ source: "whisper", transcript, metadata });
  } catch (err) {
    console.error("yt-dlp -> whisper failed:", err?.message || err);
    safeRemove(outPath);
    return res.status(500).json({ error: "Transcription failed", details: err?.message || String(err) });
  }
}
