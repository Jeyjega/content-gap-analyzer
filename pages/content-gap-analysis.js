import TextPage from '@/components/TextPage';

export default function ContentGapAnalysis() {
    return (
        <TextPage
            title="Content Gap Analysis"
            description="Identify missing logic, undefined terms, and assumed knowledge in your content before you publish."
        >
            <p className="lead">
                Your audience doesn't know what you know. GapGens simulates a "first-time learner" to spot the holes in your explanation that lead to confusion and drop-off.
            </p>

            <h2>What Problem This Solves</h2>
            <p>
                When you're an expert, you suffer from the "curse of knowledge." You skip steps because they seem obvious to you. To a beginner, however, that missing step is a chasm they can't cross. This leads to frustrated comments, lower retention, and "this doesn't work" feedback.
            </p>

            <h2>How GapGens Approaches This</h2>
            <p>
                Our AI engine doesn't just summarize your text; it critiques it. It creates a mental model of the concepts presented and checks for connectivity.
            </p>
            <p>
                If Concept A relies on Concept B, but Concept B was never defined, GapGens flags it as a critical gap. It's like having a ruthless editor who ensures your logic is bulletproof.
            </p>

            <h2>Key Capabilities</h2>
            <ul>
                <li><strong>Prerequisite checking:</strong> Flags terms used before they are defined.</li>
                <li><strong>Logic Flow Analysis:</strong> Identifies "leaps" in reasoning that lack supporting evidence.</li>
                <li><strong>Audience Simulation:</strong> Predicts questions a viewer might ask at specific timestamps.</li>
                <li><strong>Actionable Suggestions:</strong> Provides specific prompt suggestions to fill the gaps using your own knowledge.</li>
            </ul>

            <h2>Who Uses This</h2>
            <ul>
                <li><strong>Educators & Course Creators:</strong> Ensuring lessons are comprehensive.</li>
                <li><strong>Technical Writers:</strong> Verifying documentation covers edge cases.</li>
                <li><strong>Video Essayists:</strong> tightening scripts for maximum retention and clarity.</li>
            </ul>

            <h2>Why This Matters</h2>
            <p>
                <strong>Clarity converts.</strong> When your audience understands you effortlessly, they trust you implicitly. Closing content gaps is the highest-ROI editing activity you can do.
            </p>
        </TextPage>
    );
}
