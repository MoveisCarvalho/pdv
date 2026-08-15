'use client';

import React, { useState } from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
    const [show, setShow] = useState(false);

    const toggleTooltip = () => {
        setShow(!show);
    };

    return (
        <div className="relative inline-block" onMouseLeave={() => setShow(false)}>
            <div
                onMouseEnter={() => setShow(true)}
                onClick={toggleTooltip}
                className="cursor-pointer inline-flex items-center"
            >
                {children}
            </div>
            {show && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none transition-all duration-200">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                </div>
            )}
        </div>
    );
}