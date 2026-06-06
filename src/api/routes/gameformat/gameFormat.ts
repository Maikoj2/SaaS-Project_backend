// src/api/routes/gameFormats/gameFormats.ts
import { Router, RequestHandler } from 'express';
import { requireAuth, handleAuthError } from '../../config/auth';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';

import { auth, origin } from '../../middlewares';
import { GameFormatController } from '../../controllers/championship/gameFormat.controller';
import trimRequest from 'trim-request';
import { validateCreateGameFormat } from '../../validators/championships/gameformat.validator';
import { AuthRole } from '../../constants/apiRoutes';

const gameFormatController = new GameFormatController();
const router: Router = Router();

// Get all game formats
// router.get('/', [
//     origin.checkDomain as RequestHandler,
//     origin.checkTenant as RequestHandler,
//     auth as RequestHandler,
//     requireAuth,
//     handleAuthError,
//     roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
//     trimRequest.all
// ], gameFormatController.getAll as RequestHandler);

// Create game format
router.post('/', [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN]),
    trimRequest.all,
    validateCreateGameFormat
], gameFormatController.create as RequestHandler);

// ... otras rutas según necesites

export default router;