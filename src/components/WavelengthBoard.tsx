import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface WavelengthBoardProps {
    targetPercent: number; // 0-100 (Where the 4 is)
    dialPercent: number;   // 0-100 (Where the player is pointing)
    onChange?: (percent: number) => void;
    revealed: boolean;
    disabled?: boolean;
    leftLabel: string;
    rightLabel: string;
}

export const WavelengthBoard: React.FC<WavelengthBoardProps> = ({
    targetPercent,
    dialPercent,
    onChange,
    revealed,
    disabled,
    leftLabel,
    rightLabel
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        setIsDragging(true);
        updateDial(e);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        updateDial(e);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const updateDial = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

        // Calculate angle relative to center bottom
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.bottom;

        const deltaX = clientX - centerX;
        const deltaY = centerY - (('touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY));

        // Angle in radians (0 is straight up, -PI/2 is left, PI/2 is right)
        // Actually, let's map 0-100% to -90deg to +90deg

        // Using atan2 to get angle from horizontal right
        // We want 0% -> 180deg (Left), 50% -> 90deg (Up), 100% -> 0deg (Right)
        // Math.atan2(y, x) returns angle in radians

        let angleRad = Math.atan2(deltaY, deltaX);
        let angleDeg = angleRad * (180 / Math.PI);

        // Clamp to 0-180 range (0 is right, 180 is left)
        if (angleDeg < 0) angleDeg = 0;
        if (angleDeg > 180) angleDeg = 180;

        // Convert to percent (180deg = 0%, 0deg = 100%)
        const percent = 100 - (angleDeg / 180 * 100);

        if (onChange) onChange(percent);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    // Convert percent to degrees for rotation (-90 to 90)
    const getRotation = (p: number) => (p / 100) * 180 - 90;

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto select-none">
            {/* Labels */}
            <div className="flex justify-between w-full text-2xl font-black uppercase tracking-tight">
                <div className="bg-slate-800/80 px-6 py-3 rounded-2xl border-2 border-slate-700 text-cyan-400 shadow-lg backdrop-blur-sm max-w-[40%] text-center">
                    {leftLabel}
                </div>
                <div className="bg-slate-800/80 px-6 py-3 rounded-2xl border-2 border-slate-700 text-orange-400 shadow-lg backdrop-blur-sm max-w-[40%] text-center">
                    {rightLabel}
                </div>
            </div>

            {/* The Board */}
            <div
                ref={containerRef}
                className="relative w-full aspect-[2/1] overflow-hidden rounded-t-full bg-[#0a0a0a] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-8 border-slate-900"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
            >
                {/* Spectrum (Hidden unless revealed or describer) */}
                <div
                    className={clsx(
                        "absolute inset-0 transition-opacity duration-1000 origin-bottom",
                        revealed ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                        transform: `rotate(${getRotation(targetPercent)}deg)`
                    }}
                >
                    <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
                        <defs>
                            <mask id="wedge-mask">
                                <rect x="0" y="0" width="200" height="100" fill="white" />
                            </mask>
                            <linearGradient id="gold-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ca8a04" />
                                <stop offset="100%" stopColor="#854d0e" />
                            </linearGradient>
                            <linearGradient id="orange-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ea580c" />
                                <stop offset="100%" stopColor="#c2410c" />
                            </linearGradient>
                            <linearGradient id="cyan-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0891b2" />
                                <stop offset="100%" stopColor="#0e7490" />
                            </linearGradient>
                        </defs>
                        <g transform="translate(100, 100) rotate(-90)">
                            {/* Outer (2pts) - Darker Gold */}
                            <path d="M0,0 L100,-35 A100,100 0 0,1 100,35 Z" fill="url(#gold-gradient)" transform="rotate(0)" />

                            {/* Inner (3pts) - Darker Orange */}
                            <path d="M0,0 L100,-20 A100,100 0 0,1 100,20 Z" fill="url(#orange-gradient)" />

                            {/* Center (4pts) - Darker Cyan */}
                            <path d="M0,0 L100,-8 A100,100 0 0,1 100,8 Z" fill="url(#cyan-gradient)" />

                            {/* Text Labels */}
                            <text x="85" y="0" fill="rgba(255,255,255,0.9)" fontSize="10" fontWeight="900" textAnchor="middle" alignmentBaseline="middle" transform="rotate(0)">4</text>
                            <text x="85" y="-14" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" transform="rotate(0)">3</text>
                            <text x="85" y="14" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" transform="rotate(0)">3</text>
                            <text x="85" y="-28" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" transform="rotate(0)">2</text>
                            <text x="85" y="28" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" transform="rotate(0)">2</text>
                        </g>
                    </svg>
                </div>

                {/* Cover (if not revealed) */}
                {!revealed && (
                    <div className="absolute inset-0 bg-[#111] opacity-100 z-10 flex items-center justify-center">
                        <div className="text-slate-700 font-mono text-sm uppercase tracking-widest mt-20">
                            Target Hidden
                        </div>
                    </div>
                )}

                {/* Dial Pointer */}
                <div
                    className={clsx(
                        "absolute bottom-0 left-1/2 w-2 h-[90%] bg-red-600 origin-bottom rounded-t-full shadow-xl transition-transform duration-75 z-20",
                        disabled ? "cursor-not-allowed opacity-80" : "cursor-grab active:cursor-grabbing"
                    )}
                    style={{
                        transform: `translateX(-50%) rotate(${getRotation(dialPercent)}deg)`
                    }}
                >
                    {/* Dial Head */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-12 bg-red-500 rounded-full" />
                </div>

                {/* Hub */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-32 h-32 bg-red-700 rounded-full shadow-2xl z-30 border-4 border-red-800 flex items-center justify-center">
                    <div className="w-20 h-20 bg-red-600 rounded-full shadow-inner" />
                </div>
            </div>
        </div>
    );
};
