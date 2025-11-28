import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Room, Player, Team } from '../types';
import { WavelengthBoard } from '../components/WavelengthBoard';
import { Button } from '../components/Button';
import { WAVELENGTH_CARDS } from '../lib/wavelength_cards';
import { Crown, ArrowRight, Check, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { clsx } from 'clsx';
import { Layout } from '../components/Layout';

export const WavelengthRoom: React.FC = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showNeonPlayers, setShowNeonPlayers] = useState(false);
    const [showCyberPlayers, setShowCyberPlayers] = useState(false);

    // Throttling for dial updates
    const lastUpdateRef = useRef<number>(0);

    useEffect(() => {
        const storedId = localStorage.getItem('cipher_player_id');
        if (storedId) setCurrentUserId(storedId);

        if (!roomId) return;

        // Fetch initial data
        const fetchData = async () => {
            const { data: roomData } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();

            if (roomData) setRoom(roomData);

            const { data: playersData } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', roomId);

            if (playersData) setPlayers(playersData);
        };

        fetchData();

        // Subscribe to changes
        const channel = supabase
            .channel(`room:${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                (payload) => setRoom(payload.new as Room)
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
                () => fetchData() // Refetch players on change
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const currentPlayer = players.find(p => p.id === currentUserId);
    const isDescriber = room?.turn_describer_id === currentUserId;
    const isMyTeamTurn = room?.turn_team === currentPlayer?.team;
    const isGuesser = isMyTeamTurn && !isDescriber;

    // Timer Logic
    useEffect(() => {
        if (!room?.turn_end_time || room.wavelength_state?.revealed) {
            setTimeLeft(room?.round_length || 60);
            return;
        }

        const interval = setInterval(() => {
            const end = new Date(room.turn_end_time!).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, Math.ceil((end - now) / 1000));

            setTimeLeft(diff);

            if (diff === 0 && isDescriber && !room.wavelength_state?.revealed) {
                handleReveal();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [room?.turn_end_time, room?.wavelength_state?.revealed, isDescriber, room?.round_length]);

    // Start Timer on Load if not started
    useEffect(() => {
        if (isDescriber && room && !room.turn_end_time && !room.wavelength_state?.revealed) {
            supabase.from('rooms').update({
                turn_end_time: new Date(Date.now() + (room.round_length || 60) * 1000).toISOString(),
            }).eq('id', room.id).then();
        }
    }, [isDescriber, room?.id, room?.turn_end_time]);

    // Dial Update Logic
    const handleDialChange = async (percent: number) => {
        if (!room || !isGuesser || room.wavelength_state?.revealed) return;

        const now = Date.now();
        if (now - lastUpdateRef.current > 50) { // Max 20 updates per second
            lastUpdateRef.current = now;
            await supabase.from('rooms').update({
                wavelength_state: {
                    ...room.wavelength_state,
                    dial_percent: percent
                }
            }).eq('id', room.id);
        }
    };

    const handleReveal = async () => {
        if (!room || !room.wavelength_state) return;

        const target = room.wavelength_state.target_percent;
        const dial = room.wavelength_state.dial_percent;
        const diff = Math.abs(target - dial);

        // Scoring Logic
        let points = 0;
        if (diff <= 5) points = 4;
        else if (diff <= 12) points = 3;
        else if (diff <= 20) points = 2;

        const newScores = {
            ...room.scores,
            [room.turn_team]: room.scores[room.turn_team] + points
        };

        if (points === 4) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }

        await supabase.from('rooms').update({
            scores: newScores,
            wavelength_state: {
                ...room.wavelength_state,
                revealed: true
            },
            turn_end_time: null // Clear timer
        }).eq('id', room.id);
    };

    const handleNextRound = async () => {
        if (!room) return;

        // Switch teams
        let nextTeam: Team = room.turn_team === 'neon' ? 'cyber' : 'neon';
        let nextTeamPlayers = players.filter(p => p.team === nextTeam);

        if (nextTeamPlayers.length === 0) {
            nextTeam = room.turn_team; // Stay same team if other empty
            nextTeamPlayers = players.filter(p => p.team === nextTeam);
        }

        // Rotate Describer
        let nextIndex = 0;
        if (nextTeam === 'neon') {
            const currentIndex = room.scores.neon_turn_index ?? -1;
            nextIndex = (currentIndex + 1) % nextTeamPlayers.length;
        } else {
            const currentIndex = room.scores.cyber_turn_index ?? -1;
            nextIndex = (currentIndex + 1) % nextTeamPlayers.length;
        }

        const nextDescriber = nextTeamPlayers[nextIndex];

        // New Card & Target
        const randomCard = WAVELENGTH_CARDS[Math.floor(Math.random() * WAVELENGTH_CARDS.length)];
        const randomTarget = Math.random() * 100;

        // Update Room
        await supabase.from('rooms').update({
            turn_team: nextTeam,
            turn_describer_id: nextDescriber?.id,
            current_round: room.current_round + 1,
            turn_end_time: null, // Reset timer
            scores: {
                ...room.scores,
                [nextTeam === 'neon' ? 'neon_turn_index' : 'cyber_turn_index']: nextIndex
            },
            wavelength_state: {
                target_percent: randomTarget,
                dial_percent: 50,
                spectrum_card: randomCard,
                revealed: false
            }
        }).eq('id', room.id);
    };

    const handleJoinTeam = async (team: Team) => {
        if (!currentUserId) return;
        await supabase.from('players').update({ team }).eq('id', currentUserId);
    };

    if (!room) return <div className="min-h-screen bg-obsidian flex items-center justify-center text-white font-mono animate-pulse">Initializing...</div>;

    // Lobby View (if no team selected)
    if (currentPlayer && !currentPlayer.team) {
        return (
            <Layout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center gap-12">
                    <div className="text-center space-y-4 relative">
                        <div className="absolute top-0 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 -translate-y-16 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-royal-light uppercase tracking-widest">Room Code</span>
                            <div className="text-2xl font-mono font-black text-white tracking-widest bg-royal/20 px-4 py-2 rounded-lg border border-royal/30">
                                {room.id}
                            </div>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tight">Select Your Allegiance</h1>
                        <p className="text-silver text-lg font-light">Choose a team to begin the game.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                        <Button
                            onClick={() => handleJoinTeam('neon')}
                            className="h-48 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 hover:border-gold text-gold hover:bg-gold/20 transition-all duration-500 group"
                        >
                            <div className="p-4 rounded-full bg-gold/10 group-hover:scale-110 transition-transform">
                                <Crown className="w-12 h-12" />
                            </div>
                            <span className="text-2xl font-black tracking-widest">TEAM GOLD</span>
                        </Button>
                        <Button
                            onClick={() => handleJoinTeam('cyber')}
                            className="h-48 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-royal/20 to-royal/5 border border-royal/30 hover:border-royal text-royal-light hover:bg-royal/20 transition-all duration-500 group"
                        >
                            <div className="p-4 rounded-full bg-royal/10 group-hover:scale-110 transition-transform">
                                <Sparkles className="w-12 h-12" />
                            </div>
                            <span className="text-2xl font-black tracking-widest">TEAM ROYAL</span>
                        </Button>
                    </div>
                </div>
            </Layout>
        );
    }

    const neonPlayers = players.filter(p => p.team === 'neon');
    const cyberPlayers = players.filter(p => p.team === 'cyber');

    return (
        <Layout>
            <div className="flex flex-col h-full min-h-[90vh]">
                {showConfetti && <Confetti numberOfPieces={200} recycle={false} colors={['#d4af37', '#f1c40f', '#ffffff']} />}

                {/* Header */}
                <div className="flex justify-between items-center mb-8 glass-panel p-4 rounded-2xl relative">
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs tracking-widest uppercase">
                            Exit
                        </Button>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-2 text-silver font-mono text-sm">
                            <span className="text-white font-bold">ROUND {room.current_round}</span>
                            <span className="opacity-50">/</span>
                            <span className="opacity-50">{room.total_rounds}</span>
                        </div>
                        <div className={clsx(
                            "flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-mono tabular-nums transition-colors duration-300",
                            timeLeft <= 10 ? "bg-red-900/20 border-red-500 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-silver"
                        )}>
                            <Clock className="w-3 h-3" />
                            {timeLeft}s
                        </div>

                        {currentPlayer?.is_host && (
                            <>
                                <div className="h-8 w-px bg-white/10" />
                                <div className="relative group">
                                    <Button variant="ghost" size="sm" className="text-xs tracking-widest uppercase text-silver hover:text-white">
                                        Settings
                                    </Button>
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-obsidian-light border border-white/10 rounded-xl p-4 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                                        <label className="text-[10px] font-bold text-silver uppercase mb-2 block">Round Timer (s)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-center font-mono"
                                            value={room.round_length || 60}
                                            onChange={async (e) => {
                                                const val = Number(e.target.value);
                                                await supabase.from('rooms').update({ round_length: val }).eq('id', room.id);
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-12 text-3xl font-black tracking-tighter">
                        <div className={clsx("flex items-center gap-4 transition-all duration-500", room.turn_team === 'neon' ? "scale-110 opacity-100" : "opacity-40 scale-95 grayscale")}>
                            <span className="text-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">GOLD</span>
                            <span className="text-white tabular-nums">{room.scores.neon}</span>
                        </div>
                        <div className={clsx("flex items-center gap-4 transition-all duration-500", room.turn_team === 'cyber' ? "scale-110 opacity-100" : "opacity-40 scale-95 grayscale")}>
                            <span className="text-royal-light drop-shadow-[0_0_15px_rgba(75,0,130,0.5)]">ROYAL</span>
                            <span className="text-white tabular-nums">{room.scores.cyber}</span>
                        </div>
                    </div>
                </div>

                {/* Main Game Area */}
                <div className="flex-1 flex w-full gap-8">

                    {/* Left Team List (Gold) */}
                    <div className="w-72 hidden lg:flex flex-col gap-4">
                        <div
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gold/10 to-transparent border-l-4 border-gold rounded-r-xl cursor-pointer hover:bg-gold/5 transition-colors"
                            onClick={() => setShowNeonPlayers(!showNeonPlayers)}
                        >
                            <span className="font-bold text-gold tracking-widest">ROSTER</span>
                            {showNeonPlayers ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-gold" />}
                        </div>
                        <div className="space-y-2 pl-4">
                            {neonPlayers.map(p => (
                                <div key={p.id} className={clsx(
                                    "p-3 rounded-lg text-sm flex items-center gap-3 transition-all duration-300",
                                    p.id === room.turn_describer_id ? "bg-gold/20 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] translate-x-2" : "text-silver/60 hover:text-silver hover:bg-white/5"
                                )}>
                                    {p.id === room.turn_describer_id ? <Crown className="w-4 h-4 animate-bounce" /> : <div className="w-4" />}
                                    <span className="font-medium tracking-wide truncate">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Center Board */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-12">

                        {/* Status Text */}
                        <div className="text-center space-y-4">
                            {room.wavelength_state?.revealed ? (
                                <h2 className="text-6xl font-black text-white animate-in zoom-in duration-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                                    {Math.abs(room.wavelength_state.target_percent - room.wavelength_state.dial_percent) <= 5 ? "PERFECT!" :
                                        Math.abs(room.wavelength_state.target_percent - room.wavelength_state.dial_percent) <= 12 ? "GREAT!" :
                                            Math.abs(room.wavelength_state.target_percent - room.wavelength_state.dial_percent) <= 20 ? "OKAY" : "MISS"}
                                </h2>
                            ) : (
                                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-silver drop-shadow-xl">
                                    {isDescriber ? "GIVE A CLUE" : isGuesser ? "TUNE THE DIAL" : "AWAITING TRANSMISSION..."}
                                </h2>
                            )}

                            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-obsidian-light border border-white/10 shadow-lg">
                                {isDescriber && <Crown className="w-4 h-4 text-gold animate-pulse" />}
                                <span className="text-silver text-sm font-mono tracking-widest uppercase">
                                    Current Describer: <span className="text-white font-bold">{players.find(p => p.id === room.turn_describer_id)?.name}</span>
                                </span>
                            </div>
                        </div>

                        {/* The Board */}
                        <div className="w-full transform scale-100 hover:scale-[1.01] transition-transform duration-700">
                            <WavelengthBoard
                                targetPercent={room.wavelength_state?.target_percent || 50}
                                dialPercent={room.wavelength_state?.dial_percent || 50}
                                onChange={handleDialChange}
                                revealed={room.wavelength_state?.revealed || isDescriber}
                                disabled={!isGuesser || room.wavelength_state?.revealed}
                                leftLabel={room.wavelength_state?.spectrum_card.left || 'Left'}
                                rightLabel={room.wavelength_state?.spectrum_card.right || 'Right'}
                            />
                        </div>

                        {/* Controls */}
                        <div className="h-24 flex items-center justify-center w-full">
                            {room.wavelength_state?.revealed ? (
                                <Button onClick={handleNextRound} size="lg" variant="outline" className="font-black text-xl px-12 py-6 border-white/20 hover:bg-white/10 hover:border-white/40">
                                    NEXT ROUND <ArrowRight className="ml-3 w-6 h-6" />
                                </Button>
                            ) : (
                                isDescriber ? (
                                    <div className="text-silver/50 text-lg font-light tracking-widest animate-pulse">
                                        WAITING FOR TEAM...
                                    </div>
                                ) : isGuesser ? (
                                    <Button onClick={handleReveal} size="lg" variant="gold" className="font-black text-xl px-12 py-6 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
                                        <Check className="mr-3 w-6 h-6" /> LOCK IN GUESS
                                    </Button>
                                ) : (
                                    <div className="text-silver/30 text-lg font-mono tracking-widest">
                                        SPECTATING MODE
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Right Team List (Royal) */}
                    <div className="w-72 hidden lg:flex flex-col gap-4">
                        <div
                            className="flex items-center justify-between p-4 bg-gradient-to-l from-royal/10 to-transparent border-r-4 border-royal rounded-l-xl cursor-pointer hover:bg-royal/5 transition-colors"
                            onClick={() => setShowCyberPlayers(!showCyberPlayers)}
                        >
                            <span className="font-bold text-royal-light tracking-widest">ROSTER</span>
                            {showCyberPlayers ? <ChevronUp className="w-4 h-4 text-royal-light" /> : <ChevronDown className="w-4 h-4 text-royal-light" />}
                        </div>
                        <div className="space-y-2 pr-4">
                            {cyberPlayers.map(p => (
                                <div key={p.id} className={clsx(
                                    "p-3 rounded-lg text-sm flex items-center justify-end gap-3 transition-all duration-300",
                                    p.id === room.turn_describer_id ? "bg-royal/20 text-royal-light border border-royal/30 shadow-[0_0_15px_rgba(75,0,130,0.2)] -translate-x-2" : "text-silver/60 hover:text-silver hover:bg-white/5"
                                )}>
                                    <span className="font-medium tracking-wide truncate">{p.name}</span>
                                    {p.id === room.turn_describer_id ? <Crown className="w-4 h-4 animate-bounce" /> : <div className="w-4" />}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};
