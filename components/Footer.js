import Link from 'next/link';

export default function Footer({ isDark = true }) {
    return (
        <footer className={`bg-[#080809] border-t border-dashed border-white/10 pt-8 pb-8 font-mono text-[10px] text-slate-500 uppercase tracking-widest`}>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 text-center md:text-left">
                        <span className="font-display text-white text-base font-bold tracking-tighter">GAPGENS</span>
                        <span className="md:border-l md:border-slate-800 md:pl-4">© {new Date().getFullYear()} GAPGENS. ALL RIGHTS RESERVED.</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                        <Link href="/#" className="hover:text-white hover:underline transition-colors">SECURITY PROTOCOL</Link>
                        <Link href="/documentation" className="hover:text-white hover:underline transition-colors">API DOCUMENTATION</Link>
                        <Link href="/#" className="hover:text-white hover:underline transition-colors">SYSTEM STATUS</Link>
                        <Link href="/terms" className="hover:text-white hover:underline transition-colors">TERMS OF ENGAGEMENT</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
