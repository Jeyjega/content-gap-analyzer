import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import LogoutButton from '@/components/LogoutButton';

export default function Layout({ children, bgClass = "bg-slate-50", headerVariant = "light" }) {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const { user, loading } = useAuth();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path) => router.pathname === path;

    const handleScrollToTop = (e) => {
        if (router.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const isDarkHeader = headerVariant === 'dark';

    return (
        <div className={`min-h-screen flex flex-col font-sans ${bgClass} ${isDarkHeader ? 'text-white selection:bg-indigo-500/30 selection:text-indigo-200' : 'text-slate-900 selection:bg-indigo-100 selection:text-indigo-700'}`}>
            <header
                className={`
          fixed top-0 w-full z-50 transition-all duration-300 border-b
          ${scrolled
                        ? isDarkHeader
                            ? 'bg-[#030014]/80 backdrop-blur-xl border-white/10 shadow-lg shadow-black/5'
                            : 'bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-sm'
                        : 'bg-transparent border-transparent'}
        `}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group" onClick={handleScrollToTop}>
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className={`text-lg font-bold tracking-tight transition-colors ${isDarkHeader ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                            ContentGap
                        </span>
                    </Link>

                    <nav className={`hidden md:flex items-center gap-1 p-1 rounded-full border backdrop-blur-sm ${isDarkHeader ? 'bg-white/5 border-white/10' : 'bg-slate-100/50 border-slate-200/50'}`}>
                        <NavLink href="/" active={isActive('/')} onClick={handleScrollToTop} isDark={isDarkHeader}>Home</NavLink>
                        <NavLink href="/dashboard" active={isActive('/dashboard')} isDark={isDarkHeader}>Dashboard</NavLink>
                        <NavLink href="/history" active={isActive('/history')} isDark={isDarkHeader}>History</NavLink>
                    </nav>

                    <div className="flex items-center gap-4">
                        {!loading && (
                            user ? (
                                <div className="flex items-center gap-4">
                                    <div className={`text-sm font-medium ${isDarkHeader ? 'text-white' : 'text-slate-600'}`}>
                                        {user.email}
                                    </div>
                                    <LogoutButton />
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="hidden sm:inline-flex px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5"
                                >
                                    Log In
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow pt-24 pb-12">
                {children}
            </main>

            <footer className={`border-t py-12 ${isDarkHeader ? 'bg-[#030014] border-white/5 text-slate-400' : 'bg-white border-slate-100/60 text-slate-500'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isDarkHeader ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${isDarkHeader ? 'text-white' : 'text-slate-500'}`}>ContentGap Analyzer</span>
                        </div>
                        <div className={`flex gap-6 text-sm ${isDarkHeader ? 'text-slate-400' : 'text-slate-400'}`}>
                            <a href="#" className={`transition-colors ${isDarkHeader ? 'hover:text-white' : 'hover:text-slate-600'}`}>Privacy</a>
                            <a href="#" className={`transition-colors ${isDarkHeader ? 'hover:text-white' : 'hover:text-slate-600'}`}>Terms</a>
                            <a href="#" className={`transition-colors ${isDarkHeader ? 'hover:text-white' : 'hover:text-slate-600'}`}>Twitter</a>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <p className="text-xs opacity-70">
                                Secure. Your analyzed content always stays private.
                            </p>
                            <p className="text-xs">
                                © {new Date().getFullYear()} All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function NavLink({ href, active, children, onClick, isDark }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`
        px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
        ${active
                    ? isDark ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'bg-white text-slate-900 shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }
      `}
        >
            {children}
        </Link>
    );
}
