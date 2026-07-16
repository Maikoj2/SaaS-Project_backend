import { Router, RequestHandler } from "express";
import trimRequest from "trim-request";

import { origin } from "../../middlewares";
import { auth } from "../../middlewares/auth.middleware";
import { EliminationController } from "../../controllers/championship/elimination.controller";
import { eliminationRoutes } from "../../constants/apiRoutes/championship/elimination";
import { permissionAuthorization } from "../../middlewares/auth/permissionAuthorization.middleware";
import { AuthPermission } from "../../constants/permissions";
import { generateEliminationBracketValidator } from "../../validators/championships/elimination.validator";

const router = Router();
const controller = new EliminationController();

router.post(
    eliminationRoutes.GENERATE_BRACKET,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.ELIMINATION_BRACKET_CREATE]) as RequestHandler,
        ...generateEliminationBracketValidator,
        trimRequest.all as RequestHandler,
    ],
    controller.generateBracket as RequestHandler
);

export default router;