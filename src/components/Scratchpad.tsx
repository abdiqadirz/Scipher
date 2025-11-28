import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Plus, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ScratchpadProps {
    onSelectTag?: (tag: string) => void;
    className?: string;
}

export const Scratchpad: React.FC<ScratchpadProps> = ({ onSelectTag, className }) => {
    const [note, setNote] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    const handleAddNote = () => {
        if (!note.trim()) return;
        setTags(prev => [...prev, note.trim()]);
        setNote('');
    };

    const handleRemoveTag = (index: number) => {
        setTags(prev => prev.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddNote();
        }
    };

    return (
        <div className={clsx("flex flex-col gap-4 bg-obsidian-light/50 p-4 rounded-xl border border-white/10", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-silver uppercase tracking-widest">Scratchpad</h3>
                <span className="text-xs text-silver/50">Private Notes</span>
            </div>

            <div className="flex gap-2">
                <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a suspect word..."
                    className="h-10 text-sm"
                />
                <Button onClick={handleAddNote} size="sm" variant="outline" className="px-3">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[100px] content-start">
                {tags.length === 0 && (
                    <div className="w-full text-center text-silver/30 text-xs italic py-8">
                        No notes yet. Keep your ears open!
                    </div>
                )}
                {tags.map((tag, idx) => (
                    <div
                        key={idx}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm text-silver hover:text-white transition-all cursor-pointer"
                        onClick={() => onSelectTag?.(tag)}
                    >
                        <span>{tag}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveTag(idx); }}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
