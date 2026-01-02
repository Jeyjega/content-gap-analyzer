import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import Card from "../components/Card";
import Button from "../components/Button";
import ContentIcon from "../components/ContentIcon";
import { supabase } from "@/lib/supabaseClient";

function formatCreated(createdRaw) {
  if (!createdRaw) return "—";
  const d = new Date(createdRaw);
  if (Number.isNaN(d.getTime())) return String(createdRaw);

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(d);
}

function safeStringify(obj, max = 500) {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > max ? s.slice(0, max) + "…" : s;
  } catch (e) {
    return String(obj);
  }
}


export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!analysisToDelete) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/delete-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ analysisId: analysisToDelete.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete analysis");
      }

      // Remove from list
      setItems((prev) => prev.filter((i) => i.id !== analysisToDelete.id));
      setDeleteModalOpen(false);
      setAnalysisToDelete(null);

    } catch (err) {
      console.error(err);
      alert("Failed to delete analysis. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current session to retrieve access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // If not authenticated, we can either redirect or just show empty
        // For now, let's treat it as empty/unauthorized and maybe redirect
        // But since this is a protected page (usually), we might assume auth. 
        // If we strictly want to handle logout mid-session:
        setItems([]);
        return;
      }

      const token = session.access_token;

      // 2. Pass token to API
      const res = await fetch(`/api/analyses?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API error ${res.status}: ${txt}`);
      }
      const json = await res.json();

      const normalized = Array.isArray(json)
        ? json
        : Array.isArray(json.analyses)
          ? json.analyses
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.items)
              ? json.items
              : json && typeof json === "object"
                ? (() => {
                  const arrKey = Object.keys(json).find((k) => Array.isArray(json[k]));
                  return arrKey ? json[arrKey] : [json];
                })()
                : [];

      setItems((normalized || []).filter(Boolean));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load history");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <Layout bgClass="bg-[#030014]" headerVariant="dark">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="text-slate-400 font-medium">Loading history...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout bgClass="bg-[#030014]" headerVariant="dark">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Card className="p-8 border-red-500/20 bg-red-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">Error Loading History</h3>
            </div>
            <p className="text-slate-300 mb-6">{error}</p>
            <Button onClick={loadHistory} variant="secondary" className="bg-white/5 hover:bg-white/10 text-white border-white/10">Try Again</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout bgClass="bg-[#030014]" headerVariant="dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 animate-slide-up">
          <div>
            <h1 className="text-3xl font-display font-medium text-white tracking-tight">History</h1>
            <p className="text-slate-400 mt-2 text-lg">Manage your past analyses and reports</p>
          </div>
          <Button
            onClick={loadHistory}
            variant="secondary"
            className="flex items-center gap-2 shadow-sm bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border-white/5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </Button>
        </div>

        <Card className="overflow-hidden shadow-secondary border-white/5 bg-white/5 backdrop-blur-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Title / Video</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider w-64">Date Created</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-500 border border-white/5">
                          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg mb-2">No history found</p>
                          <p className="text-slate-500 mb-6">Start by creating your first analysis</p>
                          <Link href="/dashboard">
                            <Button variant="gradient" className="shadow-lg shadow-indigo-500/20">Create Analysis</Button>
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((analysis, idx) => {
                    const videoTitle =
                      (analysis?.metadata && (analysis.metadata.title || analysis.metadata.name)) ||
                      analysis?.title ||
                      (analysis?.video_id ? `Analysis for ${analysis.video_id}` : "Untitled Analysis");

                    const createdFormatted = formatCreated(analysis?.created_at ?? analysis?.created ?? analysis?.createdAt);
                    const key = analysis?.id ?? `${analysis?.video_id ?? "no-video"}-${idx}`;
                    const tooltip = safeStringify(analysis, 800);
                    const { type, video_id, video_url } = analysis;

                    // Inference logic for missing/incorrect type
                    let inferredType = type;
                    if (!inferredType || inferredType === 'youtube') {
                      // If type is missing OR default 'youtube' (which might be wrong if no video_id), try to infer
                      if (video_id) {
                        inferredType = 'youtube';
                      } else if (video_url && !video_url.includes('placeholder.internal')) {
                        inferredType = 'blog';
                      } else {
                        inferredType = 'text';
                      }
                    }

                    const isYoutube = inferredType === 'youtube';
                    const isBlog = inferredType === 'blog';
                    const isText = inferredType === 'text';

                    // nice label for secondary row
                    const getSecondaryLabel = () => {
                      if (isBlog && video_url) {
                        try { return new URL(video_url).hostname; } catch (e) { return "Website"; }
                      }
                      if (isText) return 'Custom Text Content';
                      // For YouTube, return "Analysis" as a generic label (instead of the ID)
                      if (isYoutube) return 'Analysis';
                      return null;
                    };

                    return (
                      <tr
                        key={analysis.id}
                        onClick={() => router.push(`/analysis/${analysis.id}`)}
                        className="group hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-none"
                      >
                        <td className="px-6 py-6" title={tooltip}>
                          <div className="flex items-center gap-4">
                            <ContentIcon type={inferredType} videoId={video_id} />
                            <div>
                              <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors text-base mb-1 line-clamp-1">
                                {videoTitle}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Type Badge */}
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isYoutube ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                  isBlog ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                  {isBlog ? 'WEBSITE' : (isText ? 'TEXT' : 'YOUTUBE')}
                                </span>

                                {getSecondaryLabel() && (
                                  <div className="text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded inline-block border border-white/10">
                                    {getSecondaryLabel()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-6 text-sm text-slate-400 whitespace-nowrap">
                          {createdFormatted}
                        </td>

                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnalysisToDelete(analysis);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
                              title="Delete Analysis"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-500 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all shadow-sm">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

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
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setAnalysisToDelete(null);
                    }}
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
    </Layout>
  );
}
