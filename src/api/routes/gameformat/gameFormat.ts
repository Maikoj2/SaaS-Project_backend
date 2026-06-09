// src/api/routes/gameFormats/gameFormats.ts
import { Router, RequestHandler } from 'express';
import { auth, origin } from '../../middlewares';
import { GameFormatController } from '../../controllers/championship/gameFormat.controller';
import trimRequest from 'trim-request';
import { validateCreateGameFormat } from '../../validators/championships/gameformat.validator';

import { AuthPermission } from '../../constants/permissions';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';

const gameFormatController = new GameFormatController();
const router: Router = Router();

// Get all game formats
router.get('/', [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.GAME_FORMAT_READ]) as RequestHandler,
    trimRequest.all
], gameFormatController.getAll as RequestHandler);

// Create game format
router.post('/', [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.GAME_FORMAT_CREATE]) as RequestHandler,
    trimRequest.all,
    ...validateCreateGameFormat
], gameFormatController.create as RequestHandler);

// ... otras rutas según necesites

export default router;