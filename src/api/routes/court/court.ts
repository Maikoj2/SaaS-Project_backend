import { Router, RequestHandler } from "express";
import trimRequest from "trim-request";

import { origin } from "../../middlewares";
import { auth } from "../../middlewares/auth.middleware";
import { CourtController } from "../../controllers/championship/court.controller";
import { permissionAuthorization } from "../../middlewares/auth/permissionAuthorization.middleware";
import { AuthPermission } from "../../constants/permissions";
import { courtRoutes } from "../../constants/apiRoutes/championship/court";
import { courtValidator } from "../../validators/championships/court.validator";

const router = Router();
const controller = new CourtController();

router.post(
    courtRoutes.CREATE_COURT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_CREATE]) as RequestHandler,
        ...courtValidator.CreateCourt,
        trimRequest.all as RequestHandler,
    ],
    controller.createCourt as RequestHandler
);

router.get(
    courtRoutes.GET_COURTS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_READ]) as RequestHandler,
        ...courtValidator.getCourts,
        trimRequest.all as RequestHandler,
    ],
    controller.getCourts as RequestHandler
);

router.get(
    courtRoutes.GET_COURT_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_READ]) as RequestHandler,
        ...courtValidator.getCourtById,
        trimRequest.all as RequestHandler,
    ],
    controller.getCourtById as RequestHandler
);

router.get(
    courtRoutes.GET_AVAILABLE_COURTS_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_READ]) as RequestHandler,
        ...courtValidator.getAvailableCourtsByChampionship,
        trimRequest.all as RequestHandler,
    ],
    controller.getAvailableCourtsByChampionship as RequestHandler
);



export default router;