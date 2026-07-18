import { Router, RequestHandler } from 'express';
import trimRequest from 'trim-request';

import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';

import { GroupController } from '../../controllers/championship/group.controller';
import { groupRoutes } from '../../constants/apiRoutes/championship/group';
import groupValidator from '../../validators/championships/group.validator';

const router = Router();
const controller = new GroupController();

router.get(
    groupRoutes.GET_GROUPS_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GROUP_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(groupValidator.getGroupsByChampionship as RequestHandler[])
    ],
    controller.getGroupsByChampionship as RequestHandler
);

router.get(
    groupRoutes.GET_GROUP_STANDINGS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GROUP_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(groupValidator.getGroupStandings as RequestHandler[])
    ],
    controller.getGroupStandings as RequestHandler
);

router.get(
    groupRoutes.GET_GROUP_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GROUP_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(groupValidator.getGroupById as RequestHandler[])
    ],
    controller.getGroupById as RequestHandler
);

router.get(
    groupRoutes.GET_GROUPS_BY_GROUP_DISTRIBUTION,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GROUP_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(groupValidator.getGroupsByGroupDistribution as RequestHandler[])
    ],
    controller.getGroupsByGroupDistribution as RequestHandler
);

export default router;