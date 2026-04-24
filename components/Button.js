import React from 'react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled,
    ...props
}) {
    const baseStyles = "inline-flex items-center justify-center rounded-none font-mono text-xs uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
        primary: "bg-[#10B981] text-[#080809] hover:bg-[#059669] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-[#10B981]",
        secondary: "bg-[#080809] text-white hover:bg-white/10 hover:text-[#10B981] border border-white/20 hover:border-[#10B981]/50 shadow-none",
        outline: "border border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10 shadow-none",
        ghost: "text-slate-400 hover:text-white hover:bg-white/10 border border-transparent shadow-none",
        danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 shadow-none",
        gradient: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/20 shadow-none",
        white: "bg-white text-[#080809] hover:bg-gray-200 border border-transparent shadow-none"
    };

    const sizes = {
        sm: "px-4 py-2",
        md: "px-6 py-3",
        lg: "px-8 py-4",
        xl: "px-10 py-5"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}
