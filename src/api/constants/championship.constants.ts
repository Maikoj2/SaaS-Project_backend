export const ChampionshipStatus = [
    'draft',
    'registration',
    'in_progress',
    'completed',
    'cancelled',
] as const;

export type ChampionshipStatusValue =
    (typeof ChampionshipStatus)[number];


export const MatchStatus = [
    'scheduled',
    'in_progress',
    'finished',
    'walkover',
    'cancelled',
    'completed',
] as const;

export type MatchStatusValue =
    (typeof MatchStatus)[number];