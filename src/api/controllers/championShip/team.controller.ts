import { Response } from "express";
import { Logger } from "../../config";
import { ApiResponse } from "../../responses";
import { ICustomRequest } from "../../interfaces";
import { TeamService } from "../../services/championship/team.service";
import { CustomError } from "../../errors";


export class TeamController {
    private readonly teamService: TeamService;
    private readonly logger: Logger;


    constructor(){
        this.logger = new Logger();
        this.teamService = new TeamService();
    }

    createTeamByLink = async (req: ICustomRequest, res: Response) => {
        try {
            const { code } = req.params;
            const tenant = req.clientAccount as string;
            const teamData = req.body;
        

            const team = await this.teamService.createTeamByLink(tenant, teamData, code);
             res.status(200).json(
                ApiResponse.success(team, 'Team created successfully', )
            );
        } catch (error) {
            this.logger.error('Error creating team:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error creating team', 500, 'TeamControllerError')));
        }
    }
}
