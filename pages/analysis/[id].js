import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import Card from "../../components/Card";
import Button from "../../components/Button";

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
        className="block relative w-full md:w-48 aspect-video rounded-xl overflow-hidden shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 group flex-shrink-0 bg-white/5 border border-white/10"
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="Video Thumbnail"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          onError={() => setError(true)}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className={`w-24 h-24 md:w-48 md:h-28 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${isYoutube ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
      type === 'blog' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
        'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
    <Layout bgClass="bg-[#030014]" headerVariant="dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-white transition-colors group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to History
          </Link>
        </div>

        {/* Title Section */}
        <div className="mb-12 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

            <div className="flex flex-col md:flex-row gap-6 flex-1">
              <AnalysisThumbnail type={type} videoId={analysis.video_id} videoUrl={analysis.video_url} />

              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-display font-medium text-white mb-4 leading-tight tracking-tight">
                  {analysis.title || "Untitled Analysis"}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full shadow-sm text-slate-300">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(analysis.created_at).toLocaleString()}
                  </span>

                  {(isYoutube || isBlog) && analysis.video_url && (
                    <a
                      href={analysis.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 hover:underline font-medium px-3 py-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {isYoutube ? "View Original Video" : "View Original Article"}
                    </a>
                  )}

                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isYoutube ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    isBlog ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                    {type}
                  </span>
                </div>
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
                  <Card className="overflow-hidden shadow-secondary border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="p-6 border-b border-white/5 bg-black/20">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Summary of This Content
                      </h2>
                    </div>
                    <div className="p-8">
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-slate-300 leading-relaxed shadow-sm">
                        {parsedAnalysis.summary}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Gaps Section - Always shown, with empty state if needed */}
                <Card className="overflow-hidden shadow-secondary border-white/5 bg-white/5 backdrop-blur-md">
                  <div className="p-6 border-b border-white/5 bg-black/20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/20">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      Identified Content Gaps
                    </h2>
                  </div>
                  <div className="p-8">
                    {parsedAnalysis?.gaps && parsedAnalysis.gaps.length > 0 ? (
                      <div className="grid gap-4">
                        {parsedAnalysis.gaps.map((g, i) => {
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
                    ) : (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-green-500/20">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-green-400 font-semibold text-lg mb-2">🎉 Great job!</p>
                        <p className="text-slate-400 mb-6">No major improvements suggested for this content.</p>
                        <Link href="/dashboard">
                          <Button size="sm" variant="gradient">Analyze New Content</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Script Section - Content Type Aware */}
                {scriptContent && scriptContent.trim() && !scriptContent.trim().startsWith('{') ? (
                  <Card className="overflow-hidden shadow-secondary border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-3">
                          Derivative Script (Optional)
                          {analysis.metadata?.content_target && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 flex items-center gap-1">
                              <span className="opacity-50">FOR</span> {analysis.metadata.content_target}
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                            {(isEditing ? editableScript.length : (scriptContent || "").length).toLocaleString()} chars
                          </span>
                        </div>
                      </h2>
                      <div className="flex items-center gap-2">
                        {saveSuccess && <span className="text-green-400 text-sm font-medium animate-pulse">Saved!</span>}
                        {saveError && <span className="text-red-400 text-sm font-medium">Error</span>}

                        {!isEditing && (
                          <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)} className="bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border-white/10">
                            Edit
                          </Button>
                        )}

                        {isEditing && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving} className="bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border-white/10">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving} variant="gradient">
                              Save
                            </Button>
                          </div>
                        )}

                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border-white/10"
                            onClick={() => {
                              navigator.clipboard.writeText(scriptContent);
                              setScriptCopied(true);
                              setTimeout(() => setScriptCopied(false), 1200);
                            }}
                          >
                            {scriptCopied ? (
                              <div className="flex items-center gap-1.5 text-green-400">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Copied!
                              </div>
                            ) : (
                              "Copy"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-white/5 border-b border-white/5">
                      <p className="text-xs text-slate-500">
                        This is a compressed, secondary version for clips, blogs, or summaries. It does not replace the original content.
                      </p>
                    </div>
                    <div className="p-8">
                      {isEditing ? (
                        <textarea
                          className="w-full h-[400px] p-4 rounded-xl border border-white/10 bg-black/40 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm leading-relaxed outline-none transition-all placeholder:text-slate-600"
                          value={editableScript}
                          onChange={(e) => setEditableScript(e.target.value)}
                          placeholder="Enter script here..."
                        />
                      ) : (
                        <div className="prose prose-invert max-w-none font-mono text-sm bg-[#0b0c15] text-slate-300 p-8 rounded-xl border border-white/10 whitespace-pre-wrap leading-relaxed shadow-inner">
                          {scriptContent}
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="overflow-hidden shadow-secondary border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="p-8">
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Upgrade Not Available</h3>
                        <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                          No generated content upgrade was found for this analysis.
                        </p>
                        <Link href="/dashboard">
                          <Button variant="gradient">Create New Analysis</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            <Card className="overflow-hidden shadow-secondary border-white/5 bg-white/5 backdrop-blur-md">
              <div className="p-6 border-b border-white/5 bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 text-slate-400 flex items-center justify-center border border-white/5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  {isYoutube ? "Original Transcript" : "Source Content"}
                  <span className="text-xs font-medium text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 ml-2">
                    {(analysis.transcript || "").length.toLocaleString()} chars
                  </span>
                </h2>
              </div>
              <div className="p-8">
                <div className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {analysis.transcript || "No content available."}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar: Metadata */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-secondary border-white/5 bg-white/5 backdrop-blur-md h-fit sticky top-24">
              <div className="p-6 border-b border-white/5 bg-black/20">
                <h2 className="text-lg font-bold text-white">Metadata</h2>
              </div>
              <div className="p-6 space-y-8">

                {/* Source Section */}
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Source</span>

                  {/* Website (Blog) Style */}
                  {isBlog && analysis.video_url && (
                    <div className="flex items-center gap-2 mb-3 max-w-full">
                      {/* Favicon */}
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${new URL(analysis.video_url).hostname}&sz=32`}
                        alt="Site Icon"
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='2' y1='12' x2='22' y2='12'%3E%3C/line%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'%3E%3C/path%3E%3C/svg%3E"; }}
                      />

                      {/* URL */}
                      <a
                        href={analysis.video_url}
                        target="_blank"
                        rel="noreferrer"
                        title={analysis.video_url}
                        className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors truncate flex-1 block"
                      >
                        {analysis.video_url}
                      </a>

                      {/* Copy Button */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(analysis.video_url);
                          setUrlCopied(true);
                          setTimeout(() => setUrlCopied(false), 2000);
                        }}
                        className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5 flex-shrink-0"
                        title="Copy text"
                      >
                        {urlCopied ? (
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  {/* YouTube Style */}
                  {!isBlog && !isText && (
                    <div className="flex items-center gap-2 mb-3 max-w-full">
                      {/* Video Thumbnail/Icon */}
                      <div className="w-4 h-4 rounded-full flex-shrink-0 overflow-hidden bg-red-500/10 flex items-center justify-center">
                        <img
                          src={`https://img.youtube.com/vi/${analysis.video_id}/default.jpg`}
                          alt="Video"
                          className="w-full h-full object-cover transform scale-150"
                          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<svg class="w-2.5 h-2.5 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`; }}
                        />
                      </div>

                      {/* URL */}
                      <a
                        href={analysis.video_url || `https://www.youtube.com/watch?v=${analysis.video_id}`}
                        target="_blank"
                        rel="noreferrer"
                        title={analysis.video_url || `https://www.youtube.com/watch?v=${analysis.video_id}`}
                        className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors truncate flex-1 block"
                      >
                        {analysis.video_url || `https://www.youtube.com/watch?v=${analysis.video_id}`}
                      </a>

                      {/* Copy Button */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(analysis.video_url || `https://www.youtube.com/watch?v=${analysis.video_id}`);
                          setUrlCopied(true);
                          setTimeout(() => setUrlCopied(false), 2000);
                        }}
                        className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5 flex-shrink-0"
                        title="Copy link"
                      >
                        {urlCopied ? (
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                    {isYoutube ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    ) : isBlog ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-wide">{type}</span>
                  </div>
                </div>

                {/* Meta Info Chips */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[11px] font-medium">{new Date(analysis.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-[11px] font-medium">{type === 'youtube' ? 'Video Analysis' : type === 'blog' ? 'Web Extraction' : 'Text Analysis'}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-white/5"></div>

                {/* Suggested Titles */}
                {parsedAnalysis?.titles && (
                  <div>
                    <h3 className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suggested Titles</h3>
                    <ul className="space-y-2.5">
                      {parsedAnalysis.titles.map((t, i) => (
                        <li key={i} className="group flex items-start gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 shadow-sm hover:shadow-md hover:border-indigo-500/20 transition-all relative">
                          <span className="text-indigo-400 font-bold mt-0.5">•</span>
                          <span className="flex-1 leading-relaxed pr-6">{t}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(t);
                              // Ideally show a toast here, but simple feedback for now
                            }}
                            className="absolute right-2 top-2 p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy title"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Keywords */}
                {parsedAnalysis?.keywords && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Keywords</h3>
                      <button
                        onClick={() => navigator.clipboard.writeText(parsedAnalysis.keywords.join(', '))}
                        className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(parsedAnalysis.keywords) ? parsedAnalysis.keywords : []).map((k, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 text-[11px] font-medium border border-indigo-500/20 hover:-translate-y-0.5 hover:shadow-sm hover:border-indigo-500/30 transition-all cursor-default select-all">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-white/5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {(isYoutube || isBlog) && analysis.video_url && (
                      <Button variant="outline" className="w-full justify-start text-xs h-9 bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => window.open(analysis.video_url, '_blank')}>
                        <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isYoutube ? "Watch Video" : "Visit Article"}
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start text-xs h-9 bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => window.print()}>
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Export PDF
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-xs h-9 bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => router.push('/dashboard')}>
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Analysis
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-xs h-9 bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30" onClick={() => setDeleteModalOpen(true)}>
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Analysis
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
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
  );
}
