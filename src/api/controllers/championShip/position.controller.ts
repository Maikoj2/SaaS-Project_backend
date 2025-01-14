// src/api/controllers/championship/position.controller.ts
import { Request, Response } from 'express';
import { Injectable } from '@decorators/di';

import { Logger } from '../../config';
import { PositionService } from '../../services/championship/position.service';
import { ICustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { CustomError } from '../../errors';
import { parseQueryParamToNumber } from '../../utils/QueryPatams.helper';

@Injectable()
export class PositionController {
    private readonly positionService: PositionService;
    private readonly logger: Logger;

    constructor() {
        this.positionService = new PositionService();
        this.logger = new Logger();
    }

    public  autoAssignPositions = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const tenant = req.clientAccount as string;
        
            const result = await this.positionService.autoAssignPositions(tenant, championshipId);
            res.status(200).json(
                ApiResponse.success(result, 'Positions assigned successfully')
            );
        } catch (error: any) {
            
            this.logger.error('Error auto-assigning positions:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error auto-assigning positions', 500, 'PositionControllerError')));
        }
    }

    public manualAssignPositions = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const tenant = req.clientAccount as string;
            const { positions } = req.body; // Array de objetos con teamId y position
            const result = await this.positionService.manualAssignPositions(tenant, championshipId, positions);
            res.status(200).json(result);
        } catch (error: any) {
            this.logger.error('Error manually assigning positions:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error manually assigning positions', 500, 'PositionControllerError')));
        }
    }

    public assignPositionByRegistrationId = async (req: ICustomRequest, res: Response) => {
        try {
            const { registrationId } = req.params;
            const tenant = req.clientAccount as string;
            const { position } = req.body;
            const result = await this.positionService.assignPositionByRegistrationId(tenant, registrationId, position);
            res.status(200).json(result);
        } catch (error: any) {
            this.logger.error('Error assigning position by registration ID:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error assigning position by registration ID', 500, 'PositionControllerError')));
        }
    }

    public assignRandomPositions = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const tenant = req.clientAccount as string;
            const result = await this.positionService.assignRandomPositions(tenant, championshipId);
            res.status(200).json(result);
        } catch (error: any) {
            this.logger.error('Error assigning random positions:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error assigning random positions', 500, 'PositionControllerError')));
        }
    }

    public getPositionsByChampionshipId = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const tenant = req.clientAccount as string;
            const sort = req.query.sort as string;
            const page = parseQueryParamToNumber(req.query.page, 1);
            const limit = parseQueryParamToNumber(req.query.limit, 50);
        
            const result = await this.positionService.getPositionsByChampionshipId(tenant, championshipId, limit, page, sort);
            res.status(200).json(result);
        } catch (error: any) {
            this.logger.error('Error getting positions by championship ID:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500).json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error getting positions by championship ID', 500, 'PositionControllerError')));
        }
    }

    
}