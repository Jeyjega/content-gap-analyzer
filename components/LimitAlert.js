import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from './Button';

export default function LimitAlert({ error, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (error) {
            setVisible(true);
            // Auto-dismiss after 8 seconds if it's not an upgrade prompt
            if (!error.upgrade) {
                const timer = setTimeout(() => {
                    handleClose();
                }, 8000);
                return () => clearTimeout(timer);
            }
        }
    }, [error]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for fade out
    };



    // Key handle for accessibility
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') handleClose();
    };

    useEffect(() => {
        if (visible) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [visible]);

    if (!error) return null;

    return (
        <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 pointer-events-none transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
        >
            <div className="bg-[#0f111a] border border-[#10B981]/50 shadow-none rounded-none p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 pointer-events-auto backdrop-blur-xl ring-1 ring-white/5">

                {/* Icon */}
                <div className={`w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0 ${error.upgrade ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
                    }`}>
                    {error.upgrade ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-[#10B981] font-mono text-xs tracking-widest uppercase mb-1">
                        {error.upgrade ? "Unlock Premium Features" : "Action Failed"}
                    </h4>
                    <p className="text-slate-400 text-xs font-mono uppercase tracking-wider leading-relaxed">
                        {error.message || "An unexpected error occurred."}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-center">
                    {error.upgrade && (
                        <Link href="/pricing" className="w-full md:w-auto">
                            <Button size="sm" variant="primary" className="w-full md:w-auto !py-2 shadow-none font-mono text-[10px] uppercase">
                                Upgrade Now
                            </Button>
                        </Link>
                    )}

                    <button
                        onClick={handleClose}
                        className="p-2 rounded-none hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
