import express, { RequestHandler } from 'express';

import { origin, auth } from '../../middlewares';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes';
import trimRequest from 'trim-request';
import { phasesRoutes } from '../../models/apiRoutes/championship/phases/phases.routes';
import { PhaseController } from '../../controllers/championShip/phase.controller';
import { phasesValidator } from '../../validators/championships/phases.validator';

const app = express.Router();
const phaseController = new PhaseController();

// Crear las fases de un campeonato
app.post(phasesRoutes.CREATE_PHASES, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
    ...phasesValidator.createPhases,
    trimRequest.all,
], phaseController.createPhases as RequestHandler);

// Listar las fases de un campeonato
app.get(phasesRoutes.GET_PHASES, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER, AuthRole.REFEREE, AuthRole.TEAM_MEMBER, AuthRole.VIEWER]),
    trimRequest.all
], phaseController.listPhases as RequestHandler);

// Actualizar una fase
app.patch(phasesRoutes.UPDATE_PHASE, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
    trimRequest.all
], phaseController.updatePhase as RequestHandler);

// Eliminar una fase
app.delete(phasesRoutes.DELETE_PHASE, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN]),
    trimRequest.all
], phaseController.deletePhase as RequestHandler);

// Configurar los grupos dentro de una fase
app.post(phasesRoutes.CONFIGURE_GROUPS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
    trimRequest.all
], phaseController.configureGroups as RequestHandler);

export default app; 