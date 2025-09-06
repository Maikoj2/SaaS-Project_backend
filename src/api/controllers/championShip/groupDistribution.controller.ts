
import { Request, Response } from 'express';

import { Injectable } from '@decorators/di';
import { Logger } from '../../config/logger/index.js';
import { ApiResponse } from '../../responses/apiResponse.js';
import { CustomError } from '../../errors/index.js';
import { ICustomRequest } from '../../interfaces/ICustomrequest.js';
import { GroupDistributionService } from '../../services/championship/groupDistribution.service.js';

@Injectable()
export class GroupDistributionController {
    private readonly groupDistributionService: GroupDistributionService;
    private readonly logger: Logger;

    constructor() {
        this.groupDistributionService = new GroupDistributionService();
        this.logger = new Logger();
    }

    autoCreateGroupDistribution = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;
            const { formatType } = req.body;
        
            const groupDistribution = await this.groupDistributionService.createGroupDistribution(championshipId, tenant, { formatType });
            res.status(201).json(groupDistribution);
        } catch (error) {
            this.logger.error('Error creating group distribution:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error creating group distribution', 500, 'GroupDistributionControllerError')));
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