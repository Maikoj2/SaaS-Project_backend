import { Response } from "express";
import { Logger } from "../../config";
import { ApiResponse } from "../../responses";


import { CustomError } from "../../errors";
import { IUserCustomRequest } from "../../interfaces";
import { TeamService } from "../../services/championship/teams.service";
import { ChampionshipService } from "../../services/championship/championship.service";


export class TeamController {
    private readonly teamService: TeamService;
    private readonly logger: Logger;
    private readonly championshipService: ChampionshipService;

    constructor() {
        this.logger = new Logger();
        this.teamService = new TeamService();
        this.championshipService = new ChampionshipService();
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

    createTeamManually = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        let teamAdded = false;
        let registrationAdded = false;
        let result: any;

        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            result = await this.teamService.createTeamManually(
                tenant,
                championshipId,
                req.body
            );

            await this.championshipService.updateTeamId(
                tenant,
                result.team.championshipId,
                result.team._id
            );
            teamAdded = true;

            await this.championshipService.addRegistrationId(
                result.registration.championshipId,
                tenant,
                result.registration._id
            );
            registrationAdded = true;

            res.status(201).json(
                ApiResponse.success({
                    message: 'Team created manually successfully',
                    data: {
                        team: result.team,
                        registration: result.registration,
                    },
                })
            );
        } catch (error: any) {
            if (teamAdded && result?.team?._id) {
                await this.championshipService.deleteTeamId(
                    req.clientAccount as string,
                    result.team.championshipId,
                    result.team._id
                );
            }

            if (registrationAdded && result?.registration?._id) {
                await this.championshipService.deleteRegistrationId(
                    req.clientAccount as string,
                    result.registration.championshipId,
                    result.registration._id
                );
            }

            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error creating team manually'
                )
            );
        }
    };

    updateTeamManually = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId, teamId } = req.params;

            const result = await this.teamService.updateTeamManually(
                tenant,
                championshipId,
                teamId,
                req.body
            );

            res.status(200).json(
                ApiResponse.success({
                    message: 'Team updated successfully',
                    data: result,
                })
            );
        } catch (error: any) {
            res.status(error.statusCode || 400).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error updating team'
                )
            );
        }
    };

    public addPlayerToTeam = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId, teamId } = req.params;
            const { playerId } = req.body;

            const result = await this.teamService.addPlayerToTeam(
                tenant,
                championshipId,
                teamId,
                playerId
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Player added to team successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error adding player to team:', error);

            const customError =
                error instanceof CustomError
                    ? error
                    : new CustomError(
                        `Error adding player to team: ${error}`,
                        500,
                        'TeamControllerError'
                    );

            res
                .status(customError.statusCode)
                .json(ApiResponse.error(customError.message));
        }
    };

    public removePlayerFromTeam = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId, teamId, playerId } = req.params;

            const result = await this.teamService.removePlayerFromTeam(
                tenant,
                championshipId,
                teamId,
                playerId
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Player removed from team successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error removing player from team:', error);

            const customError =
                error instanceof CustomError
                    ? error
                    : new CustomError(
                        `Error removing player from team: ${error}`,
                        500,
                        'TeamControllerError'
                    );

            res
                .status(customError.statusCode)
                .json(ApiResponse.error(customError.message));
        }
    };
}
