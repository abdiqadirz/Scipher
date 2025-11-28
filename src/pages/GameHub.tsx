import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Radio, ArrowRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export const GameHub: React.FC = () => {
    const navigate = useNavigate();

    const games = [
        {
            id: 'scipher',
            title: 'Scipher',
            description: 'The ultimate team word-guessing game. Describe, guess, and decode your way to victory.',
            icon: Brain,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            hoverBorder: 'group-hover:border-blue-500/50',
            hoverShadow: 'group-hover:shadow-blue-500/20',
            path: '/scipher'
        },
        {
            id: 'wavelength',
            title: 'Wavelength',
            description: 'A telepathic party game. Tune into your team\'s frequency and find the hidden target.',
            icon: Radio,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            hoverBorder: 'group-hover:border-rose-500/50',
            hoverShadow: 'group-hover:shadow-rose-500/20',
            path: '/wavelength'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />

            <div className="max-w-5xl w-full relative z-10 space-y-12">
                {/* Header */}
                <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-8 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400 text-sm font-medium mb-4 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <span>Multi-Game Platform</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                        CIPHER<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">SAY</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                        Choose your challenge. Test your communication.
                    </p>
                </div>

                {/* Game Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {games.map((game, idx) => (
                        <div
                            key={game.id}
                            onClick={() => navigate(game.path)}
                            className={clsx(
                                "group relative p-8 rounded-3xl border-2 cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-slate-900/50 backdrop-blur-xl flex flex-col gap-6 overflow-hidden",
                                game.border,
                                game.hoverBorder,
                                game.hoverShadow
                            )}
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            {/* Hover Gradient */}
                            <div className={clsx(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
                            )} />

                            <div className="flex items-start justify-between">
                                <div className={clsx("p-4 rounded-2xl", game.bg)}>
                                    <game.icon className={clsx("w-10 h-10", game.color)} />
                                </div>
                                <div className="p-2 rounded-full bg-slate-800/50 text-slate-500 group-hover:text-white group-hover:bg-slate-700 transition-colors">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-4xl font-black text-white tracking-tight">{game.title}</h2>
                                <p className="text-slate-400 text-lg leading-relaxed">{game.description}</p>
                            </div>

                            {/* Decorative Elements */}
                            <div className={clsx(
                                "absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40",
                                game.bg.replace('/10', '/30')
                            )} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-slate-600 text-sm font-mono">
                v0.2.0 • BETA
            </div>
        </div>
    );
};
