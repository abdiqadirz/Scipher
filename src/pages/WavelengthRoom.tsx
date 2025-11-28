import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Room, Player, Team } from '../types';
import { WavelengthBoard } from '../components/WavelengthBoard';
import { Button } from '../components/Button';
import { WAVELENGTH_CARDS } from '../lib/wavelength_cards';
import { Crown, ArrowRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Confetti from 'react-confetti';
import { clsx } from 'clsx';

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
                // Auto-reveal logic handled by server or describer client? 
                // Let's have describer trigger it to avoid race conditions
                // Actually, if time runs out, we should probably just reveal whatever the dial is at.
                // But wait, describer CAN'T reveal anymore. 
                // So maybe auto-submit?
                // Let's auto-reveal for now.
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
        // 4pts: +/- 5% (Total 10% width)
        // 3pts: +/- 12% (Total 24% width)
        // 2pts: +/- 20% (Total 40% width)

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
        // We need to track turn index in scores like Scipher
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

    if (!room) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

    // Lobby View (if no team selected)
    if (currentPlayer && !currentPlayer.team) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-8 text-center">
                    <h1 className="text-4xl font-black text-white">Select Team</h1>
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => handleJoinTeam('neon')} className="h-32 bg-gold/10 border-gold/20 hover:bg-gold/20 text-gold">
                            Team Gold
                        </Button>
                        <Button onClick={() => handleJoinTeam('cyber')} className="h-32 bg-royal/10 border-royal/20 hover:bg-royal/20 text-royal">
                            Team Royal
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const neonPlayers = players.filter(p => p.team === 'neon');
    const cyberPlayers = players.filter(p => p.team === 'cyber');

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden relative">
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            {/* Header */}
            <div className="flex justify-between items-center p-4 max-w-7xl mx-auto w-full z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        Exit
                    </Button>
                    <div className="px-4 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-sm font-mono">
                        Round {room.current_round}/{room.total_rounds}
                    </div>
                    <div className={clsx(
                        "px-4 py-1 rounded-full border text-sm font-mono tabular-nums",
                        timeLeft <= 10 ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" : "bg-slate-800 border-slate-700 text-slate-400"
                    )}>
                        {timeLeft}s
                    </div>
                </div>

                <div className="flex gap-8 text-2xl font-black">
                    <div className={clsx("flex items-center gap-3 transition-all duration-500", room.turn_team === 'neon' ? "scale-125 opacity-100" : "opacity-50 scale-90")}>
                        <span className="text-gold drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">GOLD</span>
                        <span className="text-white">{room.scores.neon}</span>
                    </div>
                    <div className={clsx("flex items-center gap-3 transition-all duration-500", room.turn_team === 'cyber' ? "scale-125 opacity-100" : "opacity-50 scale-90")}>
                        <span className="text-royal drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">ROYAL</span>
                        <span className="text-white">{room.scores.cyber}</span>
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex w-full max-w-7xl mx-auto relative">

                {/* Left Team List (Gold) */}
                <div className="w-64 p-4 hidden lg:flex flex-col gap-4">
                    <div
                        className="flex items-center justify-between p-3 bg-gold/10 border border-gold/20 rounded-xl cursor-pointer hover:bg-gold/20 transition-colors"
                        onClick={() => setShowNeonPlayers(!showNeonPlayers)}
                    >
                        <span className="font-bold text-gold">Team Gold</span>
                        {showNeonPlayers ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-gold" />}
                    </div>
                    {(showNeonPlayers || true) && ( // Always show for now on desktop
                        <div className="space-y-2">
                            {neonPlayers.map(p => (
                                <div key={p.id} className={clsx(
                                    "p-2 rounded-lg text-sm flex items-center gap-2",
                                    p.id === room.turn_describer_id ? "bg-gold/20 text-gold border border-gold/30" : "text-slate-400"
                                )}>
                                    {p.id === room.turn_describer_id && <Crown className="w-3 h-3" />}
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Center Game Area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">

                    {/* Status Text */}
                    <div className="text-center space-y-2">
                        {room.wavelength_state?.revealed ? (
                            <h2 className="text-5xl font-black text-white animate-in zoom-in drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                {Math.abs(room.wavelength_state.target_percent - room.wavelength_state.dial_percent) <= 5 ? "PERFECT!" :
                                    Math.abs(room.wavelength_state.target_percent - room.wavelength_state.dial_percent) <= 12 ? "GREAT!" :
                                        Math.abs(room.wavelength_state.target_percent - room.wavelength_state.dial_percent) <= 20 ? "OKAY" : "MISS"}
                            </h2>
                        ) : (
                            <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                                {isDescriber ? "Give a clue!" : isGuesser ? "Tune the dial!" : `${players.find(p => p.id === room.turn_describer_id)?.name} is thinking...`}
                            </h2>
                        )}
                        <div className="flex items-center justify-center gap-2 text-slate-400 bg-slate-900/50 py-1 px-4 rounded-full border border-slate-800 inline-block">
                            {isDescriber && <Crown className="w-4 h-4 text-yellow-500" />}
                            <span>Current Describer: {players.find(p => p.id === room.turn_describer_id)?.name}</span>
                        </div>
                    </div>

                    {/* The Board */}
                    <div className="w-full">
                        <WavelengthBoard
                            targetPercent={room.wavelength_state?.target_percent || 50}
                            dialPercent={room.wavelength_state?.dial_percent || 50}
                            onChange={handleDialChange}
                            revealed={room.wavelength_state?.revealed || isDescriber} // Describer always sees target
                            disabled={!isGuesser || room.wavelength_state?.revealed}
                            leftLabel={room.wavelength_state?.spectrum_card.left || 'Left'}
                            rightLabel={room.wavelength_state?.spectrum_card.right || 'Right'}
                        />
                    </div>

                    {/* Controls */}
                    <div className="h-24 flex items-center justify-center w-full">
                        {room.wavelength_state?.revealed ? (
                            <Button onClick={handleNextRound} size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-black text-xl px-12 py-6 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
                                Next Round <ArrowRight className="ml-2 w-6 h-6" />
                            </Button>
                        ) : (
                            isDescriber ? (
                                <div className="text-slate-400 text-lg animate-pulse font-medium">
                                    Waiting for your team to guess...
                                </div>
                            ) : isGuesser ? (
                                <Button onClick={handleReveal} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-transform">
                                    <Check className="mr-2 w-6 h-6" /> SUBMIT GUESS
                                </Button>
                            ) : (
                                <div className="text-slate-500 text-lg">
                                    Spectating...
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Right Team List (Royal) */}
                <div className="w-64 p-4 hidden lg:flex flex-col gap-4">
                    <div
                        className="flex items-center justify-between p-3 bg-royal/10 border border-royal/20 rounded-xl cursor-pointer hover:bg-royal/20 transition-colors"
                        onClick={() => setShowCyberPlayers(!showCyberPlayers)}
                    >
                        <span className="font-bold text-royal">Team Royal</span>
                        {showCyberPlayers ? <ChevronUp className="w-4 h-4 text-royal" /> : <ChevronDown className="w-4 h-4 text-royal" />}
                    </div>
                    {(showCyberPlayers || true) && ( // Always show for now on desktop
                        <div className="space-y-2">
                            {cyberPlayers.map(p => (
                                <div key={p.id} className={clsx(
                                    "p-2 rounded-lg text-sm flex items-center gap-2",
                                    p.id === room.turn_describer_id ? "bg-royal/20 text-royal border border-royal/30" : "text-slate-400"
                                )}>
                                    {p.id === room.turn_describer_id && <Crown className="w-3 h-3" />}
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
