import { Types } from 'mongoose';

import { CustomError } from '../../errors';
import { DatabaseHelper } from '../../utils/database.helper';

import Group, { IGroupDocument } from '../../models/mongoose/championship/group';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';

import {
    GroupStandingsResult,
    QualificationOptions,
    Standing,
    generateEliminationBracket,
    qualifyTeamsFromGroupStandings,
} from '../../domain/championship/competition';
import EliminationBracket from '../../models/mongoose/championship/eliminationBracket';
import { IMatchDocument } from '../../models/mongoose/championship/match';

type GenerateBracketInput = {
    championshipId: string;
    groupDistributionId: string;
};

export class EliminationService {
    async generateBracketFromGroupDistribution(
        tenant: string,
        data: GenerateBracketInput
    ) {
        const configuration: any = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            {
                championshipId: new Types.ObjectId(data.championshipId),
            },
            {
                throwError: true,
                errorMessage: 'Championship configuration not found',
            }
        );

        const eliminationSettings = configuration.eliminationSettings;

        if (!eliminationSettings?.enabled) {
            throw new CustomError(
                'Elimination stage is not enabled for this championship',
                400,
                'EliminationServiceError'
            );
        }

        const groups = await DatabaseHelper.findOneWithRelations(
            Group,
            tenant,
            {
                _id: new Types.ObjectId(data.groupDistributionId),
            },
            {
                nested: [
                    { path: 'matches', select: 'status matchNumber homeTeamId awayTeamId' },
                    { path: 'rankings.teamId', select: 'name' }
                ]
            }
        )
        if (!groups) {
            throw new CustomError(
                'No groups found for this group distribution',
                404,
                'EliminationServiceError'
            );
        }
        this.validateGroupMatchesAreCompleted(groups)

        const groupStandings = groups.map((group: any) =>
            this.mapGroupToGroupStandingsResult(group)
        );

        this.validateGroupsHaveStandings(groupStandings);

        const qualificationOptions: QualificationOptions = {
            mode: eliminationSettings.qualificationMode,
            topPerGroup: eliminationSettings.topPerGroup,
            bestThirdsCount: eliminationSettings.bestThirdsCount,
            totalQualifiers: eliminationSettings.totalQualifiers,
            normalizeStandingsForUnevenGroups:
                eliminationSettings.normalizeStandingsForUnevenGroups,
            tieBreakerCriteria: configuration.tieBreakerCriteria,
        };

        let qualificationResult;

        try {
            qualificationResult = qualifyTeamsFromGroupStandings(
                groupStandings,
                qualificationOptions
            );
        } catch (error) {
            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : 'Error qualifying teams from group standings',
                400,
                'EliminationServiceError'
            );
        }

        if (
            eliminationSettings.bracketSize &&
            qualificationResult.totalQualified !== eliminationSettings.bracketSize
        ) {
            throw new CustomError(
                `Bracket size mismatch. Expected ${eliminationSettings.bracketSize} teams, but got ${qualificationResult.totalQualified}.`,
                400,
                'EliminationServiceError'
            );
        }

        let bracket;

        try {
            bracket = generateEliminationBracket(
                qualificationResult.qualifiedTeams,
                {
                    includeThirdPlaceMatch:
                        eliminationSettings.includeThirdPlaceMatch,
                    initialMatchNumber:
                        eliminationSettings.initialMatchNumber ?? 1,
                }
            );
        } catch (error) {
            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : 'Error generating elimination bracket',
                400,
                'EliminationServiceError'
            );
        }

        const eliminationBracket = await DatabaseHelper.findOne(
            EliminationBracket,
            tenant,
            {
                championshipId: new Types.ObjectId(data.championshipId),
                groupDistributionId: new Types.ObjectId(data.groupDistributionId),
                status: {
                    $in: ["draft", "active"]
                }
            },
            {
                throwError: false,
                errorMessage: 'Elimination bracket not found',
            }
        )
        if (eliminationBracket) {
            throw new CustomError(
                'An active elimination bracket already exists for this group distribution',
                409,
                'EliminationServiceError'
            )
        }

        const createdEliminationBracket = await DatabaseHelper.create(
            EliminationBracket,
            tenant,
            {
                championshipId: new Types.ObjectId(data.championshipId),
                groupDistributionId: new Types.ObjectId(data.groupDistributionId),
                name: 'Elimination Bracket',
                qualification: qualificationResult,
                bracket,
                settings: {
                    eliminationSettings,
                    tieBreakerCriteria: configuration.tieBreakerCriteria,
                },
                status: 'active',

            }
        )

        return {
            championshipId: data.championshipId,
            groupDistributionId: data.groupDistributionId,
            eliminationBracketId: createdEliminationBracket._id,
            settings: createdEliminationBracket.settings,
            qualification: createdEliminationBracket.qualification,
            bracket: createdEliminationBracket.bracket,
            status: createdEliminationBracket.status,
        };
    }

    private mapGroupToGroupStandingsResult(group: any): GroupStandingsResult {
        const standings: Standing[] = (group.rankings || []).map(
            (ranking: any) => ({
                team: {
                    id: this.getTeamId(ranking.teamId),
                    name: this.getTeamName(ranking.teamId),
                    seed: ranking.position,
                },

                PJ: ranking.matchesPlayed,
                PG: ranking.won,
                PP: ranking.lost,
                WO: ranking.walkovers,

                SF: ranking.setsFor,
                SC: ranking.setsAgainst,
                CS: this.sanitizeRatio(ranking.setRatio),

                TF: ranking.pointsFor,
                TC: ranking.pointsAgainst,
                CT: this.sanitizeRatio(ranking.pointRatio),

                PTS: ranking.points,
                POS: ranking.position,
            })
        );

        return {
            groupName: group.name,
            standings,
        };
    }

    private validateGroupsHaveStandings(
        groupStandings: GroupStandingsResult[]
    ): void {
        groupStandings.forEach((group) => {
            if (!group.standings.length) {
                throw new CustomError(
                    `Group ${group.groupName} does not have standings`,
                    400,
                    'EliminationServiceError'
                );
            }

            const invalidStanding = group.standings.find(
                (standing) => !standing.team.id
            );

            if (invalidStanding) {
                throw new CustomError(
                    `Group ${group.groupName} has standings with invalid team data`,
                    400,
                    'EliminationServiceError'
                );
            }
        });
    }

    private getTeamId(team: any): string {
        if (!team) return '';

        if (team._id) {
            return team._id.toString();
        }

        return team.toString();
    }

    private getTeamName(team: any): string {
        if (!team) return '';

        return team.name || team.teamName || 'Unnamed team';
    }

    private sanitizeRatio(value: any): number {
        if (value === null || value === undefined) {
            return 0;
        }

        if (value === Infinity || value === 'Infinity') {
            return Number.POSITIVE_INFINITY;
        }

        return Number(value);
    }

    private validateGroupMatchesAreCompleted(groups: IGroupDocument): void {
        const pendingMatches = groups.flatMap((group: IMatchDocument) =>
            (group.matches || []).filter(
                (match: IMatchDocument) => !['finished', 'walkover'].includes(match.status)
            )
        );

        if (pendingMatches.length) {
            throw new CustomError(
                `Cannot generate elimination bracket. There are ${pendingMatches.length} pending group matches.`,
                400,
                'EliminationServiceError'
            );
        }
    }
}