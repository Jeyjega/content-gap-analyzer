import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import AnalysisLoader from "../components/AnalysisLoader";
import { chunkText as chunkTextFromLib } from "../lib/chunkText";

// Fallback chunkText implementation
const chunkText =
  chunkTextFromLib ||
  ((text = "", maxChars = 500) => {
    if (!text) return [];
    const sentences = text.split(/(?<=[.?!])\s+/);
    const chunks = [];
    let current = "";
    let idx = 0;
    for (const s of sentences) {
      if ((current + " " + s).trim().length > maxChars) {
        chunks.push({ text: current.trim(), index: idx++ });
        current = s;
      } else {
        current = (current + " " + s).trim();
      }
    }
    if (current.trim()) chunks.push({ text: current.trim(), index: idx++ });
    if (chunks.length === 0 && text.length > 0) {
      for (let i = 0, j = 0; i < text.length; i += maxChars, j++) {
        chunks.push({ text: text.slice(i, i + maxChars), index: j });
      }
    }
    return chunks;
  });

export default function Dashboard() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  // Protect the route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const [mode, setMode] = useState("youtube"); // youtube | blog | text
  const [videoUrlOrId, setVideoUrlOrId] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [userText, setUserText] = useState("");

  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [analysisId, setAnalysisId] = useState(null);
  const [embeddingsResult, setEmbeddingsResult] = useState(null);
  const [generatedScript, setGeneratedScript] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);

  // New states for script progress
  const [scriptProgress, setScriptProgress] = useState(0);
  const [helperMessageIndex, setHelperMessageIndex] = useState(0);

  const helperMessages = [
    "This script will incorporate all identified gaps.",
    "We’re carefully grounding everything in your original content.",
    "This usually takes under a minute.",
    "Almost there — final polish in progress."
  ];

  // Rotate helper messages
  useEffect(() => {
    let interval;
    if ((status === 'generating-analysis' || status === 'script_generating') && analysisResult && !generatedScript) {
      interval = setInterval(() => {
        setHelperMessageIndex(prev => (prev + 1) % helperMessages.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [status, analysisResult, generatedScript]);

  // Simulated progress for script generation
  useEffect(() => {
    let interval;
    if ((status === 'generating-analysis' || status === 'script_generating') && analysisResult && !generatedScript) {
      setScriptProgress(0);
      interval = setInterval(() => {
        setScriptProgress(prev => {
          if (prev >= 98) return prev;
          // Fast at first (0-50), then medium (50-80), then crawl (80-99)
          const increment = prev < 50 ? 5 : prev < 80 ? 2 : 0.2;
          return Math.min(prev + increment, 99);
        });
      }, 600);
    } else if (generatedScript) {
      setScriptProgress(100);
    }
    return () => clearInterval(interval);
  }, [status, analysisResult, generatedScript]);

  // Format Selection State
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [pendingAnalysisId, setPendingAnalysisId] = useState(null);
  const [formatChoice, setFormatChoice] = useState(null); // 'preserve' | 'monologue'

  const [isHighlighting, setIsHighlighting] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);
  const [scriptCopied, setScriptCopied] = useState(false);
  const textInputRef = useRef(null);
  const resultsRef = useRef(null);

  const log = (msg) => {
    console.log(msg);
  };

  const batchesOf = (arr = [], n = 20) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  const extractVideoId = (str) => {
    try {
      if (!str) return "";
      const u = str.trim();
      const m = u.match(/[?&]v=([^&]+)/);
      if (m && m[1]) return m[1];
      const m2 = u.match(/youtu\.be\/([^?&]+)/);
      if (m2 && m2[1]) return m2[1];
      return u;
    } catch (e) {
      return str;
    }
  };

  const makeCleanUrlFromInput = (rawInput) => {
    const raw = (rawInput || "").trim();
    if (!raw) return "";
    try {
      if (raw.startsWith("http")) {
        const u = new URL(raw);
        const v = u.searchParams.get("v");
        if (v) return `https://www.youtube.com/watch?v=${v}`;
        if (u.hostname.includes("youtu.be")) {
          const id = u.pathname.split("/").filter(Boolean)[0];
          return id ? `https://www.youtube.com/watch?v=${id}` : raw;
        }
        return `${u.origin}${u.pathname}`;
      }
      return `https://www.youtube.com/watch?v=${raw}`;
    } catch (e) {
      return raw;
    }


  };

  const resumeAnalysisWithFormat = async (choice, analysisIdOverride) => {
    setShowFormatModal(false);
    setFormatChoice(choice);

    // Resume flow
    setStatus("generating-analysis");
    const analysisId = analysisIdOverride || pendingAnalysisId;

    if (!analysisId) {
      throw new Error("Missing analysisId for resumeAnalysis");
    }

    log(`Resuming analysis ${analysisId} with format=${choice}`);

    try {
      const token = session.access_token;
      const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      const formatMode = choice === "preserve" ? "interview" : "monologue";

      const response = await fetch("/api/generate-gap-analysis", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          analysisId,
          formatMode
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      /* 
         NDJSON STREAM PARSER
      */
      while (true) {
        const { value, done } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last incomplete chunk in the buffer
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line);

              if (event.status === "gaps_ready") {
                log("Received: Gaps Ready");
                setAnalysisResult(event); // Updates gaps UI immediately
              }
              else if (event.status === "script_generating") {
                log("Received: Script Generating...");
              }
              else if (event.status === "script_ready") {
                log("Received: Script Ready");
                setGeneratedScript(event.script);
              }
              else if (event.status === "error") {
                throw new Error(event.message);
              }
            } catch (parseErr) {
              console.warn("Failed to parse JSON chunk:", line);
            }
          }
        }

        if (done) break;
      }

      // Clear final buffer if any
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.status === "script_ready") {
            setGeneratedScript(event.script);
          }
        } catch (e) { /* ignore */ }
      }

      setStatus("done");
      log("Analysis orchestration complete.");

    } catch (err) {
      console.error("resumeAnalysis error", err);
      setStatus("error");
      setError(err.message || String(err));
      log(`Error: ${err.message || String(err)}`);
    }
  };

  const handleAnalyze = async () => {
    if (!session?.access_token) {
      setError("User session invalid. Please log in again.");
      return;
    }
    const token = session.access_token;
    const authHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    setStatus("transcribing"); // generic starting status
    setTranscript("");
    setAnalysisId(null);
    setEmbeddingsResult(null);
    setGeneratedScript(null);
    setAnalysisResult(null);
    setError(null);
    setShowFormatModal(false);
    setPendingAnalysisId(null);
    setFormatChoice(null);

    log(`Starting analysis flow (mode=${mode})...`);

    // Auto-scroll to results section
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    try {
      let finalTranscript = "";
      let finalTitle = "";
      let finalVideoId = null;
      let finalUrl = null;
      let finalMetadata = null;

      if (mode === "youtube") {
        const cleanUrl = makeCleanUrlFromInput(videoUrlOrId);
        const vid = extractVideoId(cleanUrl);
        if (!vid) throw new Error("Please provide a valid YouTube URL or ID.");

        finalVideoId = vid;
        finalUrl = cleanUrl;

        // 1) Transcribe
        log(`Calling /api/transcribe with url=${cleanUrl} id=${vid}`);
        const rTrans = await fetch("/api/transcribe", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            url: cleanUrl,
            videoUrl: cleanUrl,
            videoId: vid,
            youtubeUrl: cleanUrl,
            youtube_url: cleanUrl,
          }),
        });

        if (!rTrans.ok) {
          const txt = await rTrans.text();
          throw new Error(`Transcription failed: ${txt}`);
        }

        const transJson = await rTrans.json();
        const transText = transJson.transcript || transJson.text || transJson.data?.transcript;
        if (!transText) throw new Error("Transcription returned empty text.");

        finalTranscript = transText;
        finalMetadata = transJson.metadata ?? null;
        log("Transcription done.");
      }
      else if (mode === "blog") {
        if (!webUrl) throw new Error("Please enter a website URL.");
        setStatus("fetching-web");

        const rWeb = await fetch("/api/extract-webtext", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ url: webUrl })
        });

        if (!rWeb.ok) {
          let errorDetails = "";
          try {
            const errJson = await rWeb.json();
            errorDetails = errJson.details || errJson.error || "";
          } catch (e) {
            // ignore JSON parse error, might be plain text
          }

          // Trigger fallback for 403 (Forbidden) OR "fetch failed" (often blocked connection/DNS)
          if (rWeb.status === 403 || errorDetails.includes("fetch failed")) {
            log(`Website extraction failed (${rWeb.status}: ${errorDetails}). Switching to Text Mode.`);
            setStatus("idle");
            setMode("text");

            // Enhanced Fallback UX
            setError(null);
            setShowFallbackBanner(true);
            setIsHighlighting(true);

            // Clear highlight after animation
            setTimeout(() => setIsHighlighting(false), 1500);

            // Auto-focus and smooth scroll
            setTimeout(() => {
              if (textInputRef.current) {
                textInputRef.current.focus();
                textInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
            return;
          }

          // Genuine unknown error
          throw new Error(`Failed to fetch website: ${errorDetails || rWeb.statusText}`);
        }

        const webJson = await rWeb.json();
        finalTranscript = webJson.text;
        finalTitle = webJson.title;
        finalUrl = webUrl;
        finalMetadata = { title: finalTitle };
        log("Web text extracted.");
      }
      else if (mode === "text") {
        if (!userText || userText.length < 50) throw new Error("Please enter at least 50 characters of text.");
        finalTranscript = userText;
        finalTitle = "Custom Text Analysis";
        log("Using raw text input.");
      }

      setTranscript(finalTranscript);

      // 2) Create analysis
      setStatus("creating-analysis");
      log("Calling /api/create-analysis");

      const createBody = {
        videoId: finalVideoId,
        video_url: finalUrl,
        transcript: finalTranscript,
        metadata: finalMetadata,
        title: finalTitle,
        type: mode
      };

      const r1 = await fetch("/api/create-analysis", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(createBody),
      });

      if (!r1.ok) {
        const txt = await r1.text();
        throw new Error(`create-analysis failed: ${txt}`);
      }

      const createJson = await r1.json();
      const newAnalysisId = createJson.analysisId || createJson.id || createJson.data?.id || createJson?.analysis?.id;
      if (!newAnalysisId) {
        throw new Error(`create-analysis did not return analysisId`);
      }
      setAnalysisId(newAnalysisId);
      log(`Analysis created: ${newAnalysisId}`);

      const isInterview = createJson.is_interview === true || createJson.isInterview === true;

      // 3) Prepare chunks
      setStatus("creating-embeddings");
      const chunks = chunkText(finalTranscript);
      const normalizedChunks = (Array.isArray(chunks) && chunks.length > 0)
        ? chunks.map((c, i) => ({ text: c.text ?? c, index: typeof c.index === "number" ? c.index : i }))
        : [{ text: finalTranscript, index: 0 }];

      log(`Prepared ${normalizedChunks.length} chunks`);

      // 4) Send chunks in batches
      const batchSize = 30;
      const chunkBatches = batchesOf(normalizedChunks, batchSize);
      log(`Sending embeddings in ${chunkBatches.length} batch(es)`);

      const allResponses = [];
      for (let i = 0; i < chunkBatches.length; i++) {
        const batch = chunkBatches[i];
        const payload = {
          analysisId: newAnalysisId,
          analysis_id: newAnalysisId,
          transcript: finalTranscript,
          text: finalTranscript,
          chunks: batch,
        };

        const r2 = await fetch("/api/create-embeddings", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        if (!r2.ok) {
          const txt = await r2.text();
          throw new Error(`create-embeddings batch ${i + 1} failed: ${txt}`);
        }
        const batchJson = await r2.json();
        allResponses.push(batchJson);
      }

      setEmbeddingsResult(allResponses);

      // INTERRUPT IF INTERVIEW
      if (isInterview) {
        log("Interview detected! Pausing for user input.");
        setPendingAnalysisId(newAnalysisId);
        setShowFormatModal(true);
        setStatus("idle"); // or custom 'waiting-for-user'
        return;
      }

      // 5) Call generate-gap-analysis (Default Monologue if not interview)
      // Reuse streaming orchestration for ALL content (interview + non-interview)
      setPendingAnalysisId(newAnalysisId);
      resumeAnalysisWithFormat("monologue", newAnalysisId);
      return;
    } catch (err) {
      console.error("handleAnalyze error", err);
      setStatus("error");
      setError(err.message || String(err));
      log(`Error: ${err.message || String(err)}`);
    }
  };

  const isBusy = ["transcribing", "fetching-web", "creating-analysis", "creating-embeddings", "generating-analysis"].includes(status);

  // Helpers for UI state
  const getAnalyzeButtonText = () => {
    if (status === "transcribing") return "Transcribing...";
    if (status === "fetching-web") return "Fetching Article...";
    if (status === "creating-analysis") return "Analyzing...";
    if (status === "creating-embeddings") return "Embedding...";
    if (status === "generating-analysis") return "Generating Insights...";
    return mode === "youtube" ? "Analyze Video" : mode === "blog" ? "Analyze Article" : "Analyze Text";
  };

  const isInputEmpty = () => {
    if (mode === "youtube") return !videoUrlOrId;
    if (mode === "blog") return !webUrl;
    if (mode === "text") return userText.length < 50;
    return true;
  };

  if (loading || !user) {
    return (
      <Layout bgClass="bg-[#030014]" headerVariant="dark">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 animate-pulse">Checking access...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout bgClass="bg-[#030014]" headerVariant="dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Input Section */}
        <div className="max-w-4xl mx-auto mb-16 animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-medium text-white mb-6 tracking-tight">Analyze Content</h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {mode === "youtube" && "Paste a YouTube URL below to discover content gaps, extract insights, and generate optimized scripts."}
              {mode === "blog" && "Paste a blog or article URL to extract key insights and identify content gaps."}
              {mode === "text" && "Paste your raw text, story, or draft to analyze structure and find missing elements."}
            </p>
          </div>

          {/* Fallback Info Banner */}
          {showFallbackBanner && (
            <div className="mb-6 mx-auto max-w-2xl bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in shadow-sm backdrop-blur-sm">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-white">Switching to Manual Entry</h4>
                <p className="text-indigo-200 text-sm mt-1 leading-relaxed">
                  This website does not allow automatic extraction. We’ve switched you to <strong>Text Mode</strong> — please paste the article text below.
                </p>
              </div>
              <button
                onClick={() => setShowFallbackBanner(false)}
                className="ml-auto text-indigo-300 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
            <Card className="relative p-0 shadow-2xl shadow-indigo-500/10 border-white/5 bg-white/5 backdrop-blur-md overflow-hidden transition-transform duration-300 hover:scale-[1.01]">

              {/* Mode Tabs */}
              <div className="flex border-b border-white/5 bg-black/20">
                {[
                  { id: "youtube", label: "YouTube" },
                  { id: "blog", label: "Website" },
                  { id: "text", label: "Text" }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex-1 py-4 text-sm font-medium transition-colors relative ${mode === m.id ? "text-white bg-white/5" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                  >
                    {m.label}
                    {mode === m.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500"></div>}
                  </button>
                ))}
              </div>

              <div className="p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  {mode === "youtube" && (
                    <>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={videoUrlOrId}
                        onChange={(e) => setVideoUrlOrId(e.target.value)}
                        placeholder="Paste YouTube video URL..."
                        className="w-full pl-11 pr-4 py-4 rounded-xl border-none bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-slate-500 text-lg transition-all"
                      />
                    </>
                  )}
                  {mode === "blog" && (
                    <>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={webUrl}
                        onChange={(e) => setWebUrl(e.target.value)}
                        placeholder="Enter article or blog URL..."
                        className="w-full pl-11 pr-4 py-4 rounded-xl border-none bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-slate-500 text-lg transition-all"
                      />
                    </>
                  )}
                  {mode === "text" && (
                    <textarea
                      ref={textInputRef}
                      value={userText}
                      onChange={(e) => {
                        setUserText(e.target.value);
                        if (showFallbackBanner) setShowFallbackBanner(false);
                      }}
                      placeholder="Paste your content text here (min 50 chars)..."
                      className={`w-full p-4 h-32 rounded-xl border-none bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-slate-500 text-base transition-all resize-none ${isHighlighting ? "ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-white/10 scale-[1.01]" : ""
                        }`}
                    />
                  )}
                </div>
                <Button
                  onClick={handleAnalyze}
                  isLoading={isBusy}
                  disabled={isInputEmpty()}
                  size="xl"
                  variant="gradient"
                  title={isInputEmpty() ? "Paste a link to analyze" : ""}
                  className="w-full md:w-auto rounded-xl shadow-lg shadow-indigo-500/20 self-start font-bold tracking-wide"
                >
                  {getAnalyzeButtonText()}
                </Button>
              </div>
            </Card>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4 opacity-60 flex items-center justify-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your analysis is secure and private.
          </p>

          {error && (
            <div className="mt-6 p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30 flex items-start gap-3 animate-scale-in shadow-sm backdrop-blur-sm">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Transcript */}
          <div className="lg:col-span-4 space-y-6">
            <Card className={`flex flex-col shadow-secondary border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 ${isTranscriptExpanded ? "h-[600px]" : "h-auto"}`}>
              <div
                className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              >
                <div className="flex items-center gap-2">
                  <div className={`transition-transform duration-200 ${isTranscriptExpanded ? "rotate-90" : ""}`}>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    {mode === 'youtube' ? (
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                    ) : mode === 'blog' ? (
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    Transcript
                  </h3>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-white/5 border border-white/10 text-slate-400 rounded-md shadow-sm">
                  {transcript.length > 0 ? `${transcript.length} chars` : "Empty"}
                </span>
              </div>

              {isTranscriptExpanded && (
                status === "transcribing" && !transcript ? (
                  <div className="flex-1 p-6 space-y-4 animate-pulse bg-white/5">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className={`h-2 bg-white/10 rounded ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`}></div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={transcript}
                    readOnly
                    className="flex-1 w-full p-6 resize-none outline-none text-sm leading-loose text-slate-400 font-mono bg-transparent focus:bg-white/5 transition-colors placeholder:text-slate-600"
                    placeholder="Transcript will appear here after analysis..."
                  />
                )
              )}
            </Card>
          </div>

          {/* Right Column: Analysis Results */}
          <div ref={resultsRef} className="lg:col-span-8 space-y-6">
            <Card className="p-8 min-h-[600px] shadow-secondary border-white/5 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold font-display text-white tracking-tight">Analysis Results</h2>
                <div className="flex gap-3 text-sm">
                  <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${status === 'done' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${status === 'done' ? 'bg-green-500' : 'bg-slate-400 animate-pulse'}`}></span>
                    <span className="font-medium capitalize">{status === 'idle' ? 'Ready' : status.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>

              {isBusy && !analysisResult && !generatedScript ? (
                <AnalysisLoader status={status} />
              ) : !analysisResult && !generatedScript ? (
                <div className="h-96 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-sm border border-white/5">
                    <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <p className="text-xl font-medium text-slate-400 mb-2">Ready to analyze</p>
                  <p className="text-slate-600">Enter a video URL above to start</p>
                </div>
              ) : (
                <div className="space-y-10 animate-slide-up">
                  {/* Summary */}
                  {analysisResult?.summary && (
                    <div className="prose prose-invert max-w-none">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Summary of This Content
                      </h3>
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-slate-300 leading-relaxed shadow-sm">
                        {analysisResult.summary}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {analysisResult?.gaps && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 0l-3-3m3 3l3-3M12 2a9 9 0 110 18 9 9 0 010-18z" />
                          </svg>
                        </div>
                        Identified Content Gaps
                      </h3>
                      <div className="grid gap-4">
                        {analysisResult.gaps.map((g, i) => {
                          const priority = i === 0 ? "Critical" : i === 1 ? "Medium" : "Minor";
                          const priorityColor = i === 0 ? "bg-red-900/30 text-red-300 border-red-500/30" : i === 1 ? "bg-orange-900/30 text-orange-300 border-orange-500/30" : "bg-blue-900/30 text-blue-300 border-blue-500/30";
                          const icon = i === 0 ? (
                            <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          ) : i === 1 ? (
                            <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          ) : (
                            <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          );

                          return (
                            <div key={i} className="bg-white/5 p-6 rounded-xl border border-white/5 shadow-sm hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-white/10 group-hover:bg-indigo-500 transition-all"></div>
                              <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-full bg-black/20 text-slate-400 flex items-center justify-center flex-shrink-0 text-lg font-bold mt-0.5 border-2 border-white/5 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors shadow-sm">
                                  {i + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-lg">
                                      {g.title || `Gap ${i + 1}`}
                                    </h4>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${priorityColor} flex items-center gap-1.5`}>
                                      {icon}
                                      {priority}
                                    </span>
                                  </div>
                                  {g.suggestion && (
                                    <p className="text-slate-400 text-sm leading-relaxed">{g.suggestion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested Script */}
                  {(analysisResult?.suggested_script || analysisResult?.suggestedScript || generatedScript || (isBusy && analysisResult)) && (
                    <div className="pt-8 border-t border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          Derivative Script (Optional)
                        </h3>
                        {(isBusy && !generatedScript) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                            Generating...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-4 ml-1">
                        This is a compressed, secondary version for clips, blogs, or summaries. It does not replace the original content.
                      </p>
                      <div className="bg-[#0b0c15] rounded-2xl border border-white/10 font-mono text-sm text-slate-300 shadow-inner relative overflow-hidden min-h-[200px]">
                        <div className="absolute top-0 left-0 right-0 h-10 bg-[#0b0c15] z-10 flex items-center px-4 justify-between border-b border-white/5">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">AI-Generated Script</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-transparent border-none text-slate-400 hover:text-white hover:bg-white/10 h-7 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(analysisResult?.suggested_script || generatedScript || "");
                              setScriptCopied(true);
                              setTimeout(() => setScriptCopied(false), 1200);
                            }}
                            disabled={!generatedScript && !analysisResult?.suggested_script}
                          >
                            {scriptCopied ? (
                              <div className="flex items-center gap-1.5 text-green-400">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                <span className="font-semibold">Copied</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                Copy
                              </div>
                            )}
                          </Button>
                        </div>
                        <div className="p-6 pt-14 whitespace-pre-wrap max-h-[500px] overflow-auto">
                          {generatedScript || analysisResult?.suggested_script || analysisResult?.suggestedScript ? (
                            <>
                              {generatedScript || analysisResult?.suggested_script || analysisResult?.suggestedScript}
                              {isBusy && (
                                <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle"></span>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-40 space-y-4 opacity-80">
                              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${Math.round(scriptProgress)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs font-mono text-indigo-300">Drafting script... {Math.round(scriptProgress)}%</p>
                              <p className="text-[10px] text-indigo-400/50 mt-3 animate-pulse font-medium tracking-wide text-center ease-in-out duration-1000">
                                {helperMessages[helperMessageIndex]}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Titles & Keywords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                    {/* Titles */}
                    {analysisResult?.titles && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Title Suggestions</h3>
                        <ul className="space-y-3">
                          {analysisResult.titles.map((t, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 shadow-sm hover:border-indigo-500/30 transition-colors group">
                              <span className="text-indigo-400 group-hover:text-indigo-300 mt-0.5 font-bold transition-colors">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Keywords */}
                    {analysisResult?.keywords && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Keyword Opportunities</h3>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(analysisResult.keywords) ? analysisResult.keywords : []).map((k, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-medium border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-default">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>


                </div>
              )}
            </Card>

            {/* Actions Footer */}
            <div className="flex gap-4 flex-wrap justify-end">
              <Link href="/history">
                <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">View History</Button>
              </Link>
            </div>
          </div>
        </div>
      </div >
      {/* Format Selection Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b0c15] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4 text-indigo-400">
                <div className="w-10 h-10 rounded-full bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Interview Format Detected</h3>
              </div>
              <p className="text-slate-400 mb-6 leading-relaxed">
                We detected that this content is an interview. How would you like the upgraded script to be written?
              </p>

              <div className="grid gap-3 mb-6">
                <button
                  onClick={() => resumeAnalysisWithFormat("preserve")}
                  className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all text-left group"
                >
                  <div className="mt-0.5 w-4 h-4 rounded-full border border-slate-500 group-hover:border-indigo-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-indigo-300">Preserve Interview (Q&A)</h4>
                    <p className="text-xs text-slate-500 mt-1">Keep speaker turns and dialogue structure, essentially upgrading the interview itself.</p>
                  </div>
                </button>
                <button
                  onClick={() => resumeAnalysisWithFormat("monologue")}
                  className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all text-left group"
                >
                  <div className="mt-0.5 w-4 h-4 rounded-full border border-slate-500 group-hover:border-indigo-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-indigo-300">Convert to Monologue</h4>
                    <p className="text-xs text-slate-500 mt-1">Transform into a cohesive, single-voice narrative or masterclass style.</p>
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}