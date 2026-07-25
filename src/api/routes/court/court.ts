import { Router, RequestHandler } from 'express';
import trimRequest from 'trim-request';

import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';

import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';

import { CourtController } from '../../controllers/championship/court.controller';
import { courtRoutes } from '../../constants/apiRoutes/championship/court';
import { validateCourt } from '../../validators/championships/court.validator';

const router = Router();

const controller = new CourtController();

router.post(
    courtRoutes.CREATE_COURT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_CREATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.createCourt,
    ] as RequestHandler[],
    controller.createCourt as RequestHandler
);

router.get(
    courtRoutes.GET_COURTS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.getCourts,
    ] as RequestHandler[],
    controller.getCourts as RequestHandler
);

router.get(
    courtRoutes.GET_AVAILABLE_COURTS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.getAvailableCourts,
    ] as RequestHandler[],
    controller.getAvailableCourts as RequestHandler
);

router.get(
    courtRoutes.GET_COURT_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.getCourtById,
    ] as RequestHandler[],
    controller.getCourtById as RequestHandler
);

router.patch(
    courtRoutes.UPDATE_COURT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.updateCourt,
    ] as RequestHandler[],
    controller.updateCourt as RequestHandler
);

router.delete(
    courtRoutes.DELETE_COURT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_DELETE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.deleteCourt,
    ] as RequestHandler[],
    controller.deleteCourt as RequestHandler
);

router.post(
    courtRoutes.ATTACH_COURTS_TO_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.attachCourtsToChampionship,
    ] as RequestHandler[],
    controller.attachCourtsToChampionship as RequestHandler
);

router.patch(
    courtRoutes.DETACH_COURTS_FROM_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.detachCourtsFromChampionship,
    ] as RequestHandler[],
    controller.detachCourtsFromChampionship as RequestHandler
);

router.patch(
    courtRoutes.MARK_COURT_AS_OCCUPIED,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.markCourtAsOccupied,
    ] as RequestHandler[],
    controller.markCourtAsOccupied as RequestHandler
);

router.patch(
    courtRoutes.MARK_COURT_AS_RESERVED,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.COURT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateCourt.markCourtAsReserved,
    ] as RequestHandler[],
    controller.markCourtAsReserved as RequestHandler
);

export default router;