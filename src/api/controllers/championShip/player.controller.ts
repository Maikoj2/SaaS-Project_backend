import { Injectable } from "@decorators/di";
import { ChampionshipService } from "../../services/championship/championship.service";
import { ConfigurationService } from "../../services/championship/configuration.service";
import { Logger } from "../../config";
import { ICustomRequest } from "../../interfaces";
import { ApiResponse } from "../../responses";
import { Response } from "express";
import { PlayerService } from '../../services/championship/player.service';
import { CustomError } from "../../errors";




@Injectable()
export class playerController {

    private playerService: PlayerService;
    private logger: Logger;

    constructor() {

        this.playerService = new PlayerService();
        this.logger = new Logger();
    }

    public createPlayerByLink = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const playerData = req.body;
            const code = req.params.code;

            const player = await this.playerService.createPlayerByLink(tenant, playerData, code);

            return res.status(200).json(
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


}