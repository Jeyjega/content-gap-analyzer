import React from 'react';

export default function Card({ children, className = '', hover = false, ...props }) {
    return (
        <div
            className={`
        bg-white rounded-xl border border-slate-200/60 shadow-sm
        ${hover ? 'transition-all duration-300 hover:shadow-premium-hover hover:border-slate-300/80 hover:-translate-y-0.5' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}
