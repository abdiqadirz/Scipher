import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { TeamList } from '../components/TeamList';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { Room, Player, Message } from '../types';
import { GameBoard } from '../components/GameBoard';
import { Loader2, AlertTriangle } from 'lucide-react';
import { WORD_BANK } from '../lib/words';

export const GameRoom: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const playerId = localStorage.getItem('cipher_player_id');

    useEffect(() => {
        if (!roomId || !playerId) {
            navigate('/');
            return;
        }

        const fetchInitialData = async () => {
            try {
                // Fetch Room
                const { data: roomData, error: roomError } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', roomId)
                    .single();

                if (roomError) throw roomError;
                setRoom(roomData);

                // Fetch Players
                const { data: playersData, error: playersError } = await supabase
                    .from('players')
                    .select('*')
                    .eq('room_id', roomId);

                if (playersError) throw playersError;
                setPlayers(playersData || []);

                // Fetch Messages
                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (messagesError) throw messagesError;
                setMessages(messagesData || []);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        // Realtime Subscription
        const channel = supabase
            .channel(`room:${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                setRoom(payload.new as Room);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setPlayers(prev => [...prev, payload.new as Player]);
                } else if (payload.eventType === 'UPDATE') {
                    setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new as Player : p));
                } else if (payload.eventType === 'DELETE') {
                    setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, playerId, navigate]);

    const handleJoinTeam = async (team: 'neon' | 'cyber') => {
        if (!playerId) return;
        await supabase.from('players').update({ team }).eq('id', playerId);
    };

    const handleStartGame = async () => {
        if (!room) return;
        if (players.length === 0) {
            alert('Need at least 1 player to start!');
            return;
        }

        // Pick random first describer from Neon, but respect creation order for consistency
        // If Neon is empty (e.g. 1 player on Cyber), start with Cyber
        let startingTeam: 'neon' | 'cyber' = 'neon';
        let teamPlayers = players.filter(p => p.team === 'neon').sort((a, b) => a.created_at.localeCompare(b.created_at));

        if (teamPlayers.length === 0) {
            startingTeam = 'cyber';
            teamPlayers = players.filter(p => p.team === 'cyber').sort((a, b) => a.created_at.localeCompare(b.created_at));
        }

        // We pick a random starting index
        // We pick a random starting index
        const firstDescriberIndex = Math.floor(Math.random() * teamPlayers.length);
        const firstDescriber = teamPlayers[firstDescriberIndex];

        // Pick N random words
        const shuffledWords = [...WORD_BANK].sort(() => 0.5 - Math.random());
        const selectedWords = shuffledWords.slice(0, room.words_per_turn || 10);

        await supabase.from('rooms').update({
            status: 'playing',
            turn_team: startingTeam,
            turn_phase: 'ready', // Start in ready phase
            turn_describer_id: firstDescriber.id,
            turn_end_time: null, // Timer starts after confirmation
            current_words: selectedWords,
            last_updated: new Date().toISOString(),
            scores: {
                ...room.scores,
                neon_turn_index: startingTeam === 'neon' ? firstDescriberIndex : -1,
                cyber_turn_index: startingTeam === 'cyber' ? firstDescriberIndex : -1
            }
        }).eq('id', room.id);
    };

    const handleUpdateSettings = async (field: 'total_rounds' | 'round_length' | 'words_per_turn', value: number) => {
        if (!room) return;
        // Basic validation
        const safeValue = value < 1 ? 1 : value;
        await supabase.from('rooms').update({ [field]: safeValue }).eq('id', room.id);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="w-12 h-12 text-royal animate-spin" />
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                    <AlertTriangle className="w-16 h-16 text-red-500" />
                    <h2 className="text-2xl font-bold text-white">Error Loading Room</h2>
                    <p className="text-slate-400">{error}</p>
                    <Button onClick={() => navigate('/')}>Go Home</Button>
                </div>
            </Layout>
        );
    }

    if (!room) return null;

    const currentPlayer = players.find(p => p.id === playerId);
    const isHost = currentPlayer?.is_host;

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white">
                            ROOM <span className="text-royal font-mono">{room.id}</span>
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Status: <span className="uppercase font-bold text-gold">{room.status}</span>
                        </p>
                    </div>
                    {isHost && room.status === 'lobby' && (
                        <Button variant="gold" size="lg" onClick={handleStartGame}>
                            START GAME
                        </Button>
                    )}
                </div>

                {/* Lobby View */}
                {room.status === 'lobby' && (
                    <div className="space-y-8">
                        <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                            <h2 className="text-xl font-bold text-white mb-4">Game Settings</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                                {isHost ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-xs uppercase font-bold text-slate-500">Total Rounds</label>
                                            <Input
                                                type="number"
                                                value={room.total_rounds}
                                                onChange={(e) => handleUpdateSettings('total_rounds', parseInt(e.target.value) || 1)}
                                                className="h-9 text-sm font-mono"
                                                min={1}
                                                max={20}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs uppercase font-bold text-slate-500">Seconds per Turn</label>
                                            <Input
                                                type="number"
                                                value={room.round_length}
                                                onChange={(e) => handleUpdateSettings('round_length', parseInt(e.target.value) || 30)}
                                                className="h-9 text-sm font-mono"
                                                min={10}
                                                max={300}
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-xs uppercase font-bold text-slate-500">Words per Turn</label>
                                            <Input
                                                type="number"
                                                value={room.words_per_turn || 10}
                                                onChange={(e) => handleUpdateSettings('words_per_turn', parseInt(e.target.value) || 10)}
                                                className="h-9 text-sm font-mono"
                                                min={5}
                                                max={50}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>Rounds: <span className="text-white font-mono">{room.total_rounds}</span></div>
                                        <div>Round Length: <span className="text-white font-mono">{room.round_length}s</span></div>
                                        <div>Words/Turn: <span className="text-white font-mono">{room.words_per_turn || 10}</span></div>
                                    </>
                                )}
                            </div>
                        </div>

                        <TeamList
                            players={players}
                            currentUserId={playerId || ''}
                            onJoinTeam={handleJoinTeam}
                        />
                    </div>
                )}

                {/* Game View */}
                {room.status === 'playing' && (
                    <GameBoard
                        room={room}
                        players={players}
                        messages={messages}
                        currentUserId={playerId || ''}
                    />
                )}

                {/* Victory View */}
                {room.status === 'finished' && (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
                        <h2 className="text-6xl font-black text-white mb-4">GAME OVER</h2>

                        <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
                            <div className={`p-8 rounded-2xl border-2 ${room.scores.neon > room.scores.cyber ? 'border-gold bg-gold/10 shadow-[0_0_50px_rgba(251,191,36,0.3)] scale-110' : 'border-slate-700 bg-slate-800/50 opacity-50'}`}>
                                <h3 className="text-2xl font-bold text-gold mb-2">TEAM GOLD</h3>
                                <p className="text-6xl font-black text-white">{room.scores.neon}</p>
                                {room.scores.neon > room.scores.cyber && <p className="text-gold font-bold mt-4">WINNERS!</p>}
                            </div>

                            <div className={`p-8 rounded-2xl border-2 ${room.scores.cyber > room.scores.neon ? 'border-royal bg-royal/10 shadow-[0_0_50px_rgba(99,102,241,0.3)] scale-110' : 'border-slate-700 bg-slate-800/50 opacity-50'}`}>
                                <h3 className="text-2xl font-bold text-royal mb-2">TEAM ROYAL</h3>
                                <p className="text-6xl font-black text-white">{room.scores.cyber}</p>
                                {room.scores.cyber > room.scores.neon && <p className="text-royal font-bold mt-4">WINNERS!</p>}
                            </div>
                        </div>

                        <Button onClick={() => navigate('/')} size="lg" variant="primary">
                            Back to Lobby
                        </Button>

                        <div className="max-w-2xl mx-auto bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                            <h3 className="text-xl font-bold text-white p-4 border-b border-slate-700 bg-slate-800">Leaderboard</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-300">
                                        <tr>
                                            <th className="px-6 py-3">Player</th>
                                            <th className="px-6 py-3">Team</th>
                                            <th className="px-6 py-3 text-right">Words</th>
                                            <th className="px-6 py-3 text-right">Describer Pts</th>
                                            <th className="px-6 py-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {[...players].sort((a, b) => ((b.stats?.total_points || 0) - (a.stats?.total_points || 0))).map((player) => (
                                            <tr key={player.id} className="hover:bg-slate-800/50">
                                                <td className="px-6 py-4 font-medium text-white">{player.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${player.team === 'neon' ? 'bg-gold/20 text-gold' : 'bg-royal/20 text-royal'}`}>
                                                        {player.team === 'neon' ? 'Gold' : 'Royal'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">{player.stats?.words_guessed || 0}</td>
                                                <td className="px-6 py-4 text-right">{player.stats?.describer_points || 0}</td>
                                                <td className="px-6 py-4 text-right font-bold text-white">{player.stats?.total_points || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};
