import TextPage from '@/components/TextPage';

export default function Changelog() {
    return (
        <TextPage
            title="Product Changelog"
            description="New features, improvements, and fixes. See what's new in GapGens."
        >

            <div className="border-l-2 border-white/10 pl-8 ml-4 space-y-12">

                <div className="relative">
                    <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-indigo-500 border-4 border-[#030014]"></span>
                    <h2 className="text-xl font-bold text-white mt-0">v1.2.0 — The "Monologue" Update</h2>
                    <p className="text-sm text-slate-500 mb-4">January 2026</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>New Feature:</strong> Interview to Monologue transformation. Automatically convert multi-speaker transcripts into solo narratives.</li>
                        <li><strong>Improvement:</strong> Enhanced YouTube extraction speed (3x faster).</li>
                        <li><strong>Fix:</strong> Resolved issue with timestamp alignment on videos longer than 2 hours.</li>
                    </ul>
                </div>

                <div className="relative">
                    <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-slate-700 border-4 border-[#030014]"></span>
                    <h2 className="text-xl font-bold text-white mt-0">v1.1.0 — Enhanced Gap Detection</h2>
                    <p className="text-sm text-slate-500 mb-4">December 2025</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>New Feature:</strong> "Semantic Gap" detection. Now compares your content coverage against topical clusters.</li>
                        <li><strong>UI Update:</strong> Dark mode is now the default experience for all new users.</li>
                    </ul>
                </div>

                <div className="relative">
                    <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-slate-700 border-4 border-[#030014]"></span>
                    <h2 className="text-xl font-bold text-white mt-0">v1.0.0 — Initial Launch</h2>
                    <p className="text-sm text-slate-500 mb-4">November 2025</p>
                    <p>
                        Initial public release of GapGens. Including core transcript analysis, logical gap detection, and AI script generation.
                    </p>
                </div>

            </div>

        </TextPage>
    );
}
