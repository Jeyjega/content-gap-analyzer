import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/components/AuthProvider';
import LoginButton from '@/components/LoginButton';
import EmailAuthForm from '@/components/EmailAuthForm';

export default function Pricing() {
    const { user, loading: authLoading } = useAuth();
    const [loadingTier, setLoadingTier] = useState(null);
    const [checkoutError, setCheckoutError] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [selectedTierForAuth, setSelectedTierForAuth] = useState(null);
    
    // Accordion State for FAQ
    const [openFaqIndex, setOpenFaqIndex] = useState(0);

    const handleUpgrade = async (tier) => {
        setCheckoutError(null);

        // Check if user is authenticated
        if (!user) {
            setSelectedTierForAuth(tier);
            setShowAuthModal(true);
            return;
        }

        try {
            setLoadingTier(tier);
            const response = await fetch(`/api/create-checkout-session?tier=${tier}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tier,
                    plan: tier,
                    userId: user?.id,
                    email: user?.email
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.checkoutUrl) {
                throw new Error(data.error || 'Failed to initiate checkout session');
            }

            // Redirect to Dodo Payments Checkout
            window.location.href = data.checkoutUrl;
        } catch (err) {
            console.error('Checkout error:', err);
            setCheckoutError(err.message || 'An error occurred while launching checkout. Please try again.');
            setLoadingTier(null);
        }
    };

    const faqItems = [
        {
            question: "Can I cancel anytime?",
            answer: "Yes, absolutely. You can cancel or modify your subscription at any time with a single click from your account dashboard. You will retain full access to your plan features and credits until the end of your active billing period."
        },
        {
            question: "How do credits work?",
            answer: "Credits are refreshed every month based on your active plan tier. Each content gap analysis or full script generation uses 1 credit, while lightweight script refinements use 0.5 credits. Unused credits reset automatically at the beginning of each billing cycle."
        },
        {
            question: "What are free refinements?",
            answer: "Refinements allow you to fine-tune generated content—such as adjusting tone, expanding specific hooks, or restructuring formats—for a minimal 0.5 credit cost rather than spending a full credit."
        }
    ];

    return (
        <Layout headerVariant="dark" bgClass="bg-[#080809]">
            <Head>
                <title>Pricing & Subscription Plans | GapGens</title>
                <meta
                    name="description"
                    content="Choose your growth engine. Scale your content strategy with AI-powered script generation, precision gap detection, and flexible subscription tiers."
                />
            </Head>

            <div className="relative min-h-screen bg-[#080809] text-white overflow-hidden py-16 lg:py-24">
                
                {/* Background Ambient Glows */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#10B981]/10 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-violet-600/10 blur-[140px] rounded-full pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                    
                    {/* Header Section */}
                    <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
                        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-[#10B981] uppercase tracking-[0.25em] mb-4 border border-[#10B981]/30 px-3.5 py-1 bg-[#10B981]/5 backdrop-blur-md">
                            <span>///</span> FLEXIBLE SUBSCRIPTION MODEL
                        </div>
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] via-emerald-400 to-teal-300">Growth Engine</span>
                        </h1>
                        <p className="font-sans text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
                            Scale your content strategy with AI-powered script generation and precision gap detection.
                        </p>
                    </div>

                    {/* Checkout Error Notification */}
                    {checkoutError && (
                        <div className="max-w-3xl mx-auto mb-10 p-4 bg-red-500/10 border border-red-500/30 rounded-none text-red-300 text-sm flex items-center justify-between animate-fade-in">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{checkoutError}</span>
                            </div>
                            <button
                                onClick={() => setCheckoutError(null)}
                                className="text-xs uppercase font-mono text-slate-400 hover:text-white px-2 py-1"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* Three-Tier Pricing Table */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8 items-stretch mb-24">

                        {/* TIER 1: Free Tier (Explorer) */}
                        <div className="bg-[#0D1117] border border-white/10 rounded-none p-8 flex flex-col justify-between relative transition-all duration-300 hover:border-white/20 group">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white tracking-wide font-display">Explorer</h3>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1">
                                        FREE
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-6 font-mono">Ideal for testing content gap analysis & standard generation.</p>
                                
                                <div className="mb-6 pb-6 border-b border-white/10">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-white">$0</span>
                                        <span className="text-sm font-mono text-slate-500">/ month</span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-[#10B981] flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>3 Credits / month</span>
                                    </div>
                                </div>

                                <ul className="space-y-3.5 text-sm text-slate-300 mb-8">
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Basic YouTube ingestion</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Standard AI model</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Community support</span>
                                    </li>
                                </ul>
                            </div>

                            <Link
                                href="/dashboard"
                                className="w-full block text-center py-3.5 px-4 bg-[#161B22] text-slate-300 font-mono text-xs font-bold tracking-widest uppercase border border-white/10 hover:border-white/30 hover:text-white transition-all"
                            >
                                {user ? "Current Plan" : "Get Started Free"}
                            </Link>
                        </div>

                        {/* TIER 2: Standard Tier (Creator) */}
                        <div className="bg-[#0D1117] border border-white/10 rounded-none p-8 flex flex-col justify-between relative transition-all duration-300 hover:border-[#10B981]/40 group">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white tracking-wide font-display">Creator</h3>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-1">
                                        STANDARD
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-6 font-mono">For growing creators & multi-format publishing.</p>
                                
                                <div className="mb-6 pb-6 border-b border-white/10">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-white">$9</span>
                                        <span className="text-sm font-mono text-slate-500">/ month</span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-[#10B981] flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>150 Credits / month</span>
                                    </div>
                                </div>

                                <ul className="space-y-3.5 text-sm text-slate-300 mb-8">
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>All Free features included</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Website & Text ingestion</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Standard script styles</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Free script refinements (0.5 credit cost)</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={() => handleUpgrade('standard')}
                                disabled={loadingTier === 'standard'}
                                className="w-full py-3.5 px-4 bg-transparent text-white font-mono text-xs font-bold tracking-widest uppercase border border-white/20 hover:border-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loadingTier === 'standard' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-[#10B981] rounded-none animate-spin" />
                                        <span>Launching Checkout...</span>
                                    </>
                                ) : (
                                    "Upgrade to Standard"
                                )}
                            </button>
                        </div>

                        {/* TIER 3: Pro Tier (Pro Creator - HIGHLIGHTED) */}
                        <div className="bg-gradient-to-b from-[#10B981]/15 via-[#0D1117] to-[#0D1117] border-2 border-[#10B981] rounded-none p-8 flex flex-col justify-between relative shadow-[0_0_35px_rgba(16,185,129,0.15)] group transform md:-translate-y-2 transition-all duration-300">
                            
                            {/* Most Popular Highlight Badge */}
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#10B981] to-emerald-400 text-[#080809] font-mono text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1 shadow-md">
                                ★ MOST POPULAR ★
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4 mt-2">
                                    <h3 className="text-xl font-bold text-white tracking-wide font-display">Pro Creator</h3>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#080809] bg-[#10B981] font-bold px-2.5 py-1">
                                        PRO TIER
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mb-6 font-mono">For serious content operations and maximum speed.</p>
                                
                                <div className="mb-6 pb-6 border-b border-[#10B981]/30">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-white">$29</span>
                                        <span className="text-sm font-mono text-slate-400">/ month</span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-[#10B981] flex items-center gap-1.5 font-bold">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>500+ Credits / month</span>
                                    </div>
                                </div>

                                <ul className="space-y-3.5 text-sm text-slate-200 mb-8">
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="font-medium text-white">Priority processing queue</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Pro Settings sliders (Tone & Detail depth)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Advanced derivative formats (X threads, Newsletters, etc.)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>0.5 credit cost refinements</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={() => handleUpgrade('pro')}
                                disabled={loadingTier === 'pro'}
                                className="w-full py-4 px-4 bg-[#10B981] text-[#080809] font-mono text-xs font-bold tracking-widest uppercase hover:bg-[#059669] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                            >
                                {loadingTier === 'pro' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#080809]/30 border-t-[#080809] rounded-none animate-spin" />
                                        <span>Launching Checkout...</span>
                                    </>
                                ) : (
                                    "Unlock Pro"
                                )}
                            </button>
                        </div>

                    </div>

                    {/* FAQ Accordion Section */}
                    <div className="max-w-4xl mx-auto pt-12 border-t border-white/10">
                        <div className="text-center mb-12">
                            <span className="font-mono text-xs text-[#10B981] uppercase tracking-widest">HELP & TRANSPARENCY</span>
                            <h2 className="text-3xl font-bold font-display text-white mt-2">Frequently Asked Questions</h2>
                        </div>

                        <div className="space-y-4">
                            {faqItems.map((item, index) => {
                                const isOpen = openFaqIndex === index;
                                return (
                                    <div
                                        key={index}
                                        className="bg-[#0D1117] border border-white/10 transition-colors duration-200"
                                    >
                                        <button
                                            onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                            className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                                        >
                                            <span className="text-base sm:text-lg font-semibold text-white font-sans">
                                                {item.question}
                                            </span>
                                            <span className="w-8 h-8 rounded-none bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-slate-400">
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#10B981]' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </span>
                                        </button>

                                        {isOpen && (
                                            <div className="px-6 pb-6 pt-0 text-slate-400 text-sm leading-relaxed border-t border-white/5 font-sans animate-fade-in">
                                                {item.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Authentication Prompt Modal for Unauthenticated Upgrades */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setShowAuthModal(false)}
                    />
                    <div className="relative bg-[#0D1117] border border-white/15 max-w-md w-full p-8 z-10 shadow-2xl">
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 rounded-none bg-[#10B981]/10 border border-[#10B981] flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white font-display uppercase tracking-wide">
                                Sign In Required
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">
                                Please log in or create an account to upgrade to the{' '}
                                <span className="text-[#10B981] font-bold uppercase">{selectedTierForAuth}</span> plan and initiate checkout.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <LoginButton />
                            <div className="relative flex items-center py-1">
                                <div className="flex-grow border-t border-white/10" />
                                <span className="flex-shrink-0 mx-3 text-[10px] font-mono text-slate-500 uppercase">Or email sign in</span>
                                <div className="flex-grow border-t border-white/10" />
                            </div>
                            <EmailAuthForm />
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
