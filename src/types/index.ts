export type Team = 'neon' | 'cyber';

export interface Player {
    id: string;
    room_id: string;
    name: string;
    team: Team;
    is_host: boolean;
    stats: {
        words_guessed: number;
        total_points: number;
        describer_points: number;
    };
    created_at: string;
}

export interface Room {
    id: string;
    created_at: string;
    status: 'lobby' | 'playing' | 'finished';
    game_type: 'scipher' | 'wavelength';
    current_round: number;
    total_rounds: number;
    round_length: number;
    words_per_turn: number;
    turn_team: Team;
    turn_phase: 'ready' | 'playing';
    turn_describer_id: string | null;
    turn_end_time: string | null;
    current_words: {
        word: string;
        difficulty: 'easy' | 'medium' | 'hard';
        points: number;
        guessed?: boolean;
    }[] | null;
    scores: {
        neon: number;
        cyber: number;
        neon_turn_index?: number;
        cyber_turn_index?: number;
    };
    wavelength_state?: {
        target_percent: number; // 0-100
        dial_percent: number;   // 0-100
        spectrum_card: {
            left: string;
            right: string;
        };
        revealed: boolean;
    };
    plant_state?: PlantGameState;
    last_updated: string;
}

export type PlantPhase = 'draft' | 'monologue' | 'grill' | 'huddle' | 'verdict' | 'scoreboard';

export interface PlantGameState {
    phase: PlantPhase;
    active_planter_id: string;
    current_topic: string;
    candidate_words: string[];
    secret_word: string | null;
    audience_guesses: Record<string, string>; // PlayerID -> Guessed Word
    round_scores: Record<string, number>; // PlayerID -> Score for this round
    settings: {
        draft_time: number;
        monologue_time: number;
        grill_time: number;
        huddle_time: number;
        total_pot: number;
    };
}

export interface Message {
    id: number;
    room_id: string;
    player_id: string | null; // null for system messages
    player_name?: string;
    content: string;
    created_at: string;
    type: 'chat' | 'system' | 'guess_correct' | 'guess_incorrect';
    team?: Team;
}
