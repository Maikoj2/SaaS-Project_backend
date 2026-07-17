import { Response } from 'express';
import { ApiResponse } from '../../responses';
import { IUserCustomRequest } from '../../interfaces';
import { EliminationService } from '../../services/championship/elimination.service';
import { Logger } from '../../config';

export class EliminationController {
    private eliminationService: EliminationService;
    private logger: Logger

    constructor() {
        this.eliminationService = new EliminationService();
        this.logger = new Logger();
    }

    generateBracket = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result =
                await this.eliminationService.generateBracketFromGroupDistribution(
                    tenant,
                    {
                        championshipId: req.params.championshipId,
                        groupDistributionId: req.params.groupDistributionId,
                    }
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Elimination bracket generated successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error(error, 'Error generating elimination bracket');
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error.message || 'Error generating elimination bracket',
                )
            );
        }
    };

    getActiveBracket = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;


            const result =
                await this.eliminationService.getActiveBracketByChampionshipId(
                    tenant,
                    req.params.championshipId,
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Active elimination bracket retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error(error, 'Error retrieving active elimination bracket');
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error.message || 'Error retrieving active elimination bracket',
                )
            );
        }
    };

    getBracketById = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;


            const result =
                await this.eliminationService.getBracketById(
                    tenant,
                    req.params.championshipId,
                    req.params.eliminationBracketId,
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Elimination bracket retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error(error, 'Error retrieving elimination bracket');
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error.message || 'Error retrieving elimination bracket',
                )
            );
        }
    };

    getBracketByChampionship = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;


            const result =
                await this.eliminationService.getBracketsByChampionship(
                    tenant,
                    req.params.championshipId,
                );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Elimination bracket retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            this.logger.error(error, 'Error retrieving elimination bracket');
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error.message || 'Error retrieving elimination bracket',
                )
            );
        }
    };





}