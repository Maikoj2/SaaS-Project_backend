import {  Response } from "express";
import { Logger } from "../../config";
import { AuthError } from "../../errors";
import { ApiResponse } from "../../responses";
import { IPluginsCustomRequest } from '../../interfaces/IPluginsCustomRequest';
import { QueryHelper } from "../../utils/queryHelper";


export class PluginsController {
    private readonly logger: Logger;
    constructor() {
        this.logger = new Logger();
    }

    public async getItems(req: IPluginsCustomRequest, res: Response) {
        try {
            const  searchQuery = await QueryHelper.buildSearchQuery(req.query);
            
            res.status(200).json(ApiResponse.success(null, 'Plugins fetched successfully'));
        } catch (error) {
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : 'Error fetching plugins'));
        }
    }
}