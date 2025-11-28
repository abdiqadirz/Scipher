import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Radio, ArrowRight, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import { Layout } from '../components/Layout';

export const GameHub: React.FC = () => {
    const navigate = useNavigate();

    const games = [
        {
            id: 'scipher',
            title: 'SCIPHER',
            description: 'The ultimate team word-guessing game. Decode the message.',
            icon: Brain,
            color: 'text-gold',
            gradient: 'from-gold to-gold-dark',
            border: 'border-gold/20',
            shadow: 'shadow-gold/10',
            path: '/scipher'
        },
        {
            id: 'wavelength',
            title: 'WAVELENGTH',
            description: 'Tune into your team\'s frequency. Find the hidden target.',
            icon: Radio,
            color: 'text-royal-light',
            gradient: 'from-royal-light to-royal',
            border: 'border-royal/20',
            shadow: 'shadow-royal/10',
            path: '/wavelength'
        }
    ];

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-16">

                {/* Hero Section */}
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-gold text-sm font-bold tracking-widest uppercase backdrop-blur-md shadow-lg animate-float">
                        <Crown className="w-4 h-4" />
                        <span>Premium Game Suite</span>
                    </div>

                    <div className="relative">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-silver-light to-silver drop-shadow-2xl">
                            CIPHER<span className="text-gold">SAY</span>
                        </h1>
                        <div className="absolute -inset-10 bg-gold/20 blur-[100px] -z-10 animate-pulse-slow" />
                    </div>

                    <p className="text-xl text-silver max-w-2xl mx-auto font-light tracking-wide leading-relaxed">
                        Elevate your game night with our collection of <span className="text-gold font-medium">luxury social experiences</span>.
                    </p>
                </div>

                {/* Game Cards */}
                <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
                    {games.map((game, idx) => (
                        <div
                            key={game.id}
                            onClick={() => navigate(game.path)}
                            className={clsx(
                                "group relative p-10 rounded-[2rem] border cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] flex flex-col gap-8 overflow-hidden glass-panel",
                                game.border,
                                "hover:border-white/20"
                            )}
                            style={{ animationDelay: `${idx * 200}ms` }}
                        >
                            {/* Hover Gradient Overlay */}
                            <div className={clsx(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br pointer-events-none",
                                game.id === 'scipher' ? "from-gold/10 via-transparent to-transparent" : "from-royal/10 via-transparent to-transparent"
                            )} />

                            <div className="flex items-start justify-between relative z-10">
                                <div className={clsx(
                                    "p-5 rounded-2xl bg-gradient-to-br shadow-lg group-hover:shadow-2xl transition-all duration-500",
                                    game.gradient
                                )}>
                                    <game.icon className="w-12 h-12 text-obsidian" />
                                </div>
                                <div className="p-3 rounded-full bg-white/5 text-silver group-hover:text-white group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/20">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <h2 className={clsx("text-5xl font-black tracking-tighter", game.color)}>
                                    {game.title}
                                </h2>
                                <p className="text-silver text-lg font-light leading-relaxed">
                                    {game.description}
                                </p>
                            </div>

                            {/* Decorative Glow */}
                            <div className={clsx(
                                "absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20 transition-opacity duration-500 group-hover:opacity-40",
                                game.id === 'scipher' ? "bg-gold" : "bg-royal"
                            )} />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-silver/30 text-xs font-mono tracking-[0.2em] uppercase">
                    Designed for Excellence
                </div>
            </div>
        </Layout>
    );
};
