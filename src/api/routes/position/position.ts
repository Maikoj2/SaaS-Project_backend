import express, { Express, RequestHandler } from 'express';

import { auth, origin } from '../../middlewares';
import trimRequest from 'trim-request';

import { positionRoutes } from '../../models/apiRoutes/championship/position/positionRoutes';
import { PositionController } from '../../controllers/championShip/position.controller';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { AuthRole } from '../../models';
import { positionValidator } from '../../validators/championships/position.validator';

const app: Express = express();
const positionController = new PositionController();


// put positions automatically according to the number of confirmed registrations and registration date
app.post(positionRoutes.AUTO_ASSIGN_POSITIONS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER,
            AuthRole.REFEREE
        ]),
        positionValidator.assignPositions,
        trimRequest.all
    ],
    positionController.autoAssignPositions as RequestHandler
);

// put positions manually sending an array of objects with teamId and position
app.post(positionRoutes.MANUAL_ASSIGN_POSITIONS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER
        ]),
        positionValidator.manualAssignPositions,
        trimRequest.all
    ],
    positionController.manualAssignPositions as RequestHandler
);

// Asignar posiciones aleatorias
app.post(positionRoutes.ASSIGN_RANDOM_POSITIONS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER
        ]),
        positionValidator.assignPositions,
        trimRequest.all
    ],
    positionController.assignRandomPositions as RequestHandler
);

// put position by registration id
app.post(positionRoutes.ASSIGN_POSITION_BY_REGISTRATION_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER
        ]),
        positionValidator.assignPositions,
        trimRequest.all
    ],
    positionController.assignPositionByRegistrationId as RequestHandler
);

// get positions by championship id
app.get(positionRoutes.GET_POSITIONS_BY_CHAMPIONSHIP_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        handleAuthError,
        requireAuth,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER,
            AuthRole.REFEREE,
            AuthRole.TEAM_MEMBER
        ]),
        positionValidator.assignPositions,
        trimRequest.all
    ],
    positionController.getPositionsByChampionshipId as RequestHandler
);



export default app;
