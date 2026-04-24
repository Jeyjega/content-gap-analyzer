import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";
import Link from "next/link";

export default function UpgradeBanner({
    title = "Unlock Premium Features",
    message = "Free limit reached. Upgrade to continue.",
    ctaText = "Upgrade Now",
    visible = false,
    onClose
}) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4"
                >
                    <div className="bg-[#0f111a] border border-[#10B981]/50 shadow-none rounded-none p-4 md:p-5 flex flex-col sm:flex-row items-center gap-5 backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden group">

                        {/* Glossy Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/10 via-transparent to-[#10B981]/5 opacity-50 pointer-events-none"></div>

                        {/* Icon */}
                        <div className="w-12 h-12 rounded-none bg-[#10B981]/10 flex items-center justify-center flex-shrink-0 text-[#10B981] border border-[#10B981]/30 shadow-none">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>

                        {/* Content */}
                        <div className="flex-1 text-center sm:text-left min-w-0">
                            <h4 className="text-[#10B981] font-mono text-xs uppercase tracking-widest mb-1">{title}</h4>
                            <p className="text-slate-400 text-xs font-mono uppercase tracking-wider leading-relaxed truncate-2-lines">{message}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
                            <Link href="/pricing" className="w-full sm:w-auto">
                                <Button variant="primary" className="w-full sm:w-auto shadow-none font-mono text-[10px]">
                                    {ctaText}
                                </Button>
                            </Link>

                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-none hover:bg-white/5 text-slate-500 hover:text-white transition-colors border border-transparent hover:border-white/5"
                                aria-label="Dismiss"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
