import { PaginateResult } from "mongoose";
import { Logger } from "../../config";
import { AuthError } from "../../errors";
import GroupDistribution, { ITeamDistribution } from "../../models/mongoose/championship/groupsDistrubution";
import { DatabaseHelper } from "../../utils/database.helper";
import Position, { IPositionDocument } from "../../models/mongoose/championship/position";
import { Schema, Types } from "mongoose";
import Group from "../../models/mongoose/championship/group";
import Match from "../../models/mongoose/championship/match";
import Court from "../../models/mongoose/championship/court";

import {
    DistributionStrategy,
    distributeTeamsIntoGroups,
    generateFixtureForGroups,
    scheduleMatchesOnCourts,
    mapCompetitionGroupsToDistributionMap,
    mapDistributionMapToMongoDistribution,
    mapPositionsToCompetitionTeams,
    MatchStatus,
} from "../../domain/championship/competition"
import Championship from "../../models/mongoose/championship/championship";
import ChampionshipConfiguration from "../../models/mongoose/championship/configuration";




export class GroupDistributionService {
    private logger: Logger;
    constructor() {
        this.logger = new Logger();
    }

    async createGroupDistribution(
        championshipId: string,
        tenant: string,
        data: Partial<any>
    ): Promise<any> {


        const positions = await this.getTotalTeams(tenant, championshipId);

        if (positions.totalDocs === 0) {
            throw new AuthError('No teams found');
        }
        const existingGroupDistribution = await DatabaseHelper.findOne(
            GroupDistribution,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                status: { $in: ['draft', 'active'] },
            }
        );


        if (existingGroupDistribution) {
            throw new AuthError(
                'A group distribution already exists for this championship'
            );
        }

        let availableCourts: any[] = [];

        if (data.schedule?.enabled) {
            const championship = await DatabaseHelper.findOneWithRelations(
                Championship,
                tenant,
                {
                    _id: new Types.ObjectId(championshipId),
                },
                {
                    basic: ['courts'],
                }
            );

            if (!championship) {
                throw new AuthError('Championship not found');
            }

            availableCourts = ((championship as any).courts || []).filter(
                (court: any) => court.status === 'available'
            );

            if (!availableCourts.length) {
                throw new AuthError(
                    'No available courts found for this championship'
                );
            }
        }


        const competitionTeams = mapPositionsToCompetitionTeams(
            positions.docs as any
        );

