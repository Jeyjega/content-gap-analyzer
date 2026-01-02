import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalysis();
    }, []);

    async function loadAnalysis() {
        setLoading(true);

        const { data, error } = await supabase
            .from("analyses")
            .select("generated_script")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error("Failed to load analysis", error);
            setLoading(false);
            return;
        }

        // ✅ CRITICAL FIX — NORMALIZE DATA SHAPE
        let parsed;
        try {
            parsed =
                typeof data.generated_script === "string"
                    ? JSON.parse(data.generated_script)
                    : data.generated_script;
        } catch (e) {
            console.error("Invalid JSON in generated_script", e);
            parsed = {};
        }

        setAnalysisResult(parsed);
        setLoading(false);
    }

    if (loading) {
        return <div className="p-6">Loading GapGens analysis…</div>;
    }

    if (!analysisResult) {
        return <div className="p-6">No analysis found.</div>;
    }

    const gaps = Array.isArray(analysisResult.gaps)
        ? analysisResult.gaps
        : [];

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Gap Analysis</h1>

            {/* SUMMARY */}
            {analysisResult.summary && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold">Summary</h2>
                    <p className="text-gray-700 mt-2">{analysisResult.summary}</p>
                </div>
            )}

            {/* GAPS */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold">Identified Gaps</h2>

                {gaps.length === 0 ? (
                    <p className="text-gray-500 mt-2">
                        No content gaps identified.
                    </p>
                ) : (
                    <div className="space-y-4 mt-3">
                        {gaps.map((gap, idx) => (
                            <div
                                key={idx}
                                className="border rounded p-4 bg-white shadow-sm"
                            >
                                <h3 className="font-medium">{gap.title}</h3>
                                <p className="text-sm text-gray-700 mt-1">
                                    {gap.suggestion}
                                </p>
                                <span className="text-xs text-gray-500 mt-2 inline-block">
                                    Priority: {gap.priority}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DERIVATIVE SCRIPT */}
            {analysisResult.suggested_script && (
                <div>
                    <h2 className="text-lg font-semibold">Derivative Script</h2>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 mt-3 bg-gray-50 p-4 rounded">
                        {analysisResult.suggested_script}
                    </pre>
                </div>
            )}
        </div>
    );
}
