import { Response } from 'express';
import { ApiResponse } from '../../responses';
import { IUserCustomRequest } from '../../interfaces';
import { EliminationService } from '../../services/championship/elimination.service';

export class EliminationController {
    private eliminationService: EliminationService;

    constructor() {
        this.eliminationService = new EliminationService();
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
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error.message || 'Error generating elimination bracket',
                )
            );
        }
    };
}