        const ChampionshipConf = await DatabaseHelper.findOneWithRelations(
            ChampionshipConfiguration,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
            },
            {}
        );

        const strategy = this.mapFormatTypeToDistributionStrategy(
            ChampionshipConf?.distributionStrategy || 'serpentine'
        );

        const distributionResult = distributeTeamsIntoGroups(competitionTeams, {
            strategy,
            numberOfGroups: data.numberOfGroups || data.cantGroups,
            maxTeamsPerGroup: data.maxTeamsPerGroup,
            groupSizePreference: data.groupSizePreference,
            avoidSameClub: data.avoidSameClub ?? true,
            minTeams: data.minTeams,
            maxTeams: data.maxTeams,
        });

        const distributionMap = mapCompetitionGroupsToDistributionMap(
            distributionResult.groups
        );

        const mongoDistribution = mapDistributionMapToMongoDistribution(
            distributionMap
        );

        const groupDistributionData = {
            championshipId:
                new Types.ObjectId(championshipId),

            name: data.name || 'fase de grupos',

            /**
             * Dejamos ambos nombres para evitar romper el modelo actual
             * si todavía usa cantTeams/cantGroups o teams/groups.
             */
            cantTeams: positions.totalDocs,
            cantGroups: distributionResult.groupPlan.numberOfGroups,
            teams: positions.totalDocs,
            groups: distributionResult.groupPlan.numberOfGroups,

            distribution: mongoDistribution,

            formatType: data.formatType || 'serpentine',
            status: 'draft' as 'draft' | 'active' | 'completed',
            customRules: data.customRules || '',
        };
        const groupDistributionCreated = await DatabaseHelper.create(
            GroupDistribution,
            tenant,
            groupDistributionData
        );

        if (!groupDistributionCreated) {
            throw new AuthError('Error creating group distribution');
        }

        const createdGroups = [];
        const createdMatches = [];

        const fixtureResult = generateFixtureForGroups(distributionResult.groups, {
            initialMatchNumber: 1,
            includeRoundNumber: true,
        });

        for (const group of distributionResult.groups) {
            const teamIds = group.teams.map(
                (team) => new Types.ObjectId(team.id)
            );

            const groupData = {
                championshipId: groupDistributionCreated.championshipId,
                groupDistributionId: groupDistributionCreated._id,
                name: group.name,
                teams: teamIds,
                matches: [],
                rankings: [],
                status: 'active' as 'active' | 'completed',
            };

            const groupCreated = await DatabaseHelper.create(
                Group,
                tenant,
                groupData
            );

            if (!groupCreated) {
                throw new AuthError(`Error creating group ${group.name}`);
            }

            const groupMatches = fixtureResult.matches.filter(
                (match) => match.groupName === group.name
            );

            const matchIds = [];

            for (const fixtureMatch of groupMatches) {
                const matchData = {
                    championshipId: new Types.ObjectId(championshipId),

                    phaseId: data.phaseId
                        ? new Types.ObjectId(data.phaseId)
                        : undefined,

                    groupId: groupCreated._id,

                    homeTeamId: new Types.ObjectId(fixtureMatch.teamA.id),
                    awayTeamId: new Types.ObjectId(fixtureMatch.teamB.id),

                    courtId: data.courtId
                        ? new Types.ObjectId(data.courtId)
                        : undefined,

                    gameFormatId: data.gameFormatId
                        ? new Types.ObjectId(data.gameFormatId)
                        : undefined,

                    statistics: [],
                    status: 'scheduled' as 'scheduled',
                };

                const createdMatch = await DatabaseHelper.create(
                    Match,
                    tenant,
                    matchData
                );

                if (!createdMatch) {
                    throw new AuthError(
                        `Error creating match ${fixtureMatch.matchNumber}`
                    );
                }

                matchIds.push(createdMatch._id);
                createdMatches.push(createdMatch);
            }

            groupCreated.matches = matchIds;
            await groupCreated.save();

            createdGroups.push(groupCreated);
        }

        let scheduleSummary = {
            enabled: false,
        };

        if (data.schedule?.enabled) {

            const matchesForScheduling = createdMatches.map(
                (match: any, index: number) => ({
                    id: match._id.toString(),
                    matchNumber: index + 1,
                    groupName: '',
                    teamA: {
                        id: match.homeTeamId.toString(),
                        name: '',
                    },
                    teamB: {
                        id: match.awayTeamId.toString(),
                        name: '',
                    },
                    status: 'scheduled' as MatchStatus,

                })
            );


            const scheduledResult = scheduleMatchesOnCourts(
                matchesForScheduling,
                {
                    courts: availableCourts.map((court: any) => ({
                        id: court._id.toString(),
                        name: court.name,
                    })),
                    date: data.schedule.date,
                    startTime: data.schedule.startTime,
                    matchDurationMinutes:
                        data.schedule.matchDurationMinutes ?? 60,
                    breakMinutes:
                        data.schedule.breakMinutes ?? 0,
                    avoidBackToBackMatches:
                        data.schedule.avoidBackToBackMatches ?? true,
                }
            );

            for (const scheduledMatch of scheduledResult.matches) {
                const startTime = scheduledMatch.time
                    ? new Date(`${scheduledMatch.date}T${scheduledMatch.time}`)
                    : undefined;

                const endTime = startTime
                    ? new Date(
                        startTime.getTime() +
                        (data.schedule.matchDurationMinutes ?? 60) *
                        60 *
                        1000
                    )
                    : undefined;

                const updatedMatch = await DatabaseHelper.findOneAndUpdate(
                    Match,
                    tenant,
                    {
                        _id: scheduledMatch.id
                    },
                    {
                        $set: {
                            courtId: new Types.ObjectId(scheduledMatch.courtId),
                            startTime,
                            endTime,
                        },
                    },
                    { upsert: true, new: true }
                )
                if (updatedMatch) {
                    const matchIndex: any = createdMatches.findIndex(
                        (match: any) => match._id.toString() === scheduledMatch.id
                    );

                    if (matchIndex !== -1) {
                        createdMatches[matchIndex] = updatedMatch;
                    }
                }
            }

            scheduleSummary = {
                enabled: true,
                courtsUsed: availableCourts.length,
                totalMatches: scheduledResult.totalMatches,
                totalSlots: scheduledResult.totalSlots,
                date: data.schedule.date,
                startTime: data.schedule.startTime,
                matchDurationMinutes:
                    data.schedule.matchDurationMinutes ?? 60,
                breakMinutes:
                    data.schedule.breakMinutes ?? 0,
                avoidBackToBackMatches:
                    data.schedule.avoidBackToBackMatches ?? true,
            } as any;
        }

        return {
            groupDistribution: groupDistributionCreated,
            groups: createdGroups,
            matches: createdMatches,
            groupPlan: distributionResult.groupPlan,
            fixture: {
                totalMatches: fixtureResult.totalMatches,
            },
            schedule: scheduleSummary,
            warnings: distributionResult.warnings,
        };
    }


    private mapFormatTypeToDistributionStrategy(
        formatType: string
    ): DistributionStrategy {
        switch (formatType) {
            case 'serpentine':
                return 'serpentine';

            case 'linear':
                return 'linear';

            case 'random':
                return 'random';

            case 'balancedByClub':
                return 'balancedByClub';

            default:
                throw new AuthError('Invalid format type');
        }
    }

    // async createGroupDistribution(championshipId: string, tenant: string, data: Partial<any>): Promise<any> {
    //     const totalTeams = await this.getTotalTeams(tenant, championshipId);
    //     if (totalTeams.totalDocs === 0) {
    //         throw new AuthError('No teams found');
    //     }
    //     const teams = totalTeams.docs.map(team => team.teamId._id.toString());

    //     // Determinar el número de grupos

    //     const numberOfGroups = data.cantTeams ? data.cantTeams : this.calculateNumberOfGroups(totalTeams.totalDocs);


    //     switch (data.formatType) {
    //         case 'serpentine':
    //             const groupDistribution = this.teamsDistributionSerpentine(numberOfGroups, totalTeams.totalDocs, teams);

    //             const groupDistributionData = {
    //                 championshipId: championshipId as unknown as Schema.Types.ObjectId,
    //                 name: data.name || 'fase de grupos',
    //                 cantTeams: totalTeams.totalDocs,
    //                 cantGroups: numberOfGroups,
    //                 distribution: groupDistribution,
    //                 formatType: data.formatType || 'serpentine',
    //                 status: 'draft' as 'draft' | 'active' | 'completed',
    //                 customRules: data.customRules || ''
    //             }
    //             const groupDistributionCreated = await DatabaseHelper.create(GroupDistribution, tenant, groupDistributionData);
    //             if (!groupDistributionCreated) {
    //                 throw new AuthError('Error creating group distribution');
    //             }

    //             for (const [groupName, teams] of Object.entries(groupDistribution)) {
    //                 const teamIds = teams.map((team: any) => team.teamId);

    //                 const matches = await this.generateRoundRobinMatches(teamIds.map((teamId: any) => teamId.toString()), championshipId, tenant);

    //                 const groupData = {
    //                     groupDistributionId: groupDistributionCreated._id as unknown as Schema.Types.ObjectId,
    //                     name: groupName,
    //                     teams: teamIds,
    //                     matches: [], // Inicialmente vacío, puedes llenarlo más tarde
    //                     rankings: [], // Inicialmente vacío, puedes llenarlo más tarde
    //                     status: 'active' as 'active' | 'completed'
    //                 };

    //                 const groupCreated = await DatabaseHelper.create(Group, tenant, groupData);
    //                 if (!groupCreated) {
    //                     throw new AuthError('Error creating group');
    //                 }
    //                 // for (const round of Object.values(matches)) {
    //                 //     for (const match of round) {
    //                 //         const newMatch = {
    //                 //             championshipId: championshipId as unknown as Schema.Types.ObjectId,
    //                 //             homeTeamId: match.home as unknown as Schema.Types.ObjectId,
    //                 //             awayTeamId: match.away as unknown as Schema.Types.ObjectId,
    //                 //             courtId: [] as unknown as Schema.Types.ObjectId, // Assign correct court ID
    //                 //             gameFormatId: [] as unknown as Schema.Types.ObjectId, // Assign correct game format ID
    //                 //             status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    //                 //         };

    //                 //         await DatabaseHelper.create(Match, tenant, newMatch);
    //                 //     }
    //                 // }
    //             }


    //             return { groupDistributionCreated };
    //         case 'linear':
    //             break;
    //         case 'random':
    //             break;
    //         case 'custom':
    //             break;
    //         default:
    //             throw new AuthError('Invalid format type');
    //     }


    //     return totalTeams.docs;
    // }

    // async getGroupDistributions(championshipId: string): Promise<IGroupDistributionDocument[]> {
    //     return await GroupDistribution.findByChampionship(championshipId);
    // }

    // async updateGroupDistribution(id: string, distribution: { [key: string]: any }): Promise<IGroupDistributionDocument | null> {
    //     return await GroupDistribution.updateDistribution(id, distribution);
    // }

    // async deleteGroupDistribution(id: string): Promise<IGroupDistributionDocument | null> {
    //     return await GroupDistribution.findByIdAndDelete(id);
    // }
    private getTotalTeams = async (tenant: string, championshipId: string): Promise<PaginateResult<IPositionDocument>> => {
        try {

            const totalRegistrations = await DatabaseHelper.count(Position, tenant, { championshipId });
            const registrations = await DatabaseHelper.getItemsWithRelations(
                Position,
                tenant,
                { championshipId },
                { sort: { position: 1 }, limit: totalRegistrations, select: ['teamId', 'position'] },
                { basic: ['teamId'], nested: [{ path: 'teamId', select: 'name' }] }
            );


            return registrations;
        } catch (error) {
            throw new AuthError(error instanceof Error ? error.message : 'Error getting total teams');
        }
    }


}