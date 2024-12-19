import express, { Express, RequestHandler } from 'express';
import { ChampionshipsRoutes } from '../../models/apiRoutes/championship/championshipsRoutes';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { AuthRole } from '../../models';
import { ChampionshipController } from '../../controllers/championShip/championship.controller';
import trimRequest from 'trim-request';
import { validateCreateChampionship, validateCreateChampionshipConfiguration } from '../../validators/championships/campionship.validator';


const championshipController = new ChampionshipController();
const app: Express = express();


// create championship
app.post(ChampionshipsRoutes.CHAMPIONSHIPS,[
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER
    ]),
    validateCreateChampionship,
    validateCreateChampionshipConfiguration,
    trimRequest.all,
], championshipController.create as RequestHandler);

// get all championships
app.get(ChampionshipsRoutes.CHAMPIONSHIPS,[
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER
    ]),
], championshipController.getActive as RequestHandler);



export default app;
