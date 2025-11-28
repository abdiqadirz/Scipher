import React, { useEffect, useState } from 'react';
import type { Room, Player, Message, Team } from '../types';
import { Chat } from './Chat';
import { Button } from './Button';
import { WORD_BANK } from '../lib/words';
import { supabase } from '../lib/supabase';
import { Play, Crown, Eye, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { clsx } from 'clsx';

interface GameBoardProps {
    room: Room;
    players: Player[];
    messages: Message[];
    currentUserId: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ room, players, messages, currentUserId }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);

    const currentPlayer = players.find(p => p.id === currentUserId);
    const isMyTurn = room.turn_team === currentPlayer?.team;
    const isDescriber = room.turn_describer_id === currentUserId;
    const isGuesser = isMyTurn && !isDescriber;

    // Timer Logic
    useEffect(() => {
        if (!room.turn_end_time || room.turn_phase !== 'playing') {
            setTimeLeft(room.round_length); // Reset timer display when not playing
            return;
        }

        const interval = setInterval(() => {
            const end = new Date(room.turn_end_time!).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, Math.ceil((end - now) / 1000));

            setTimeLeft(diff);

            if (diff === 0 && isDescriber) {
                handleTurnEnd();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [room.turn_end_time, room.turn_phase, isDescriber, room.round_length]);

    // Confetti Effect
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.type === 'guess_correct') {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    }, [messages]);

    const handleStartTurn = async () => {
        if (!isDescriber) return;
        await supabase.from('rooms').update({
            turn_phase: 'playing',
            turn_end_time: new Date(Date.now() + room.round_length * 1000).toISOString(),
        }).eq('id', room.id);
    };

    const handleTurnEnd = async (currentScores?: any) => {
        if (room.current_round >= room.total_rounds) {
            await supabase.from('rooms').update({
                status: 'finished',
                last_updated: new Date().toISOString()
            }).eq('id', room.id);
            return;
        }

        // Switch teams
        let nextTeam: Team = room.turn_team === 'neon' ? 'cyber' : 'neon';
        let nextTeamPlayers = players
            .filter(p => p.team === nextTeam)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));

        if (nextTeamPlayers.length === 0) {
            nextTeam = room.turn_team;
            nextTeamPlayers = players
                .filter(p => p.team === nextTeam)
                .sort((a, b) => a.created_at.localeCompare(b.created_at));
        }

        // Sequential Rotation
        let nextIndex = 0;
        if (nextTeam === 'neon') {
            const currentIndex = room.scores.neon_turn_index ?? -1;
            nextIndex = (currentIndex + 1) % nextTeamPlayers.length;
        } else {
            const currentIndex = room.scores.cyber_turn_index ?? -1;
            nextIndex = (currentIndex + 1) % nextTeamPlayers.length;
        }

        const nextDescriber = nextTeamPlayers[nextIndex];

        // Pick new words
        const shuffledWords = [...WORD_BANK].sort(() => 0.5 - Math.random());
        const selectedWords = shuffledWords.slice(0, room.words_per_turn || 10);

        // Use provided scores or fallback to current room scores (handling stale state)
        const baseScores = currentScores || room.scores;
        const newScores = {
            ...baseScores,
            [nextTeam === 'neon' ? 'neon_turn_index' : 'cyber_turn_index']: nextIndex
        };

        await supabase.from('rooms').update({
            turn_team: nextTeam,
            turn_phase: 'ready',
            turn_describer_id: nextDescriber.id,
            turn_end_time: null,
            current_words: selectedWords,
            current_round: room.current_round + 1,
            scores: newScores
        }).eq('id', room.id);
    };

    const handleWordGuessed = async (wordIndex: number) => {
        // Can be triggered by describer clicking or by chat match
        if (!room.current_words) return;

        const word = room.current_words[wordIndex];
        if (word.guessed) return;

        const updatedWords = [...room.current_words];
        updatedWords[wordIndex] = { ...word, guessed: true };

        const points = word.points;
        const teamScoreKey = room.turn_team;

        const newScores = {
            ...room.scores,
            [teamScoreKey]: room.scores[teamScoreKey] + points
        };

        // Check if all words guessed
        if (updatedWords.every(w => w.guessed)) {
            // Pass the new scores directly to avoid race condition
            await handleTurnEnd(newScores);
        } else {
            await supabase.from('rooms').update({
                scores: newScores,
                current_words: updatedWords
            }).eq('id', room.id);
        }
    };

    const handleSendMessage = async (content: string) => {
        if (!currentPlayer) return;

        // Check for match in current words
        const matchIndex = room.current_words?.findIndex(w => !w.guessed && w.word.toLowerCase() === content.trim().toLowerCase());

        if (matchIndex !== undefined && matchIndex !== -1 && isGuesser && room.turn_phase === 'playing') {
            // Correct Guess!
            const word = room.current_words![matchIndex];

            // Update Room (mark guessed)
            await handleWordGuessed(matchIndex);

            // Send System Message
            await supabase.from('messages').insert({
                room_id: room.id,
                content: `${word.word}`, // Just the word for the guess board
                player_id: currentPlayer.id,
                player_name: currentPlayer.name,
                team: currentPlayer.team,
                type: 'guess_correct'
            });

            // Update Stats
            const currentStats = currentPlayer.stats || { words_guessed: 0, total_points: 0, describer_points: 0 };
            const newStats = {
                ...currentStats,
                words_guessed: (currentStats.words_guessed || 0) + 1,
                total_points: (currentStats.total_points || 0) + word.points
            };
            await supabase.from('players').update({ stats: newStats }).eq('id', currentPlayer.id);

            // Update Describer Stats
            const describer = players.find(p => p.id === room.turn_describer_id);
            if (describer) {
                const describerStats = describer.stats || { words_guessed: 0, total_points: 0, describer_points: 0 };
                const newDescriberStats = {
                    ...describerStats,
                    describer_points: (describerStats.describer_points || 0) + word.points,
                    total_points: (describerStats.total_points || 0) + word.points
                };
                await supabase.from('players').update({ stats: newDescriberStats }).eq('id', describer.id);
            }

        } else {
            // Incorrect Guess (if playing)
            if (isGuesser && room.turn_phase === 'playing') {
                await supabase.from('messages').insert({
                    room_id: room.id,
                    player_id: currentPlayer.id,
                    player_name: currentPlayer.name,
                    content: content,
                    team: currentPlayer.team,
                    type: 'guess_incorrect' // New type for styling
                });
            } else {
                // Normal Chat (Lobby/Ready phase)
                await supabase.from('messages').insert({
                    room_id: room.id,
                    player_id: currentPlayer.id,
                    player_name: currentPlayer.name,
                    content: content,
                    team: currentPlayer.team,
                    type: 'chat'
                });
            }
        }
    };

    // Determine Roles & Visibility
    const isActiveGuesser = isMyTurn && !isDescriber && room.turn_phase === 'playing';
    const showChat = isActiveGuesser;


    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] p-4 gap-6 bg-slate-950">
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            {/* Main Content Area */}
            <div className={clsx(
                "bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-800/50 p-8 overflow-hidden flex flex-col relative shadow-2xl transition-all duration-500",
                isActiveGuesser ? "w-full max-w-3xl mx-auto" : "w-full max-w-7xl mx-auto"
            )}>
                {/* Header (Visible to ALL) */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-800/50 px-5 py-2 rounded-full border border-slate-700/50 backdrop-blur-sm shadow-inner">
                            <span className="text-slate-400 text-xs font-mono uppercase tracking-wider mr-3">Round</span>
                            <span className="text-white font-black text-lg">{room.current_round}/{room.total_rounds}</span>
                        </div>
                        {/* Team Scores */}
                        <div className="flex gap-6 text-base font-black tracking-tight">
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20">
                                <span className="text-gold">GOLD</span>
                                <span className="text-white">{room.scores.neon}</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-royal/10 border border-royal/20">
                                <span className="text-royal">ROYAL</span>
                                <span className="text-white">{room.scores.cyber}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className={clsx(
                        "px-6 py-2 rounded-full border flex items-center gap-3 transition-all duration-300 shadow-lg",
                        timeLeft <= 10 && room.turn_phase === 'playing'
                            ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse scale-110"
                            : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    )}>
                        <span className="text-xs font-mono uppercase tracking-wider">Time</span>
                        <span className="font-black text-xl min-w-[3ch] text-center text-white tabular-nums">{timeLeft}s</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative flex flex-col">
                    {isActiveGuesser ? (
                        /* GUESSER VIEW: Centralized Chat + Feedback Below */
                        <div className="flex flex-col h-full gap-6">
                            {/* Chat Area - Centralized */}
                            <div className="flex-1 bg-slate-950/50 rounded-2xl border border-slate-800/50 overflow-hidden shadow-inner relative">
                                <Chat
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    currentUserTeam={currentPlayer?.team}
                                    disabled={false}
                                />
                            </div>

                            {/* Feedback Area - Minimalistic, Below Chat */}
                            <div className="h-24 flex items-center justify-center">
                                {messages.slice().reverse().find(m => m.type === 'guess_correct' || m.type === 'guess_incorrect') && (
                                    (() => {
                                        const lastFeedback = messages.slice().reverse().find(m => m.type === 'guess_correct' || m.type === 'guess_incorrect');
                                        if (!lastFeedback) return null;

                                        // Only show recent feedback (within last 3 seconds) could be handled by a separate state, 
                                        // but for now we just show the last one. 
                                        // Ideally we'd filter by timestamp but we don't have it easily accessible here without parsing.
                                        // Let's just show it.

                                        if (lastFeedback.type === 'guess_correct') {
                                            return (
                                                <div key={lastFeedback.id || 'correct'} className="flex flex-col items-center animate-in zoom-in duration-300">
                                                    <div className="flex items-center gap-3 text-green-400 mb-1">
                                                        <Sparkles className="w-5 h-5" />
                                                        <span className="text-sm font-bold uppercase tracking-widest">Correct!</span>
                                                    </div>
                                                    <div className="text-3xl font-black text-white tracking-tight">
                                                        {lastFeedback.content}
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div key={lastFeedback.id || 'incorrect'} className="flex flex-col items-center animate-in shake duration-300">
                                                    <span className="text-red-500/50 text-xs font-bold uppercase tracking-widest mb-1">Missed</span>
                                                    <div className="text-2xl font-bold text-red-400/80 line-through decoration-2 decoration-red-500/50">
                                                        {lastFeedback.content}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })()
                                )}
                            </div>
                        </div>
                    ) : (
                        /* WORD GRID (Describer & Spectator View) */
                        <>
                            {room.turn_phase === 'ready' ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-10 animate-in zoom-in duration-500">
                                    {isDescriber ? (
                                        <>
                                            <div className="text-center space-y-6">
                                                <div className="inline-block p-4 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4 animate-bounce">
                                                    <Crown className="w-12 h-12 text-blue-400" />
                                                </div>
                                                <h2 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl">YOUR TURN</h2>
                                                <p className="text-slate-400 text-2xl font-light">Describe <span className="text-white font-bold">{room.words_per_turn || 10} words</span> to your team.</p>
                                            </div>
                                            <Button size="lg" variant="primary" onClick={handleStartTurn} className="w-full max-w-md text-2xl py-8 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:scale-105 transition-all duration-300 hover:shadow-[0_0_60px_rgba(59,130,246,0.5)]">
                                                <Play className="w-8 h-8 mr-4 fill-current" /> START ROUND
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="space-y-8 animate-pulse text-center">
                                            <div className="w-32 h-32 rounded-full bg-slate-800/50 mx-auto flex items-center justify-center border-4 border-slate-700/50 shadow-2xl">
                                                <Eye className="w-12 h-12 text-slate-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-bold text-white tracking-tight">Waiting for Describer...</h3>
                                                <p className="text-slate-400 text-xl mt-2">The round will start soon.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                                        {room.current_words?.map((word, idx) => (
                                            <div
                                                key={idx}
                                                className={clsx(
                                                    "aspect-[4/3] p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-500 relative overflow-hidden group",
                                                    word.guessed
                                                        ? "bg-green-500/5 border-green-500/20 opacity-50 scale-95 grayscale-[0.5]"
                                                        : "bg-slate-800/40 border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/80 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
                                                )}
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                {/* Card Background Gradient */}
                                                {!word.guessed && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                )}

                                                <div className={clsx(
                                                    "font-black text-lg md:text-xl break-words leading-tight text-center mt-2 px-2 tracking-tight z-10 flex-1 flex items-center justify-center",
                                                    word.guessed ? "text-green-400 line-through decoration-2 decoration-green-500/50" : "text-white group-hover:text-blue-100"
                                                )}>
                                                    {word.word}
                                                </div>

                                                <div className="flex justify-center items-end z-10">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={clsx(
                                                            "text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors",
                                                            word.guessed ? "text-green-500/50" : "text-slate-500 group-hover:text-slate-400"
                                                        )}>{word.points} PTS</span>
                                                        <div className={clsx(
                                                            "w-12 h-1 rounded-full transition-all duration-500",
                                                            word.guessed ? "bg-green-500" : "bg-slate-700 group-hover:bg-blue-500"
                                                        )} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right Panel: Chat Input (Visible ONLY to Active Guessers - REMOVED as it's now integrated) */}
            {!isActiveGuesser && showChat && (
                <div className="w-full h-64 lg:h-auto lg:w-96 bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-slate-800/50 flex flex-col overflow-hidden shrink-0 shadow-2xl animate-in slide-in-from-right-8 duration-700">
                    <Chat
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        currentUserTeam={currentPlayer?.team}
                        disabled={false}
                    />
                </div>
            )}
        </div>
    );
};
