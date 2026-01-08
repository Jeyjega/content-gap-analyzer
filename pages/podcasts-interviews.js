import TextPage from '@/components/TextPage';

export default function PodcastsInterviews() {
    return (
        <TextPage
            title="GapGens for Podcasters"
            description="Turn one conversation into a week's worth of content. Transform interviews into articles, newsletters, and clips."
        >
            <p className="lead">
                Podcasts are high-effort, low-discoverability assets. GapGens solves the discoverability problem by extracting the text value from your audio.
            </p>

            <h2>The Problem</h2>
            <p>
                Google can't search your MP3s easily. Social media feeds don't play audio automatically. To grow a podcast, you need written collateral—show notes, blogs, tweets—that drives people to listen.
            </p>

            <h2>How GapGens Helps</h2>
            <ul>
                <li><strong>Interview to Monologue:</strong> The "Holy Grail" feature. Turn an interview with an expert into a first-person article written by them.</li>
                <li><strong>Show Notes on Autopilot:</strong> Get comprehensive summaries, key takeaways, and timestamped chapters.</li>
                <li><strong>Clip Spotter:</strong> Identify the most structurally complete arguments in the episode to clip for social media.</li>
            </ul>

            <h2>Why It Matters</h2>
            <p>
                Guest experts are your unfair advantage. GapGens lets you fully leverage their expertise, creating a content library that establishes your show as the authority in your niche.
            </p>
        </TextPage>
    );
}
