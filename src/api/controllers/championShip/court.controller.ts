import { Response } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
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

            res.status(error.statusCode || 400).json(
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

            const result = await this.courtService.getCourts(
                tenant,
                {
                    status: req.query.status as string,
                    type: req.query.type as string,
                    currentChampionshipId: req.query.currentChampionshipId as string,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
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

    getAvailableCourts = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.courtService.getAvailableCourts(
                tenant,
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
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

            res.status(error.statusCode || 400).json(
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

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error deleting court'
                )
            );
        }
    };

    attachCourtsToChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            const result = await this.courtService.attachCourtsToChampionship(
                tenant,
                championshipId,
                req.body
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Courts attached to championship successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error attaching courts to championship:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error attaching courts to championship'
                )
            );
        }
    };

    detachCourtsFromChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            const result =
                await this.courtService.detachCourtsFromChampionship(
                    tenant,
                    championshipId,
                    req.body
                );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Courts detached from championship successfully'
                )
            );
        } catch (error: any) {
            this.logger.error(
                'Error detaching courts from championship:',
                error
            );

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error detaching courts from championship'
                )
            );
        }
    };

    markCourtAsOccupied = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { courtId } = req.params;

            const court = await this.courtService.markCourtAsOccupied(
                tenant,
                courtId
            );

            res.status(200).json(
                ApiResponse.success(
                    court,
                    'Court marked as occupied successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error marking court as occupied:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error marking court as occupied'
                )
            );
        }
    };

    markCourtAsReserved = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { courtId } = req.params;

            const court = await this.courtService.markCourtAsReserved(
                tenant,
                courtId
            );

            res.status(200).json(
                ApiResponse.success(
                    court,
                    'Court marked as reserved successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error marking court as reserved:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error marking court as reserved'
                )
            );
        }
    };
}