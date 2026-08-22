import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import LogoutButton from '@/components/LogoutButton';
import UserMenu from '@/components/UserMenu';
import Footer from '@/components/Footer';

export default function Layout({ children, bgClass = "bg-slate-50", headerVariant = "light" }) {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, loading } = useAuth();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [router.pathname]);

    const isActive = (path) => router.pathname === path;

    const handleScrollToTop = (e) => {
        if (router.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const isDarkHeader = headerVariant === 'dark';

    return (
        <div className={`min-h-screen flex flex-col font-sans ${bgClass} ${isDarkHeader ? 'text-white selection:bg-[#10B981]/30 selection:text-white' : 'text-white selection:bg-[#10B981]/30 selection:text-white'}`}>
            <header
                className={`
          fixed top-0 w-full z-50 transition-all duration-300
          ${scrolled
                        ? 'bg-[#080809]/80 backdrop-blur-xl border-b border-white/5'
                        : 'bg-transparent border-b border-transparent'}
        `}
            >
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group" onClick={handleScrollToTop}>
                        <span className={`font-display text-xl font-bold tracking-tighter uppercase text-white transition-colors`}>
                            GapGens
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 px-8 py-2">
                        <NavLink href="/" isDark={true}>HOME</NavLink>
                        <NavLink href="/dashboard" isDark={true}>DASHBOARD</NavLink>
                        <NavLink href="/history" isDark={true}>HISTORY</NavLink>
                    </nav>

                    <div className="flex items-center gap-4">
                        {!loading && (
                            user ? (
                                <UserMenu user={user} isDarkHeader={true} />
                            ) : (
                                <Link
                                    href="/login"
                                    className="hidden sm:inline-flex px-6 py-2 bg-transparent text-[#10B981] font-mono text-xs font-bold tracking-widest border border-[#10B981]/30 hover:border-[#10B981] hover:bg-[#10B981]/10 transition-all"
                                    style={{ borderRadius: "0px" }}
                                >
                                    EXECUTE STRATEGY
                                </Link>
                            )
                        )}

                        {/* Mobile Menu Toggle Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden text-slate-400 hover:text-white focus:outline-none p-1.5 cursor-pointer flex items-center justify-center"
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-[#080809]/95 backdrop-blur-xl border-b border-white/5 px-4 pt-2 pb-4 space-y-1.5 flex flex-col z-40 w-full animate-fade-in">
                        <Link
                            href="/"
                            className={`px-3 py-2 font-mono text-xs tracking-widest uppercase hover:text-white transition-colors ${isActive('/') ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            HOME
                        </Link>
                        <Link
                            href="/dashboard"
                            className={`px-3 py-2 font-mono text-xs tracking-widest uppercase hover:text-white transition-colors ${isActive('/dashboard') ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            DASHBOARD
                        </Link>
                        <Link
                            href="/history"
                            className={`px-3 py-2 font-mono text-xs tracking-widest uppercase hover:text-white transition-colors ${isActive('/history') ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            HISTORY
                        </Link>
                        {!loading && !user && (
                            <Link
                                href="/login"
                                className="px-3 py-2 font-mono text-xs tracking-widest uppercase text-[#10B981] hover:bg-[#10B981]/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                EXECUTE STRATEGY
                            </Link>
                        )}
                    </div>
                )}
            </header>

            <main className="flex-grow pt-16">
                {children}
            </main>

            <Footer isDark={true} />
        </div>
    );
}

function NavLink({ href, children, isDark }) {
    return (
        <Link
            href={href}
            className={`
        text-xs font-mono tracking-widest transition-colors duration-200 uppercase
        text-slate-400 hover:text-white relative group
      `}
        >
            {children}
            <span className="absolute -bottom-2 left-0 w-full h-[1px] bg-[#10B981]/0 group-hover:bg-[#10B981] transition-colors"></span>
        </Link>
    );
}
