import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase, deviceId } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserMenu({ user, isDarkHeader }) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const menuRef = useRef(null);

    const handleLogout = async () => {
        try {
            // 1. Unregister device session (best-effort)
            if (deviceId) {
                await fetch('/api/session/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_id: deviceId }),
                });
            }

            // 2. Global Supabase SignOut
            await supabase.auth.signOut({ scope: 'global' });
        } catch (error) {
            console.error('Error logging out:', error);
        } finally {
            // 3. Clear all local state (Critical for Safari/Brave)
            localStorage.clear();
            sessionStorage.clear();

            // 4. Force hard reload to clear memory/caches
            window.location.replace('/');
        }
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const firstLetter = user?.email ? user.email[0].toUpperCase() : '?';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm transition-transform active:scale-95
          ${isDarkHeader
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20'
                        : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-md ring-1 ring-slate-900/10'}
        `}
            >
                {firstLetter}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`
              absolute right-0 mt-3 w-64 rounded-xl shadow-2xl overflow-hidden border z-50 origin-top-right
              ${isDarkHeader ? 'bg-[#0f172a]/95 border-white/10 backdrop-blur-xl' : 'bg-white/95 border-slate-200 backdrop-blur-xl'}
            `}
                    >
                        <div className={`p-4 border-b ${isDarkHeader ? 'border-white/5' : 'border-slate-100'}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkHeader ? 'text-indigo-400' : 'text-slate-500'}`}>Signed in as</p>
                            <p className={`text-sm truncate font-medium ${isDarkHeader ? 'text-gray-200' : 'text-slate-900'}`}>{user.email}</p>
                        </div>

                        <button
                            onClick={handleLogout}
                            className={`w-full text-left px-4 py-3 flex items-center gap-2.5 text-sm transition-colors group
                  ${isDarkHeader ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
                        >
                            <svg className={`w-4 h-4 transition-colors ${isDarkHeader ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
