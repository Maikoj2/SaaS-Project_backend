import { Injectable } from "@decorators/di";
import { DatabaseHelper } from "../../utils/database.helper";
import GameFormat, { IGameFormatDocument } from "../../models/mongoose/championschip/gameFormat";

@Injectable()
export class GameFormatService {
    /**
     * Crear nuevo campeonato
     */
    async create(tenant: string, championshipData: Partial<IGameFormatDocument>): Promise<IGameFormatDocument> {
        try {
            const championship = await DatabaseHelper.create(
                GameFormat,
                tenant,
                championshipData
            );
            return championship;


        } catch (error: any) {
            throw new Error(`Error creating championship: ${error.message}`);
        }
    }
}