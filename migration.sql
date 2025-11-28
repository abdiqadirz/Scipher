-- Add words_per_turn to rooms
alter table public.rooms add column words_per_turn int default 10;

-- Add turn_phase to rooms
alter table public.rooms add column turn_phase text check (turn_phase in ('ready', 'playing')) default 'ready';

-- Change current_word to current_words (we can't easily change type, so we'll drop and re-add or just add a new column)
-- Easiest is to just add new column and ignore the old one
alter table public.rooms add column current_words jsonb;
