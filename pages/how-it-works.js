import TextPage from '@/components/TextPage';

export default function HowItWorks() {
    return (
        <TextPage
            title="How GapGens Works"
            description="Turn your existing content into high-performing assets with our transcript-grounded AI pipeline."
        >
            <p className="lead">
                GapGens isn't a "magic writer" that invents facts. It's a precision tool that analyzes what you've already created, finds what's missing, and helps you fill the gaps with authority.
            </p>

            <h2>The Problem: Great Content, Wasted Potential</h2>
            <p>
                Most creators and companies sit on a goldmine of expertise locked in "one-off" formats: a single YouTube video, a webinar recording, or a podcast interview. Once published, the ideas are often lost to the feed.
            </p>
            <p>
                Trying to repurpose this content manually is tedious. Asking generic AI to "write a blog post based on this video" usually results in hallucinations, generic fluff, and a loss of your unique voice.
            </p>

            <h2>Our Approach: Transcript-Grounded Intelligence</h2>
            <p>
                GapGens takes a different approach. We believe the answers are already in your source material—or they should be. Our engine strictly anchors to your transcripts to ensure accuracy.
            </p>
            <ul>
                <li><strong>No External Hallucinations:</strong> We don't browse the web to stifle your voice with generic data.</li>
                <li><strong>Gap Detection:</strong> We identify logically missing steps, undefined terms, and assumed knowledge that leaves your audience confused.</li>
                <li><strong>Structural Fidelity:</strong> We preserve your arguments and examples, only expanding where necessary to bridge the gaps.</li>
            </ul>

            <h2>Key Capabilities</h2>
            <ul>
                <li><strong>Deep Transcript Analysis:</strong> Upload video URLs or raw text. We parse every word.</li>
                <li><strong>Logical Gap Reports:</strong> Get a prioritized list of "content holes" that need filling.</li>
                <li><strong>format shifting:</strong> Turn a messy 2-person interview into a clean, structured solo monologue or article.</li>
                <li><strong>Source-Faithful Generation:</strong> Generate new scripts that sound exactly like you, because they are built from your words.</li>
            </ul>

            <h2>Who Uses This?</h2>
            <p>
                GapGens is built for:
            </p>
            <ul>
                <li><strong>YouTube Creators:</strong> Refining scripts and repurposing live streams.</li>
                <li><strong>Podcasters:</strong> Turning rambling interviews into tight solo episodes/articles.</li>
                <li><strong>Content Teams:</strong> ensuring technical documentation and whitepapers are complete.</li>
            </ul>

            <h2>Why This Matters</h2>
            <p>
                In an age of AI noise, <strong>trust is the only currency</strong>. By ensuring your derived content is grounded in your actual expertise, you build authority rather than eroding it with generic generated text.
            </p>
        </TextPage>
    );
}
