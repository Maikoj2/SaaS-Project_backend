import { Router, RequestHandler } from 'express';
import trimRequest from 'trim-request';

import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { MatchController } from '../../controllers/championship/match.controller';
import { matchRoutes } from '../../constants/apiRoutes/championship/match';

const router = Router();
const controller = new MatchController();

router.post(matchRoutes.REGISTER_MATCH_RESULT, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    trimRequest.all as RequestHandler,
], controller.registerMatchResult as RequestHandler);

export default router;