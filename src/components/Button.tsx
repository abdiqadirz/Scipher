import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'gold' | 'royal' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-slate-700 hover:bg-slate-600 text-white',
            gold: 'bg-gold hover:bg-gold-600 text-slate-900 font-bold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:shadow-[0_0_25px_rgba(251,191,36,0.7)] border border-gold-glow/20',
            royal: 'bg-royal hover:bg-royal-500 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.7)] border border-royal-glow/20',
            ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
            danger: 'bg-red-500 hover:bg-red-600 text-white',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-base',
            lg: 'px-6 py-3 text-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
