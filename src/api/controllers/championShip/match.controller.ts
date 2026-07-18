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

    getMatchesByChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.matchService.getMatchesByChampionship(
                tenant,
                req.params.championshipId,
                {
                    status: req.query.status as string,
                    isEliminationMatch: req.query.isEliminationMatch as string,
                    groupId: req.query.groupId as string,
                    eliminationBracketId: req.query.eliminationBracketId as string,
                }
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Matches retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error || 'Error retrieving matches'
                )
            );
        }
    };

    getMatchById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.matchService.getMatchById(
                tenant,
                req.params.championshipId,
                req.params.matchId
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Match retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error || 'Error retrieving match',
                )
            );
        }
    };

    getMatchesByGroup = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.matchService.getMatchesByGroup(
                tenant,
                req.params.championshipId,
                req.params.groupId,
                {
                    status: req.query.status as string,
                }
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Group matches retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error || 'Error retrieving group matches',
                )
            );
        }
    };

    getMatchesByEliminationBracket = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result =
                await this.matchService.getMatchesByEliminationBracket(
                    tenant,
                    req.params.championshipId,
                    req.params.eliminationBracketId,
                    {
                        status: req.query.status as string,
                    }
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Elimination bracket matches retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error ||
                    'Error retrieving elimination bracket matches',
                )
            );
        }
    };
}