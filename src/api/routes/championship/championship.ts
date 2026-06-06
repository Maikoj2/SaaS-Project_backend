import express, { Express, RequestHandler } from 'express';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { ChampionshipController } from '../../controllers/championship/championship.controller';
import trimRequest from 'trim-request';
import { validateCreateChampionship, validateCreateChampionshipConfiguration } from '../../validators/championships/championship.validator';
import { ChampionshipsRoutes } from '../../constants/apiRoutes/championship/championshipsRoutes';
import { AuthRole } from '../../constants/apiRoutes';


const championshipController = new ChampionshipController();
const app: Express = express();


// create championship
app.post(ChampionshipsRoutes.CHAMPIONSHIPS, [
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
app.get(ChampionshipsRoutes.CHAMPIONSHIPS, [
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
