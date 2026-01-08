import TextPage from '@/components/TextPage';

export default function Methodology() {
    return (
        <TextPage
            title="Our Methodology"
            description="How GapGens ensures accuracy, eliminates hallucinations, and protects your intellectual property."
        >
            <p className="lead">
                We built GapGens on a simple premise: <strong>AI should be an architect, not an inventor.</strong>
            </p>

            <h2>The "Grounding" Principle</h2>
            <p>
                Standard LLMs are trained to predict the next likely word. This makes them creative but unreliable liars. They hallucinate facts to complete a pattern.
            </p>
            <p>
                GapGens uses a proprietary <strong>Retrieval-Augmented Generation (RAG)</strong> pipeline that strictly constrains the model to your provided source material.
            </p>

            <h2>How It Works</h2>
            <ol>
                <li><strong>Ingestion & Indexing:</strong> We break your transcript into semantic chunks, indexing them by concept and logic flow.</li>
                <li><strong>Gap Detection:</strong> We simulate a "learner model" that attempts to learn the subject solely from your chunks. Where the learner fails, a gap is flagged.</li>
                <li><strong>Constraint Injection:</strong> When generating new scripts, we inject strict negative constraints: <em>"Do not use metaphors not present in source. Do not invent statistics."</em></li>
                <li><strong>Verification:</strong> Our post-processing layer cross-references every claim in the output against the source transcript. Unverified claims are flagged or removed.</li>
            </ol>

            <h2>Data Privacy</h2>
            <ul>
                <li><strong>Your Data is Yours:</strong> We do not train our foundational models on your private content.</li>
                <li><strong>Encryption:</strong> All transcripts and analysis data are encrypted at rest and in transit.</li>
                <li><strong>Ephemeral Processing:</strong> For "guest" users, data is wiped immediately after the session ends.</li>
            </ul>

            <h2>Why Trust Us?</h2>
            <p>
                We are built by creators, for creators. We know that one hallucinated stat can ruin a reputation built over years. That's why we prioritized <strong>fidelity over creativity</strong>.
            </p>
        </TextPage>
    );
}
