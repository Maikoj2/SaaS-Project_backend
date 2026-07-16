import express, { Express, RequestHandler } from 'express';

import { origin } from '../../middlewares';


import trimRequest from 'trim-request';

import { ValidationChain } from 'express-validator';
import { playerRoutes } from '../../constants/apiRoutes/championship/player';
import { playerValidation } from '../../validators/championships/player.validator';
import { playerController } from '../../controllers/championship/player.controller';


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
