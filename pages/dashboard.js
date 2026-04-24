import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import Tooltip from "../components/Tooltip";
import LimitAlert from "../components/LimitAlert";
import UpgradeBanner from "../components/UpgradeBanner"; // NEW
import UpgradeModal from "../components/UpgradeModal"; // Context-Aware Modal
import AnalysisLoader from "../components/AnalysisLoader";
import { supabase } from "../lib/supabaseClient";
import FeedbackBox from "../components/FeedbackBox"; // Import FeedbackBox
import { chunkText as chunkTextFromLib } from "../lib/chunkText";
import { getEntitlementUX, ERROR_CODES } from "../lib/errorMapping"; // NEW

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

// Extract JSON error if wrapped in "Analysis failed: " or similar text
const parseError = (err) => {
  let msg = err.message || String(err);
  if (!msg) return { message: "Unknown error" };

  try {
    // 1. Try straightforward JSON parse
    let parsed = JSON.parse(msg);
    if (parsed && parsed.error) {
      return {
        message: parsed.error,
        upgrade: !!parsed.upgrade,
        code: parsed.code // Capture backend error code
      };
    }
  } catch (e1) {
    // 2. Try to find JSON object substring { ... }
    const firstParen = msg.indexOf("{");
    const lastParen = msg.lastIndexOf("}");

    if (firstParen !== -1 && lastParen > firstParen) {
      const potentialJson = msg.substring(firstParen, lastParen + 1);
      try {
        let parsed = JSON.parse(potentialJson);
        if (parsed && parsed.error) {
          return {
            message: parsed.error,
            upgrade: !!parsed.upgrade,
            code: parsed.code
          };
        }
      } catch (e2) {
        // ignore
      }
    }
  }

  // fallback: strip prefixes
  const prefixes = ["Analysis failed: ", "Regenerate failed: ", "create-analysis failed: "];
  for (let p of prefixes) {
    if (msg.startsWith(p)) {
      msg = msg.replace(p, "");
    }
  }

  return { message: msg };
};

