import { Injectable } from "@decorators/di";
import { DatabaseHelper } from "../../utils/database.helper";
import GameFormat, { IGameFormatDocument } from "../../models/mongoose/championship/gameFormat";
import { gameFormats } from '../../seeds/gameFormats.seed';

@Injectable()
export class GameFormatService {
    /**
     * Crear nuevo campeonato
     * 
     * 
     */
    private seletField = ['name', 'description', 'config'];
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

    async getAll(tenant: string, page: number, limit: number, sort: Record<string, 1 | -1>  , order: string){
        try {
            const gameFormat = await DatabaseHelper.getItems( GameFormat,tenant, {}, { page, limit , select: this.seletField, sort, order})
            return gameFormat;
        } catch (error: any) {
            throw new Error(`Error getting game formats: ${error.message}`);
        }




    }
}