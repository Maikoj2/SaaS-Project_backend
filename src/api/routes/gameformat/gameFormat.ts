// src/api/routes/gameFormats/gameFormats.ts
import express, { Express, RequestHandler } from 'express';
import { requireAuth, handleAuthError } from '../../config/auth';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes';
import { auth, origin } from '../../middlewares';
import { GameFormatController } from '../../controllers/championShip/gameFormat.controller';
import trimRequest from 'trim-request';
import { validateCreateGameFormat } from '../../validators/championships/gameformat.validator';

const gameFormatController = new GameFormatController();
const app: Express = express();

// Get all game formats
// app.get('/', [
//     origin.checkDomain as RequestHandler,
//     origin.checkTenant as RequestHandler,
//     auth as RequestHandler,
//     requireAuth,
//     handleAuthError,
//     roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
//     trimRequest.all
// ], gameFormatController.getAll as RequestHandler);

// Create game format
app.post('/', [
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

export default app;