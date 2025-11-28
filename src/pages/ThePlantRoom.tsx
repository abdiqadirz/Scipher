import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Room, Player, PlantPhase } from '../types';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Scratchpad } from '../components/Scratchpad';
import { Sprout, Clock, Crown, Users, Check } from 'lucide-react';
import Confetti from 'react-confetti';
import { clsx } from 'clsx';

// Helper to generate random topics and words (placeholder for now)
const TOPICS = ["A Trip to the Dentist", "My First Date", "Cooking a Meal", "A Day at the Beach", "Lost in the Woods"];
const NOUNS = ["Banana", "Monkey", "Tractor", "Spaceship", "Jellyfish", "Trumpet", "Cactus", "Velcro", "Poodle", "Lasagna"];

export const ThePlantRoom: React.FC = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [verdictInput, setVerdictInput] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        const storedId = localStorage.getItem('cipher_player_id');
        if (storedId) setCurrentUserId(storedId);

        if (!roomId) return;

        const fetchData = async () => {
            const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
            if (roomData) setRoom(roomData);
            const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId);
            if (playersData) setPlayers(playersData);
        };
        fetchData();

        const channel = supabase.channel(`room:${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => setRoom(payload.new as Room))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const currentPlayer = players.find(p => p.id === currentUserId);
    const isHost = currentPlayer?.is_host;
    const plantState = room?.plant_state;
    const isPlanter = plantState?.active_planter_id === currentUserId;

    // Timer Logic
    useEffect(() => {
        if (!room?.turn_end_time || plantState?.phase === 'verdict' || plantState?.phase === 'scoreboard') {
            if (plantState?.phase === 'scoreboard') setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const end = new Date(room.turn_end_time!).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, Math.ceil((end - now) / 1000));
            setTimeLeft(diff);

            if (diff === 0 && isHost) {
                handlePhaseTimeout();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [room?.turn_end_time, plantState?.phase, isHost]);

    const handlePhaseTimeout = async () => {
        if (!room || !plantState) return;

        // Auto-advance logic based on phase
        if (plantState.phase === 'draft') {
            // Auto-select random word if none selected
            const randomWord = plantState.candidate_words[Math.floor(Math.random() * plantState.candidate_words.length)];
            await handleSetSecretWord(randomWord); // This will also advance phase
        } else if (plantState.phase === 'monologue') {
            await updatePhase('grill', plantState.settings.grill_time);
        } else if (plantState.phase === 'grill') {
            await updatePhase('huddle', plantState.settings.huddle_time);
        } else if (plantState.phase === 'huddle') {
            await updatePhase('verdict', 0); // No timer for verdict submission
        }
    };

    const updatePhase = async (phase: PlantPhase, duration: number) => {
        if (!room) return;
        const endTime = duration > 0 ? new Date(Date.now() + duration * 1000).toISOString() : null;

        await supabase.from('rooms').update({
            turn_end_time: endTime,
            plant_state: {
                ...room.plant_state,
                phase: phase
            }
        }).eq('id', room.id);
    };

    const handleStartGame = async () => {
        if (!room || players.length < 1) return; // Allow 1 player for testing

        const randomPlanter = players[Math.floor(Math.random() * players.length)];
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const words = NOUNS.sort(() => 0.5 - Math.random()).slice(0, 3);

        await supabase.from('rooms').update({
            status: 'playing',
            turn_end_time: new Date(Date.now() + (room.plant_state?.settings.draft_time || 20) * 1000).toISOString(),
            plant_state: {
                ...room.plant_state,
                phase: 'draft',
                active_planter_id: randomPlanter.id,
                current_topic: topic,
                candidate_words: words,
                secret_word: null,
                audience_guesses: {},
                round_scores: {}
            }
        }).eq('id', room.id);
    };

    const handleSetSecretWord = async (word: string) => {
        if (!room || !room.plant_state) return;
        await supabase.from('rooms').update({
            turn_end_time: new Date(Date.now() + room.plant_state.settings.monologue_time * 1000).toISOString(),
            plant_state: {
                ...room.plant_state,
                secret_word: word,
                phase: 'monologue'
            }
        }).eq('id', room.id);
    };

    const handleSubmitVerdict = async () => {
        if (!room || !room.plant_state || !currentUserId || !verdictInput.trim()) return;

        const newGuesses = {
            ...room.plant_state.audience_guesses,
            [currentUserId]: verdictInput.trim()
        };

        const allAudienceSubmitted = players
            .filter(p => p.id !== room.plant_state?.active_planter_id)
            .every(p => newGuesses[p.id]);

        if (allAudienceSubmitted) {
            // Calculate Scores
            const secret = room.plant_state.secret_word?.toLowerCase().trim();
            const correctGuessers = Object.entries(newGuesses)
                .filter(([_, guess]) => guess.toLowerCase().trim() === secret)
                .map(([pid]) => pid);

            const pot = room.plant_state.settings.total_pot;
            const newScores = { ...room.plant_state.round_scores };

            // Greed Mechanic
            if (correctGuessers.length === 0) {
                // Planter Wins
                newScores[room.plant_state.active_planter_id] = pot;
            } else {
                // Audience Wins (Split Pot)
                const pointsPerGuesser = Math.floor(pot / correctGuessers.length);
                correctGuessers.forEach(pid => {
                    newScores[pid] = pointsPerGuesser;
                });
                newScores[room.plant_state.active_planter_id] = 0;
            }

            // Update Total Scores
            const globalScores = { ...room.scores } as Record<string, number>;
            Object.entries(newScores).forEach(([pid, score]) => {
                globalScores[pid] = (globalScores[pid] || 0) + score;
            });

            await supabase.from('rooms').update({
                scores: globalScores,
                plant_state: {
                    ...room.plant_state,
                    audience_guesses: newGuesses,
                    round_scores: newScores,
                    phase: 'scoreboard'
                }
            }).eq('id', room.id);

            setShowConfetti(true);
        } else {
            await supabase.from('rooms').update({
                plant_state: {
                    ...room.plant_state,
                    audience_guesses: newGuesses
                }
            }).eq('id', room.id);
        }
    };

    const handleNextRound = async () => {
        handleStartGame();
        setShowConfetti(false);
        setVerdictInput('');
    };

    if (!room || !plantState) return <div className="min-h-screen bg-obsidian flex items-center justify-center text-white font-mono animate-pulse">Initializing...</div>;

    // Lobby View
    if (room.status === 'lobby') {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-600">THE PLANT</h1>
                        <p className="text-silver text-lg">Waiting for players...</p>
                    </div>

                    <div className="bg-obsidian-light/50 p-8 rounded-2xl border border-emerald-500/20 w-full max-w-md">
                        <div className="space-y-4">
                            {players.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        {p.is_host ? <Crown className="w-4 h-4 text-gold" /> : <Users className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                    <span className="text-white font-bold">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isHost && (
                        <Button onClick={handleStartGame} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 py-6 shadow-lg shadow-emerald-500/20">
                            START GAME
                        </Button>
                    )}
                </div>
            </Layout>
        );
    }

    const planterName = players.find(p => p.id === plantState.active_planter_id)?.name;

    return (
        <Layout>
            <div className="flex flex-col h-full min-h-[90vh] max-w-5xl mx-auto w-full">
                {showConfetti && <Confetti numberOfPieces={200} recycle={false} colors={['#10b981', '#34d399', '#ffffff']} />}

                {/* Header */}
                <div className="flex justify-between items-center mb-8 glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs tracking-widest uppercase border border-white/10 hover:bg-white/5">
                            Exit
                        </Button>
                        <div className="flex flex-col">
                            <span className="text-xs text-silver uppercase tracking-widest font-bold">Current Phase</span>
                            <span className="text-xl font-black text-emerald-400 uppercase">{plantState.phase}</span>
                        </div>
                    </div>

                    {timeLeft > 0 && (
                        <div className={clsx(
                            "flex items-center gap-2 px-6 py-2 rounded-full border text-lg font-mono tabular-nums font-bold",
                            timeLeft <= 10 ? "bg-red-900/20 border-red-500 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-silver"
                        )}>
                            <Clock className="w-5 h-5" />
                            {timeLeft}s
                        </div>
                    )}
                </div>

                {/* Game Area */}
                <div className="flex-1 flex flex-col md:flex-row gap-8">

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col gap-8">

                        {/* Topic Card */}
                        <div className="glass-panel p-8 rounded-3xl text-center space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500" />
                            <span className="text-emerald-400 text-sm font-bold tracking-[0.3em] uppercase">Current Topic</span>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                                {plantState.current_topic}
                            </h2>
                        </div>

                        {/* Phase Specific Content */}
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">

                            {/* DRAFT PHASE */}
                            {plantState.phase === 'draft' && (
                                <div className="text-center space-y-8 w-full">
                                    {isPlanter ? (
                                        <>
                                            <p className="text-xl text-silver">Choose your secret word to hide:</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {plantState.candidate_words.map(word => (
                                                    <Button
                                                        key={word}
                                                        onClick={() => handleSetSecretWord(word)}
                                                        className="h-32 text-2xl font-black bg-white/5 hover:bg-emerald-500/20 border-white/10 hover:border-emerald-500 transition-all"
                                                    >
                                                        {word}
                                                    </Button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-2xl text-silver animate-pulse font-light">
                                            <span className="font-bold text-white">{planterName}</span> is choosing a word...
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MONOLOGUE / GRILL / HUDDLE */}
                            {(plantState.phase === 'monologue' || plantState.phase === 'grill' || plantState.phase === 'huddle') && (
                                <div className="text-center space-y-8">
                                    {isPlanter ? (
                                        <div className="space-y-4">
                                            <p className="text-silver uppercase tracking-widest text-sm">Your Secret Word</p>
                                            <div className="text-6xl font-black text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]">
                                                {plantState.secret_word}
                                            </div>
                                            <p className="text-white/50 max-w-md mx-auto">
                                                {plantState.phase === 'monologue' ? "Tell a story about the topic and hide this word naturally." :
                                                    plantState.phase === 'grill' ? "Answer their questions without giving it away." :
                                                        "Stay cool while they discuss."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="w-32 h-32 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center ring-4 ring-emerald-500/20">
                                                <Users className="w-16 h-16 text-emerald-400" />
                                            </div>
                                            <h3 className="text-3xl font-bold text-white">
                                                {plantState.phase === 'monologue' ? "Listen Carefully..." :
                                                    plantState.phase === 'grill' ? "Interrogate the Planter!" :
                                                        "Discuss & Deduce"}
                                            </h3>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* VERDICT */}
                            {plantState.phase === 'verdict' && (
                                <div className="w-full max-w-xl space-y-8 text-center">
                                    <h2 className="text-4xl font-black text-white">Final Verdict</h2>
                                    {isPlanter ? (
                                        <p className="text-xl text-silver animate-pulse">Waiting for audience to vote...</p>
                                    ) : (
                                        !plantState.audience_guesses[currentUserId || ''] ? (
                                            <div className="space-y-4">
                                                <p className="text-silver">What was the secret word?</p>
                                                <div className="flex gap-4">
                                                    <Input
                                                        value={verdictInput}
                                                        onChange={(e) => setVerdictInput(e.target.value)}
                                                        placeholder="Enter your guess..."
                                                        className="text-lg py-6"
                                                    />
                                                    <Button onClick={handleSubmitVerdict} disabled={!verdictInput} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8">
                                                        SUBMIT
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-8 bg-white/5 rounded-xl border border-white/10">
                                                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                                                <p className="text-xl text-white font-bold">Guess Submitted</p>
                                                <p className="text-silver">Waiting for others...</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* SCOREBOARD */}
                            {plantState.phase === 'scoreboard' && (
                                <div className="w-full max-w-2xl space-y-8 text-center animate-in zoom-in duration-500">
                                    <div className="space-y-2">
                                        <p className="text-silver uppercase tracking-widest text-sm">The Secret Word Was</p>
                                        <h2 className="text-6xl font-black text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]">
                                            {plantState.secret_word}
                                        </h2>
                                    </div>

                                    <div className="grid gap-4">
                                        {Object.entries(plantState.audience_guesses).map(([pid, guess]) => {
                                            const player = players.find(p => p.id === pid);
                                            const isCorrect = guess.toLowerCase().trim() === plantState.secret_word?.toLowerCase().trim();
                                            return (
                                                <div key={pid} className={clsx(
                                                    "flex items-center justify-between p-4 rounded-xl border",
                                                    isCorrect ? "bg-emerald-500/20 border-emerald-500/50" : "bg-red-500/10 border-red-500/20"
                                                )}>
                                                    <span className="font-bold text-white">{player?.name}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className={clsx("text-lg", isCorrect ? "text-emerald-400" : "text-red-400 line-through")}>
                                                            {guess}
                                                        </span>
                                                        {isCorrect && <span className="text-emerald-400 font-bold">+{plantState.round_scores[pid]} pts</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Planter Score */}
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 mt-4">
                                            <div className="flex items-center gap-2">
                                                <Sprout className="w-5 h-5 text-emerald-400" />
                                                <span className="font-bold text-white">{planterName} (Planter)</span>
                                            </div>
                                            <span className="text-emerald-400 font-bold">+{plantState.round_scores[plantState.active_planter_id]} pts</span>
                                        </div>
                                    </div>

                                    {isHost && (
                                        <Button onClick={handleNextRound} size="lg" className="bg-white text-obsidian hover:bg-silver font-black px-12">
                                            NEXT ROUND
                                        </Button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Sidebar / Scratchpad */}
                    <div className="w-full md:w-80 flex flex-col gap-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-silver uppercase tracking-widest mb-4">Players</h3>
                            <div className="space-y-2">
                                {players.map(p => (
                                    <div key={p.id} className={clsx(
                                        "flex items-center gap-3 p-2 rounded-lg transition-all",
                                        p.id === plantState.active_planter_id ? "bg-emerald-500/20 border border-emerald-500/30" : "hover:bg-white/5"
                                    )}>
                                        {p.id === plantState.active_planter_id ? <Sprout className="w-4 h-4 text-emerald-400" /> : <div className="w-4" />}
                                        <span className={clsx("font-medium", p.id === plantState.active_planter_id ? "text-emerald-100" : "text-silver")}>
                                            {p.name}
                                        </span>
                                        {plantState.phase === 'verdict' && plantState.audience_guesses[p.id] && (
                                            <Check className="w-4 h-4 text-emerald-400 ml-auto" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!isPlanter && plantState.phase !== 'scoreboard' && (
                            <Scratchpad
                                onSelectTag={(tag) => setVerdictInput(tag)}
                                className="flex-1"
                            />
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    );
};
