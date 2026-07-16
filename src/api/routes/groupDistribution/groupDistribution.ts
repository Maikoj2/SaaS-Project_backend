import { Router, RequestHandler } from "express";
import trimRequest from 'trim-request';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { validateGenerateInvitationLink, validateUseInvitationLink } from '../../validators/championships/generatelink.validator';

import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';
import { groupDistribution } from "../../controllers/championship/groupDistribution.controller";
import { groupDistributionRoutes } from "../../constants/apiRoutes/championship/groupDistribution";
import { validateCreateGroupDistribution, validateGroupDistributionRules } from "../../validators/championships/groupDistribution.validator";


const router = Router();

const controller = new groupDistribution();


router.post(groupDistributionRoutes.CREATE_GROUP_DISTRIBUTION, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.GROUP_DISTRIBUTION_CREATE]) as RequestHandler,
    ...validateCreateGroupDistribution,
    validateGroupDistributionRules,
    trimRequest.all as RequestHandler,
] as RequestHandler[], controller.autoCreateGroupDistribution as RequestHandler);


export default router;