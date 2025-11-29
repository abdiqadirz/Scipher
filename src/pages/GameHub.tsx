import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Radio, Sprout, ArrowRight, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { Layout } from '../components/Layout';

export const GameHub: React.FC = () => {
    const navigate = useNavigate();
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const games = [
        {
            id: 'scipher',
            title: 'SCIPHER',
            subtitle: 'DECRYPTION PROTOCOL',
            description: 'Collaborative linguistic decryption. Intercept and decode enemy transmissions.',
            icon: Brain,
            path: '/scipher',
            stats: { players: '4-12', time: '20m' }
        },
        {
            id: 'wavelength',
            title: 'WAVELENGTH',
            subtitle: 'FREQUENCY SYNC',
            description: 'Psychic spectrum alignment. Tune into the collective consciousness.',
            icon: Radio,
            path: '/wavelength',
            stats: { players: '2-10', time: '15m' }
        },
        {
            id: 'the_plant',
            title: 'THE PLANT',
            subtitle: 'SOCIAL INFILTRATION',
            description: 'Identify the anomaly. A high-stakes test of deception and deduction.',
            icon: Sprout,
            path: '/the-plant',
            stats: { players: '3-8', time: '30m' }
        }
    ];

    return (
        <Layout>
            <div className="h-full flex flex-col gap-8">

                {/* Header Section */}
                <div className="flex-none text-center space-y-2 pt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1 border border-accent/20 bg-accent/5 rounded-none clip-corner">
                        <Terminal className="w-3 h-3 text-accent" />
                        <span className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">Secure Access Terminal</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-highlight via-highlight/80 to-mid drop-shadow-2xl">
                        FUTURE <span className="text-accent">SHEIKHS</span>
                    </h1>
                </div>

                {/* Harmonic Accordion */}
                <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 pb-8">
                    {games.map((game) => {
                        const isHovered = hoveredId === game.id;
                        const isDimmed = hoveredId !== null && !isHovered;

                        return (
                            <div
                                key={game.id}
                                onMouseEnter={() => setHoveredId(game.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => navigate(game.path)}
                                className={clsx(
                                    "relative group cursor-pointer overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
                                    "border border-mid/30 bg-base/40 backdrop-blur-sm clip-corner",
                                    "flex flex-col justify-between p-8",
                                    isHovered ? "flex-[3] opacity-100 border-accent/50 bg-base/80" : "flex-[1] opacity-90 hover:opacity-100",
                                    isDimmed && "opacity-60 blur-[1px]"
                                )}
                            >
                                {/* Background Grid Effect */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(163,176,135,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(163,176,135,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                                {/* Hover Glow */}
                                <div className={clsx(
                                    "absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-[80px] transition-opacity duration-500",
                                    isHovered ? "opacity-20 bg-accent" : "opacity-0"
                                )}></div>

                                {/* Top Content */}
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className={clsx(
                                        "p-6 border border-mid/30 bg-base/50 transition-all duration-500 rounded-2xl flex items-center justify-center",
                                        isHovered ? "scale-110 border-accent/50 text-accent shadow-[0_0_30px_rgba(163,176,135,0.3)]" : "text-mid scale-100"
                                    )}>
                                        <game.icon className="w-16 h-16" />
                                    </div>
                                    <div className="font-mono text-xs text-mid tracking-widest">
                                        ID: {game.id.toUpperCase()}
                                    </div>
                                </div>

                                {/* Middle Content (Description - Only visible on hover/expand) */}
                                <div className={clsx(
                                    "relative z-10 space-y-4 transition-all duration-500 delay-100",
                                    isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 absolute bottom-20"
                                )}>
                                    <div className="h-[1px] w-12 bg-accent/50"></div>
                                    <p className="text-lg font-light leading-relaxed text-highlight/90 max-w-md">
                                        {game.description}
                                    </p>
                                    <div className="flex gap-4 font-mono text-xs text-accent/80">
                                        <span className="border border-accent/20 px-2 py-1">PLAYERS: {game.stats.players}</span>
                                        <span className="border border-accent/20 px-2 py-1">EST. TIME: {game.stats.time}</span>
                                    </div>
                                </div>

                                {/* Bottom Content */}
                                <div className="relative z-10 mt-auto pt-8">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="font-mono text-xs text-accent tracking-[0.2em] mb-1">{game.subtitle}</div>
                                            <h2 className={clsx(
                                                "font-orbitron font-black tracking-tighter transition-all duration-500",
                                                isHovered ? "text-5xl text-highlight" : "text-3xl text-mid group-hover:text-highlight/70"
                                            )}>
                                                {game.title}
                                            </h2>
                                        </div>

                                        <div className={clsx(
                                            "p-2 border border-accent/30 transition-all duration-300",
                                            isHovered ? "bg-accent text-base rotate-0" : "text-accent -rotate-45 opacity-0"
                                        )}>
                                            <ArrowRight className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
};
