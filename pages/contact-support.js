import TextPage from '@/components/TextPage';

export default function ContactSupport() {
    return (
        <TextPage
            title="Contact Support"
            description="We're here to help. Get in touch with our team."
        >
            <p className="lead">
                Have a question, found a bug, or have a feature request? We'd love to hear from you.
            </p>

            <h2>Email Us</h2>
            <p>
                For general support and inquiries:
                <br />
                <a href="mailto:support@gapgens.com" className="text-indigo-400 font-bold text-xl">support@gapgens.com</a>
            </p>
            <p>
                For enterprise sales and partnership:
                <br />
                <a href="mailto:sales@gapgens.com" className="text-indigo-400 font-bold text-xl">sales@gapgens.com</a>
            </p>

            <h2>Response Times</h2>
            <p>
                We are a small, dedicated team. We aim to respond to all support tickets within 24 hours during business days (Mon-Fri).
            </p>

            <h2>Social</h2>
            <p>
                You can also find us on <a href="#">Twitter</a> for status updates and quick tips.
            </p>

        </TextPage>
    );
}
