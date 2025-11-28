import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'gold' | 'royal' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-obsidian-light border border-white/10 text-white hover:bg-white/5 hover:border-white/20 shadow-lg hover:shadow-white/5',
            gold: 'bg-gradient-to-br from-gold to-gold-dark text-obsidian font-black border border-gold-light/50 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:scale-[1.02]',
            royal: 'bg-gradient-to-br from-royal-light to-royal-dark text-white font-black border border-royal-light/50 shadow-[0_0_20px_rgba(75,0,130,0.5)] hover:shadow-[0_0_30px_rgba(75,0,130,0.7)] hover:scale-[1.02]',
            ghost: 'bg-transparent hover:bg-white/5 text-silver hover:text-white border border-transparent hover:border-white/5',
            danger: 'bg-red-900/50 border border-red-500/50 text-red-200 hover:bg-red-900/80 hover:border-red-400',
            outline: 'bg-transparent border border-white/10 text-silver hover:border-white/30 hover:text-white hover:bg-white/5'
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm rounded-lg',
            md: 'px-5 py-2.5 text-base rounded-xl',
            lg: 'px-8 py-4 text-lg rounded-2xl',
            xl: 'px-10 py-5 text-xl rounded-2xl'
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'relative overflow-hidden transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {/* Shine effect for gold/royal buttons */}
                {(variant === 'gold' || variant === 'royal') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-shimmer" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {props.children}
                </span>
            </button>
        );
    }
);
