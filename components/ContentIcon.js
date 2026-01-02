import { useState } from "react";

export default function ContentIcon({ type, videoId }) {
    const [error, setError] = useState(false);

    // If it's a YouTube video and we have an ID and no error, show thumbnail
    if ((!type || type === 'youtube') && videoId && !error) {
        return (
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm relative bg-slate-100">
                <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                    onError={() => setError(true)}
                />
            </div>
        );
    }

    // Fallback / Other Types
    let icon;
    let styles = "bg-indigo-50 text-indigo-600 border-indigo-100"; // Default (YouTube/Video)

    if (type === 'blog') {
        styles = "bg-emerald-50 text-emerald-600 border-emerald-100";
        icon = (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        );
    } else if (type === 'text') {
        styles = "bg-amber-50 text-amber-600 border-amber-100";
        icon = (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        );
    } else {
        // Default / Youtube Fallback
        icon = (
            <>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </>
        );
    }

    return (
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-sm transition-all duration-300 ${styles}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {icon}
            </svg>
        </div>
    );
}
