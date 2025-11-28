import React, { useState, useEffect, useRef } from 'react';
import type { Message, Team } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Send } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatProps {
    messages: Message[];
    onSendMessage: (content: string) => void;
    currentUserTeam?: Team;
    disabled?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, disabled }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || disabled) return;
        onSendMessage(input.trim());
        setInput('');
    };

    return (
        <div className="flex flex-col h-[400px] bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messages.map((msg) => {
                    const isSystem = msg.type === 'system';
                    const isCorrect = msg.type === 'guess_correct';
                    const isNeon = msg.team === 'neon';

                    return (
                        <div
                            key={msg.id}
                            className={clsx(
                                "flex flex-col max-w-[85%]",
                                isSystem ? "mx-auto items-center text-center w-full" : (isNeon ? "items-start" : "items-end ml-auto")
                            )}
                        >
                            {!isSystem && (
                                <span className={clsx(
                                    "text-xs font-bold mb-1 px-2",
                                    isNeon ? "text-gold" : "text-royal"
                                )}>
                                    {msg.player_name}
                                </span>
                            )}

                            <div className={clsx(
                                "px-3 py-2 rounded-lg text-sm break-words",
                                isSystem && "bg-slate-700/50 text-slate-300 text-xs italic py-1 px-4 rounded-full",
                                isCorrect && "bg-green-500/20 text-green-400 border border-green-500/50 font-bold w-full text-center",
                                !isSystem && !isCorrect && isNeon && "bg-gold/10 text-gold-glow border border-gold/20 rounded-tl-none",
                                !isSystem && !isCorrect && !isNeon && "bg-royal/10 text-royal-glow border border-royal/20 rounded-tr-none"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={disabled ? "Only guessers can type..." : "Type your guess..."}
                    disabled={disabled}
                    className="flex-1"
                />
                <Button type="submit" variant="ghost" disabled={disabled || !input.trim()} className="px-3">
                    <Send className="w-5 h-5" />
                </Button>
            </form>
        </div>
    );
};
