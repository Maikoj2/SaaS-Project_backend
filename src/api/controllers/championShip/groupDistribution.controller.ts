import { Response } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';
import { IUserCustomRequest } from '../../interfaces';
import { GroupDistributionService } from '../../services/championship/groupDistribution.service';
import { ApiResponse } from '../../responses';





export class groupDistribution {

    private logger: Logger;
    private groupDistributionService: GroupDistributionService;

    constructor() {
        this.logger = new Logger();
        this.groupDistributionService = new GroupDistributionService();
    }


    autoCreateGroupDistribution = async (req: IUserCustomRequest, res: Response): Promise<void> => {

        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;
            const formatType = req.body;

            const groupDistribution = await this.groupDistributionService.createGroupDistribution(championshipId, tenant, formatType);
            res.status(201).json(ApiResponse.success(
                {
                    message: 'Group distribution created successfully',
                    data: groupDistribution

                }));
        } catch (error: any) {
            this.logger.error('Error creating group distribution:', error);
            res.status(error.statusCode || 400).json(ApiResponse.error(error instanceof Error ? error.message : 'Error creating group distribution'));
        }
    }



    getGroupDistributionsByChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result =
                await this.groupDistributionService.getGroupDistributionsByChampionship(
                    tenant,
                    req.params.championshipId,
                    {
                        status: req.query.status as string,
                        formatType: req.query.formatType as string,
                    },
                    {
                        page: Number(req.query.page) || 1,
                        limit: Number(req.query.limit) || 20,
                    }
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Group distributions retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving group distributions'
                )
            );
        }
    };
    getGroupDistributionById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result =
                await this.groupDistributionService.getGroupDistributionById(
                    tenant,
                    req.params.championshipId,
                    req.params.groupDistributionId
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Group distribution retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving group distribution'
                )
            );
        }
    };
}