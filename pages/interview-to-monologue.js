import TextPage from '@/components/TextPage';

export default function InterviewToMonologue() {
    return (
        <TextPage
            title="Interview to Monologue"
            description="Transform multi-speaker interviews into cohesive, authoritative solo narratives."
        >
            <p className="lead">
                Extract the wisdom from a messy conversation and repackage it as a direct-to-camera masterclass.
            </p>

            <h2>What Problem This Solves</h2>
            <p>
                Interviews are great for discovery but terrible for efficiency. Listeners have to wade through banter, "umms," interruptions, and side-tracks to get the value.
            </p>
            <p>
                Creators often want to take the insights from a guest interview and present them as a clean, concise video essay or article. Doing this manually requires hours of re-listening and synthesis.
            </p>

            <h2>How GapGens Approaches This</h2>
            <p>
                GapGens identifies the core "subject" of the conversation. It separates the interviewer's prompts from the expert's answers.
            </p>
            <p>
                It then synthesizes the expert's fragmented answers into complete, standalone paragraphs. The result is a script that reads as if the expert sat down to write a structured essay on the topic.
            </p>

            <h2>Key Capabilities</h2>
            <ul>
                <li><strong>Speaker Separation:</strong> Isolates the "Expert" signal from the "Host" noise.</li>
                <li><strong>Context Fusion:</strong> Merges answers that were split across different parts of the interview.</li>
                <li><strong>Narrative Smoothing:</strong> Removes conversational crutches ("Yeah, exactly," "Like I said earlier").</li>
                <li><strong>Attribution Preservation:</strong> Ensures stories remain first-person ("I did this") or third-person as desired.</li>
            </ul>

            <h2>Who Uses This</h2>
            <ul>
                <li><strong>Podcast Hosts:</strong> Creating solo recap episodes.</li>
                <li><strong>Journalists:</strong> Drafting articles from interview transcripts.</li>
                <li><strong>Corporate Comms:</strong> Turning executive fireside chats into memos.</li>
            </ul>

            <h2>Why This Matters</h2>
            <p>
                <strong>Respect your audience's time.</strong> Providing a condensed, high-density version of a conversation is a premium value add. It turns "background listening" into "must-read material."
            </p>
        </TextPage>
    );
}
