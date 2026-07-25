import { Response } from 'express';

import { Logger } from '../../config/logger/WinstonLogger';
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { GroupService } from '../../services/championship/group.service';

export class GroupController {
    private logger: Logger;
    private groupService: GroupService;

    constructor() {
        this.logger = new Logger();
        this.groupService = new GroupService();
    }

    getGroupsByChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const sortField =
                typeof req.query.sortField === 'string'
                    ? req.query.sortField
                    : 'createdAt';

            const sortDirection: 1 | -1 =
                req.query.sortOrder === 'asc' ? 1 : -1;

            const sort: Record<string, 1 | -1> = {
                [sortField]: sortDirection,
            };
            const result = await this.groupService.getGroupsByChampionship(
                tenant,
                req.params.championshipId,
                {
                    status: req.query.status as string,
                    groupDistributionId: req.query.groupDistributionId as string,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                    sort
                }
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Groups retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error('Error retrieving groups:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving groups'
                )
            );
        }
    };

    getGroupById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.groupService.getGroupById(
                tenant,
                req.params.championshipId,
                req.params.groupId
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Group retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error('Error retrieving group:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving group'
                )
            );
        }
    };

    getGroupStandings = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.groupService.getGroupStandings(
                tenant,
                req.params.championshipId,
                req.params.groupId
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Group standings retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error('Error retrieving group standings:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving group standings'
                )
            );
        }
    };

    getGroupsByGroupDistribution = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const sortField =
                typeof req.query.sortField === 'string'
                    ? req.query.sortField
                    : 'createdAt';

            const sortDirection: 1 | -1 =
                req.query.sortOrder === 'asc' ? 1 : -1;

            const sort: Record<string, 1 | -1> = {
                [sortField]: sortDirection,
            };

            const result =
                await this.groupService.getGroupsByGroupDistribution(
                    tenant,
                    req.params.groupDistributionId,
                    {
                        page: Number(req.query.page) || 1,
                        limit: Number(req.query.limit) || 20,
                        sort
                    }
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Groups by group distribution retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error(
                'Error retrieving groups by group distribution:',
                error
            );

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving groups by group distribution'
                )
            );
        }
    };
}