import { Router, RequestHandler } from "express";
import trimRequest from 'trim-request';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';

import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';
import { groupDistribution } from "../../controllers/championship/groupDistribution.controller";
import { groupDistributionRoutes } from "../../constants/apiRoutes/championship/groupDistribution";
import { validateGroupDistribution, validateGroupDistributionRules } from "../../validators/championships/groupDistribution.validator";


const router = Router();

const controller = new groupDistribution();


router.post(groupDistributionRoutes.CREATE_GROUP_DISTRIBUTION, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.GROUP_DISTRIBUTION_CREATE]) as RequestHandler,
    trimRequest.all as RequestHandler,
    ...validateGroupDistribution.createGroupDistribution,
    validateGroupDistributionRules,
] as RequestHandler[], controller.autoCreateGroupDistribution as RequestHandler);

router.get(
    groupDistributionRoutes.GET_GROUP_DISTRIBUTIONS_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GROUP_DISTRIBUTION_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGroupDistribution.getGroupDistributionsByChampionship,
    ],
    controller.getGroupDistributionsByChampionship as RequestHandler
);

router.get(
    groupDistributionRoutes.GET_GROUP_DISTRIBUTION_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GROUP_DISTRIBUTION_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGroupDistribution.getGroupDistributionById,
    ],
    controller.getGroupDistributionById as RequestHandler
);


export default router;