import { RequestHandler, Router } from 'express';
import { InvitationLinkController } from '../../controllers/championship/invitationLink.controller';
import trimRequest from 'trim-request';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { validateGenerateInvitationLink, validateUseInvitationLink } from '../../validators/championships/generatelink.validator';
import { InvitationLinkRoutes } from '../../constants/apiRoutes/invitationlinkroutes.ts/invitationlinkRoutes';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';

const router = Router();
const controller = new InvitationLinkController();

// Generar nuevo enlace de invitación
router.post(InvitationLinkRoutes.GENERATE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.INVITATION_LINK_CREATE]) as RequestHandler,
    ...validateGenerateInvitationLink,
    trimRequest.all as RequestHandler,
] as RequestHandler[], controller.generateLink as RequestHandler);

// Usar enlace de invitación
router.post(InvitationLinkRoutes.USE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    ...validateUseInvitationLink,
    trimRequest.all as RequestHandler,
] as RequestHandler[], controller.useInvitationLink as RequestHandler);

// Obtener enlace activo
router.get(InvitationLinkRoutes.GET_ACTIVE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.INVITATION_LINK_READ]) as RequestHandler,
] as RequestHandler[], controller.getActiveLink as RequestHandler);

// Desactivar enlace
router.delete(InvitationLinkRoutes.DEACTIVATE_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.INVITATION_LINK_MANAGE]) as RequestHandler,
] as RequestHandler[], controller.deactivateLink as RequestHandler);

// Obtener estadísticas del enlace
router.get(InvitationLinkRoutes.GET_LINK_STATS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.INVITATION_LINK_READ]) as RequestHandler,
] as RequestHandler[], controller.getLinkStats as RequestHandler);

// Obtener historial de enlaces
router.get(InvitationLinkRoutes.GET_ALL_LINKS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.INVITATION_LINK_READ]) as RequestHandler,
] as RequestHandler[], controller.getAllLinks as RequestHandler);

export default router;