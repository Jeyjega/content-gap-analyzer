import TextPage from '@/components/TextPage';

export default function About() {
    return (
        <TextPage
            title="About GapGens"
            description="We are building the intelligence layer for the creator economy."
        >
            <p className="lead">
                GapGens was founded on a belief that the future of content isn't "more"—it's "better."
            </p>

            <h2>Our Story</h2>
            <p>
                As content creators ourselves, we saw a disturbing trend. The tools being built for creators were all about <strong>generation</strong>—churning out more text, more posts, more noise.
            </p>
            <p>
                But nobody was building tools for <strong>intelligence</strong>. Nobody was building tools to help you check your work, find your blind spots, and make your existing content stronger.
            </p>
            <p>
                We realized that the real power of AI wasn't to replace the creator, but to act as the ultimate editor and research assistant. That's why we built GapGens.
            </p>

            <h2>Our Mission</h2>
            <p>
                <strong>To eliminate the gap between what you know and what you communicate.</strong>
            </p>
            <p>
                We want to help experts transfer their knowledge to their audience with zero loss of fidelity. We believe that by raising the quality bar of content, we improve the internet for everyone.
            </p>

            <h2>Our Values</h2>
            <ul>
                <li><strong>Truth First:</strong> We prioritize accuracy over fluency. We'd rather the AI say "I don't know" than invent a pleasing lie.</li>
                <li><strong>Creator Control:</strong> The AI works for you, not the other way around. You set the constraints, the tone, and the goal.</li>
                <li><strong>Deep Work:</strong> We build tools for thoughtful creation, not dopamine-loop consumption.</li>
            </ul>
        </TextPage>
    );
}
