import TextPage from '@/components/TextPage';

export default function ContentStrategyTeams() {
    return (
        <TextPage
            title="GapGens for Content Strategy Teams"
            description="Standardize quality and maintain voice consistency across your entire editorial calendar."
        >
            <p className="lead">
                Managing a team of writers or freelancers? GapGens provides the objective quality control layer you've been missing.
            </p>

            <h2>The Problem</h2>
            <p>
                Editing is expensive. Subject Matter Experts (SMEs) hate reviewing freelance work because "they just don't get it." The technical gaps are too big.
            </p>

            <h2>How GapGens Helps</h2>
            <ul>
                <li><strong>Automated QA:</strong> Run every draft through GapGens before it hits an editor's desk. Catch logical fallacies and missing definitions automatically.</li>
                <li><strong>SME Download:</strong> Interview your SME for 20 minutes. Use GapGens to generate detailed content briefs that actually contain the technical nuance required.</li>
                <li><strong>Voice Consistency:</strong> Train GapGens on your brand's whitepapers to ensure new content matches your established tone.</li>
            </ul>

            <h2>Why It Matters</h2>
            <p>
                <strong>Scale without dilution.</strong> Usually, as content volume goes up, quality goes down. GapGens inverts this curve by using AI to enforce depth, not just generate length.
            </p>
        </TextPage>
    );
}
