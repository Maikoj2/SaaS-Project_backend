import { Router, RequestHandler } from 'express';
import trimRequest from 'trim-request';

import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { MatchController } from '../../controllers/championship/match.controller';
import { matchRoutes } from '../../constants/apiRoutes/championship/match';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';
import matchValidator from '../../validators/championships/match.validator';

const router = Router();
const controller = new MatchController();

router.post(matchRoutes.REGISTER_MATCH_RESULT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.MATCH_RESULT_REGISTER]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...matchValidator.registerMatchResult as RequestHandler[],
    ],
    controller.registerMatchResult as RequestHandler);

router.get(matchRoutes.GET_MATCHES_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.MATCH_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...matchValidator.getMatchesByChampionship as RequestHandler[],
    ],
    controller.getMatchesByChampionship as RequestHandler);

router.get(matchRoutes.GET_MATCH_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.MATCH_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...matchValidator.getMatchById as RequestHandler[],
    ],
    controller.getMatchById as RequestHandler);

router.get(matchRoutes.GET_MATCHES_BY_GROUP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.MATCH_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...matchValidator.getMatchesByGroup as RequestHandler[],
    ],
    controller.getMatchesByGroup as RequestHandler);

router.get(matchRoutes.GET_MATCHES_BY_ELIMINATION_BRACKET,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.MATCH_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...matchValidator.getMatchesByEliminationBracket as RequestHandler[],
    ],
    controller.getMatchesByEliminationBracket as RequestHandler);

export default router;