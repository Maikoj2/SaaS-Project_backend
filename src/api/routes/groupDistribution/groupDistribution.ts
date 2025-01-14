// src/api/routes/championship/groupDistribution.routes.ts

import express, { RequestHandler } from 'express';

import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware.js';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes.js';
import trimRequest from 'trim-request';
import { groupDistributionRoutes } from '../../models/apiRoutes/championship/groupDistribution/groupDistribution.routes';
import { auth, origin } from '../../middlewares';
import { handleAuthError } from '../../config/auth/index.js';
import { GroupDistributionController } from '../../controllers/championShip/groupDistribution.controller.js';
import { requireAuth } from '../../config/passport/passport.js';

const router = express.Router();
const groupDistributionController = new GroupDistributionController();

router.post(groupDistributionRoutes.CREATE_GROUP_DISTRIBUTION, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]) as RequestHandler,
    trimRequest.all,
], groupDistributionController.autoCreateGroupDistribution as RequestHandler);

// router.get(groupDistributionRoutes.GET_ALL_GROUP_DISTRIBUTION, [
//     origin.checkDomain as RequestHandler,
//     origin.checkTenant as RequestHandler,
//     auth as RequestHandler,
//     requireAuth as RequestHandler,
//     handleAuthError as RequestHandler,
//     roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER, AuthRole.TEAM_MEMBER]) as RequestHandler,
//     trimRequest.all,
// ], groupDistributionController.getAll);

// router.patch(groupDistributionRoutes.UPDATE_GROUP_DISTRIBUTION, [
//     origin.checkDomain as RequestHandler,
//     origin.checkTenant as RequestHandler,
//     auth as RequestHandler,
//     requireAuth as RequestHandler,
//     handleAuthError as RequestHandler,
//     roleAuthorization([AuthRole.ADMIN]) as RequestHandler,
//     trimRequest.all,
// ], groupDistributionController.update);

// router.delete(groupDistributionRoutes.DELETE_GROUP_DISTRIBUTION, [
//     origin.checkDomain as RequestHandler,
//     origin.checkTenant as RequestHandler,
//     auth as RequestHandler,
//     requireAuth as RequestHandler,
//     handleAuthError as RequestHandler,
//     roleAuthorization([AuthRole.ADMIN]) as RequestHandler,
//     trimRequest.all,
// ], groupDistributionController.delete);

export default router;