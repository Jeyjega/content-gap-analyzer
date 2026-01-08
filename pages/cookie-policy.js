import TextPage from '@/components/TextPage';

export default function CookiePolicy() {
    return (
        <TextPage
            title="Cookie Policy"
            description="Last updated: January 2026"
        >
            <p>
                GapGens uses cookies to improve your experience. This policy explains what they are and how we use them.
            </p>

            <h2>What are cookies?</h2>
            <p>
                Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and login state.
            </p>

            <h2>How We Use Cookies</h2>
            <ul>
                <li><strong>Essential Cookies:</strong> These are required for the site to function (e.g., keeping you logged in). You cannot disable these.</li>
                <li><strong>Analytics Cookies:</strong> We use anonymous analytics tools (like Plausible or Google Analytics) to understand site traffic. These do not track your personal identity across the web.</li>
            </ul>

            <h2>Managing Cookies</h2>
            <p>
                Most web browsers allow you to control cookies through their settings preferences. However, limiting cookies may impact your ability to use the full functionality of GapGens (specifically logging in).
            </p>
        </TextPage>
    );
}
