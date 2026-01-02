import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import AnalysisLoader from "../components/AnalysisLoader";
import { chunkText as chunkTextFromLib } from "../lib/chunkText";

/* =====================================================
   SAFE HELPERS (DO NOT REMOVE)
===================================================== */

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeString = (v) => (typeof v === "string" ? v : "");

/* =====================================================
   FALLBACK CHUNKER
===================================================== */

const chunkText =
  chunkTextFromLib ||
  ((text = "", maxChars = 500) => {
    if (!text) return [];
    const sentences = text.split(/(?<=[.?!])\s+/);
    const chunks = [];
    let current = "";
    let idx = 0;

    for (const s of sentences) {
      if ((current + " " + s).length > maxChars) {
        chunks.push({ text: current.trim(), index: idx++ });
        current = s;
      } else {
        current += " " + s;
      }
    }

    if (current.trim()) {
      chunks.push({ text: current.trim(), index: idx++ });
    }

    return chunks.length
      ? chunks
      : [{ text: text.slice(0, maxChars), index: 0 }];
  });

/* =====================================================
   INTERVIEW DETECTION (CLIENT-SIDE)
===================================================== */

function detectInterview(text) {
  if (!text || text.length < 200) return false;
  const speakerLabels = (text.match(/^[A-Z][a-z]+(\s[A-Z][a-z]+)?:/gm) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  return speakerLabels > 5 || questions / (text.length / 1000) > 2.5;
}

/* =====================================================
   DASHBOARD
===================================================== */

export default function Dashboard() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const [mode, setMode] = useState("youtube");
  const [videoUrlOrId, setVideoUrlOrId] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [userText, setUserText] = useState("");

  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [analysisId, setAnalysisId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [generatedScript, setGeneratedScript] = useState(null);
  const [error, setError] = useState(null);

  const [showFormatModal, setShowFormatModal] = useState(false);
  const [pendingAnalysisId, setPendingAnalysisId] = useState(null);

  const resultsRef = useRef(null);

  const isBusy = [
    "transcribing",
    "fetching-web",
    "creating-analysis",
    "creating-embeddings",
    "generating-analysis",
  ].includes(status);

  /* =====================================================
     RESUME ANALYSIS (AFTER MODAL)
  ===================================================== */

  const resumeAnalysisWithFormat = async (format) => {
    setShowFormatModal(false);
    if (!pendingAnalysisId) return;

    setStatus("generating-analysis");

    try {
      const token = session.access_token;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const genRes = await fetch("/api/generate-gap-analysis", {
        method: "POST",
        headers,
        body: JSON.stringify({
          analysisId: pendingAnalysisId,
          outputFormat: format,
        }),
      });

      if (!genRes.ok) {
        throw new Error("Gap analysis failed to generate");
      }

      const genJson = await genRes.json();
      const parsed = genJson?.parsed || {};

      const safeParsed = {
        summary: safeString(parsed.summary),
        gaps: safeArray(parsed.gaps),
        titles: safeArray(parsed.titles),
        keywords: safeArray(parsed.keywords),
        suggested_script: safeString(parsed.suggested_script),
      };

      setAnalysisResult(safeParsed);
      setGeneratedScript(safeParsed.suggested_script);
      setStatus("done");
      setAnalysisId(pendingAnalysisId);
      setPendingAnalysisId(null);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate analysis");
      setStatus("error");
    }
  };

  /* =====================================================
     ANALYZE HANDLER
  ===================================================== */

  const handleAnalyze = async () => {
    if (!session?.access_token) {
      setError("Session expired. Please login again.");
      return;
    }

    setStatus("transcribing");
    setTranscript("");
    setAnalysisResult(null);
    setGeneratedScript(null);
    setError(null);
    setAnalysisId(null);
    setPendingAnalysisId(null);
    setShowFormatModal(false);

    try {
      const token = session.access_token;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      let finalTranscript = "";

      /* ---------- 1. TRANSCRIPTION ---------- */

      if (mode === "youtube") {
        if (!videoUrlOrId) throw new Error("Please enter a YouTube URL");
        const r = await fetch("/api/transcribe", {
          method: "POST",
          headers,
          body: JSON.stringify({ url: videoUrlOrId }),
        });
        if (!r.ok) throw new Error("Transcription failed (invalid URL?)");
        const j = await r.json();
        if (!j.transcript) throw new Error("No transcript returned");
        finalTranscript = j.transcript;
      }

      if (mode === "blog") {
        if (!webUrl) throw new Error("Please enter a website URL");
        const r = await fetch("/api/extract-webtext", {
          method: "POST",
          headers,
          body: JSON.stringify({ url: webUrl }),
        });
        if (!r.ok) throw new Error("Website extraction failed");
        const j = await r.json();
        if (!j.text) throw new Error("No text extracted from website");
        finalTranscript = j.text;
      }

      if (mode === "text") {
        if (!userText || userText.length < 50) throw new Error("Text too short (min 50 chars)");
        finalTranscript = userText;
      }

      setTranscript(finalTranscript);

      /* ---------- 2. CREATE ANALYSIS RECORD ---------- */

      setStatus("creating-analysis");

      const createRes = await fetch("/api/create-analysis", {
        method: "POST",
        headers,
        body: JSON.stringify({
          transcript: finalTranscript,
          type: mode,
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create analysis record");

      const createJson = await createRes.json();
      const newId = createJson.analysisId || createJson.id;

      if (!newId) throw new Error("Missing analysis ID");

      setAnalysisId(newId);

      /* ---------- 3. CREATE EMBEDDINGS ---------- */

      setStatus("creating-embeddings");

      const chunks = chunkText(finalTranscript);
      const chunkRes = await fetch("/api/create-embeddings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          analysisId: newId,
          chunks,
        }),
      });

      if (!chunkRes.ok) console.warn("Embeddings generation warning (non-fatal)");

      /* ---------- 4. DETECT INTERVIEW & PAUSE/PROCEED ---------- */

      const isInterview = detectInterview(finalTranscript);

      if (isInterview) {
        setPendingAnalysisId(newId);
        setShowFormatModal(true);
        setStatus("idle");
        return; // STOP HERE -> Wait for Modal
      }

      /* ---------- 5. GENERATE GAP ANALYSIS (MONOLOGUE) ---------- */

      setStatus("generating-analysis");

      const genRes = await fetch("/api/generate-gap-analysis", {
        method: "POST",
        headers,
        body: JSON.stringify({
          analysisId: newId,
          outputFormat: "monologue",
        }),
      });

      if (!genRes.ok) throw new Error("Analysis generation failed");

      const genJson = await genRes.json();

      /* 🔒 HARD NORMALIZATION (CRITICAL) */

      const parsed = genJson?.parsed || {};

      const safeParsed = {
        summary: safeString(parsed.summary),
        gaps: safeArray(parsed.gaps),
        titles: safeArray(parsed.titles),
        keywords: safeArray(parsed.keywords),
        suggested_script: safeString(parsed.suggested_script),
      };

      setAnalysisResult(safeParsed);
      setGeneratedScript(safeParsed.suggested_script);
      setStatus("done");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  if (loading || !user) {
    return (
      <Layout bgClass="bg-[#030014]">
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Loading…
        </div>
      </Layout>
    );
  }

  // Helper for UI Logic
  const hasAnalysisData = analysisResult && !error && status === "done";
  const gaps = analysisResult?.gaps || [];

  return (
    <Layout bgClass="bg-[#030014]" headerVariant="dark">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Card className="p-6 mb-10">
          <input
            className="w-full p-4 bg-white/5 text-white rounded-lg"
            placeholder="Paste content or URL"
            value={mode === "text" ? userText : videoUrlOrId}
            onChange={(e) =>
              mode === "text"
                ? setUserText(e.target.value)
                : setVideoUrlOrId(e.target.value)
            }
          />

          <Button
            onClick={handleAnalyze}
            isLoading={isBusy}
            className="mt-4"
          >
            Analyze
          </Button>
        </Card>

        {/* FORMAT SELECTION MODAL */}
        {showFormatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0b0c15] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-white mb-2">Interview Detected</h3>
              <p className="text-slate-400 mb-6">
                This content appears to be an interview. How should we process it?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => resumeAnalysisWithFormat("preserve")}
                  className="w-full p-4 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                >
                  <div className="font-semibold text-white">Preserve Inteview</div>
                  <div className="text-xs text-slate-500">Keep Q&A format, fix logic/gaps</div>
                </button>
                <button
                  onClick={() => resumeAnalysisWithFormat("monologue")}
                  className="w-full p-4 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                >
                  <div className="font-semibold text-white">Convert to Monologue</div>
                  <div className="text-xs text-slate-500">Rewrite as single-voice narrative</div>
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={resultsRef}>
          {isBusy && <AnalysisLoader status={status} />}

          {hasAnalysisData && (
            <Card className="p-8">
              <h2 className="text-xl text-white mb-4">Summary</h2>
              <p className="text-slate-300">{analysisResult.summary}</p>

              <h3 className="text-lg text-white mt-8 mb-4">
                Identified Content Gaps
              </h3>

              {gaps.length === 0 ? (
                <p className="text-green-400">
                  🎉 No major improvements suggested.
                </p>
              ) : (
                gaps.map((g, i) => (
                  <div key={i} className="mb-4 p-4 bg-white/5 rounded">
                    <h4 className="text-white font-semibold">
                      {g.title || `Gap ${i + 1}`}
                    </h4>
                    <p className="text-slate-400">{g.suggestion}</p>
                  </div>
                ))
              )}

              {generatedScript && (
                <>
                  <h3 className="text-lg text-white mt-8 mb-4">
                    Derivative Script
                  </h3>
                  <pre className="bg-black/40 p-4 rounded text-slate-300 whitespace-pre-wrap">
                    {generatedScript}
                  </pre>
                </>
              )}
            </Card>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Link href="/history">
            <Button variant="ghost">View History</Button>
          </Link>
        </div>

        {error && (
          <div className="mt-6 text-red-400 font-medium p-4 border border-red-500/20 bg-red-900/10 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </Layout>
  );
}