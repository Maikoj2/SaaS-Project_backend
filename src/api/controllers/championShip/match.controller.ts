import { Response } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { MatchService } from '../../services/championship/match.service';

export class MatchController {
    private logger: Logger;
    private matchService: MatchService;

    constructor() {
        this.logger = new Logger();
        this.matchService = new MatchService();
    }

    registerMatchResult = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { matchId } = req.params;

            const result = await this.matchService.registerMatchResult(
                tenant,
                matchId,
                req.body
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Match result registered successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error('Error registering match result:', error);

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error registering match result'
                )
            );
        }
    };
}