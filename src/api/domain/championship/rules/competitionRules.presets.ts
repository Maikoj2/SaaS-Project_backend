export type GenderMode = 'male' | 'female' | 'mixed' | 'open';

export interface TeamSizeRules {
    minPlayers: number;
    maxPlayers: number;
    starters: number;
}

export interface MixedRules {
    minMalePlayers?: number;
    minFemalePlayers?: number;
}

export interface CompetitionCategory {
    id: string;
    name: string;
    genderMode: GenderMode;
    minAge?: number;
    maxAge?: number;
    maxTeams?: number;
    teamSize?: TeamSizeRules;
    mixedRules?: MixedRules;
}

export interface CompetitionRules {
    genderMode: GenderMode;
    teamSize: TeamSizeRules;
    mixedRules?: MixedRules;
    categories: {
        enabled: boolean;
        list: CompetitionCategory[];
    };
}

export enum CompetitionRulePreset {
    BEACH_OPEN_2V2 = 'BEACH_OPEN_2V2',
    BEACH_MALE_2V2 = 'BEACH_MALE_2V2',
    BEACH_FEMALE_2V2 = 'BEACH_FEMALE_2V2',
    BEACH_MIXED_2V2 = 'BEACH_MIXED_2V2',

    INDOOR_OPEN_6V6 = 'INDOOR_OPEN_6V6',
    INDOOR_MALE_6V6 = 'INDOOR_MALE_6V6',
    INDOOR_FEMALE_6V6 = 'INDOOR_FEMALE_6V6',
    INDOOR_MIXED_6V6 = 'INDOOR_MIXED_6V6',
}

export const COMPETITION_RULE_PRESETS: Record<CompetitionRulePreset, CompetitionRules> = {
    [CompetitionRulePreset.BEACH_OPEN_2V2]: {
        genderMode: 'open',
        teamSize: {
            minPlayers: 2,
            maxPlayers: 4,
            starters: 2,
        },
        categories: {
            enabled: false,
            list: [],
        },
    },

    [CompetitionRulePreset.BEACH_MALE_2V2]: {
        genderMode: 'male',
        teamSize: {
            minPlayers: 2,
            maxPlayers: 4,
            starters: 2,
        },
        categories: {
            enabled: true,
            list: [
                {
                    id: 'male-open',
                    name: 'Masculino Libre',
                    genderMode: 'male',
                    minAge: 16,
                },
            ],
        },
    },

    [CompetitionRulePreset.BEACH_FEMALE_2V2]: {
        genderMode: 'female',
        teamSize: {
            minPlayers: 2,
            maxPlayers: 4,
            starters: 2,
        },
        categories: {
            enabled: true,
            list: [
                {
                    id: 'female-open',
                    name: 'Femenino Libre',
                    genderMode: 'female',
                    minAge: 16,
                },
            ],
        },
    },

    [CompetitionRulePreset.BEACH_MIXED_2V2]: {
        genderMode: 'mixed',
        teamSize: {
            minPlayers: 2,
            maxPlayers: 4,
            starters: 2,
        },
        mixedRules: {
            minMalePlayers: 1,
            minFemalePlayers: 1,
        },
        categories: {
            enabled: true,
            list: [
                {
                    id: 'mixed-open',
                    name: 'Mixto Libre',
                    genderMode: 'mixed',
                    minAge: 16,
                    mixedRules: {
                        minMalePlayers: 1,
                        minFemalePlayers: 1,
                    },
                },
            ],
        },
    },

    [CompetitionRulePreset.INDOOR_OPEN_6V6]: {
        genderMode: 'open',
        teamSize: {
            minPlayers: 6,
            maxPlayers: 12,
            starters: 6,
        },
        categories: {
            enabled: false,
            list: [],
        },
    },

    [CompetitionRulePreset.INDOOR_MALE_6V6]: {
        genderMode: 'male',
        teamSize: {
            minPlayers: 6,
            maxPlayers: 12,
            starters: 6,
        },
        categories: {
            enabled: true,
            list: [
                {
                    id: 'male-open',
                    name: 'Masculino Libre',
                    genderMode: 'male',
                    minAge: 16,
                },
            ],
        },
    },

    [CompetitionRulePreset.INDOOR_FEMALE_6V6]: {
        genderMode: 'female',
        teamSize: {
            minPlayers: 6,
            maxPlayers: 12,
            starters: 6,
        },
        categories: {
            enabled: true,
            list: [
                {
                    id: 'female-open',
                    name: 'Femenino Libre',
                    genderMode: 'female',
                    minAge: 16,
                },
            ],
        },
    },

    [CompetitionRulePreset.INDOOR_MIXED_6V6]: {
        genderMode: 'mixed',
        teamSize: {
            minPlayers: 6,
            maxPlayers: 12,
            starters: 6,
        },
        mixedRules: {
            minMalePlayers: 3,
            minFemalePlayers: 3,
        },
        categories: {
            enabled: true,
            list: [
                {
                    id: 'mixed-open',
                    name: 'Mixto Libre',
                    genderMode: 'mixed',
                    minAge: 16,
                    mixedRules: {
                        minMalePlayers: 3,
                        minFemalePlayers: 3,
                    },
                },
            ],
        },
    },
};

export function getCompetitionRulesByPreset(
    preset: CompetitionRulePreset
): CompetitionRules {
    const rules = COMPETITION_RULE_PRESETS[preset];

    if (!rules) {
        throw new Error(`Invalid competition rule preset: ${preset}`);
    }

    return rules;
}

export function getVolleyballTypeByPreset(
    preset: CompetitionRulePreset
): 'beach' | 'indoor' {
    const starters = getCompetitionRulesByPreset(preset).teamSize.starters;

    if (starters === 2) {
        return 'beach';
    }

    if (starters === 6) {
        return 'indoor';
    }

    throw new Error(`Cannot derive volleyball type from preset: ${preset}`);
}
