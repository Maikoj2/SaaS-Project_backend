// src/api/routes/gameFormats/gameFormats.ts
import express, { Express, RequestHandler } from 'express';
import { requireAuth, handleAuthError } from '../../config/auth';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes';
import { auth, origin } from '../../middlewares';
import { GameFormatController } from '../../controllers/championShip/gameFormat.controller';
import trimRequest from 'trim-request';
import { gameFormatValidate } from '../../validators/championships/gameFormat.validator';

const gameFormatController = new GameFormatController();
const Router = express.Router();

// Get all game formats
Router.get('/', [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
    trimRequest.all,
    gameFormatValidate.getAll,
], gameFormatController.getAll as RequestHandler);


// Create game format
Router.post('/', [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN]),
    trimRequest.all,
    gameFormatValidate.create
], gameFormatController.create as RequestHandler);

Router.patch('/:id', [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN]),
    trimRequest.all,
    gameFormatValidate.update
], gameFormatController.update as RequestHandler);

export default Router;