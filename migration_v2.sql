-- Run this in your Supabase SQL Editor to update the database schema

-- Add game_type column
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS game_type text CHECK (game_type IN ('scipher', 'wavelength')) DEFAULT 'scipher';

-- Add wavelength_state column
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS wavelength_state jsonb;

-- Update existing rooms to have a game_type (optional, but good for consistency)
UPDATE public.rooms SET game_type = 'scipher' WHERE game_type IS NULL;
