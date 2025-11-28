import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen w-full relative overflow-x-hidden">
            {/* Ambient Glows */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-royal/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

            {/* Content Container */}
            <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col px-4 py-6">
                {children}
            </div>
        </div>
    );
};
