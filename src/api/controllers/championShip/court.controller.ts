import { Response } from 'express';
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { Logger } from '../../config/logger/WinstonLogger';
import { CourtService } from '../../services/championship/court.service';


export class CourtController {
    private logger: Logger;
    private courtService: CourtService;

    constructor() {
        this.logger = new Logger();
        this.courtService = new CourtService();
    }

    createCourt = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const court = await this.courtService.createCourt(
                tenant,
                req.body
            );

            res.status(201).json(
                ApiResponse.success(
                    court,
                    'Court created successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error creating court:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error creating court'
                )
            );
        }
    };

    getCourts = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const courts = await this.courtService.getCourts(
                tenant,
                {
                    championshipId: req.query.championshipId as string,
                    type: req.query.type as string,
                    status: req.query.status as string,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );

            res.status(200).json(
                ApiResponse.success(
                    courts,
                    'Courts retrieved successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error retrieving courts:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving courts'
                )
            );
        }
    };

    getCourtById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { courtId } = req.params;

            const court = await this.courtService.getCourtById(
                tenant,
                courtId
            );

            res.status(200).json(
                ApiResponse.success(
                    court,
                    'Court retrieved successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error retrieving court:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving court'
                )
            );
        }
    };

    updateCourt = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { courtId } = req.params;

            const court = await this.courtService.updateCourt(
                tenant,
                courtId,
                req.body
            );

            res.status(200).json(
                ApiResponse.success(
                    court,
                    'Court updated successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error updating court:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error updating court'
                )
            );
        }
    };

    deleteCourt = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { courtId } = req.params;

            const court = await this.courtService.deleteCourt(
                tenant,
                courtId
            );

            res.status(200).json(
                ApiResponse.success(
                    court,
                    'Court deleted successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error deleting court:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error deleting court'
                )
            );
        }
    };

    getAvailableCourtsByChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            const courts =
                await this.courtService.getAvailableCourtsByChampionship(
                    tenant,
                    championshipId
                );

            res.status(200).json(
                ApiResponse.success(
                    courts,
                    'Available courts retrieved successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error retrieving available courts:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving available courts'
                )
            );
        }
    };
}