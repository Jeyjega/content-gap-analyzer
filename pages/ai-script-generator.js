import TextPage from '@/components/TextPage';

export default function AiScriptGenerator() {
    return (
        <TextPage
            title="AI Script Generator"
            description="Generate production-ready video scripts and articles that stay strictly faithful to your source material."
        >
            <p className="lead">
                Stop fighting with generic AI tools that rewrite your voice. GapGens generates scripts that amplify your ideas without inventing facts.
            </p>

            <h2>What Problem This Solves</h2>
            <p>
                Most "AI writers" are creative writers—and that's the problem. You don't want creativity; you want clarity. You want your rough draft or webinar recording polished into a tight script, without the AI adding hallucinations or "marketing fluff" that ruins the authenticity.
            </p>

            <h2>How GapGens Approaches This</h2>
            <p>
                We use a strict "Grounding First" architecture. The AI is structurally constrained to only use information present in the source transcript or explicitly provided in the gap-filling phase.
            </p>
            <p>
                It treats your content like a database of facts. It reassembles them into a new format (e.g., a YouTube script structure) but refuses to import outside data unless specifically asked.
            </p>

            <h2>Key Capabilities</h2>
            <ul>
                <li><strong>Source Fidelity:</strong> 100% adherence to your metrics, stories, and examples.</li>
                <li><strong>Structure Enforcement:</strong> Output follows proven retention hooks (Hook, Value, Body, Payoff).</li>
                <li><strong>Tone Matching:</strong> Analyzes your speaking patterns to write in your voice.</li>
                <li><strong>Zero Hallucinations:</strong> If it's not in the source, it's not in the script.</li>
            </ul>

            <h2>Who Uses This</h2>
            <ul>
                <li><strong>YouTubers:</strong> Turning raw thoughts into filmed scripts.</li>
                <li><strong>Founders:</strong> Converting internal talks into LinkedIn thought leadership.</li>
                <li><strong>Podcasters:</strong> Creating "clips" scripts from long episodes.</li>
            </ul>

            <h2>Why This Matters</h2>
            <p>
                <strong>Speed without compromise.</strong> You can produce 10x more content, but if that content feels "generated," you lose your audience. GapGens gives you volume while protecting your reputation.
            </p>
        </TextPage>
    );
}
