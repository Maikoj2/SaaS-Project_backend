import { CustomError } from '../../../errors';
import type {
    IConfigurationDocument,
    ICompetitionRules,
    IMixedRules,
    ITeamSizeRules,
} from '../../../models/mongoose/championship/configuration';
import {
    BeachVolleyballPosition,
    IndoorVolleyballPosition,
} from '../../../models/mongoose/championship/player';
import { ChampionshipType } from '../../../models/mongoose/championship/championship';

export type PublicGenderMode = ICompetitionRules['genderMode'];

export interface PublicGenderRules {
    mode: PublicGenderMode;
    minMalePlayers?: number;
    minFemalePlayers?: number;
}

export type PublicTeamSizeRules = ITeamSizeRules;

export interface PublicRegistrationCategory {
    id: string;
    name: string;
    teamSize?: PublicTeamSizeRules;
    gender: PublicGenderRules;
}

export interface PublicRegistrationRules {
    volleyballType: ChampionshipType;
    allowedPositions: Array<
        IndoorVolleyballPosition | BeachVolleyballPosition
    >;
    teamSize: PublicTeamSizeRules;
    gender: PublicGenderRules;
    categories: PublicRegistrationCategory[];
}

function configurationError(message: string): never {
    throw new CustomError(message, 500, 'PublicRegistrationRulesError');
}

function mapTeamSize(teamSize: ITeamSizeRules | undefined): PublicTeamSizeRules {
    if (
        !teamSize ||
        !Number.isInteger(teamSize.minPlayers) ||
        !Number.isInteger(teamSize.maxPlayers) ||
        !Number.isInteger(teamSize.starters) ||
        teamSize.minPlayers < 1 ||
        teamSize.maxPlayers < teamSize.minPlayers ||
        teamSize.starters < 1 ||
        teamSize.starters > teamSize.maxPlayers
    ) {
        return configurationError('Invalid public team size configuration');
    }

    return {
        minPlayers: teamSize.minPlayers,
        maxPlayers: teamSize.maxPlayers,
        starters: teamSize.starters,
    };
}

function mapGender(
    mode: PublicGenderMode,
    mixedRules?: IMixedRules
): PublicGenderRules {
    if (!['open', 'male', 'female', 'mixed'].includes(mode)) {
        return configurationError('Invalid public gender configuration');
    }

    if (mode !== 'mixed') {
        return { mode };
    }

    if (
        !Number.isInteger(mixedRules?.minMalePlayers) ||
        !Number.isInteger(mixedRules?.minFemalePlayers) ||
        (mixedRules?.minMalePlayers ?? 0) < 1 ||
        (mixedRules?.minFemalePlayers ?? 0) < 1
    ) {
        return configurationError('Invalid public mixed gender configuration');
    }

    return {
        mode,
        minMalePlayers: mixedRules?.minMalePlayers,
        minFemalePlayers: mixedRules?.minFemalePlayers,
    };
}

export function buildPublicRegistrationRules(
    configuration: Pick<
        IConfigurationDocument,
        'matchRules' | 'competitionRules'
    >
): PublicRegistrationRules {
    const volleyballType = configuration.matchRules?.volleyballType;
    const competitionRules = configuration.competitionRules;

    if (!competitionRules) {
        return configurationError('Competition rules are required');
    }

    if (!competitionRules.categories) {
        return configurationError('Competition categories configuration is required');
    }

    if (
        volleyballType !== ChampionshipType.BEACH &&
        volleyballType !== ChampionshipType.INDOOR
    ) {
        return configurationError('Unsupported volleyball type');
    }

    const allowedPositions = volleyballType === ChampionshipType.BEACH
        ? Object.values(BeachVolleyballPosition)
        : Object.values(IndoorVolleyballPosition);

    const categories = competitionRules.categories.enabled
        ? competitionRules.categories.list.map((category) => ({
            id: category.id,
            name: category.name,
            ...(category.teamSize && {
                teamSize: mapTeamSize(category.teamSize),
            }),
            gender: mapGender(category.genderMode, category.mixedRules),
        }))
        : [];

    return {
        volleyballType: volleyballType as ChampionshipType,
        allowedPositions,
        teamSize: mapTeamSize(competitionRules.teamSize),
        gender: mapGender(
            competitionRules.genderMode,
            competitionRules.mixedRules
        ),
        categories,
    };
}
