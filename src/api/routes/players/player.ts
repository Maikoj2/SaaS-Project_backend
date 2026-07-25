import express, { Express, RequestHandler, Router } from 'express';

import { auth, origin } from '../../middlewares';


import trimRequest from 'trim-request';

import { ValidationChain } from 'express-validator';
import { playerRoutes } from '../../constants/apiRoutes/championship/player';
import { playerValidation } from '../../validators/championships/player.validator';
import { playerController } from '../../controllers/championship/player.controller';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';


const controller = new playerController();
const router: Router = Router();
// create player by link invitation
router.post(playerRoutes.PLAYER_BY_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    trimRequest.all,
    ...playerValidation.createPlayer as ValidationChain[]
], (controller.createPlayerByLink) as RequestHandler);

router.post(
    playerRoutes.CREATE_PLAYER_MANUALLY,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.PLAYER_CREATE]) as RequestHandler,
        ...playerValidation.createPlayerManually as RequestHandler[],
        trimRequest.all as RequestHandler,
        ...(playerValidation.createPlayerManually as RequestHandler[]),
    ],
    controller.createPlayerManually as RequestHandler
);

router.get(
    playerRoutes.GET_PLAYERS_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.PLAYER_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(playerValidation.getPlayersByChampionship as RequestHandler[]),
    ],
    (controller.getPlayersByChampionship) as RequestHandler
);

router.get(
    playerRoutes.GET_PLAYER_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.PLAYER_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(playerValidation.getPlayerByChampionship as RequestHandler[]),
    ],
    controller.getPlayerById as RequestHandler
);

router.patch(
    playerRoutes.UPDATE_PLAYER_BY_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.PLAYER_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...(playerValidation.updatePlayerByChampionship as RequestHandler[]),
    ],
    controller.updatePlayer as RequestHandler
);

export default router;
