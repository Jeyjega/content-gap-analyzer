import TextPage from '@/components/TextPage';

export default function Pricing() {
    return (
        <TextPage
            title="Simple, Transparent Pricing"
            description="Start for free, upgrade as you scale."
        >
            <p className="lead">
                We rely on a fair usage model based on analyzed hours.
            </p>

            {/* Pricing Grid */}
            <div className="grid md:grid-cols-3 gap-8 not-prose my-12">

                {/* Free Tier */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Hobbyist</h3>
                    <div className="text-3xl font-bold text-white mb-6">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
                    <ul className="space-y-4 text-sm text-slate-300 mb-8 flex-grow">
                        <li>• 1 hour of analysis / month</li>
                        <li>• Standard processing speed</li>
                        <li>• Basic gap reports</li>
                    </ul>
                    <a href="#" className="block text-center py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-medium">Get Started</a>
                </div>

                {/* Pro Tier */}
                <div className="bg-indigo-600/10 border border-indigo-500/50 rounded-xl p-8 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-xs text-white px-3 py-1 font-bold uppercase rounded-bl-lg">Popular</div>
                    <h3 className="text-xl font-bold text-white mb-2">Creator</h3>
                    <div className="text-3xl font-bold text-white mb-6">$29<span className="text-sm font-normal text-slate-500">/mo</span></div>
                    <ul className="space-y-4 text-sm text-slate-300 mb-8 flex-grow">
                        <li>• 10 hours of analysis / month</li>
                        <li>• Priority processing</li>
                        <li>• Advanced Gap & Script tools</li>
                        <li>• Interview to Monologue</li>
                    </ul>
                    <a href="#" className="block text-center py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium">Start Free Trial</a>
                </div>

                {/* Agency Tier */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Agency</h3>
                    <div className="text-3xl font-bold text-white mb-6">$99<span className="text-sm font-normal text-slate-500">/mo</span></div>
                    <ul className="space-y-4 text-sm text-slate-300 mb-8 flex-grow">
                        <li>• 50 hours of analysis / month</li>
                        <li>• Team seats (up to 3)</li>
                        <li>• White-label reports</li>
                        <li>• Priority Support</li>
                    </ul>
                    <a href="#" className="block text-center py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-medium">Contact Sales</a>
                </div>

            </div>

            <h2>Which plan is right for me?</h2>
            <ul>
                <li><strong>Hobbyist:</strong> Perfect for testing the water or analyzing one video a month.</li>
                <li><strong>Creator:</strong> Ideal for active YouTubers or podcasters publishing weekly.</li>
                <li><strong>Agency:</strong> Built for content teams managing multiple clients or shows.</li>
            </ul>

        </TextPage>
    );
}
