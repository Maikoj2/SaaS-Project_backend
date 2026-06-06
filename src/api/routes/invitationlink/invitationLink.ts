import { RequestHandler, Router } from 'express';
import { InvitationLinkController } from '../../controllers/championship/invitationLink.controller';
;


import trimRequest from 'trim-request';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { validateGenerateInvitationLink, validateUseInvitationLink } from '../../validators/championships/generatelink.validator';
import { InvitationLinkRoutes } from '../../constants/apiRoutes/invitationlinkroutes.ts/invitationlinkRoutes';
import { AuthRole } from '../../constants/apiRoutes';

const router = Router();
const controller = new InvitationLinkController();

// Generar nuevo enlace de invitación
router.post(InvitationLinkRoutes.GENERATE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]) as RequestHandler,
    ...validateGenerateInvitationLink,
    trimRequest.all as RequestHandler,
] as RequestHandler[], controller.generateLink as RequestHandler);

// Usar enlace de invitación
router.post(InvitationLinkRoutes.USE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    ...validateUseInvitationLink,
    trimRequest.all as RequestHandler,
] as RequestHandler[], controller.useInvitationLink as RequestHandler);

// Obtener enlace activo
router.get(InvitationLinkRoutes.GET_ACTIVE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]) as RequestHandler,
] as RequestHandler[], controller.getActiveLink as RequestHandler);

// Desactivar enlace
router.delete(InvitationLinkRoutes.DEACTIVATE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]) as RequestHandler,
] as RequestHandler[], controller.deactivateLink as RequestHandler);

// Obtener estadísticas del enlace
router.get(InvitationLinkRoutes.GET_LINK_STATS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]) as RequestHandler,
] as RequestHandler[], controller.getLinkStats as RequestHandler);

// Obtener historial de enlaces
router.get(InvitationLinkRoutes.GET_ALL_LINKS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth as RequestHandler,
    handleAuthError as RequestHandler,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]) as RequestHandler,
] as RequestHandler[], controller.getAllLinks as RequestHandler);

export default router;