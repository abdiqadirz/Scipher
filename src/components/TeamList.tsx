import React from 'react';
import type { Player } from '../types';
import { User, Crown } from 'lucide-react';

interface TeamListProps {
    players: Player[];
    currentUserId: string;
    onJoinTeam: (team: 'neon' | 'cyber') => void;
}

export const TeamList: React.FC<TeamListProps> = ({ players, currentUserId, onJoinTeam }) => {
    const neonPlayers = players.filter(p => p.team === 'neon');
    const cyberPlayers = players.filter(p => p.team === 'cyber');
    const unassignedPlayers = players.filter(p => !p.team);

    const TeamColumn = ({ team, teamPlayers, colorClass, title }: { team: 'neon' | 'cyber', teamPlayers: Player[], colorClass: string, title: string }) => (
        <div className={`flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700 ${colorClass}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold uppercase tracking-wider">{title}</h3>
                <span className="text-sm font-mono opacity-70">{teamPlayers.length} Players</span>
            </div>

            <div className="space-y-2 mb-4">
                {teamPlayers.map(player => (
                    <div key={player.id} className="flex items-center space-x-2 bg-slate-900/50 p-2 rounded-lg">
                        {player.is_host ? <Crown className="w-4 h-4 text-yellow-400" /> : <User className="w-4 h-4 opacity-50" />}
                        <span className={player.id === currentUserId ? 'font-bold text-white' : 'text-slate-300'}>
                            {player.name} {player.id === currentUserId && '(You)'}
                        </span>
                    </div>
                ))}
                {teamPlayers.length === 0 && (
                    <div className="text-center py-4 text-slate-500 italic text-sm">No players yet</div>
                )}
            </div>

            <button
                onClick={() => onJoinTeam(team)}
                className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium"
            >
                Join {title}
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TeamColumn
                    team="neon"
                    teamPlayers={neonPlayers}
                    colorClass="border-gold/30 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                    title="Team Gold"
                />
                <TeamColumn
                    team="cyber"
                    teamPlayers={cyberPlayers}
                    colorClass="border-royal/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                    title="Team Royal"
                />
            </div>

            {unassignedPlayers.length > 0 && (
                <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-sm text-slate-400 mb-2">Spectators / Unassigned</h4>
                    <div className="flex flex-wrap gap-2">
                        {unassignedPlayers.map(player => (
                            <span key={player.id} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                                {player.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
