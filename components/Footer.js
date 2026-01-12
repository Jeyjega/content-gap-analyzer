import Link from 'next/link';

export default function Footer({ isDark = true }) {
    // Always use dark theme as requested by user ("Dark theme, matching current site")
    // The props is kept for compatibility but we enforce the dark look for the footer
    // to ensure consistency with the requested "Dark, premium" aesthetic.

    const footerBg = "bg-[#030014]";
    const footerBorder = "border-white/5";
    const textPrimary = "text-slate-300";
    const textSecondary = "text-slate-500";
    const hoverText = "hover:text-white";
    const headingClass = "text-sm font-semibold text-white tracking-wide uppercase mb-4";

    return (
        <footer className={`${footerBg} border-t ${footerBorder} pt-16 pb-8 font-sans`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Main Grid: 5 Columns on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">

                    {/* Column 1: Brand & Authority */}
                    <div className="lg:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 group mb-6">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">
                                GapGens
                            </span>
                        </Link>
                        <p className={`text-sm ${textSecondary} leading-relaxed max-w-xs mb-4`}>
                            GapGens is an AI content analysis platform that identifies content gaps and generates transcript-grounded scripts for creators, educators, and strategists.
                        </p>
                        <p className={`text-xs ${textSecondary} font-medium`}>
                            Platform-aware derivative scripts for YouTube, Blogs, LinkedIn, and X.
                        </p>
                    </div>

                    {/* Column 2: Product */}
                    <div>
                        <h3 className={headingClass}>Product</h3>
                        <ul className="space-y-3 text-sm">
                            <li><FooterLink href="/how-it-works" text="How It Works" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/content-gap-analysis" text="Content Gap Analysis" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/ai-script-generator" text="AI Script Generator" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/interview-to-monologue" text="Interview to Monologue" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/supported-formats" text="Supported Formats" className={`${textPrimary} ${hoverText}`} /></li>
                        </ul>
                    </div>

                    {/* Column 3: Use Cases */}
                    <div>
                        <h3 className={headingClass}>Use Cases</h3>
                        <ul className="space-y-3 text-sm">
                            <li><FooterLink href="/youtube-creators" text="YouTube Creators" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/podcasts-interviews" text="Podcasts & Interviews" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/blogs-articles" text="Blogs & Articles" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/founders-educators" text="Founders & Educators" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/content-strategy-teams" text="Content Strategy Teams" className={`${textPrimary} ${hoverText}`} /></li>
                        </ul>
                    </div>

                    {/* Column 4: Resources */}
                    <div>
                        <h3 className={headingClass}>Resources</h3>
                        <ul className="space-y-3 text-sm">
                            <li><FooterLink href="/documentation" text="Documentation" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/methodology" text="Methodology" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/faq" text="FAQ" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/changelog" text="Changelog" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/contact-support" text="Contact / Support" className={`${textPrimary} ${hoverText}`} /></li>
                        </ul>
                    </div>

                    {/* Column 5: Company & Legal */}
                    <div>
                        <h3 className={headingClass}>Company</h3>
                        <ul className="space-y-3 text-sm">
                            <li><FooterLink href="/about" text="About GapGens" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/pricing" text="Pricing" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/privacy-policy" text="Privacy Policy" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/terms" text="Terms of Service" className={`${textPrimary} ${hoverText}`} /></li>
                            <li><FooterLink href="/cookie-policy" text="Cookie Policy" className={`${textPrimary} ${hoverText}`} /></li>
                        </ul>
                    </div>
                </div>

                {/* Footer Bottom Bar */}
                <div className={`pt-8 border-t ${footerBorder} flex flex-col md:flex-row justify-between items-center gap-4`}>
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <p className={`text-xs ${textSecondary}`}>
                            © {new Date().getFullYear()} GapGens. All rights reserved.
                        </p>
                        <span className="hidden md:block w-1 h-1 bg-slate-800 rounded-full"></span>
                        <p className={`text-xs ${textSecondary} flex items-center gap-1.5`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            AI-assisted. Transcript-grounded. No hallucinations.
                        </p>
                    </div>

                    {/* Optional Social Icons */}
                    <div className="flex items-center gap-4">
                        <SocialLink href="#" label="X / Twitter">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </SocialLink>
                        {/* GitHub - Only if public, adding placeholder for now as per design rules optional */}
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, text, className }) {
    return (
        <Link href={href} className={`transition-colors duration-200 ${className}`}>
            {text}
        </Link>
    );
}

function SocialLink({ href, children, label }) {
    return (
        <a
            href={href}
            className="text-slate-500 hover:text-white transition-colors duration-200"
            aria-label={label}
        >
            {children}
        </a>
    );
}
