-- Add 'the_plant' to game_type check constraint
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_game_type_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_game_type_check CHECK (game_type IN ('scipher', 'wavelength', 'the_plant'));

-- Add plant_state column
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS plant_state jsonb;
