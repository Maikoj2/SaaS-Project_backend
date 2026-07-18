
import { Types } from 'mongoose';
import { Group } from '../../models/mongoose/championship/group';
import { DatabaseHelper } from '../../utils/database.helper';
import { CustomError } from '../../errors';
import { PaginationOptions } from '../../interfaces';
import { PopulateOptions } from '../../interfaces/IhelperDatabase';

export class GroupService {

    async getGroupsByChampionship(
        tenant: string,
        championshipId: string,
        filters: {
            status?: string;
            groupDistributionId?: string;
        },
        options?: Partial<PaginationOptions>
    ) {
        const query: Record<string, any> = {
            championshipId: new Types.ObjectId(championshipId),
        };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.groupDistributionId) {
            query.groupDistributionId = new Types.ObjectId(
                filters.groupDistributionId
            );
        }


        const groups = await DatabaseHelper.getItemsWithRelations(
            Group,
            tenant,
            query,
            options,
            {
                nested: this.populateOptions
            },

        );

        return groups;
    }

    async getGroupById(
        tenant: string,
        championshipId: string,
        groupId: string
    ) {

        const group = await DatabaseHelper.findOneWithRelations(
            Group,
            tenant,
            {
                _id: new Types.ObjectId(groupId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                nested: this.populateOptions
            }
        );


        if (!group) {
            throw new CustomError(
                'Group not found',
                404,
                'GroupServiceError'
            );
        }

        return group;
    }

    async getGroupStandings(
        tenant: string,
        championshipId: string,
        groupId: string
    ) {

        const group = await DatabaseHelper.findOneWithRelations(
            Group,
            tenant,
            {
                _id: new Types.ObjectId(groupId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                nested: this.standingsPopulateOptions
            }
        );

        if (!group) {
            throw new CustomError(
                'Group not found',
                404,
                'GroupServiceError'
            );
        }

        return {
            groupId: group._id,
            name: group.name,
            status: group.status,
            standings: group.rankings,
        };
    }

    async getGroupsByGroupDistribution(
        tenant: string,
        groupDistributionId: string,
        options?: Partial<PaginationOptions>
    ) {

        const query = {
            groupDistributionId: new Types.ObjectId(groupDistributionId),
        };
        const groups = await DatabaseHelper.getItemsWithRelations(
            Group,
            tenant,
            query,
            options,
            {
                nested: this.populateOptions
            },

        );

        return groups;
    }
    private get populateOptions(): PopulateOptions[] {
        return [
            {
                path: 'teams',
                select: 'name clubName teamName',
            },
            {
                path: 'matches',
                select: 'status startTime homeTeamId awayTeamId score winnerId bracketMatchNumber isEliminationMatch',
                populate: [
                    {
                        path: 'homeTeamId',
                        select: 'name teamName clubName',
                    },
                    {
                        path: 'awayTeamId',
                        select: 'name teamName clubName',
                    },
                ],
            },
            {
                path: 'rankings.teamId',
                select: 'name teamName clubName',
            }
        ];
    }
    private get standingsPopulateOptions(): PopulateOptions[] {
        return [
            {
                path: 'rankings.teamId',
                select: 'name teamName clubName',
            },
        ];
    }


} 