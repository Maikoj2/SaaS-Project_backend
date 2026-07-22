import { CustomError } from '../../../errors';

type GenderMode = 'male' | 'female' | 'mixed' | 'open';

interface TeamSizeRules {
    minPlayers: number;
    maxPlayers: number;
    starters: number;
}

interface MixedRules {
    minMalePlayers?: number;
    minFemalePlayers?: number;
}

interface CompetitionCategory {
    id: string;
    name: string;
    genderMode: GenderMode;
    minAge?: number;
    maxAge?: number;
    maxTeams?: number;
    teamSize?: TeamSizeRules;
    mixedRules?: MixedRules;
}

interface CompetitionRules {
    genderMode: GenderMode;
    teamSize?: TeamSizeRules;
    mixedRules?: MixedRules;
    categories?: {
        enabled: boolean;
        list: CompetitionCategory[];
    };
}

interface PlayerLike {
    gender?: 'male' | 'female';
    dateOfBirth?: Date | string;
}

interface ValidateCompetitionRulesParams {
    competitionRules: CompetitionRules;
    players: PlayerLike[];
    categoryId?: string;
    errorSource?: string;
}

export function validateCompetitionRulesForTeam({
    competitionRules,
    players,
    categoryId,
    errorSource = 'CompetitionRulesValidator',
}: ValidateCompetitionRulesParams): void {
    validateTeamSize(competitionRules, players, errorSource);
    validateCategory(competitionRules, categoryId, errorSource);

    const genderMode = getEffectiveGenderMode(
        competitionRules,
        categoryId
    );

    const validator = validatorsByGenderMode[genderMode];

    if (!validator) {
        throw new CustomError(
            `Unsupported gender mode: ${genderMode}`,
            400,
            errorSource
        );
    }

    validator({
        competitionRules,
        players,
        categoryId,
        errorSource,
    });
}

function validateTeamSize(
    competitionRules: CompetitionRules,
    players: PlayerLike[],
    errorSource: string
): void {
    if (!competitionRules.teamSize) return;

    const { minPlayers, maxPlayers } = competitionRules.teamSize;

    if (players.length < minPlayers) {
        throw new CustomError(
            `The team must have at least ${minPlayers} players`,
            400,
            errorSource
        );
    }

    if (players.length > maxPlayers) {
        throw new CustomError(
            `The team cannot have more than ${maxPlayers} players`,
            400,
            errorSource
        );
    }
}

function validateCategory(
    competitionRules: CompetitionRules,
    categoryId: string | undefined,
    errorSource: string
): void {
    if (!competitionRules.categories?.enabled) return;

    if (!categoryId) {
        throw new CustomError(
            'Category is required for this championship',
            400,
            errorSource
        );
    }

    const categoryExists = competitionRules.categories.list.some(
        (category) => category.id === categoryId
    );

    if (!categoryExists) {
        throw new CustomError(
            'Invalid category for this championship',
            400,
            errorSource
        );
    }
}

function getEffectiveGenderMode(
    competitionRules: CompetitionRules,
    categoryId?: string
): GenderMode {
    if (!competitionRules.categories?.enabled || !categoryId) {
        return competitionRules.genderMode;
    }

    const category = competitionRules.categories.list.find(
        (item) => item.id === categoryId
    );

    return category?.genderMode || competitionRules.genderMode;
}

type GenderModeValidatorParams = {
    competitionRules: CompetitionRules;
    players: PlayerLike[];
    categoryId?: string;
    errorSource: string;
};

const validatorsByGenderMode: Record<
    GenderMode,
    (params: GenderModeValidatorParams) => void
> = {
    mixed: validateMixedGenderMode,
    male: validateMaleGenderMode,
    female: validateFemaleGenderMode,
    open: validateOpenGenderMode,
};

function validateMixedGenderMode({
    competitionRules,
    players,
    categoryId,
    errorSource,
}: GenderModeValidatorParams): void {
    const mixedRules = getEffectiveMixedRules(
        competitionRules,
        categoryId
    );

    const malePlayers = players.filter(
        (player) => player.gender === 'male'
    ).length;

    const femalePlayers = players.filter(
        (player) => player.gender === 'female'
    ).length;

    const minMalePlayers = mixedRules?.minMalePlayers || 0;
    const minFemalePlayers = mixedRules?.minFemalePlayers || 0;

    if (malePlayers < minMalePlayers) {
        throw new CustomError(
            `The team must have at least ${minMalePlayers} male player(s)`,
            400,
            errorSource
        );
    }

    if (femalePlayers < minFemalePlayers) {
        throw new CustomError(
            `The team must have at least ${minFemalePlayers} female player(s)`,
            400,
            errorSource
        );
    }
}

function validateMaleGenderMode({
    players,
    errorSource,
}: GenderModeValidatorParams): void {
    const invalidPlayers = players.filter(
        (player) => player.gender !== 'male'
    );

    if (invalidPlayers.length > 0) {
        throw new CustomError(
            'Only male players are allowed in this competition',
            400,
            errorSource
        );
    }
}

function validateFemaleGenderMode({
    players,
    errorSource,
}: GenderModeValidatorParams): void {
    const invalidPlayers = players.filter(
        (player) => player.gender !== 'female'
    );

    if (invalidPlayers.length > 0) {
        throw new CustomError(
            'Only female players are allowed in this competition',
            400,
            errorSource
        );
    }
}

function validateOpenGenderMode(): void {
    // Open mode does not validate player gender.
}

function getEffectiveMixedRules(
    competitionRules: CompetitionRules,
    categoryId?: string
): MixedRules | undefined {
    if (!competitionRules.categories?.enabled || !categoryId) {
        return competitionRules.mixedRules;
    }

    const category = competitionRules.categories.list.find(
        (item) => item.id === categoryId
    );

    return category?.mixedRules || competitionRules.mixedRules;
}