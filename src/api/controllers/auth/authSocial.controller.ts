import {   Response } from "express";
import { Logger } from "../../config";
import { ApiResponse } from "../../responses/apiResponse";
import { matchedData } from "express-validator";
import { FacebookService } from "../../services/email/facebook.service";
import { CustomError } from "../../errors";
import { ICustomRequest } from "../../interfaces";




export class AuthSocialController {
    private readonly logger: Logger;
    private readonly facebookService: FacebookService;

    constructor() {
        this.logger = new Logger();
        this.facebookService = new FacebookService();
    }

    public  facebookLogin = async (req: ICustomRequest, res: Response) => {
        try {
            const data = matchedData(req);
            this.facebookService.authenticate(req, res, data.tenant);
             res.status(200).json(
                ApiResponse.success({}, 'Facebook login successful')
            );
        } catch (error) {
            this.logger.error(error as string);
             res.status(500).json(
                ApiResponse.error(new CustomError('Error logging in with Facebook', 500, 'AuthSocialControllerError'))
            );
        }
    }
}
