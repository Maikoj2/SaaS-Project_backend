import { Router, RequestHandler } from "express";
import trimRequest from "trim-request";

import { origin } from "../../middlewares";
import { auth } from "../../middlewares/auth.middleware";
import { EliminationController } from "../../controllers/championship/elimination.controller";
import { eliminationRoutes } from "../../constants/apiRoutes/championship/elimination";
import { permissionAuthorization } from "../../middlewares/auth/permissionAuthorization.middleware";
import { AuthPermission } from "../../constants/permissions";
import { EliminationBracketValidator } from "../../validators/championships/elimination.validator";

const router = Router();
const controller = new EliminationController();

router.post(
    eliminationRoutes.GENERATE_BRACKET,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.ELIMINATION_BRACKET_CREATE]) as RequestHandler,
        ...EliminationBracketValidator.generateBracket,
        trimRequest.all as RequestHandler,
    ],
    controller.generateBracket as RequestHandler
);

router.get(
    eliminationRoutes.GET_ACTIVE_BRACKET,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.ELIMINATION_BRACKET_READ]) as RequestHandler,
        ...EliminationBracketValidator.getActiveBracket,
        trimRequest.all as RequestHandler,
    ],
    controller.getActiveBracket as RequestHandler
);

router.get(
    eliminationRoutes.GET_BRACKET_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.ELIMINATION_BRACKET_READ]) as RequestHandler,
        ...EliminationBracketValidator.getBracketById,
        trimRequest.all as RequestHandler,
    ],
    controller.getBracketById as RequestHandler
);

router.get(
    eliminationRoutes.GET_BRACKETS_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.ELIMINATION_BRACKET_READ]) as RequestHandler,
        ...EliminationBracketValidator.getBracketByChampionship,
        trimRequest.all as RequestHandler,
    ],
    controller.getBracketByChampionship as RequestHandler
);



export default router;