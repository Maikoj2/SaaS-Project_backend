import { Response } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { GameFormatService } from '../../services/championship/gameformat.service';


export class GameFormatController {
    private logger: Logger;
    private gameFormatService: GameFormatService;

    constructor() {
        this.logger = new Logger();
        this.gameFormatService = new GameFormatService();
    }

    createGameFormat = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const gameFormat = await this.gameFormatService.createGameFormat(
                tenant,
                req.body
            );

            res.status(201).json(
                ApiResponse.success(
                    gameFormat,
                    'Game format created successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error creating game format:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error creating game format'
                )
            );
        }
    };

    getGameFormats = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.gameFormatService.getGameFormats(
                tenant,
                {
                    formatType: req.query.formatType as string,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Game formats retrieved successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error retrieving game formats:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving game formats'
                )
            );
        }
    };

    getGameFormatById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { gameFormatId } = req.params;

            const gameFormat =
                await this.gameFormatService.getGameFormatById(
                    tenant,
                    gameFormatId
                );

            res.status(200).json(
                ApiResponse.success(
                    gameFormat,
                    'Game format retrieved successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error retrieving game format:', error);

            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving game format'
                )
            );
        }
    };

    updateGameFormat = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { gameFormatId } = req.params;

            const gameFormat = await this.gameFormatService.updateGameFormat(
                tenant,
                gameFormatId,
                req.body
            );

            res.status(200).json(
                ApiResponse.success(
                    gameFormat,
                    'Game format updated successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error updating game format:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error updating game format'
                )
            );
        }
    };

    deleteGameFormat = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { gameFormatId } = req.params;

            const gameFormat = await this.gameFormatService.deleteGameFormat(
                tenant,
                gameFormatId
            );

            res.status(200).json(
                ApiResponse.success(
                    gameFormat,
                    'Game format deleted successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error deleting game format:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error deleting game format'
                )
            );
        }
    };

    assignGameFormatToChampionshipConfiguration = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            const result =
                await this.gameFormatService.assignGameFormatToChampionshipConfiguration(
                    tenant,
                    championshipId,
                    req.body
                );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Game format assigned to championship successfully'
                )
            );
        } catch (error: any) {
            this.logger.error(
                'Error assigning game format to championship:',
                error
            );

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error assigning game format to championship'
                )
            );
        }
    };
}