import TextPage from '@/components/TextPage';

export default function Faq() {
    return (
        <TextPage
            title="Frequently Asked Questions"
            description="Common questions about GapGens features, pricing, and technology."
        >
            <div className="space-y-8">

                <div>
                    <h2 className="text-xl font-bold text-white mb-2">How is this different from ChatGPT?</h2>
                    <p>
                        ChatGPT is a generalist conversationalist. GapGens is a specialist analyst. We are architected specifically for long-form content analysis and utilize strict grounding techniques to prevent hallucinations. We also provide specific tools like "Gap Reports" that ChatGPT cannot replicate reliably.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Does GapGens train on my data?</h2>
                    <p>
                        No. Your content remains your intellectual property. We do not use your uploads to train our public models.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white mb-2">What languages do you support?</h2>
                    <p>
                        Currently, our analysis engine is optimized for English. We are testing beta support for Spanish, French, and German, which will be rolling out soon.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Can I analyze videos that aren't mine?</h2>
                    <p>
                        Technically, yes—our YouTube ingestor works on public videos. This is a great way to research competitors or learn from top creators. However, you are responsible for respecting copyright laws regarding the generated derivatives.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white mb-2">What happens if I run out of analysis minutes?</h2>
                    <p>
                        You can upgrade your plan or purchase ad-hoc credit packs at any time. We'll notify you when you're reaching your limit.
                    </p>
                </div>

            </div>
        </TextPage>
    );
}
