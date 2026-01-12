import React, { useState } from 'react';

const Tooltip = ({ content, children, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);

    if (!content) return children;

    return (
        <div
            className={`relative flex items-center ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#1a1b26] text-white text-[10px] font-semibold tracking-wide rounded-md shadow-xl whitespace-nowrap z-[60] border border-white/10 pointer-events-none">
                    {content}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#1a1b26]"></div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
