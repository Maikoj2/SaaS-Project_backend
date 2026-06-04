import { Logger } from "../../config";
import { Injectable } from "@decorators/di";
import { GameFormatService } from "../../services/championship/gameformat.service";
import { ICustomRequest } from "../../interfaces";
import { Response } from "express";
import { ApiResponse } from "../../responses";
import { CustomError } from "../../errors";

@Injectable()
export class GameFormatController {
    private gameFormatService: GameFormatService;
    private logger: Logger;

    constructor() {
        this.gameFormatService = new GameFormatService();
        this.logger = new Logger();
    }

    public create = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;

            const gameFormat = await this.gameFormatService.create(tenant, req.body);
            res.status(201).json(
                ApiResponse.success(gameFormat, 'Game format created successfully')
            );
        } catch (error: any) {
            this.logger.error(error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error creating game format', 500, 'GameFormatControllerError'))
            );
        }
    }

    public getAll = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const { page, limit, sort, order } = req.query;
            const sortParams = sort as unknown as Record<string, 1 | -1>;
            const gameFormat = await this.gameFormatService.getAll(tenant, Number(page), Number(limit), sortParams, order as string);

            res.status(200).json(
                ApiResponse.success(gameFormat, 'Game format fetched successfully')
            );
        } catch (error: any) {
            this.logger.error(error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error fetching game format', 500, 'GameFormatControllerError'))
            );
        }
    }

    public update = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const { id } = req.params;
            const gameFormat = await this.gameFormatService.update(tenant, id, req.body);

            if (!gameFormat) {
                res.status(404).json(
                    ApiResponse.error(new CustomError('Game format not found', 404, 'GameFormatNotFoundError'))
                );
                return;
            }

            res.status(200).json(
                ApiResponse.success(gameFormat, 'Game format updated successfully')
            );
        } catch (error: any) {
            this.logger.error(error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error updating game format', 500, 'GameFormatControllerError'))
            );
        }
    }
}