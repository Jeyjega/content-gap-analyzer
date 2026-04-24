import React from 'react';

export default function Card({ children, className = '', hover = false, ...props }) {
    return (
        <div
            className={`
        bg-[#111827]/80 backdrop-blur-md rounded-none border border-white/10 shadow-none
        ${hover ? 'transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-[#10B981]/50 hover:-translate-y-0.5' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}
