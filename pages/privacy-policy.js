import TextPage from '@/components/TextPage';

export default function PrivacyPolicy() {
    return (
        <TextPage
            title="Privacy Policy"
            description="Last updated: January 2026"
        >
            <p>
                At GapGens, we take your privacy seriously. This document outlines what data we collect, how we use it, and your rights regarding that data.
            </p>

            <h2>1. The Short Version</h2>
            <p>
                We analyze the content you upload to provide our service. We do not sell your data. We do not claim ownership of your content. We rely on secure third-party providers (like Stripe for payments and Supabase for authentication) to keep your data safe.
            </p>

            <h2>2. Information We Collect</h2>
            <ul>
                <li><strong>Account Info:</strong> Email address and name via your login provider.</li>
                <li><strong>User Content:</strong> Text, audio files, and video URLs you submit for analysis.</li>
                <li><strong>Usage Data:</strong> Anonymized metrics on how you use the site (e.g., page views, error logs).</li>
            </ul>

            <h2>3. How We Use Your Content</h2>
            <p>
                <strong>Your Content is for Analysis Only.</strong> We process your uploads to generate the reports and scripts you request. We do not use your private content to train our public-facing AI models without your explicit permission.
            </p>

            <h2>4. Data Retention</h2>
            <p>
                We retain your analysis history to allow you to review past reports. You can delete individual reports or your entire account at any time, which permanently removes this data from our servers.
            </p>

            <h2>5. CCPA and GDPR</h2>
            <p>
                You have the right to access, correct, or delete your personal data. To exercise these rights, please contact privacy@gapgens.com.
            </p>
        </TextPage>
    );
}
