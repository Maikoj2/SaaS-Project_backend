import { Router, RequestHandler } from 'express';
import trimRequest from 'trim-request';

import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';

import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';

import { GameFormatController } from '../../controllers/championship/gameFormat.controller';
import { gameFormatRoutes } from '../../constants/apiRoutes/championship/gameFormat';
import { validateGameFormat } from '../../validators/championships/gameformat.validator';

const router = Router();

const controller = new GameFormatController();

router.post(
    gameFormatRoutes.CREATE_GAME_FORMAT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GAME_FORMAT_CREATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGameFormat.createGameFormat,
    ] as RequestHandler[],
    controller.createGameFormat as RequestHandler
);

router.get(
    gameFormatRoutes.GET_GAME_FORMATS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GAME_FORMAT_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGameFormat.getGameFormats,
    ] as RequestHandler[],
    controller.getGameFormats as RequestHandler
);

router.get(
    gameFormatRoutes.GET_GAME_FORMAT_BY_ID,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GAME_FORMAT_READ]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGameFormat.getGameFormatById,
    ] as RequestHandler[],
    controller.getGameFormatById as RequestHandler
);

router.patch(
    gameFormatRoutes.UPDATE_GAME_FORMAT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GAME_FORMAT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGameFormat.updateGameFormat,
    ] as RequestHandler[],
    controller.updateGameFormat as RequestHandler
);

router.delete(
    gameFormatRoutes.DELETE_GAME_FORMAT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GAME_FORMAT_DELETE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGameFormat.deleteGameFormat,
    ] as RequestHandler[],
    controller.deleteGameFormat as RequestHandler
);

router.patch(
    gameFormatRoutes.ASSIGN_GAME_FORMAT_TO_CHAMPIONSHIP,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.GAME_FORMAT_UPDATE]) as RequestHandler,
        trimRequest.all as RequestHandler,
        ...validateGameFormat.assignGameFormatToChampionshipConfiguration,
    ] as RequestHandler[],
    controller.assignGameFormatToChampionshipConfiguration as RequestHandler
);

export default router;