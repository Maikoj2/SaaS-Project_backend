import { Request, Response } from 'express';
import { PhaseService } from '../../services/championship/phase.service';
import { ApiResponse } from '../../responses/apiResponse';
import { Logger } from '../../config';
import { ICustomRequest } from '../../interfaces';
import { CustomError } from '../../errors';

export class PhaseController {
    private phaseService: PhaseService;
    private logger: Logger;

    constructor() {
        this.phaseService = new PhaseService();
        this.logger = new Logger();
    }

    public createPhases = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const { gameFormatId, startTime } = req.body;
            const tenant = req.clientAccount as string;

            const phases = await this.phaseService.createPhases(championshipId, gameFormatId, tenant, startTime);
            res.status(201).json(ApiResponse.success(phases, 'Phases created successfully'));
        } catch (error) {
            this.logger.error('Error creating phases:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error creating phases', 500, 'PhaseControllerError')));
        }
    };

    public listPhases = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const tenant = req.clientAccount as string;

            const phases = await this.phaseService.listPhases(championshipId, tenant);
            res.status(200).json(ApiResponse.success(phases, 'Phases retrieved successfully'));
        } catch (error) {
            this.logger.error('Error listing phases:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error listing phases', 500, 'PhaseControllerError')));
        }
    };

    public updatePhase = async (req: ICustomRequest, res: Response) => {
        try {
            const { phaseId } = req.params;
            const updateData = req.body;
            const tenant = req.clientAccount as string;

            const updatedPhase = await this.phaseService.updatePhase(phaseId, updateData, tenant);
            res.status(200).json(ApiResponse.success(updatedPhase, 'Phase updated successfully'));
        } catch (error) {
            this.logger.error('Error updating phase:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error updating phase', 500, 'PhaseControllerError')));
        }
    };

    public deletePhase = async (req: ICustomRequest, res: Response) => {
        try {
            const { phaseId } = req.params;
            const tenant = req.clientAccount as string;

            await this.phaseService.deletePhase(phaseId, tenant);
            res.status(200).json(ApiResponse.success('Phase deleted successfully'));
        } catch (error) {
            this.logger.error('Error deleting phase:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error deleting phase', 500, 'PhaseControllerError')));
        }
    };

    public configureGroups = async (req: ICustomRequest, res: Response) => {
        try {
            const { phaseId } = req.params;
            const { groupSize, advancement } = req.body;
            const tenant = req.clientAccount as string;

            const groups = await this.phaseService.configureGroups(phaseId, groupSize, advancement, tenant);
            res.status(201).json(ApiResponse.success(groups, 'Groups configured successfully'));
        } catch (error) {
            this.logger.error('Error configuring groups:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error configuring groups', 500, 'PhaseControllerError')));
        }
    };
} 