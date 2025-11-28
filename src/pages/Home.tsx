import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { Users, Zap } from 'lucide-react';

export const Home: React.FC = () => {
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

            // Create Room
            const { error: roomError } = await supabase
                .from('rooms')
                .insert({
                    id: code,
                    status: 'lobby',
                    current_round: 1,
                    total_rounds: 12,
                    scores: { neon: 0, cyber: 0 }
                });

            if (roomError) throw roomError;

            // Create Player (Host)
            const { data: { user } } = await supabase.auth.getUser();

            // Use existing ID from local storage, or auth ID, or generate new one
            let playerId = localStorage.getItem('cipher_player_id');
            if (user) playerId = user.id;
            if (!playerId) playerId = crypto.randomUUID();

            const { error: playerError } = await supabase
                .from('players')
                .upsert({
                    id: playerId,
                    room_id: code,
                    name: name,
                    is_host: true,
                    team: null // User picks team in the next screen
                });

            if (playerError) throw playerError;

            // Store player ID in local storage for reconnection
            localStorage.setItem('cipher_player_id', playerId);
            localStorage.setItem('cipher_player_name', name);

            navigate(`/room/${code}`);
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

            // Check if room exists
            const { data: room, error: roomCheckError } = await supabase
                .from('rooms')
                .select('status')
                .eq('id', code)
                .single();

            if (roomCheckError || !room) {
                throw new Error('Room not found');
            }

            if (room.status !== 'lobby') {
                throw new Error('Game already in progress');
            }

            // Create Player
            const { data: { user } } = await supabase.auth.getUser();

            // Use existing ID from local storage, or auth ID, or generate new one
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

            navigate(`/room/${code}`);
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

                {/* Rebranded Header */}
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.5)] rotate-3 hover:rotate-6 transition-transform duration-500">
                            <Zap className="w-10 h-10 text-white fill-white" />
                        </div>
                    </div>
                    <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4 drop-shadow-2xl">
                        SCIPHER
                    </h1>
                    <p className="text-slate-400 text-xl font-medium tracking-wide">
                        The Ultimate Team Word Game
                    </p>
                </div>

                <div className="w-full max-w-sm space-y-6 bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-2xl">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Your Codename</label>
                        <Input
                            placeholder="Enter your name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={12}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <Button
                            variant="gold"
                            onClick={handleCreateRoom}
                            disabled={isCreating || isJoining}
                            className="w-full"
                        >
                            {isCreating ? 'Creating...' : 'Create Room'}
                        </Button>

                        <div className="space-y-2">
                            <Input
                                placeholder="CODE"
                                className="text-center uppercase tracking-widest font-mono"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={4}
                            />
                            <Button
                                variant="royal"
                                onClick={handleJoinRoom}
                                disabled={isCreating || isJoining}
                                className="w-full"
                            >
                                {isJoining ? 'Joining...' : 'Join Room'}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 text-slate-500 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Team based • Real-time • Fast paced</span>
                </div>
            </div>
        </Layout>
    );
};
