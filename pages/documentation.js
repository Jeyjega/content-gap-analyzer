import TextPage from '@/components/TextPage';

export default function Documentation() {
    return (
        <TextPage
            title="GapGens Documentation"
            description="Guides, tutorials, and API reference for getting the most out of GapGens."
        >
            <p className="lead">
                Welcome to the GapGens knowledge base. Here you'll find everything you need to master our content intelligence engine.
            </p>

            <h2>Getting Started</h2>
            <ul>
                <li><strong>Quickstart Guide:</strong> Your first analysis in 60 seconds.</li>
                <li><strong>Connecting Sources:</strong> How to link YouTube, RSS feeds, and upload files.</li>
                <li><strong>Understanding the Output:</strong> How to interpret gap reports and confidence scores.</li>
            </ul>

            <h2>Core Features</h2>
            <p>
                Deep dive into our specific analysis modes:
            </p>
            <ul>
                <li><strong>Gap Analysis 101:</strong> What the different gap types mean (Logical, Semantic, Structural).</li>
                <li><strong>Script Generation:</strong> How to prompt the AI for specific tones and formats.</li>
                <li><strong>Monologue Mode:</strong> Best practices for recording interviews that convert well to solo scripts.</li>
            </ul>

            <h2>Advanced Usage</h2>
            <ul>
                <li><strong>Team Workflows:</strong> Managing shared workspaces and permissions. (Enterprise)</li>
                <li><strong>API Access:</strong> Integrating GapGens into your CMS or publishing pipeline.</li>
            </ul>

            <h2>Need help?</h2>
            <p>
                If you can't find what you're looking for, please check our <a href="/faq">FAQ</a> or <a href="/contact-support">Contact Support</a>.
            </p>
        </TextPage>
    );
}
