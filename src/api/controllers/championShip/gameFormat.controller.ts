import { Logger } from "../../config";

import { Injectable } from "@decorators/di";
import { GameFormatService } from "../../services/championship/gameformat.service";
import { IUserCustomRequest } from "../../interfaces";
import { Response } from "express";

@Injectable()
export class GameFormatController {
    private gameFormatService: GameFormatService;
    private logger: Logger;

    constructor() {
        this.gameFormatService = new GameFormatService();
        this.logger = new Logger();
    }

    public create = async (req: IUserCustomRequest, res: Response) =>  {
        try {
            const tenant = req.clientAccount as string;
    
            const gameFormat = await this.gameFormatService.create(tenant, req.body);
            res.status(201).json({
                gameFormat
            });
        } catch (error: any) {
            this.logger.error(error);
            res.status(500).json({ message: error.message });
        }
    }
}