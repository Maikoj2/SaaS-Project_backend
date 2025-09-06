import express,{ Express, RequestHandler } from 'express';
import { teamRoutes } from '../../models/apiRoutes/championship/team/teamRoutes';
import { origin } from '../../middlewares';
import { teamValidator } from '../../validators/championships/team.validator';
import { ValidationChain } from 'express-validator';
import trimRequest from 'trim-request';
import { TeamController } from '../../controllers/championShip/team.controller';


const app:Express = express();
const teamController = new TeamController();

//create team by invitation link
app.post(teamRoutes.CREATE_TEAM_BY_LINK,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        ...teamValidator.createTeamByLink as ValidationChain[],
        trimRequest.all
    ],
    teamController.createTeamByLink  as RequestHandler );

export default app;
