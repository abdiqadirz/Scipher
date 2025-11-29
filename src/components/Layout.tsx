import React from 'react';
import { Activity, Wifi } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="h-screen w-screen overflow-hidden relative bg-base text-highlight font-rajdhani selection:bg-accent selection:text-base">

            {/* HUD: Top Bar */}
            <div className="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-8 z-50 pointer-events-none border-b border-mid/30 bg-base/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                    <span className="font-mono text-xs text-accent tracking-[0.2em]">SYSTEM.ONLINE</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-mid">
                        <Wifi className="w-4 h-4" />
                        <span className="font-mono text-xs">NET.SECURE</span>
                    </div>
                    <div className="h-4 w-[1px] bg-mid/50"></div>
                    <div className="font-orbitron text-sm tracking-widest text-highlight/80">KINETIC ARCHIVE v4.0</div>
                </div>
            </div>

            {/* HUD: Decorative Corners */}
            <div className="absolute top-20 left-8 w-8 h-8 border-l-2 border-t-2 border-accent/50 pointer-events-none"></div>
            <div className="absolute top-20 right-8 w-8 h-8 border-r-2 border-t-2 border-accent/50 pointer-events-none"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-accent/50 pointer-events-none"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-r-2 border-b-2 border-accent/50 pointer-events-none"></div>

            {/* HUD: Side Lines */}
            <div className="absolute top-1/2 left-8 -translate-y-1/2 h-32 w-[1px] bg-gradient-to-b from-transparent via-mid to-transparent pointer-events-none"></div>
            <div className="absolute top-1/2 right-8 -translate-y-1/2 h-32 w-[1px] bg-gradient-to-b from-transparent via-mid to-transparent pointer-events-none"></div>

            {/* Main Content Area */}
            <main className="relative z-10 h-full w-full flex items-center justify-center p-8 pt-24">
                <div className="w-full max-w-7xl h-full flex flex-col">
                    {children}
                </div>
            </main>

            {/* HUD: Bottom Status */}
            <div className="absolute bottom-0 left-0 w-full h-12 flex items-center justify-between px-12 z-50 pointer-events-none text-[10px] font-mono text-mid uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-accent" />
                    <span>Memory: OPTIMAL</span>
                </div>
                <div>
                    SECURE CONNECTION ESTABLISHED
                </div>
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[60] bg-[length:100%_2px,3px_100%] opacity-20"></div>
        </div>
    );
};
