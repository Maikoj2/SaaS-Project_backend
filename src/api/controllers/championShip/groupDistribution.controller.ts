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
    // getAll = async (req: Request, res: Response): Promise<void> => {
    //     try {
    //         const { championshipId } = req.params;
    //         const groupDistributions = await this.groupDistributionService.getGroupDistributions(championshipId);
    //         res.status(200).json(groupDistributions);
    //     } catch (error) {
    //         this.logger.error('Error getting group distributions:', error);
    //         res.status(error instanceof CustomError ? error.statusCode : 500)
    //             .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error getting group distributions', 500, 'GroupDistributionControllerError')));
    //     }
    // }

    // update = async (req: Request, res: Response): Promise<void> => {
    //     try {
    //         const { id } = req.params;
    //         const updatedGroupDistribution = await this.groupDistributionService.updateGroupDistribution(id, req.body.distribution);
    //         res.status(200).json(updatedGroupDistribution);
    //     } catch (error) {
    //         this.logger.error('Error updating group distribution:', error);
    //         res.status(error instanceof CustomError ? error.statusCode : 500)
    //             .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error updating group distribution', 500, 'GroupDistributionControllerError')));
    //     }
    // }

    // delete = async (req: Request, res: Response): Promise<void> => {
    //     try {
    //         const { id } = req.params;
    //         await this.groupDistributionService.deleteGroupDistribution(id);
    //         res.status(204).send();
    //     } catch (error) {
    //         this.logger.error('Error deleting group distribution:', error);
    //         res.status(error instanceof CustomError ? error.statusCode : 500)
    //             .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error deleting group distribution', 500, 'GroupDistributionControllerError')));
    //     }
    // }
}