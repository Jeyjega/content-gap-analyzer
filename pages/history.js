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

  // Treat backend timestamps as UTC. If missing 'Z' or offset, append 'Z'.
  let dateStr = createdRaw;
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    dateStr += 'Z';
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(createdRaw);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');

  return `${year}.${month}.${day} // ${hours}:${mins}:${secs}`;
}




export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

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
      setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const paginatedItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [items.length, currentPage, totalPages]);

  if (loading) {
    return (
      <Layout bgClass="bg-[#080809]" headerVariant="dark">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-white/10 border-t-[#10B981] rounded-none animate-spin"></div>
            <div className="text-[#10B981] font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Archive...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout bgClass="bg-[#080809]" headerVariant="dark">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="p-8 border border-red-500/30 bg-red-500/10 backdrop-blur-sm rounded-none">
            <div className="flex items-center gap-3 text-red-500 mb-4 font-mono">
              <span className="text-xl">{'>'}</span>
              <h3 className="text-sm font-bold uppercase tracking-widest">System Error: Archive Inaccessible</h3>
            </div>
            <p className="text-slate-300 font-mono text-xs mb-6 uppercase tracking-wider">{error}</p>
            <Button onClick={loadHistory} variant="secondary" className="bg-[#080809] hover:bg-white/10 text-white border border-white/20 rounded-none font-mono text-xs uppercase tracking-widest">Reboot Stream</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout bgClass="bg-[#080809]" headerVariant="dark">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-16 gap-8 animate-slide-up relative z-10">
          <div className="flex relative">
            <div className="w-1 bg-[#10B981] mr-6 hidden sm:block h-16 self-end"></div>
            <div>
              <h2 className="font-mono text-[10px] font-bold text-[#10B981] uppercase tracking-[0.3em] mb-4">
                SECURE ARCHIVE // ACCESS LEVEL 4
              </h2>
              <h1 className="text-5xl sm:text-7xl font-display font-black text-white tracking-tighter uppercase leading-none">
                Log History
              </h1>
            </div>
          </div>
          <Button
            onClick={loadHistory}
            variant="secondary"
            className="flex items-center gap-3 bg-white/5 text-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10 border border-[#10B981]/20 rounded-none px-6 py-3 transition-colors h-12 shadow-sm font-mono text-xs uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-bold">Refresh Stream</span>
          </Button>
        </div>

        <div className="w-full border-t border-b border-white/10 mb-2 mt-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[0.2em] bg-[#080809]">
              <div className="col-span-12 md:col-span-2">REF_ID</div>
              <div className="col-span-12 md:col-span-4">AUDIT TITLE & SOURCE</div>
              <div className="col-span-12 md:col-span-3">DEPLOYMENT DATE</div>
              <div className="col-span-12 md:col-span-2">STATUS</div>
              <div className="col-span-12 md:col-span-1 text-right">DIRECTIVES</div>
            </div>
        </div>

        <div className="flex flex-col gap-[2px] animate-slide-up relative z-10" style={{ animationDelay: '0.1s' }}>
            {items.length === 0 ? (
                <div className="bg-[#111827] px-6 py-24 text-center border border-white/5 w-full flex flex-col items-center">
                    <div className="font-mono text-xl text-slate-500 mb-4 tracking-widest uppercase">{'>'} INPUT STREAM EMPTY</div>
                    <p className="text-slate-400 font-mono text-xs tracking-wider mb-8">NO PRIOR LOGS FOUND IN ARCHIVE</p>
                    <Link href="/dashboard">
                    <Button variant="secondary" className="border-[#10B981] bg-[#10B981]/10 text-[#10B981] rounded-none shadow-none hover:bg-[#10B981]/20 font-mono tracking-widest text-xs uppercase px-8 py-3">Initialize Analysis</Button>
                    </Link>
                </div>
            ) : (
                paginatedItems.map((analysis, pageIdx) => {
                const idx = (currentPage - 1) * ITEMS_PER_PAGE + pageIdx;
                const videoTitle =
                    (analysis?.metadata && (analysis.metadata.title || analysis.metadata.name)) ||
                    analysis?.title ||
                    (analysis?.video_id ? `Analysis for ${analysis.video_id}` : "Untitled Analysis");

                const createdFormatted = formatCreated(analysis?.created_at ?? analysis?.created ?? analysis?.createdAt);
                
                // Construct fake ID index sequence 
                // We use Array length - idx to have countdown numbering if it's descending date order, ensuring ID matches
                const paddedIndex = String(items.length - idx).padStart(3, '0');
                const refId = `#AX-${paddedIndex}`;

                const { type, video_id, video_url } = analysis;

                // Inference logic for missing/incorrect type
                let inferredType = type;
                if (!inferredType || inferredType === 'youtube') {
                    if (video_id) { inferredType = 'youtube'; } 
                    else if (video_url && !video_url.includes('placeholder.internal')) { inferredType = 'blog'; } 
                    else { inferredType = 'text'; }
                }

                const isYoutube = inferredType === 'youtube';
                const isBlog = inferredType === 'blog';
                const isText = inferredType === 'text';

                // We default everything to AUTHORIZED conceptually
                const isDraft = isText; // Just picking a condition for visual variety if needed, or make all AUTHORIZED

                return (
                    <div
                        key={analysis.id}
                        onClick={() => router.push(`/analysis/${analysis.id}`)}
                        className="grid grid-cols-12 gap-4 items-center bg-[#111827] hover:bg-[#1f2937] px-6 py-6 transition-colors border-l-2 border-transparent hover:border-[#10B981] group cursor-pointer"
                    >
                        <div className="col-span-12 md:col-span-2 font-mono text-xs text-slate-400 tracking-wider group-hover:text-white transition-colors">
                            {refId}
                        </div>

                        <div className="col-span-12 md:col-span-4 flex items-center gap-4">
                            <div className="w-10 h-10 flex-shrink-0 bg-white/5 border border-white/5 flex items-center justify-center">
                               {isYoutube ? (
                                   <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                               ) : isBlog ? (
                                   <svg className="w-5 h-5 text-[#0D9488]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                               ) : (
                                   <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg>
                               )}
                            </div>
                            <div className="flex flex-col max-w-full overflow-hidden">
                                <div className="font-sans font-bold text-white text-sm line-clamp-1 group-hover:text-[#10B981] transition-colors leading-snug">
                                    {videoTitle}
                                </div>
                                <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest truncate mt-1">
                                    SOURCE: {isYoutube ? 'YOUTUBE STREAM' : isBlog ? 'EXTERNAL DOMAIN' : 'INTERNAL REPOSITORY'} // {isYoutube && video_id ? `INTEL-LINK: YT.BE/V/${video_id.substring(0,5)}` : isBlog && video_url ? `LINK: ${video_url.substring(0,20)}...` : 'PROTOCOL: TXT-RAW'}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 md:col-span-3 font-mono text-[11px] text-slate-400 tracking-wider">
                            {createdFormatted}
                        </div>

                        <div className="col-span-12 md:col-span-2">
                           {isDraft ? (
                               <div className="inline-flex items-center gap-2 border border-slate-500/30 bg-transparent px-2 py-1">
                                   <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">DRAFT MODE</span>
                               </div>
                           ) : (
                               <div className="inline-flex items-center gap-2 border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-1">
                                   <div className="w-1.5 h-1.5 bg-[#10B981]"></div>
                                   <span className="font-mono text-[10px] text-[#10B981] font-bold uppercase tracking-widest">AUTHORIZED</span>
                               </div>
                           )}
                        </div>

                        <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-3 text-slate-500">
                           <button onClick={(e) => { e.stopPropagation(); router.push(`/analysis/${analysis.id}`); }} className="hover:text-white transition-colors" title="View Intelligence">
                               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h2v2H4zm0 5h2v2H4zm0 5h2v2H4zm16-8V6H8.023v2H18.8zM8 11h12v2H8zm0 5h12v2H8z"/></svg>
                           </button>
                           {/* Decorative download button */}
                           <button onClick={(e) => e.stopPropagation()} className="hover:text-[#10B981] transition-colors" title="Export Archive">
                               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21l-8-9h6V3h4v9h6l-8 9z"/></svg>
                           </button>
                           <button
                             onClick={(e) => {
                                 e.stopPropagation();
                                 setAnalysisToDelete(analysis);
                                 setDeleteModalOpen(true);
                             }}
                             className="hover:text-red-500 transition-colors"
                             title="Delete Log"
                           >
                               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                           </button>
                        </div>
                    </div>
                );
                })
            )}

            {/* Pagination Component */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 animate-slide-up">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center border border-white/10 bg-transparent text-slate-500 hover:text-white hover:border-white/30 disabled:opacity-50 disabled:hover:text-slate-500 disabled:hover:border-white/10 font-mono text-xs transition-colors"
                    >{'<'}</button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      // simple ellipsis logic
                      if (totalPages > 7) {
                        if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                          if (pageNum === 2 && currentPage > 3) return <span key={pageNum} className="font-mono text-slate-500 px-2 tracking-widest">...</span>;
                          if (pageNum === totalPages - 1 && currentPage < totalPages - 2) return <span key={pageNum} className="font-mono text-slate-500 px-2 tracking-widest">...</span>;
                          return null;
                        }
                      }
                      
                      const isActive = currentPage === pageNum;
                      return (
                        <button 
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 flex items-center justify-center border font-mono text-[10px] transition-colors ${
                            isActive 
                              ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981] font-bold" 
                              : "border-white/10 bg-transparent text-slate-400 hover:text-white hover:border-white/30"
                          }`}
                        >
                          {String(pageNum).padStart(2, '0')}
                        </button>
                      );
                    })}

                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center border border-white/10 bg-transparent text-slate-500 hover:text-white hover:border-white/30 disabled:opacity-50 disabled:hover:text-slate-500 disabled:hover:border-white/10 font-mono text-xs transition-colors"
                    >{'>'}</button>
                </div>
            )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0b0c15] border border-red-500/20 rounded-none shadow-2xl max-w-md w-full overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4 text-red-500">
                  <div className="w-10 h-10 border border-red-500 bg-red-500/10 flex items-center justify-center flex-shrink-0 rounded-none">
                    <span className="font-mono text-white text-lg">!</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Purge Directive</h3>
                </div>
                <p className="text-slate-400 mb-6 leading-relaxed font-mono text-xs uppercase tracking-wider">
                  CONFIRM PURGE PROTOCOL FOR ARCHIVE LOG. THIS ACTION IS DESTRUCTIVE AND IRREVERSIBLE.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    className="bg-transparent hover:bg-white/5 text-slate-400 border border-white/20 rounded-none font-mono text-xs uppercase tracking-widest"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setAnalysisToDelete(null);
                    }}
                    disabled={isDeleting}
                  >
                    Abort
                  </Button>
                  <Button
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500 hover:text-red-400 rounded-none focus:ring-0 font-mono text-xs uppercase tracking-widest"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "PURGING..." : "EXECUTE PURGE"}
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
