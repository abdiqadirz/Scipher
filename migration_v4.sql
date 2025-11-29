-- Add difficulty column to rooms table
alter table public.rooms 
add column difficulty text check (difficulty in ('easy', 'medium', 'hard', 'superhard')) default 'medium';
