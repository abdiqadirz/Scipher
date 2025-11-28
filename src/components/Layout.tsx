import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-cyber selection:text-slate-900 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-dark-bg to-dark-bg opacity-50" />
            <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col px-4 py-6 sm:max-w-2xl md:max-w-4xl">
                {children}
            </div>
        </div>
    );
};
