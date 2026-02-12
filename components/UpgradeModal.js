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
            <div className="relative bg-[#0b0c15] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">

                {/* Header Graphic / Icon (Optional decorative element) */}
                <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <div className="p-8">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/5 mx-auto">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <h3 className="text-2xl font-display font-medium text-white mb-4 text-center leading-tight">
                        {headline}
                    </h3>

                    <div className="bg-white/5 rounded-xl p-5 border border-white/5 mb-8">
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
                            variant="gradient"
                            className="w-full text-lg shadow-lg shadow-indigo-500/20 py-3"
                            onClick={() => {
                                window.location.href = '/pricing'; // Or handling via router if preferred
                            }}
                        >
                            {primaryActionText}
                        </Button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-sm text-slate-500 hover:text-white transition-colors font-medium"
                        >
                            {secondaryActionText}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
