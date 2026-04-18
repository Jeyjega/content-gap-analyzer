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
                    </div>
                </div>
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
