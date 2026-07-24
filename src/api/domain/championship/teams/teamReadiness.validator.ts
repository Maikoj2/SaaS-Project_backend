import { Types } from 'mongoose';

import Team from '../../../models/mongoose/championship/team';
import { Player } from '../../../models/mongoose/championship/player';
import ChampionshipConfiguration from '../../../models/mongoose/championship/configuration';

import { DatabaseHelper } from '../../../utils/database.helper';
import { CustomError } from '../../../errors';

import { validateCompetitionRulesForTeam } from '../rules/competitionRules.validator';

export async function validateTeamsReadyForFixture(
    tenant: string,
    championshipId: string
): Promise<void> {
    const configuration = await DatabaseHelper.findOne(
        ChampionshipConfiguration,
        tenant,
        {
            championshipId: new Types.ObjectId(championshipId),
        }
    );

    if (!configuration) {
        throw new CustomError(
            'Championship configuration not found',
            404,
            'TeamReadinessValidator'
        );
    }

    const teams = await DatabaseHelper.find(
        Team,
        tenant,
        {
            championshipId: new Types.ObjectId(championshipId),
            status: {
                $in: ['pending', 'active'],
            },
        }
    );

    if (!teams.length) {
        throw new CustomError(
            'No teams found for this championship',
            400,
            'TeamReadinessValidator'
        );
    }

    if (configuration.minTeams && teams.length < configuration.minTeams) {
        throw new CustomError(
            `The championship requires at least ${configuration.minTeams} teams`,
            400,
            'TeamReadinessValidator'
        );
    }

    if (configuration.maxTeams && teams.length > configuration.maxTeams) {
        throw new CustomError(
            `The championship cannot have more than ${configuration.maxTeams} teams`,
            400,
            'TeamReadinessValidator'
        );
    }

    const allPlayerIds: string[] = [];

    for (const team of teams as any[]) {
        if (!team.players || team.players.length === 0) {
            throw new CustomError(
                `Team ${team.name} has no players`,
                400,
                'TeamReadinessValidator'
            );
        }

        if (!team.captainId) {
            throw new CustomError(
                `Team ${team.name} does not have a captain`,
                400,
                'TeamReadinessValidator'
            );
        }

        const captainBelongsToTeam = team.players.some(
            (playerId: any) =>
                playerId.toString() === team.captainId.toString()
        );

        if (!captainBelongsToTeam) {
            throw new CustomError(
                `Team ${team.name} has an invalid captain`,
                400,
                'TeamReadinessValidator'
            );
        }

        const players = await DatabaseHelper.find(
            Player,
            tenant,
            {
                _id: {
                    $in: team.players,
                },
                status: 'active',
            }
        );

        if (players.length !== team.players.length) {
            throw new CustomError(
                `Team ${team.name} has inactive or invalid players`,
                400,
                'TeamReadinessValidator'
            );
        }

        validateCompetitionRulesForTeam({
            competitionRules: configuration.competitionRules!,
            players,
            categoryId: team.categoryId,
            errorSource: 'TeamReadinessValidator',
        });

        for (const playerId of team.players) {
            allPlayerIds.push(playerId.toString());
        }
    }

    const uniquePlayerIds = new Set(allPlayerIds);

    if (uniquePlayerIds.size !== allPlayerIds.length) {
        throw new CustomError(
            'There are duplicated players across teams',
            400,
            'TeamReadinessValidator'
        );
    }
}