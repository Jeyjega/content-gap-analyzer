import React, { useEffect } from 'react';
import Button from './Button';

/**
 * Context-Aware Upgrade Modal
 * Replaces generic alerts with a targeted upsell.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to close the modal
 * @param {string} headline - Main title (context-aware)
 * @param {Array<string>} bullets - List of benefits/reasons
 * @param {string} primaryActionText - Text for the upgrade button
 * @param {string} secondaryActionText - Text for the cancel button
 */
export default function UpgradeModal({
    isOpen,
    onClose,
    headline = "Upgrade to Pro",
    bullets = [],
    primaryActionText = "Upgrade to Pro",
    secondaryActionText = "Maybe later"
}) {

    // Prevent background scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#0b0c15] border border-[#10B981] rounded-none shadow-[0_0_50px_rgba(16,185,129,0.1)] max-w-md w-full overflow-hidden animate-scale-in">

                {/* Header Graphic / Icon (Optional decorative element) */}
                <div className="h-2 bg-[#10B981]"></div>

                <div className="p-8">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-none bg-[#10B981]/10 flex items-center justify-center mb-6 border border-[#10B981] mx-auto">
                        <svg className="w-6 h-6 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-mono tracking-widest uppercase text-white mb-4 text-center leading-tight">
                        {headline}
                    </h3>

                    <div className="bg-[#080809] rounded-none p-5 border border-[#10B981]/30 mb-8">
                        <ul className="space-y-3">
                            {bullets.length > 0 ? (
                                bullets.map((txt, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{txt}</span>
                                    </li>
                                ))
                            ) : (
                                <>
                                    <li className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Analyze unlimited videos & articles</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Unlock Blog, LinkedIn & X formats</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Generate detailed content strategies</span>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <Button
                            variant="primary"
                            className="w-full text-xs shadow-none py-3"
                            onClick={() => {
                                window.location.href = '/pricing'; // Or handling via router if preferred
                            }}
                        >
                            {primaryActionText}
                        </Button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-xs font-mono tracking-widest uppercase text-slate-500 hover:text-white transition-colors"
                        >
                            {secondaryActionText}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
