import { Injectable } from "@decorators/di";

import { Logger } from "../../config";
import { IUserCustomRequest } from "../../interfaces";
import { ApiResponse } from "../../responses";
import { Response } from "express";

import { CustomError } from "../../errors";
import { PlayerService } from "../../services/championship/player.service";




@Injectable()
export class playerController {

    private playerService: PlayerService;
    private logger: Logger;

    constructor() {

        this.playerService = new PlayerService();
        this.logger = new Logger();
    }

    public createPlayerByLink = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const playerData = req.body;
            const code = req.params.code;

            const player = await this.playerService.createPlayerByLink(tenant, playerData, code);

            res.status(200).json(
                ApiResponse.success(player, 'Player created successfully')
            );

        } catch (error) {
            this.logger.error('Error creating player:', error);
            const customError = error instanceof CustomError
                ? error
                : new CustomError(`Error creating player: ${error}`, 500, 'PlayerControllerError');

            res.status(customError.statusCode)
                .json(ApiResponse.error(customError));
        }
    }

    public createPlayerManually = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            const result = await this.playerService.createPlayerManually(
                tenant,
                championshipId,
                req.body
            );

            res.status(201).json(
                ApiResponse.success(
                    result,
                    'Player created manually successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error creating player manually:', error);

            const customError =
                error instanceof CustomError
                    ? error
                    : new CustomError(
                        `Error creating player manually: ${error}`,
                        500,
                        'PlayerControllerError'
                    );

            res
                .status(customError.statusCode)
                .json(ApiResponse.error(customError.message));
        }
    };

    public getPlayersByChampionship = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.playerService.getPlayersByChampionship(
                tenant,
                req.params.championshipId,
                {
                    status: req.query.status as string,
                    gender: req.query.gender as string,
                    search: req.query.search as string,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Players retrieved successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error retrieving players:', error);

            const customError =
                error instanceof CustomError
                    ? error
                    : new CustomError(
                        `Error retrieving players: ${error}`,
                        500,
                        'PlayerControllerError'
                    );

            res
                .status(customError.statusCode)
                .json(ApiResponse.error(customError.message));
        }
    };

    public getPlayerById = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.playerService.getPlayerById(
                tenant,
                req.params.championshipId,
                req.params.playerId
            );
            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Player retrieved successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error retrieving player:', error);

            const customError =
                error instanceof CustomError
                    ? error
                    : new CustomError(
                        `Error retrieving player: ${error}`,
                        500,
                        'PlayerControllerError'
                    );
            res
                .status(customError.statusCode)
                .json(ApiResponse.error(customError.message));
        }
    };

    public updatePlayer = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;

            const result = await this.playerService.updatePlayer(
                tenant,
                req.params.championshipId,
                req.params.playerId,
                req.body
            );

            res.status(200).json(
                ApiResponse.success(
                    result,
                    'Player updated successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error updating player:', error);

            const customError =
                error instanceof CustomError
                    ? error
                    : new CustomError(
                        `Error updating player: ${error}`,
                        500,
                        'PlayerControllerError'
                    )
            res
                .status(customError.statusCode)
                .json(ApiResponse.error(customError.message));
        }
    };

}