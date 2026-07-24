import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Tooltip from "../../components/Tooltip";
import UpgradeModal from "../../components/UpgradeModal"; // Context-Aware Modal

// Helper to get platform-specific config
function getPlatformConfig(platformName) {
  const lower = platformName?.toLowerCase() || "";

  if (lower.includes('linkedin')) {
    return {
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
    };
  } else if (lower.includes('twitter') || lower.includes('x')) {
    return {
      color: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    };
  } else if (lower.includes('youtube')) {
    return {
      color: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
    };
  } else if (lower.includes('instagram')) {
    return {
      color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    };
  } else if (lower.includes('blog') || lower.includes('article')) {
    return {
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    };
  }

  // Default (Purple)
  return {
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
  };
}

// Helper component for detail page thumbnail
function AnalysisThumbnail({ type, videoId, videoUrl }) {
  const [error, setError] = useState(false);
  const isYoutube = !type || type === "youtube";

  if (isYoutube && videoId && !error) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noreferrer"
        className="block relative w-full md:w-48 aspect-video overflow-hidden transition-all duration-300 group flex-shrink-0 bg-white/5 border border-white/10 shadow-none"
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="Video Thumbnail"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          onError={() => setError(true)}
        />
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 bg-[#10B981] flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className={`w-24 h-24 md:w-48 md:h-28 flex items-center justify-center flex-shrink-0 border shadow-none ${isYoutube ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
      type === 'blog' ? 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20' :
        'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
      }`}>
      {isYoutube ? (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : type === 'blog' ? (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ) : (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
    </div>
  );
}

export default function AnalysisView() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editableScript, setEditableScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isScriptMaximized, setIsScriptMaximized] = useState(false);
  // Modal State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalConfig, setUpgradeModalConfig] = useState({});

  useEffect(() => {
    if (isScriptMaximized) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isScriptMaximized]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analysis/${id}`);
        if (!res.ok) throw new Error("Failed to load analysis");
        const json = await res.json();
        setAnalysis(json.analysis || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (analysis) {
      let content = analysis.generated_script;
      try {
        if (content && content.startsWith('{')) {
          const parsed = JSON.parse(content);
          content = parsed.suggested_script || parsed.suggestedScript || content;
        }
      } catch (e) {
        // ignore
      }
      setEditableScript(content || "");
    }
  }, [analysis]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/delete-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: id }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete analysis");
      }
      router.push("/history?deleted=true");
    } catch (err) {
      console.error(err);
      alert("Failed to delete analysis. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/update-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: id,
          generated_script: editableScript,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save script");
      }

      setAnalysis((prev) => ({ ...prev, generated_script: editableScript }));
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error(err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerationEntitlement = (platform) => {
    // Simulate check or rely on catch block handling
    // Ideally check usage here if available, but for now relying on backend error or passed props if we had them
    // In this file we don't have usage context easily available without refetching.
    // So we will rely on catching the error from the API mostly, OR if we know it's a paid platform.

    const paidPlatforms = ['blog', 'linkedin_carousel', 'x_thread', 'email_newsletter'];
    // However, we don't have 'userPlan' in this component state currently.
    // Assuming the API call catches it. 
  };

  if (loading) {
    return (
      <Layout bgClass="bg-[#030014]" headerVariant="dark">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="text-slate-400 font-medium">Loading analysis...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!analysis) {
    return (
      <Layout bgClass="bg-[#030014]" headerVariant="dark">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Card className="p-8 border-red-500/20 bg-red-900/10 text-center backdrop-blur-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4 border border-red-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analysis Not Found</h3>
            <p className="text-slate-400 mb-6">The requested analysis could not be found or has been deleted.</p>
            <Link href="/history">
              <Button variant="secondary" className="bg-white/5 hover:bg-white/10 text-white">Back to History</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  // Derived state
  const type = analysis.type || analysis.metadata?.type || "youtube";
  const isYoutube = type === "youtube";
  const isBlog = type === "blog";
  const isText = type === "text";

  // Parse suggested results
  let scriptContent = analysis.generated_script;
  let parsedAnalysis = null;

  try {
    if (scriptContent && (scriptContent.startsWith('{') || scriptContent.trim().startsWith('{'))) {
      const parsed = JSON.parse(scriptContent);
      // If it has 'suggested_script' or 'gaps', it's likely our structured JSON
      if (parsed.suggested_script || parsed.gaps || parsed.summary) {
        parsedAnalysis = parsed;
        scriptContent = parsed.suggested_script || parsed.suggestedScript || scriptContent;
      }
    }
  } catch (e) {
    // legacy content or plain text, ignore
  }

  // Always show script section for all types
  const showScriptSection = true;

  return (
    <>
      <div className="print:hidden">
        <Layout bgClass="bg-[#080809]" headerVariant="dark">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">

            <UpgradeModal
              isOpen={upgradeModalOpen}
              onClose={() => setUpgradeModalOpen(false)}
              headline={upgradeModalConfig.headline}
              bullets={upgradeModalConfig.bullets}
              primaryActionText={upgradeModalConfig.primaryActionText}
            />

            {/* Tactical Back Link */}
            <div className="mb-8">
              <Link
                href="/history"
                className="inline-flex items-center gap-2 text-[10px] font-mono text-slate-500 hover:text-[#10B981] uppercase tracking-widest transition-colors group"
              >
                <span className="opacity-50">{'<'}</span> RETURN TO DOSSIER
              </Link>
            </div>

            {/* Title Section (Header Lockup) */}
            <div className="mb-16 animate-slide-up border-b border-white/5 pb-8 relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="flex gap-6 items-end">
                       <div className="hidden sm:block">
                         <AnalysisThumbnail type={type} videoId={analysis.video_id} videoUrl={analysis.video_url} />
                       </div>
                       <div>
                           <div className="font-mono text-[10px] uppercase tracking-widest text-[#10B981] mb-6 flex items-center gap-3">
                               <span>ANALYSIS ID: {analysis.id ? analysis.id.split('-')[0].toUpperCase() : 'UNKNOWN'}</span>
                               <span className="w-px h-3 bg-white/20"></span>
                               <span className="text-slate-500">STATUS: FINALIZED</span>
                           </div>
                           <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tight uppercase leading-none">
                             {analysis.title || "Untitled Analysis"}
                           </h1>
                       </div>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-left md:text-right flex flex-col gap-3">
                        <div className="text-slate-500">
                            DATE CREATED<br/>
                            <span className="text-slate-300">{new Date(analysis.created_at).toISOString().replace('T', ' // ').substring(0,19).replace(/-/g, '.')} UTC</span>
                        </div>
                        <div className="text-slate-500">
                            SOURCE TYPE<br/>
                            <span className="text-[#10B981]">
                                {isYoutube ? 'YOUTUBE_STREAM' : isBlog ? 'EXTERNAL_DOMAIN_URL' : 'TEXT_RAW_INPUT'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {/* Main Content: Script & Analysis */}
              <div className="lg:col-span-2 space-y-8">

                {/* Show Script Section based on logic */}
                {/* Show Script/Analysis Section based on logic */}
                {showScriptSection && (
                  <div className="space-y-8">
                    {/* Summary Section */}
                    {parsedAnalysis?.summary && (
                      <div className="bg-[#111827] border-l-4 border-l-[#10B981] p-8 shadow-none relative">
                        <h2 className="font-mono text-[10px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-4">
                          SUMMARY OF THIS CONTENT
                        </h2>
                        <div className="text-slate-300 text-sm leading-relaxed font-sans">
                          {parsedAnalysis.summary}
                        </div>
                      </div>
                    )}

                    {/* Gaps Section */}
                    <div>
                      <div className="flex items-end justify-between border-b border-white/5 pb-4 mb-6">
                        <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
                          Identified Content Gaps
                        </h2>
                        {parsedAnalysis?.gaps && (
                          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                            {parsedAnalysis.gaps.filter((_,i) => i===0).length > 0 ? "1 CRITICAL" : "0 CRITICAL"} // {Math.max(0, parsedAnalysis.gaps.length - 1)} STRATEGIC
                          </div>
                        )}
                      </div>
                      
                      {parsedAnalysis?.gaps && parsedAnalysis.gaps.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {parsedAnalysis.gaps.map((g, i) => {
                            const severity = (g.severity || (i === 0 ? "CRITICAL" : "MEDIUM")).toUpperCase();
                            const isCritical = severity === "CRITICAL";
                            const isMedium = severity === "MEDIUM";
                            const badgeColor = isCritical 
                              ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30" 
                              : isMedium
                                ? "bg-slate-500/10 text-slate-400 border-slate-500/30"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/30";
                            const numColor = isCritical 
                              ? "text-[#10B981]" 
                              : isMedium 
                                ? "text-[#0D9488]" 
                                : "text-blue-400";
                            
                            return (
                              <div key={i} className="bg-[#111827] p-6 group flex items-start gap-4 shadow-none">
                                <div className={`font-mono text-2xl font-bold mt-1 ${numColor}`}>
                                  {String(i + 1).padStart(2, '0')}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
                                    <h4 className="font-semibold text-white text-sm pr-4">
                                      {g.title || `Gap ${i + 1}`}
                                    </h4>
                                    <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border ${badgeColor}`}>
                                      {severity}
                                    </span>
                                  </div>
                                  {(g.description || g.suggestion) && (
                                    <p className="text-slate-400 text-xs font-mono leading-relaxed opacity-80">{g.description || g.suggestion}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-[#111827] border-t-2 border-[#10B981]">
                          <p className="text-[#10B981] font-mono text-sm tracking-widest uppercase mb-2">{'// NO ANOMALIES DETECTED'}</p>
                          <p className="text-slate-500 font-mono text-xs mb-6 uppercase tracking-wider">The source material satisfies all defined strategic parameters.</p>
                          <Link href="/dashboard">
                            <Button variant="secondary" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20 rounded-none font-mono text-[10px] tracking-widest">Execute New Protocol</Button>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Script Section */}
                    {scriptContent && scriptContent.trim() && !scriptContent.trim().startsWith('{') ? (
                      <div className={`transition-all duration-300 ${isScriptMaximized ? 'fixed inset-0 z-[100] bg-[#080809] flex flex-col p-8' : 'mt-8 pt-4'}`}>
                        <div className="flex items-end justify-between border-b border-white/5 pb-4 mb-6">
                            <h2 className="text-xl font-display font-medium text-white flex flex-col sm:flex-row sm:items-center gap-2">
                              Derivative Script Viewer
                              <span className="font-mono text-[10px] text-[#10B981] tracking-widest uppercase">
                                / {isYoutube ? 'YOUTUBE_V1.2' : isBlog ? 'BLOG_V1.0' : 'TEXT_RAW'}
                              </span>
                            </h2>
                            <div className="flex items-center gap-3 relative z-20">
                               <button onClick={() => setIsScriptMaximized(!isScriptMaximized)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 transition-colors rounded-none" title="Toggle Fullscreen">
                                 {isScriptMaximized ? (
                                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                 ) : (
                                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                 )}
                               </button>
                               <button 
                                 onClick={() => {
                                    navigator.clipboard.writeText(scriptContent);
                                    setScriptCopied(true);
                                    setTimeout(() => setScriptCopied(false), 1200);
                                 }}
                                 className="w-8 h-8 flex items-center justify-center bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 transition-colors rounded-none"
                                 title="Copy to Clipboard"
                               >
                                 {scriptCopied ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                               </button>
                               <button 
                                 onClick={() => setIsEditing(!isEditing)} 
                                 className={`w-8 h-8 flex items-center justify-center border transition-colors rounded-none ${isEditing ? 'bg-white/20 text-white border-white/40' : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'}`}
                                 title="Edit Script Mode"
                               >
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                               </button>
                            </div>
                        </div>

                        <div className={`p-8 bg-[#111827] border border-white/5 relative shadow-none ${isScriptMaximized ? 'flex-1 overflow-y-auto' : ''}`}>
                          <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-slate-600 uppercase tracking-widest opacity-50 z-0">
                            {'//'} SYSTEM LOG_STREAM_ACTIVE
                          </div>
                          <div className="relative z-10 w-full h-full">
                              {isEditing ? (
                                <div className="flex flex-col h-full items-end gap-3 w-full">
                                    <textarea
                                    className={`w-full p-4 border border-[#10B981]/50 bg-black/40 text-slate-300 focus:ring-0 focus:border-[#10B981] font-mono text-xs leading-relaxed outline-none transition-all placeholder:text-slate-600 ${isScriptMaximized ? 'h-full resize-none flex-1' : 'h-[500px]'}`}
                                    value={editableScript}
                                    onChange={(e) => setEditableScript(e.target.value)}
                                    placeholder="Enter script protocol..."
                                    />
                                    <div className="flex gap-3">
                                       <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving} className="bg-transparent text-slate-400 border border-white/20 rounded-none font-mono text-[10px] tracking-widest uppercase hover:text-white">Abort</Button>
                                       <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-[#10B981] text-black hover:bg-[#10B981]/80 rounded-none font-mono text-[10px] font-bold tracking-widest uppercase">{isSaving ? 'UPLOADING...' : 'SAVE PROTOCOL'}</Button>
                                    </div>
                                    {saveSuccess && <span className="font-mono text-[10px] text-[#10B981] tracking-widest mt-2 uppercase">Protocol Accepted</span>}
                                    {saveError && <span className="font-mono text-[10px] text-red-500 tracking-widest mt-2 uppercase">{saveError}</span>}
                                </div>
                              ) : (
                                <div className={`font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed ${isScriptMaximized ? 'min-h-full' : ''}`}>
                                  {scriptContent}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden bg-[#111827] mt-8 pt-4 border border-white/5">
                        <div className="p-8">
                          <div className="text-center py-12 border border-white/5 border-dashed">
                            <h3 className="font-mono text-sm tracking-widest text-[#10B981] mb-2 uppercase">{'// STREAM UNAVAILABLE'}</h3>
                            <p className="text-slate-500 font-mono text-xs mb-8 max-w-md mx-auto leading-relaxed uppercase tracking-wider">
                              NO GENERATED SCRIPT MODULE WAS DETECTED WITHIN THIS DOSSIER ARCHIVE.
                            </p>
                            <Link href="/dashboard">
                              <Button className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/20 rounded-none font-mono text-[10px] tracking-widest uppercase">Initiate New Analysis</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-[#111827] shadow-none">
                  <div className="p-6 border-b border-white/5">
                    <h2 className="font-mono text-[10px] text-[#10B981] uppercase tracking-[0.2em]">
                      {'// ORIGINAL TRANSCRIPT RECORD'}
                      <span className="text-slate-500 ml-2">
                        {(analysis.transcript || "").length.toLocaleString()} CHARS
                      </span>
                    </h2>
                  </div>
                  <div className="p-8">
                    <div className="text-slate-400 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                      {analysis.transcript || "No content available."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar: Metadata */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#111827] p-8 text-white h-fit sticky top-24 border-none shadow-none">
                   
                   {/* Command Metadata Header */}
                   <h3 className="font-mono text-[10px] text-[#10B981] font-bold uppercase tracking-[0.2em] mb-6">
                      COMMAND METADATA
                   </h3>
                   
                   <div className="space-y-6 font-mono text-[10px] tracking-widest uppercase text-slate-500 border-b border-white/5 pb-8 mb-8">
                       <div>
                          <div className="flex justify-between mb-2">
                              <span>CONFIDENCE SCORE</span>
                              <span className="text-[#10B981]">94%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 overflow-hidden">
                              <div className="h-full bg-[#10B981] w-[94%]"></div>
                          </div>
                       </div>
                       <div>
                          <span>MODEL VERSION</span><br/>
                          <span className="text-slate-300">AEGIS-PREMIUM-v4.2</span>
                       </div>
                       <div>
                          <span>PROCESSING TIME</span><br/>
                          <span className="text-slate-300">1.842ms</span>
                       </div>
                   </div>

                   {/* Suggested Titles */}
                   {parsedAnalysis?.titles && (
                       <div className="border-b border-white/5 pb-8 mb-8">
                           <h3 className="font-mono text-[10px] text-[#10B981] font-bold uppercase tracking-[0.2em] mb-4">
                              SUGGESTED TITLES
                           </h3>
                           <div className="space-y-2">
                               {parsedAnalysis.titles.map((t, i) => (
                                   <div key={i} className="bg-white/5 border border-white/5 p-3 text-slate-300 font-sans text-xs leading-snug hover:border-[#10B981]/50 transition-colors cursor-pointer" onClick={() => navigator.clipboard.writeText(t)}>
                                      {t}
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

                   {/* Execution Actions */}
                   <div className="space-y-3">
                       <button onClick={() => window.print()} className="w-full bg-[#10B981] hover:bg-[#10B981]/80 text-black py-4 font-bold font-mono text-[10px] tracking-widest uppercase transition-colors flex items-center justify-between px-4 rounded-none">
                           <span>EXPORT INTELLIGENCE PDF</span>
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       </button>
                       <button onClick={() => router.push('/dashboard')} className="w-full bg-[#10B981]/5 hover:bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:border-[#10B981]/40 py-4 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center justify-between px-4 rounded-none">
                           <span>NEW DEEP ANALYSIS</span>
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                       </button>
                       <button onClick={() => setDeleteModalOpen(true)} className="w-full bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 py-4 font-mono text-[10px] tracking-widest uppercase transition-colors flex items-center justify-between px-4 rounded-none">
                           <span>ARCHIVE DOSSIER</span>
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                       </button>
                   </div>
                   
                   {/* Decorative System Footnote */}
                   <div className="mt-8 pt-8">
                      <div className="w-full h-40 relative overflow-hidden flex items-end" style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 10px)' }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent pointer-events-none"></div>
                          <span className="font-mono text-[7px] text-[#10B981] font-bold tracking-[0.2em] mb-4 ml-4 relative z-10 uppercase">SYSTEM_ONLINE {'//'} MONITORING NODES...</span>
                      </div>
                   </div>

                </div>
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-[#0b0c15] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4 text-red-500">
                      <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white">Delete Analysis?</h3>
                    </div>
                    <p className="text-slate-400 mb-6 leading-relaxed">
                      Are you sure you want to delete this analysis? This action cannot be undone.
                    </p>
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        variant="secondary"
                        className="bg-white/5 hover:bg-white/10 text-slate-300 border-transparent"
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white border-transparent focus:ring-red-500 shadow-lg shadow-red-500/20"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </Layout >
      </div>

      {/* Print / PDF View */}
      <div className="hidden print:block bg-white text-black p-8 font-serif max-w-4xl mx-auto">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold mb-2 text-black">{analysis.title || "Untitled Analysis"}</h1>
          <p className="text-sm text-gray-500">Source: {analysis.video_url || "Uploaded Content"} | {new Date(analysis.created_at).toLocaleDateString()}</p>
        </div>

        {parsedAnalysis?.summary && (
          <div className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-100 pb-1 text-black">Summary</h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{parsedAnalysis.summary}</p>
          </div>
        )}

        {parsedAnalysis?.gaps && parsedAnalysis.gaps.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-100 pb-1 text-black">Identified Gaps</h2>
            <div className="space-y-4">
              {parsedAnalysis.gaps.map((g, i) => (
                <div key={i} className="mb-4">
                  <h3 className="font-bold text-gray-900">• {g.title}</h3>
                  {(g.description || g.suggestion) && <p className="text-gray-700 mt-1 ml-4">{g.description || g.suggestion}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {scriptContent && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-100 pb-1 text-black">Derivative Script</h2>
            <div className="prose max-w-none text-gray-800 font-serif whitespace-pre-wrap leading-relaxed">
              {scriptContent}
            </div>
          </div>
        )}

        {(parsedAnalysis?.titles || parsedAnalysis?.keywords) && (
          <div className="mt-8 pt-8 border-t border-gray-200 break-inside-avoid">
            <div className="grid grid-cols-2 gap-8">
              {parsedAnalysis?.titles && (
                <div>
                  <h3 className="font-bold mb-2 uppercase text-sm tracking-wider text-gray-500">Suggested Titles</h3>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                    {parsedAnalysis.titles.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
              {parsedAnalysis?.keywords && (
                <div>
                  <h3 className="font-bold mb-2 uppercase text-sm tracking-wider text-gray-500">Keywords</h3>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-700">
                    {parsedAnalysis.keywords.join(", ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Generated by GapGens
        </div>
      </div>
    </>
  );
}
