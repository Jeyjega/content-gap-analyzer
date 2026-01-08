import TextPage from '@/components/TextPage';

export default function SupportedFormats() {
    return (
        <TextPage
            title="Supported Input Formats"
            description="We prioritize ingestors that guarantee high-fidelity text extraction to prevent analysis errors."
        >

            {/* 2. Supported Formats */}
            <h2 className="text-2xl font-bold text-white mb-6">Currently Supported</h2>
            <div className="grid gap-8 mb-16">

                <div>
                    <h3 className="text-xl font-semibold text-white mb-2">YouTube Videos</h3>
                    <p className="text-slate-400">
                        Directly analyze public YouTube URLs. We extract the official caption track (generated or manual) to ensure the analysis is grounded in the exact spoken words of the video.
                    </p>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Web Articles & Blogs</h3>
                    <p className="text-slate-400">
                        Paste any public article URL. Our parser strips away ads, navigation bars, and comments to isolate the core editorial content for gap detection.
                    </p>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Raw Text</h3>
                    <p className="text-slate-400">
                        Paste text directly from your clipboard. Perfect for analyzing drafts from Google Docs, Notion, or email newsletters before they are published.
                    </p>
                </div>

            </div>

            {/* 3. Coming Soon */}
            <div className="border-t border-white/5 pt-10 mb-16 opacity-75">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    Coming Soon <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Roadmap</span>
                </h2>
                <div className="grid gap-6">

                    <div>
                        <h3 className="text-lg font-medium text-slate-200 mb-1">Audio Files (MP3/WAV)</h3>
                        <p className="text-sm text-slate-500">
                            Direct upload for podcast recordings and voice memos.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-slate-200 mb-1">Documents (PDF/DOCX)</h3>
                        <p className="text-sm text-slate-500">
                            Ingestion for whitepapers and technical manuals.
                        </p>
                    </div>

                </div>
            </div>

            {/* 4. Trust & Accuracy Statement */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                <h3 className="text-lg font-bold text-white mb-3">Our Engineering Stance on Fidelity</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-0">
                    GapGens only analyzes formats that can be reliably converted into clean, structured text. We intentionally delay support for formats like PDF or raw audio until our extraction layer yields zero-defect results. If we cannot guarantee that the input text faithfully represents your source material, we will not run the analysis. Accuracy is the prerequisite for utility.
                </p>
            </div>

        </TextPage>
    );
}
