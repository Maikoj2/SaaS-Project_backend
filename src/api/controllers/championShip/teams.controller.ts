import { Response } from "express";
import { Logger } from "../../config";
import { ApiResponse } from "../../responses";


import { CustomError } from "../../errors";
import { IUserCustomRequest } from "../../interfaces";
import { TeamService } from "../../services/championship/teams.service";


export class TeamController {
    private readonly teamService: TeamService;
    private readonly logger: Logger;


    constructor() {
        this.logger = new Logger();
        this.teamService = new TeamService();
    }

    createTeamByLink = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { code } = req.params;
            const tenant = req.clientAccount as string;
            const teamData = req.body;


            const team = await this.teamService.createTeamByLink(tenant, teamData, code);
            res.status(200).json(
                ApiResponse.success(team, 'Team created successfully',)
            );
        } catch (error) {
            this.logger.error('Error creating team:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error creating team', 500, 'TeamControllerError')));
        }
    }

    getTeamsByChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.teamService.getTeamsByChampionship(
                tenant,
                req.params.championshipId,
                {
                    status: req.query.status as string,
                    search: req.query.search as string,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Teams retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving teams'
                )
            );
        }
    };

    getTeamById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.teamService.getTeamById(
                tenant,
                req.params.championshipId,
                req.params.teamId
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Team retrieved successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error retrieving team'
                )
            );
        }
    };
}
