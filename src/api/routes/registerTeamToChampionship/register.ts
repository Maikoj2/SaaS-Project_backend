
import { Router, RequestHandler } from 'express';
import { auth, origin } from '../../middlewares/index.js';
import { RegistrationRoutes } from '../../constants/apiRoutes/registerToChampionShips/register.js';
import trimRequest from 'trim-request';
import { validateRegistration } from '../../validators/championships/register.validator.js';
import { RegistrationController } from '../../controllers/championship/register.controller.js';
import { extractTenantFromParams } from '../../middlewares/auth/webhookTenant.middleware.js';

const registrationController = new RegistrationController();
const router: Router = Router();


// Registro con enlace de invitación
router.post(RegistrationRoutes.REGISTRATION_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    trimRequest.all as RequestHandler,
    ...(validateRegistration as RequestHandler[]),
], registrationController.registerWithInvitation as RequestHandler);
// 2. Obtener estado de un registro por ID (requiere autenticación)
router.get(RegistrationRoutes.REGISTRATION_STATUS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
], registrationController.getRegistrationStatus as RequestHandler);
// 3. Webhook de MercadoPago (Server-to-Server, por lo que NO usa origin.checkDomain)
router.post(RegistrationRoutes.REGISTRATION_WEBHOOK, [
    extractTenantFromParams as RequestHandler,
    trimRequest.all as RequestHandler,
], registrationController.handlePaymentWebhook as RequestHandler);
export default router;