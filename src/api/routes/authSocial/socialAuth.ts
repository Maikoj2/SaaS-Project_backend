import express,{Express, RequestHandler}from 'express';
import { AuthSocialRoute } from '../../models/apiRoutes/auth/authRoutes';
import { AuthSocialController } from '../../controllers/auth/authSocial.controller';
import { origin } from '../../middlewares';



const app: Express = express();
const authSocialController = new AuthSocialController();


// TODO: Social Auth routes - Pending Production Setup
/*
app.get(AuthSocialRoute.FACEBOOK, 
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
    ],
    authSocialController.facebookLogin as RequestHandler
);
*/

// Requisitos para producción:
// 1. Facebook Developer App configurada
// 2. SSL/HTTPS configurado
// 3. Dominio verificado
// 4. URLs de callback configuradas
// 5. Variables de entorno:
//    - FACEBOOK_APP_ID
//    - FACEBOOK_APP_SECRET
//    - FACEBOOK_CALLBACK_URL

export default app;
