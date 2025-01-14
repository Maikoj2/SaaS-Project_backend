import {  Response } from "express";
import { Logger } from "../../config";
import {  CustomError } from "../../errors";
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
            
            res.status(200).json(ApiResponse.success(searchQuery, 'Plugins fetched successfully'));
        } catch (error) {
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error( new CustomError('Error fetching plugins', 500, 'PluginsControllerError')));
        }
    }
}