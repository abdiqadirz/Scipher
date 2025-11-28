import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { Radio, Users, Crown } from 'lucide-react';

export const WavelengthLobby: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');

    const [roundLength, setRoundLength] = useState(60);
    const [showSettings, setShowSettings] = useState(false);

    const generateRoomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleCreateRoom = async () => {
        if (!name) {
            setError('Please enter your name');
            return;
        }
        setIsCreating(true);
        setError('');

        try {
            const code = generateRoomCode();

            // Create Player (Host)
            const { data: { user } } = await supabase.auth.getUser();
            let playerId = localStorage.getItem('cipher_player_id');
            if (user) playerId = user.id;
            if (!playerId) playerId = crypto.randomUUID();

            // Create Room
            const { error: roomError } = await supabase
                .from('rooms')
                .insert({
                    id: code,
                    status: 'lobby',
                    game_type: 'wavelength',
                    current_round: 1,
                    total_rounds: 12,
                    round_length: roundLength,
                    scores: { neon: 0, cyber: 0 },
                    turn_describer_id: playerId, // Host is first describer
                    wavelength_state: {
                        target_percent: 50,
                        dial_percent: 50,
                        spectrum_card: { left: 'Hot', right: 'Cold' },
                        revealed: false
                    }
                });

            if (roomError) throw roomError;

            // Create Player Record
            const { error: playerError } = await supabase
                .from('players')
                .upsert({
                    id: playerId,
                    room_id: code,
                    name: name,
                    is_host: true,
                    team: null
                });

            if (playerError) throw playerError;

            localStorage.setItem('cipher_player_id', playerId);
            localStorage.setItem('cipher_player_name', name);

            navigate(`/wavelength/${code}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create room');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!name) {
            setError('Please enter your name');
            return;
        }
        if (!roomCode || roomCode.length !== 4) {
            setError('Please enter a valid 4-letter room code');
            return;
        }
        setIsJoining(true);
        setError('');

        try {
            const code = roomCode.toUpperCase();

            // Check if room exists and is Wavelength
            const { data: room, error: roomCheckError } = await supabase
                .from('rooms')
                .select('status, game_type')
                .eq('id', code)
                .single();

            if (roomCheckError || !room) {
                throw new Error('Room not found');
            }

            if (room.game_type !== 'wavelength') {
                throw new Error('This is not a Wavelength room');
            }

            if (room.status !== 'lobby') {
                throw new Error('Game already in progress');
            }

            // Create Player
            const { data: { user } } = await supabase.auth.getUser();
            let playerId = localStorage.getItem('cipher_player_id');
            if (user) playerId = user.id;
            if (!playerId) playerId = crypto.randomUUID();

            const { error: playerError } = await supabase
                .from('players')
                .upsert({
                    id: playerId,
                    room_id: code,
                    name: name,
                    is_host: false,
                    team: null
                });

            if (playerError) throw playerError;

            localStorage.setItem('cipher_player_id', playerId);
            localStorage.setItem('cipher_player_name', name);

            navigate(`/wavelength/${code}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to join room');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center p-6 bg-royal/10 rounded-full mb-8 ring-1 ring-royal/50 shadow-[0_0_50px_rgba(75,0,130,0.3)] backdrop-blur-xl animate-float">
                        <Radio className="w-16 h-16 text-royal-light" />
                    </div>
                    <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-royal-light to-royal tracking-tighter drop-shadow-2xl mb-4">
                        WAVELENGTH
                    </h1>
                    <p className="text-silver text-xl font-light tracking-widest uppercase">
                        Tune into your team's frequency
                    </p>
                </div>

                <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 glass-panel p-8 rounded-[2rem]">
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-royal-light uppercase tracking-widest ml-1">Your Identity</label>
                        <Input
                            placeholder="ENTER YOUR NAME"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="text-lg py-4 font-bold tracking-wide text-center uppercase"
                        />
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="text-xs font-bold text-silver hover:text-white uppercase tracking-widest flex items-center gap-2 mx-auto"
                        >
                            <span>{showSettings ? 'Hide' : 'Show'} Game Settings</span>
                        </button>

                        {showSettings && (
                            <div className="p-4 bg-black/20 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-silver uppercase">Round Timer (s)</label>
                                    <Input type="number" value={roundLength} onChange={(e) => setRoundLength(Number(e.target.value))} className="text-center" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <Button
                            variant="royal"
                            onClick={handleCreateRoom}
                            disabled={isCreating || isJoining}
                            className="h-40 flex flex-col items-center justify-center gap-4 border-0 shadow-2xl hover:shadow-royal/50 transition-all duration-500 group"
                        >
                            <div className="p-4 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-300">
                                <Crown className="w-8 h-8" />
                            </div>
                            <span className="text-lg font-black tracking-wide">CREATE ROOM</span>
                        </Button>

                        <div className="space-y-4">
                            <Input
                                placeholder="CODE"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={4}
                                className="text-center text-2xl uppercase tracking-[0.5em] font-mono h-[4.5rem] font-bold"
                            />
                            <Button
                                variant="outline"
                                onClick={handleJoinRoom}
                                disabled={isCreating || isJoining}
                                className="w-full h-[calc(10rem-5.5rem)] border-white/10 hover:bg-white/5 hover:border-royal-light/50 text-silver hover:text-white transition-all duration-300"
                            >
                                <Users className="w-5 h-5 mr-2" />
                                JOIN ROOM
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl text-red-300 text-center text-sm font-bold tracking-wide animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <div className="text-center pt-4 border-t border-white/5">
                        <button onClick={() => navigate('/')} className="text-silver/50 hover:text-white text-xs font-mono tracking-widest uppercase transition-colors">
                            Return to Hub
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
