import express, { Express, RequestHandler } from 'express';
import { playerRoutes } from '../../models/apiRoutes/championship/player/playerRoutes';
import { auth, origin } from '../../middlewares';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import trimRequest from 'trim-request';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes';
import { playerValidation } from '../../validators/championships/player.validator';
import { playerController } from '../../controllers/championShip/player.controller';
import { ValidationChain } from 'express-validator';


const PlayerController = new playerController();
const app: Express = express();
// create player by link invitation
app.post(playerRoutes.PLAYER_BY_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    trimRequest.all,
    ...playerValidation.createPlayer as ValidationChain[]
], (PlayerController.createPlayerByLink as unknown) as RequestHandler);

export default app;
