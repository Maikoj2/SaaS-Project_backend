import { Router, RequestHandler } from "express";
import { auth } from "../../middlewares/auth.middleware";
import { origin } from "../../middlewares";
import { permissionAuthorization } from "../../middlewares/auth/permissionAuthorization.middleware";
import { AuthPermission } from "../../constants/permissions";


import { teamRoutes } from "../../constants/apiRoutes/championship/teams";
import trimRequest from "trim-request";
import { teamValidator } from "../../validators/championships/teams.validatos";
import { TeamController } from "../../controllers/championship/teams.controller";

const router = Router();
const controller = new TeamController();

router.post(teamRoutes.CREATE_TEAM_BY_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    ...teamValidator.createTeamByLink,
    trimRequest.all as RequestHandler,
] as RequestHandler[], controller.createTeamByLink as RequestHandler);

router.get(
    teamRoutes.GET_TEAMS_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...teamValidator.getTeamsByChampionship,
    ],
    controller.getTeamsByChampionship as RequestHandler
);

router.get(
    teamRoutes.GET_TEAM_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...teamValidator.getTeamById,
    ],
    controller.getTeamById as RequestHandler
);


export default router;       