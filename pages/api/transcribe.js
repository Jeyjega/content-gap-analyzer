// pages/api/transcribe.js
import { generate } from "youtube-po-token-generator";
import { toFile } from "openai";
import { Buffer } from 'node:buffer'; // Buffered for Edge

export const runtime = 'edge';

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
 * Main handler (Edge Runtime)
 */
export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const input = normalizeInput(body);

    if (!input || (!input.url && !input.videoId)) {
      return new Response(JSON.stringify({ error: "Missing YouTube URL or ID." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const videoId = input.videoId || extractVideoId(input.url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL or ID." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Encoder for streaming text
    const encoder = new TextEncoder();

    // Create a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        // Heartbeat Interval
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(" ")); // Send space to keep alive
          } catch (e) {
            clearInterval(heartbeatInterval);
          }
        }, 5000);

        try {
          // Log start
          console.log(`Starting Edge Streaming Transaction for Video ID: ${videoId}`);

          const ytdlMod = await import("@distube/ytdl-core");
          const ytdl = ytdlMod?.default ?? ytdlMod;

          // 1. Generate Fresh PO Token & Visitor Data
          console.log("Generating fresh PO Token...");
          let generatedTokens = {};
          try {
            generatedTokens = await generate();
            console.log("PO Token generated successfully.");
          } catch (genErr) {
            console.error("Token generation failed (continuing without):", genErr.message);
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
            saveDebugFile: false, // CRITICAL: DISABLE DEBUG WRITES (Fixes EROFS)
          };

          // 4. Fetch Metadata (Title)
          let metadata = null;
          try {
            // CRITICAL: saveDebugFile: false here too if getInfo supports it (it usually passes opts down)
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

          clearInterval(heartbeatInterval);

          if (transcript && transcript.length > 0) {
            const finalResponse = { source: "whisper", transcript, metadata };
            controller.enqueue(encoder.encode(JSON.stringify(finalResponse)));
          } else {
            throw new Error("Whisper returned empty transcript");
          }

        } catch (err) {
          clearInterval(heartbeatInterval);
          console.error("Transcription failed:", err.message);
          // Return error JSON
          const errorResponse = {
            error: "Transcription failed",
            details: err.message
          };
          controller.enqueue(encoder.encode(JSON.stringify(errorResponse)));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      }
    });

  } catch (globalErr) {
    return new Response(JSON.stringify({ error: globalErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
