import express, { RequestHandler } from 'express';

import { auth } from '../../middlewares/auth.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { origin } from '../../middlewares';

import trimRequest from 'trim-request';
import { RegistrationRoutes } from '../../models/apiRoutes/championship/registation/registationRoutes';
import { validateRegistration } from '../../validators/championships/registation.validator';
import { RegistrationController } from '../../controllers/championShip/registration.controller';

const app = express.Router();
const controller = new RegistrationController();

// Registro con enlace de invitación
app.post(RegistrationRoutes.REGISTRATION, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    trimRequest.all as RequestHandler,
    ...(validateRegistration as RequestHandler[]) ,
], controller.registerWithInvitation as RequestHandler );

// Webhook para procesar pagos
app.post(RegistrationRoutes.REGISTRATION_WEBHOOK, [
    // No necesita auth porque viene del gateway de pago
    // Pero necesita validación de firma
    trimRequest.all as RequestHandler,
], controller.handlePaymentWebhook as RequestHandler );

app.get(RegistrationRoutes.REGISTRATION_WEBHOOK_SUCCESS, [
    // No necesita auth porque viene del gateway de pago
    // Pero necesita validación de firma
    trimRequest.all as RequestHandler,
], controller.handlePaymentWebhook as RequestHandler );

// // Verificar estado del registro
// router.get('/championships/registration/:id', [
//     origin.checkDomain as RequestHandler,
//     origin.checkTenant as RequestHandler,
//     auth as RequestHandler,
//     requireAuth,
//     handleAuthError,
// ], controller.getRegistrationStatus);

export default app;