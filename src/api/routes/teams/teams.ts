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

router.post(
    teamRoutes.CREATE_TEAM_MANUALLY,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_CREATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...teamValidator.createTeamManually,
    ],
    controller.createTeamManually as RequestHandler
);

router.patch(
    teamRoutes.UPDATE_TEAM_MANUALLY,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(teamValidator.updateTeamManually as RequestHandler[]),
    ],
    controller.updateTeamManually as RequestHandler
);

router.post(
    teamRoutes.ADD_PLAYER_TO_TEAM,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(teamValidator.addPlayerToTeam as RequestHandler[]),
    ],
    controller.addPlayerToTeam as RequestHandler
);

router.delete(
    teamRoutes.REMOVE_PLAYER_FROM_TEAM,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(teamValidator.removePlayerFromTeam as RequestHandler[]),
    ],
    controller.removePlayerFromTeam as RequestHandler
);

router.patch(
    teamRoutes.REPLACE_PLAYER_IN_TEAM,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.TEAM_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(teamValidator.replacePlayerInTeam as RequestHandler[]),
    ],
    controller.replacePlayerInTeam as RequestHandler
);



export default router;       