export default function Dashboard() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  // Protect the route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const [usage, setUsage] = useState({ analyses: 0, youtube: 0 });
  const [userPlan, setUserPlan] = useState("free");
  const [credits, setCredits] = useState({ used: 0, total: 30, remaining: 30, resetAt: null });
  const [estimatedCost, setEstimatedCost] = useState(null);



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
  const [entitlementError, setEntitlementError] = useState(null); // specific entitlement state
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  // Modal State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalConfig, setUpgradeModalConfig] = useState({});

  // New states for script progress
  const [scriptProgress, setScriptProgress] = useState(0);
  const [helperMessageIndex, setHelperMessageIndex] = useState(0);

  const helperMessages = [
    "This script will incorporate all identified gaps.",
    "We’re carefully grounding everything in your original content.",
    "This usually takes under a minute.",
    "Almost there — final polish in progress."
  ];

  // Word count helpers
  const countWords = (text) =>
    !text || text.trim() === "" ? 0 : text.trim().split(/\s+/).filter(Boolean).length;

  const calcCreditCost = (wordCount, inputType) => {
    if (!wordCount || wordCount <= 0) return 0;
    let raw;
    if (inputType === "blog") raw = (wordCount / 1000) * 1.2;
    else if (inputType === "youtube") raw = (wordCount / 1000) * 1.5;
    else raw = wordCount / 1000;
    return Math.ceil(raw / 0.5) * 0.5;
  };

  // Fetch usage and plan
  useEffect(() => {
    if (!user) return;

    async function fetchEntitlements() {
      // 1. Get Plan
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      const plan = sub?.plan?.toLowerCase() || "free";
      setUserPlan(plan);

      // 2. Get Usage
      const { data: usageData } = await supabase
        .from("freemium_usage")
        .select("analyses_used, reset_at")
        .eq("user_id", user.id)
        .maybeSingle();

      const planCredits = plan === "pro" ? 100 : plan === "standard" ? 30 : 3;
      let creditsUsed = parseFloat(usageData?.analyses_used) || 0;
      const resetAt = usageData?.reset_at ? new Date(usageData.reset_at) : new Date(0);

      if (new Date() >= resetAt) creditsUsed = 0;

      setUsage({ analyses: Math.floor(creditsUsed), youtube: 0 });
      setCredits({
        used: creditsUsed,
        total: planCredits,
        remaining: Math.max(0, planCredits - creditsUsed),
        resetAt: usageData?.reset_at || null,
      });
    }

    fetchEntitlements();
  }, [user, analysisResult, generatedScript]); // Refresh when analysis completes

  // Dynamic credit estimate for text mode
  useEffect(() => {
    if (mode === "text") {
      const wc = countWords(userText);
      setEstimatedCost(wc > 0 ? calcCreditCost(wc, "text") : null);
    } else {
      setEstimatedCost(null); // URL modes: cost known only after transcription
    }
  }, [userText, mode]);

  // Rotate helper messages
  useEffect(() => {
    let interval;
    if ((status === 'generating-analysis' || status === 'script_generating' || status === 'regenerating') && analysisResult && !generatedScript) {
      interval = setInterval(() => {
        setHelperMessageIndex(prev => (prev + 1) % helperMessages.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [status, analysisResult, generatedScript]);

  // Simulated progress for script generation
  useEffect(() => {
    let interval;
    if ((status === 'generating-analysis' || status === 'script_generating' || status === 'regenerating') && analysisResult && !generatedScript) {
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
  const [showToneModal, setShowToneModal] = useState(false);
  const [selectedTone, setSelectedTone] = useState(null);
  const [pendingAnalysisId, setPendingAnalysisId] = useState(null);
  const [formatChoice, setFormatChoice] = useState(null); // 'preserve' | 'monologue'

  const [contentTarget, setContentTarget] = useState("youtube"); // 'youtube' | 'blog' | 'linkedin' | 'x'
  const [selectedPlatform, setSelectedPlatform] = useState(null); // For post-analysis switching

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
    setFormatChoice(choice === "preserve" ? "interview" : "monologue");
    
    // Trigger the Tone Selection modal instead of directly fetching
    setShowToneModal(true);
  };

  const generateScriptWithTone = async (tone) => {
    setShowToneModal(false);
    setSelectedTone(tone);

    setStatus("generating-analysis");
    const analysisId = pendingAnalysisId;

    if (!analysisId) {
      setError(parseError("Missing analysisId for generateScriptWithTone"));
      return;
    }

    log(`Generating script ${analysisId} with tone=${tone}`);

    try {
      const token = session.access_token;
      const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          analysisId,
          formatMode: formatChoice,
          tone: tone,
          gaps: analysisResult?.gaps
        })
      });

      if (!response.ok) {
        throw new Error(`Script generation failed: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      /* NDJSON STREAM PARSER */
      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.status === "script_generating") {
                log("Received: Script Generating...");
              } else if (event.status === "script_ready") {
                log("Received: Script Ready");
                setGeneratedScript(event.script);
              } else if (event.status === "error") {
                throw new Error(event.message);
              }
            } catch (parseErr) {
              console.warn("Failed to parse JSON chunk:", line);
            }
          }
        }
        if (done) break;
      }

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
      console.error("generateScriptWithTone error", err);
      setStatus("error");
      const errorObj = parseError(err);
      setError(errorObj);
      log(`Error: ${errorObj.message}`);
    }
  };

  const handleRegenerateScript = async (newPlatform) => {
    if (!newPlatform) return;
    // Removed duplicate check to allow explicit regeneration via button
    // if (newPlatform === (selectedPlatform || contentTarget)) return;

    // Check bounds
    if (!analysisId || !analysisResult?.gaps) {
      console.error("Cannot regenerate: missing analysisId or gaps");
      return;
    }

    setSelectedPlatform(newPlatform);
    setStatus("regenerating");
    // Clear current script to show loading state effectively or keep it and show overlay
    setGeneratedScript("");

    // We'll treat "regenerating" similar to "script_generating" for helper text
    setScriptProgress(0);

    log(`Regenerating script for platform: ${newPlatform}`);

    try {
      const token = session.access_token;

      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          analysisId,
          regenerateScript: true,
          targetPlatform: newPlatform,
          tone: selectedTone,
          gaps: analysisResult.gaps,
          summary: analysisResult.summary, // Pass these to preserve DB consistency if needed
          titles: analysisResult.titles,
          keywords: analysisResult.keywords,
          formatMode: "monologue"
        })
      });

      if (!response.ok) {
        throw new Error(`Regenerate failed: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.status === "script_ready") {
                setGeneratedScript(event.script);
                setStatus("done");
              }
            } catch (e) { console.warn("Parse error", e); }
          }
        }
        if (done) break;
      }

      // Final flush
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.status === "script_ready") {
            setGeneratedScript(event.script);
            setStatus("done");
          }
        } catch (e) { }
      }

    } catch (err) {
      console.error("Regeneration error", err);
      const errorObj = parseError(err);

      // Entitlement Modal Check
      if (errorObj.code) {
        const uxConfig = getEntitlementUX(errorObj.code);
        if (uxConfig.showUpgradeCTA) {
          setUpgradeModalConfig({
            headline: errorObj.code === "YOUTUBE_LIMIT" ? "Monthly YouTube Limit Reached" : "Upgrade to Unlock Feature",
            bullets: errorObj.code === "YOUTUBE_LIMIT"
              ? ["You’ve used your 1 free YouTube analysis.", "Upgrade to Pro for 50/month.", "Unlock all advanced features."]
              : ["This feature requires a premium plan.", "Upgrade to Pro to unlock unlimited access.", "Generate content for all platforms."],
            primaryActionText: "Upgrade Now"
          });
          setUpgradeModalOpen(true);
          setStatus("done");
          return;
        }
      }

      setError(errorObj);
      setStatus("done");
      // Auto-scroll to top so user isn't stuck at bottom with an error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAnalyze = async () => {
    if (!session?.access_token) {
      setError({ message: "User session invalid. Please log in again." });
      return;
    }

    // 8,000-word hard cap for text mode
    if (mode === "text") {
      const wc = countWords(userText);
      if (wc > 8000) {
        setError({ message: "Your content exceeds the 8,000-word limit. Please trim your transcript or split it into parts and analyse each separately." });
        return;
      }
    }

    // Credit limit pre-check (optimistic UI)
    if (userPlan !== "pro") {
      const cost = mode === "text" ? calcCreditCost(countWords(userText), "text") : 1;
      if (credits.used + cost > credits.total) {
        const resetDate = credits.resetAt ? new Date(credits.resetAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "next cycle";
        setUpgradeModalConfig({
          headline: "Insufficient Credits",
          bullets: [
            `This analysis requires ${cost} credits. You have ${credits.remaining.toFixed(1)} credits remaining.`,
            `Your credits reset on ${resetDate}.`,
            userPlan === "standard" ? "Upgrade to Pro for 100 credits/month." : "Upgrade to Standard for 30 credits/month."
          ],
          primaryActionText: "Upgrade Plan"
        });
        setUpgradeModalOpen(true);
        return;
      }
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
    setSelectedPlatform(null); // Reset post-analysis selection on new analysis

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
        if (transJson.error) {
          throw new Error(JSON.stringify({
             error: transJson.details ? `${transJson.error}: ${transJson.details}` : transJson.error,
             code: transJson.code || "TRANSCRIPTION_ERROR",
             details: transJson.details
          }));
        }
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
        metadata: {
          ...finalMetadata,
          content_target: contentTarget
        },
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

      // 3) Extract Gaps Pause
      setStatus("analyzing-gaps");
      const gapResp = await fetch("/api/analyze-gaps", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ analysisId: newAnalysisId })
      });
      if (!gapResp.ok) {
        const txt = await gapResp.text();
        throw new Error(`Analyze gaps failed: ${txt}`);
      }
      const gapData = await gapResp.json();
      setAnalysisResult({ ...gapData, isInterview });
      
      setPendingAnalysisId(newAnalysisId);

      // 6) Render gaps first, then automatically trigger the modal
      log("Gaps analysis complete. Automatically triggering tone selection.");
      setStatus("waiting-for-user");
      
      setTimeout(() => {
        if (isInterview) {
          setShowFormatModal(true);
        } else {
          setFormatChoice("monologue");
          setShowToneModal(true);
        }
      }, 800);

    } catch (err) {
      console.error("handleAnalyze error", err);
      setStatus("error");
      const errorObj = parseError(err);

      // ENTITLEMENT HANDLING
      if (errorObj.code) {
        const uxConfig = getEntitlementUX(errorObj.code);
        setEntitlementError(uxConfig);

        // Special handling for disabled transcription and bot blocks
        if (["TRANSCRIPTION_DISABLED", "YOUTUBE_BOT_BLOCK", "YOUTUBE_FETCH_ERROR", "VIDEO_TOO_LONG"].includes(errorObj.code)) {
          // We rely on LimitAlert (which uses entitlementError) to show the message
          // So we just return here to avoid setting generic error
          setStatus("idle");
          return;
        }

        if (uxConfig.showUpgradeCTA) {
          // If it's a hard stop, show modal. If it's just a banner, show banner.
          // For now, let's prioritize modal for total limits if code matches
          if (errorObj.code === 'TOTAL_LIMIT') {
            setUpgradeModalConfig({
              headline: "Monthly Analysis Limit Reached",
              bullets: [
                "You’ve reached your monthly analysis limit.",
                "Upgrade to Pro for UNLIMITED analyses.",
                "Add up to 3 team members."
              ]
            });
            setUpgradeModalOpen(true);
            return;
          }

          setShowUpgradeBanner(true);
          // Do NOT show LimitAlert for upgrade issues if we show the banner
          return;
        }
      }

      setError(errorObj);
      log(`Error: ${errorObj.message}`);
      // Do not scroll to top if it's just an inline error or upgrade prompt?
      // User requested "Sticky upgrade banner... Non-blocking".
      if (!errorObj.code) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };



  const isBusy = ["transcribing", "fetching-web", "creating-analysis", "creating-embeddings", "analyzing-gaps", "generating-analysis", "regenerating"].includes(status);

  // Helpers for UI state
  const getAnalyzeButtonText = () => {
    if (status === "transcribing") return "Transcribing...";
    if (status === "fetching-web") return "Fetching Article...";
    if (status === "creating-analysis") return "Analyzing...";
    if (status === "creating-embeddings") return "Embedding...";
    if (status === "analyzing-gaps") return "Identifying Gaps...";
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
      <Layout bgClass="bg-[#080809]" headerVariant="dark">
        <div className="min-h-screen flex items-center justify-center bg-[#080809]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-none animate-spin mx-auto mb-4"></div>
            <p className="font-mono text-[10px] tracking-widest text-[#10B981] animate-pulse">_AUTHORIZING_SESSION...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout bgClass="bg-[#080809]" headerVariant="dark">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
        {/* Ambient Subtle Glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#10B981]/5 blur-[150px] rounded-full pointer-events-none -z-10"></div>
        
        {/* Credit Meter */}
        {user && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-[#111827]/80 border border-white/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">CREDIT BALANCE</span>
                <span className={`font-mono text-xs font-bold ${credits.remaining <= 0 ? "text-red-400" : credits.remaining / credits.total < 0.2 ? "text-amber-400" : "text-[#10B981]"}`}>
                  {credits.used.toFixed(1)} of {credits.total} credits used this month
                </span>
              </div>
              <div className="w-full sm:w-48 h-1.5 bg-[#080809] border border-white/10 relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-500 ${credits.remaining <= 0 ? "bg-red-500" : credits.remaining / credits.total < 0.2 ? "bg-amber-500" : "bg-[#10B981]"}`}
                  style={{ width: `${Math.min(100, (credits.used / credits.total) * 100)}%` }}
                />
              </div>
            </div>
            {credits.remaining <= 0 && (
              <div className="mt-1 font-mono text-[10px] text-red-400 text-right">
                {userPlan === "pro"
                  ? "You've used all your credits for this month. Contact us if you need a custom plan."
                  : "You've used all your credits for this month. Upgrade to Pro for more analyses."}
              </div>
            )}
          </div>
        )}

        {/* Input Section */}
        <div className="max-w-4xl mx-auto mb-16 animate-slide-up">
          <div className="text-center mb-10">
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4">SYSTEM ENTRY POINT</div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 tracking-tighter uppercase italic">Strategic Ingestion</h1>
            <p className="font-sans text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {mode === "youtube" && "Input a YouTube URL to execute gap detection and generate derivative scripts."}
              {mode === "blog" && "Input an article URL to extract core insights and identify content gaps."}
              {mode === "text" && "Input raw text or draft material to analyze structure and identify structural flaws."}
            </p>
          </div>

          {/* Fallback Info Banner */}
          {showFallbackBanner && (
            <div className="mb-6 mx-auto max-w-2xl bg-[#0b0c15] border border-[#10B981]/30 p-4 flex items-start gap-3 animate-fade-in shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
              <div className="w-8 h-8 bg-transparent border border-[#10B981]/20 flex items-center justify-center flex-shrink-0 text-[#10B981]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Switching to Manual Entry</h4>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  Target blocked automatic extraction. <strong>TEXT MODE</strong> initialized — please input raw data below.
                </p>
              </div>
              <button
                onClick={() => setShowFallbackBanner(false)}
                className="ml-auto text-[#10B981]/50 hover:text-[#10B981] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="relative group">
            <div className="bg-[#111827]/80 backdrop-blur-md border border-white/10 overflow-hidden rounded-none shadow-2xl">

              {/* Mode Tabs */}
              <div className="flex border-b border-white/5 bg-[#080809]">
                {[
                  { id: "youtube", label: "YOUTUBE" },
                  { id: "blog", label: "WEBSITE" },
                  { id: "text", label: "TEXT" }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                    }}
                    className={`flex-1 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-colors relative ${mode === m.id ? "text-white bg-white/5" : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
                      }`}
                  >
                    {m.label}
                    {mode === m.id && <div className="absolute top-0 left-0 w-full h-[1px] bg-[#10B981]"></div>}
                  </button>
                ))}
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Row 1: Full-Width Input */}
                <div className="w-full relative">
                  {mode === "youtube" && (
                    <>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-[#10B981] font-mono font-bold text-lg">{'>'}</span>
                      </div>
                      <input
                        type="text"
                        value={videoUrlOrId}
                        onChange={(e) => setVideoUrlOrId(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full pl-11 pr-4 py-4 rounded-none border-0 border-b-2 border-white/10 bg-[#080809] focus:bg-[#10B981]/5 focus:border-[#10B981] focus:outline-none focus:ring-0 text-white font-mono text-sm placeholder:text-slate-600 transition-all shadow-inner"
                      />
                    </>
                  )}
                  {mode === "blog" && (
                    <>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-[#10B981] font-mono font-bold text-lg">{'>'}</span>
                      </div>
                      <input
                        type="text"
                        value={webUrl}
                        onChange={(e) => setWebUrl(e.target.value)}
                        placeholder="https://yourblog.com/post"
                        className="w-full pl-11 pr-4 py-4 rounded-none border-0 border-b-2 border-white/10 bg-[#080809] focus:bg-[#10B981]/5 focus:border-[#10B981] focus:outline-none focus:ring-0 text-white font-mono text-sm placeholder:text-slate-600 transition-all shadow-inner"
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
                      placeholder="// PASTE RAW TRANSCRIPT OR TEXT HERE"
                      className={`w-full p-4 h-32 rounded-none border-0 border-b-2 bg-[#080809] focus:bg-[#10B981]/5 focus:outline-none focus:ring-0 text-white font-mono text-sm placeholder:text-slate-600 transition-all shadow-inner resize-none ${isHighlighting ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-white/10" : "border-white/10 focus:border-[#10B981]"
                        }`}
                    />
                  )}
                </div>

                {/* Row 2: Selector + Action */}
                {/* Row 2: Selector + Action */}
                <div className="flex flex-col lg:flex-row items-end justify-between gap-6">
                  {/* Left: Platform Selector */}
                  <div className="flex-1 w-full lg:w-auto min-w-0">
                    <div className="text-left mb-2.5 flex items-center justify-between">
                      <h3 className="font-mono text-xs font-bold text-slate-500 tracking-wider">TARGET PLATFORM</h3>
                      {entitlementError?.inlineMessage && (
                        <span className="font-mono text-[10px] font-bold text-[#10B981] animate-pulse px-2 py-0.5 border border-[#10B981]/20">
                          {entitlementError.inlineMessage}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-0 w-full border border-white/10 p-1 bg-[#080809]">
                      {[
                        {
                          id: "youtube",
                          label: "YOUTUBE",
                          sub: "Long video",
                          icon: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                        },
                        {
                          id: "blog",
                          label: "BLOG",
                          sub: "Articles",
                          icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
                          paidOnly: true
                        },
                        {
                          id: "linkedin",
                          label: "LINKEDIN",
                          sub: "Post",
                          icon: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                        },
                        {
                          id: "x",
                          label: "X — SINGLE POST",
                          sub: "Single post",
                          icon: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
                        },
                        {
                          id: "x_thread",
                          label: "X — THREAD",
                          sub: "Deep dive",
                          icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                          paidOnly: true
                        },
                        {
                          id: "linkedin_carousel",
                          label: "LINKEDIN CAROUSEL",
                          sub: "Carousel",
                          icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
                          paidOnly: true
                        },
                        {
                          id: "email_newsletter",
                          label: "NEWSLETTER",
                          sub: "Email",
                          icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                          paidOnly: true
                        }
                      ].map((platform) => {
                        const isLocked = false;
                        const isActive = contentTarget === platform.id;
                        return (

                          <div key={platform.id} className="w-full h-full relative border-[0.5px] border-white/5">
                            <Tooltip content={isLocked ? "Available on Standard & Pro" : ""}>
                              <button
                                onClick={() => {
                                  if (isLocked) {
                                    setEntitlementError({ inlineMessage: "Available on Standard & Pro plans." });
                                    setShowUpgradeBanner(true);
                                    return;
                                  };
                                  setEntitlementError(null);
                                  setContentTarget(platform.id)
                                }}
                                className={`relative flex flex-col justify-center items-start px-3 py-3 transition-all duration-0 w-full h-full min-h-[72px] ${isLocked
                                  ? "opacity-40 cursor-not-allowed bg-[#080809] grayscale"
                                  : isActive
                                    ? "bg-[#10B981]/10 border border-[#10B981] z-10"
                                    : "bg-[#080809] hover:bg-white/5"
                                  }`}
                              >
                                {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>}
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                  <div className={`${isLocked ? "text-slate-500" :
                                    isActive ? "text-[#10B981]" : "text-slate-400 group-hover:text-slate-300"
                                    }`}>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d={platform.icon} />
                                    </svg>
                                  </div>
                                  <span className={`text-[11px] font-mono font-bold whitespace-nowrap tracking-wider ${isLocked ? "text-slate-500" :
                                    isActive ? "text-[#10B981]" : "text-slate-200"
                                    }`}>
                                    {platform.label} {isLocked && "🔒"}
                                  </span>
                                </div>
                                <span className={`block font-mono text-[10px] pl-1.5 truncate w-full text-left uppercase tracking-widest ${isLocked ? "text-slate-600" :
                                  isActive ? "text-[#0D9488]" : "text-slate-400"
                                  }`}>
                                  {platform.sub}
                                </span>
                              </button>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>

                    {/* Credit estimate below platform selector */}
                    {estimatedCost !== null ? (
                      <div className="mt-3 font-mono text-[10px] text-slate-500">
                        Estimated cost: <span className="text-[#10B981] font-bold">{estimatedCost} credits</span>
                        &nbsp;&nbsp;|&nbsp;&nbsp;You have <span className={credits.remaining < estimatedCost ? "text-amber-400 font-bold" : "text-white font-bold"}>{credits.remaining.toFixed(1)} credits</span> remaining
                      </div>
                    ) : mode !== "text" ? (
                      <div className="mt-3 font-mono text-[10px] text-slate-600">
                        Credit cost calculated after {mode === "youtube" ? "video is transcribed" : "article is extracted"}
                      </div>
                    ) : null}
                  </div>

                  {/* Right: Analyze Button */}
                  <div className="flex-shrink-0 w-full lg:w-auto flex flex-col items-center lg:items-end">
                    <Button
                      onClick={handleAnalyze}
                      isLoading={isBusy}
                      disabled={isInputEmpty() || credits.remaining <= 0}
                      size="xl"
                      variant="primary"
                      title={credits.remaining <= 0 ? "No credits remaining" : isInputEmpty() ? "Paste a link to analyze" : ""}
                      className={`w-full lg:w-auto h-[72px] rounded-none border border-[#10B981] font-mono font-bold tracking-widest text-[12px] uppercase px-8 transition-all ${credits.remaining <= 0
                        ? "!bg-slate-900 !text-slate-600 !border-slate-800 !cursor-not-allowed opacity-50"
                        : "!bg-[#10B981] !text-[#080809] hover:!bg-[#0D9488] hover:!border-[#0D9488] shadow-none"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {isBusy ? <span className="animate-pulse">_PROCESSING</span> : getAnalyzeButtonText()}
                        {credits.remaining > 0 && !isBusy && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        )}
                      </div>
                    </Button>

                    {((userPlan === "free" && usage.analyses >= 3) || (userPlan === "standard" && usage.analyses >= 20)) && (
                      <div className="mt-3 text-center lg:text-right">
                         <span className="font-mono text-[10px] text-amber-500 tracking-widest uppercase">
                          LIMIT REACHED. <Link href="/pricing" className="underline hover:text-[#10B981] transition-colors ml-1">UPGRADE</Link>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4 opacity-60 flex items-center justify-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your analysis is secure and private.
          </p>

          {/* Limit Alert Replaces Inline Error */}
          <LimitAlert error={error} onClose={() => setError(null)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Transcript */}
          <div className="lg:col-span-4 min-h-[500px] max-h-[800px] flex flex-col">
            <div className={`flex flex-col bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-none overflow-hidden transition-all duration-0 ${isTranscriptExpanded ? "h-full" : "h-auto"}`}>
              <div
                className="p-4 border-b border-white/10 bg-[#080809] flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              >
                <div className="flex items-center gap-2">
                  <div className={`text-[#10B981] transition-transform duration-0 ${isTranscriptExpanded ? "rotate-90" : ""}`}>
                    <span className="font-mono">{'>'}</span>
                  </div>
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    RAW TRANSCRIPT DATA
                  </h3>
                </div>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 border border-[#10B981]/20 text-[#10B981] tracking-widest">
                  {transcript.length > 0 ? `${transcript.length} BYTES` : "EMPTY"}
                </span>
              </div>

              {isTranscriptExpanded && (
                status === "transcribing" && !transcript ? (
                  <div className="flex-1 p-6 space-y-4 bg-transparent border-l border-dashed border-white/10 ml-4 mt-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`h-1 bg-[#10B981]/20 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`}></div>
                    ))}
                    <p className="font-mono text-[10px] text-[#10B981] animate-pulse mt-4">_EXTRACTING_AUDIO_DATA...</p>
                  </div>
                ) : (
                  <div className="flex-1 relative flex">
                    <div className="w-6 border-r border-dashed border-white/10 flex-shrink-0 bg-[#080809]/50"></div>
                    <textarea
                      value={transcript}
                      readOnly
                      className="flex-1 w-full p-4 resize-none outline-none text-sm leading-relaxed text-slate-300 font-mono bg-transparent focus:bg-white/5 transition-colors placeholder:text-slate-600"
                      placeholder="// SYSTEM IDLE. NO DATA INGESTED."
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div ref={resultsRef} className="lg:col-span-8 min-h-[500px] max-h-[800px] flex flex-col">
            <div className="p-8 h-full flex flex-col bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-none relative">
              
              <div className="flex items-start justify-between mb-8 pb-4 border-b border-dashed border-white/10">
                <div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">OUTPUT LOG</div>
                  <h2 className="text-2xl font-display font-bold text-white tracking-tighter uppercase italic">Intelligence Engine</h2>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className={`px-3 py-1 border flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${status === 'done' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]' : 'bg-[#080809] text-slate-500 border-white/10'
                    }`}>
                    <span className={`w-1.5 h-1.5 ${status === 'done' ? 'bg-[#10B981]' : 'bg-slate-500 animate-pulse'}`}></span>
                    <span>{status === 'idle' ? 'STANDBY' : status.replace('-', '_')}</span>
                  </div>
                </div>
              </div>

              {isBusy && !analysisResult && !generatedScript ? (
                <AnalysisLoader status={status} />
              ) : !analysisResult && !generatedScript ? (
                <div className="h-96 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 bg-[#080809] hover:bg-white/5 transition-colors group">
                  <div className="w-12 h-12 flex items-center justify-center mb-4 text-[#10B981]/30 group-hover:text-[#10B981] transition-colors border border-white/5 group-hover:border-[#10B981]/50 bg-[#111827]">
                     <span className="font-mono text-xl">{'>_'}</span>
                  </div>
                  <p className="font-mono text-xs text-[#10B981] mb-1 tracking-widest">SYSTEM AWAITING INPUT</p>
                  <p className="font-mono text-[10px] text-slate-600 uppercase">Input target above to initiate deep scan.</p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0 animate-slide-up">
                  {/* Summary */}
                  {analysisResult?.summary && (
                    <div className="shrink-0 mb-8">
                      <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <span className="text-[#10B981]">{'>'}</span> SYSTEM SUMMARY
                      </h3>
                      <div className="bg-[#080809] p-6 border-l-2 border-[#10B981] border-y border-r border-white/5 text-slate-200 leading-relaxed font-sans text-base shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981]/5 blur-2xl"></div>
                        {analysisResult.summary}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {analysisResult?.gaps && (
                    <div className="flex flex-col flex-1 min-h-0 pb-4">
                      <h3 className="shrink-0 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <span className="text-red-500">{'>'}</span> IDENTIFIED CONTENT GAPS
                      </h3>
                      <div className="flex flex-col gap-0 border border-white/5 bg-[#080809] flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                        {analysisResult.gaps.map((g, i) => {
                          const severity = (g.severity || (i === 0 ? "CRITICAL" : i === 1 ? "MEDIUM" : "MINOR")).toUpperCase();
                          const priorityColor = severity === "CRITICAL" ? "text-red-500 border-red-500/30 bg-red-500/10" : severity === "MEDIUM" ? "text-orange-500 border-orange-500/30 bg-orange-500/10" : "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10";
                          const numColor = severity === "CRITICAL" ? "text-red-500" : severity === "MEDIUM" ? "text-orange-500" : "text-[#10B981]";
                          const accentColor = severity === "CRITICAL" ? "bg-red-500" : severity === "MEDIUM" ? "bg-orange-500" : "bg-[#10B981]";

                          return (
                            <div key={i} className={`p-6 border-b border-dashed border-white/10 hover:bg-white/5 transition-colors group relative ${i === analysisResult.gaps.length - 1 ? 'border-b-0' : ''}`}>
                              <div className={`absolute top-0 left-0 w-0.5 h-full transition-all opacity-0 group-hover:opacity-100 ${accentColor}`}></div>
                              
                              <div className="flex items-start gap-4">
                                <div className={`font-mono text-base font-bold ${numColor} mt-0.5 w-6`}>
                                  [{String(i + 1).padStart(2, '0')}]
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                    <h4 className="font-sans font-bold text-white group-hover:text-slate-100 transition-colors text-lg uppercase tracking-tight">
                                      {g.title || `GAP DETECTED ${i + 1}`}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {g.category && <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider hidden sm:block">{g.category}</span>}
                                      <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${priorityColor}`}>
                                        {severity}
                                      </span>
                                    </div>
                                  </div>
                                  {(g.description || g.suggestion) && (
                                    <p className="text-slate-300 text-base leading-relaxed mt-2">{g.description || g.suggestion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Manual Tone Trigger CTA */}
                      {(!generatedScript && !isBusy && analysisResult) && (
                        <div className="mt-6 pt-6 border-t border-dashed border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                          <div>
                            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-tight">Gaps Analysis Completed</h4>
                            <p className="text-xs font-sans text-slate-400 mt-1">Review the gaps above. Awaiting narrative tone selection to synthesize derivative output.</p>
                          </div>
                          <button
                            onClick={() => {
                              if (analysisResult.isInterview) {
                                setShowFormatModal(true);
                              } else {
                                setFormatChoice("monologue");
                                setShowToneModal(true);
                              }
                            }}
                            className="group bg-[#10B981] hover:bg-[#059669] text-black font-mono font-bold text-xs px-6 py-3 uppercase tracking-widest transition-all w-full sm:w-auto relative overflow-hidden"
                          >
                            <div className="absolute inset-x-0 top-0 h-px bg-white/50"></div>
                            <span className="flex items-center gap-2 justify-center">
                              SELECT TONE & GENERATE
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                              </span>
                            </span>
                          </button>
                        </div>
                      )}

                    </div>
                  )}




                </div>
              )}
            </div>

          </div>
        </div>

        {/* Suggested Script - Full Width below the grid */}
        {(analysisResult?.suggested_script || analysisResult?.suggestedScript || generatedScript || (isBusy && analysisResult)) && (
          <div className="mt-8 p-8 bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-none relative animate-slide-up">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                  <span className="text-[#0D9488]">{'>'}</span> DERIVATIVE SCRIPT // OPTIONAL
                </h3>
                <p className="text-[10px] font-mono text-slate-500">Refine parameters without discarding structural insights.</p>
              </div>
              {(isBusy && !generatedScript) && (
                <span className="font-mono text-[9px] font-bold px-2 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 animate-pulse tracking-widest uppercase">
                  GENERATING SEQUENCE...
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              {/* Platform Selector */}
              <div className="relative group">
                <select
                  value={selectedPlatform || contentTarget}
                  onChange={(e) => handleRegenerateScript(e.target.value)}
                  disabled={isBusy}
                  className="appearance-none bg-[#080809] border border-white/20 rounded-none py-2 pl-3 pr-10 font-mono text-xs font-bold tracking-widest uppercase text-white focus:outline-none focus:border-[#10B981] hover:border-white/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="youtube">YOUTUBE</option>
                  <option value="blog">BLOG</option>
                  <option value="linkedin">LINKEDIN — POST</option>
                  <option value="linkedin_carousel">LINKEDIN CAROUSEL</option>
                  <option value="x">X — SINGLE POST</option>
                  <option value="x_thread">X — THREAD</option>
                  <option value="email_newsletter">NEWSLETTER</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-white transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="bg-[#080809] border border-white/10 shadow-inner relative overflow-hidden min-h-[200px]">
              <div className="absolute top-0 left-0 right-0 h-10 bg-[#080809] z-10 flex items-center px-4 justify-between border-b border-dashed border-white/10">
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-slate-500">AI-GENERATED OUTPUT</span>
                <div className="flex items-center gap-2">
                  {/* Regenerate Button */}
                  <Tooltip content="">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="!rounded-none !bg-transparent !border !border-white/10 !text-slate-400 hover:!text-[#10B981] hover:!border-[#10B981]/50 h-7 px-3 gap-2 flex items-center justify-center transition-all group shadow-none"
                      onClick={() => handleRegenerateScript(selectedPlatform || contentTarget)}
                      disabled={isBusy || (!generatedScript && !analysisResult?.suggested_script)}
                      title="Regenerate script"
                    >
                      <svg className={`w-3.5 h-3.5 group-hover:text-[#10B981] transition-colors ${status === 'regenerating' ? 'animate-spin text-[#10B981]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="font-mono text-[9px] uppercase tracking-widest font-bold">REGENERATE</span>
                    </Button>
                  </Tooltip>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="!rounded-none !bg-transparent !border !border-white/10 !text-slate-400 hover:!text-white hover:!bg-white/10 h-7 px-3 text-[9px] font-mono font-bold tracking-widest uppercase shadow-none"
                    onClick={() => {
                      navigator.clipboard.writeText(analysisResult?.suggested_script || generatedScript || "");
                      setScriptCopied(true);
                      setTimeout(() => setScriptCopied(false), 1200);
                    }}
                    disabled={!generatedScript && !analysisResult?.suggested_script}
                  >
                    {scriptCopied ? (
                      <div className="flex items-center gap-1.5 text-[#10B981]">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>COPIED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span>COPY DATA</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
              <div className="p-6 pt-14 whitespace-pre-wrap max-h-[500px] overflow-auto">
                {generatedScript || analysisResult?.suggested_script || analysisResult?.suggestedScript ? (
                  <div className="font-mono text-sm leading-relaxed text-slate-200">
                    {generatedScript || analysisResult?.suggested_script || analysisResult?.suggestedScript}
                    {isBusy && (
                      <span className="inline-block w-2 h-4 ml-1 bg-[#10B981] animate-blink align-middle"></span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 space-y-4 opacity-80">
                    <div className="w-48 h-1 bg-[#080809] border border-white/10 rounded-none overflow-hidden relative">
                      <div
                        className="absolute top-0 left-0 h-full bg-[#10B981] transition-all duration-300 ease-out"
                        style={{ width: `${Math.round(scriptProgress)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] font-mono text-[#10B981] tracking-widest uppercase">COMPUTING SCRIPT... {Math.round(scriptProgress)}%</p>
                    <p className="text-[9px] font-mono text-slate-500 mt-3 font-bold tracking-widest uppercase text-center">
                      {helperMessages[helperMessageIndex]?.toUpperCase() || "INITIALIZING..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Titles & Keywords - Full Width below Script */}
        {(analysisResult?.titles || analysisResult?.keywords) && (
          <div className="mt-8 p-8 bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-none relative animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Titles */}
              {analysisResult?.titles && (
                <div>
                  <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                     <span className="text-purple-500">{'>'}</span> STRATEGIC TITLES
                  </h3>
                  <ul className="space-y-0 border border-white/5 bg-[#080809]">
                    {analysisResult.titles.map((t, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-mono text-slate-200 p-3 border-b border-dashed border-white/5 hover:bg-white/5 transition-colors group">
                        <span className="text-slate-600 group-hover:text-purple-500 mt-0.5 font-bold transition-colors">[{i + 1}]</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {analysisResult?.keywords && (
                <div>
                  <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                     <span className="text-pink-500">{'>'}</span> INDEXED KEYWORDS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(analysisResult.keywords) ? analysisResult.keywords : []).map((k, i) => (
                      <span key={i} className="px-2 py-1 border border-white/10 text-slate-300 font-mono text-[11px] uppercase tracking-widest hover:border-pink-500/50 hover:text-pink-400 transition-colors cursor-default bg-[#080809]">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-6 animate-slide-up">
          <div className="flex justify-end">
            <Link href="/history">
              <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 font-mono text-xs tracking-widest uppercase">View History</Button>
            </Link>
          </div>

          {/* Feedback Box - Only shown when analysis is done */}
          {status === "done" && (analysisResult || generatedScript) && (
            <div className="w-full flex justify-center mt-2 pb-8">
              <div className="w-full max-w-2xl">
                <FeedbackBox />
              </div>
            </div>
          )}
        </div>
      </div >
      {/* Format Selection Modal */}
      {
        showFormatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080809]/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#111827] border border-[#10B981] rounded-none max-w-md w-full overflow-hidden animate-scale-in relative shadow-[0_0_50px_rgba(16,185,129,0.1)]" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[#10B981]">
                    <span className="font-mono text-xl font-bold">{'>_'}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 font-bold">SYSTEM ALERT</span>
                    <h3 className="text-xl font-display font-bold text-white tracking-tight uppercase italic">Interview Detected</h3>
                  </div>
                </div>
                <p className="text-slate-400 mb-8 leading-relaxed font-sans text-sm">
                  The ingested source data exhibits an interview/multi-speaker structure. Select processing protocol:
                </p>

                <div className="grid gap-0 border border-white/10 p-1 bg-[#080809]">
                  <button
                    onClick={() => resumeAnalysisWithFormat("preserve")}
                    className="flex items-start gap-4 p-4 border border-white/5 bg-[#080809] hover:bg-[#10B981]/5 hover:border-[#10B981]/50 transition-all text-left group relative"
                  >
                    <div className="absolute top-0 left-0 w-0 h-full bg-[#10B981] group-hover:w-1 transition-all"></div>
                    <div className="mt-0.5 w-4 h-4 border border-slate-600 group-hover:border-[#10B981] flex items-center justify-center rounded-none">
                      <div className="w-2 h-2 bg-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div>
                      <h4 className="font-mono font-bold text-white text-xs tracking-wider uppercase group-hover:text-[#10B981] transition-colors">PRESERVE PROTOCOL</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Retain Q&A structure and multi-voice boundaries.</p>
                    </div>
                  </button>
                  <button
                    onClick={() => resumeAnalysisWithFormat("monologue")}
                    className="flex items-start gap-4 p-4 border border-white/5 bg-[#080809] hover:bg-[#10B981]/5 hover:border-[#10B981]/50 transition-all text-left group relative"
                  >
                    <div className="absolute top-0 left-0 w-0 h-full bg-[#10B981] group-hover:w-1 transition-all"></div>
                    <div className="mt-0.5 w-4 h-4 border border-slate-600 group-hover:border-[#10B981] flex items-center justify-center rounded-none">
                      <div className="w-2 h-2 bg-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div>
                      <h4 className="font-mono font-bold text-white text-xs tracking-wider uppercase group-hover:text-[#10B981] transition-colors">MONOLOGUE PROTOCOL</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Synthesize into a unified, authoritative narrative.</p>
                    </div>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )
      }

      {/* Tone Selection Modal */}
      {
        showToneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080809]/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#111827] border border-[#10B981] rounded-none max-w-4xl w-full overflow-hidden animate-scale-in relative shadow-[0_0_50px_rgba(16,185,129,0.1)]" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[#10B981]">
                    <span className="font-mono text-xl font-bold">{'>_'}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 font-bold">TONE SELECTION</span>
                    <h3 className="text-xl font-display font-bold text-white tracking-tight uppercase italic">Choose Your Voice</h3>
                  </div>
                </div>
                <p className="text-slate-400 mb-6 leading-relaxed font-sans text-sm">
                  Tone changes how your script sounds — not what it says.
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 border border-white/10 p-2 bg-[#080809] max-h-[50vh] overflow-y-auto">
                  {[
                    { id: "Conversational", title: "Conversational", desc: "Direct, human, one-to-one." },
                    { id: "Authoritative",  title: "Authoritative",  desc: "Confident, declarative, no hedging." },
                    { id: "Storytelling",   title: "Storytelling",   desc: "Scene-driven, narrative arc, sensory detail." },
                    { id: "Educational",    title: "Educational",    desc: "Step-by-step, clear reasoning, accessible." },
                    { id: "Professional",   title: "Professional",   desc: "Formal, evidence-forward, structured." },
                    { id: "Motivational",   title: "Motivational",   desc: "Stakes-first, urgent, action-oriented." },
                    { id: "Witty",          title: "Witty",          desc: "Unexpected angles, precise, surprising." },
                    { id: "Analytical",     title: "Analytical",     desc: "Data-first, logic-driven, precise." }
                  ].map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className={`flex flex-col items-start gap-2 p-4 border transition-all text-left group relative ${selectedTone === tone.id ? "bg-[#10B981]/10 border-[#10B981]" : "border-white/5 hover:bg-[#10B981]/5 hover:border-[#10B981]/50"}`}
                    >
                      <div className={`absolute top-0 left-0 h-full transition-all ${selectedTone === tone.id ? "w-1 bg-[#10B981]" : "w-0 bg-[#10B981] group-hover:w-1"}`}></div>
                      <div>
                        <h4 className={`font-mono font-bold text-[10px] tracking-wider uppercase transition-colors ${selectedTone === tone.id ? "text-[#10B981]" : "text-white group-hover:text-[#10B981]"}`}>{tone.title}</h4>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{tone.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    disabled={!selectedTone}
                    onClick={() => generateScriptWithTone(selectedTone)}
                    className={`group font-mono font-bold text-sm uppercase px-8 py-3 flex items-center gap-2 transition-all relative overflow-hidden ${!selectedTone ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-[#10B981] text-black hover:bg-[#059669]"}`}
                  >
                    {!selectedTone ? null : <div className="absolute inset-x-0 top-0 h-px bg-white/50"></div>}
                    <span>{selectedTone ? "GENERATE SCRIPT" : "SELECT A TONE FIRST"}</span>
                    {selectedTone && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                      </span>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )
      }

      <UpgradeBanner
        visible={showUpgradeBanner}
        title="Unlock Premium Features"
        message={entitlementError?.bannerMessage || "Free limit reached. Upgrade to continue."}
        onClose={() => setShowUpgradeBanner(false)}
      />
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        headline={upgradeModalConfig.headline}
        bullets={upgradeModalConfig.bullets}
        primaryActionText={upgradeModalConfig.primaryActionText}
      />
    </Layout >
  );
}