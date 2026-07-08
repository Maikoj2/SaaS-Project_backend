import express, { Express, RequestHandler, Router } from 'express';

import { auth, origin } from '../../middlewares';
import trimRequest from 'trim-request';



import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';
import { positionValidator } from '../../validators/championships/position.validator';
import { positionRoutes } from '../../constants/apiRoutes/championship/positionRoutes';
import { PositionController } from '../../controllers/championship/position.controller';

const router: Router = Router();
const positionController = new PositionController();


// put positions automatically according to the number of confirmed registrations and registration date
router.post(positionRoutes.AUTO_ASSIGN_POSITIONS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.CHAMPIONSHIP_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(positionValidator.assignPositions as RequestHandler[])
        ,
    ], positionController.autoAssignPositions as RequestHandler);

// put positions manually according to the number of confirmed registrations and registration date
// app.post(positionRoutes.MANUAL_ASSIGN_POSITIONS,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         trimRequest.all as RequestHandler,
//         ...(positionValidator as RequestHandler[]),
//     ], positionController.manualAssignPositions as RequestHandler);

// assign position to a registration by registration id
// app.post(positionRoutes.ASSIGN_POSITION_BY_REGISTRATION_ID,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         trimRequest.all as RequestHandler,
//         ...(positionValidator as RequestHandler[]),
//     ], positionController.assignPositionByRegistrationId as RequestHandler);

// assign random positions to all confirmed registrations
// app.post(positionRoutes.ASSIGN_RANDOM_POSITIONS,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         trimRequest.all as RequestHandler,
//         ...(positionValidator as RequestHandler[]),
//     ], positionController.assignRandomPositions as RequestHandler);

// get all positions of a championship by championship id
// app.get(positionRoutes.GET_POSITIONS_BY_CHAMPIONSHIP_ID,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         trimRequest.all as RequestHandler,
//         ...(positionValidator as RequestHandler[]),
//     ], positionController.getPositionsByChampionshipId as RequestHandler);

export default router;