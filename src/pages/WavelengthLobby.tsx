import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { Radio, Users } from 'lucide-react';

export const WavelengthLobby: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');

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
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full mb-6 ring-1 ring-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                        <Radio className="w-12 h-12 text-rose-500" />
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl mb-2">
                        WAVELENGTH
                    </h1>
                    <p className="text-slate-400 text-lg font-light tracking-wide">
                        Tune into your team's frequency.
                    </p>
                </div>

                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                    <div className="space-y-4">
                        <Input
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-900/50 border-slate-800 focus:border-rose-500 focus:ring-rose-500/20 text-lg py-6"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            onClick={handleCreateRoom}
                            disabled={isCreating || isJoining}
                            className="h-32 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 border-0 shadow-lg hover:shadow-rose-500/25 transition-all duration-300"
                        >
                            <Radio className="w-8 h-8" />
                            <span className="text-lg font-bold">Create Room</span>
                        </Button>

                        <div className="space-y-2">
                            <Input
                                placeholder="Room Code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={4}
                                className="text-center uppercase tracking-[0.5em] font-mono bg-slate-900/50 border-slate-800 focus:border-rose-500 focus:ring-rose-500/20 h-[3.5rem]"
                            />
                            <Button
                                onClick={handleJoinRoom}
                                disabled={isCreating || isJoining}
                                className="w-full h-[calc(8rem-4.5rem)] bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                            >
                                <Users className="w-5 h-5 mr-2" />
                                Join Room
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <div className="text-center">
                        <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 text-sm underline underline-offset-4 transition-colors">
                            Back to Game Hub
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
