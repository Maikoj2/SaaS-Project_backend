import express, { Express, RequestHandler } from 'express';
import { ChampionshipsRoutes } from '../../models/apiRoutes/championship/championshipsRoutes';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { AuthRole } from '../../models';
import { ChampionshipController } from '../../controllers/championShip/championship.controller';
import trimRequest from 'trim-request';
import { validateCreateChampionship, validateCreateChampionshipConfiguration, validateUpdateStatusChampionship } from '../../validators/championships/campionship.validator';
import { championshipConfigurationValidators } from '../../validators/championships/Configuration.validator';


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

// get all active championships
app.get(ChampionshipsRoutes.CHAMPIONSHIPS,[
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER,
        AuthRole.REFEREE,
        AuthRole.TEAM_MEMBER,
        AuthRole.VIEWER
    ]),
], championshipController.getActive as RequestHandler);

// Obtener un campeonato específico
app.get(ChampionshipsRoutes.CHAMPIONSHIPS_ID, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
], championshipController.getById as RequestHandler);

// Actualizar estado del campeonato
app.patch(ChampionshipsRoutes.CHAMPIONSHIPS_ID_STATUS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
    validateUpdateStatusChampionship,
], championshipController.updateStatus as RequestHandler);

// Registrar equipo en campeonato
app.post(ChampionshipsRoutes.CHAMPIONSHIPS_ID_TEAMS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
], championshipController.registerTeam as RequestHandler);


app.patch(ChampionshipsRoutes.CHAMPIONSHIPS_ID_CONFIGURATION, [
    origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER,
            AuthRole.REFEREE,
            AuthRole.TEAM_MEMBER,
            AuthRole.VIEWER
        ]) as RequestHandler,
        ...championshipConfigurationValidators.updateChampionshipConfiguration,
        trimRequest.all,
] , championshipController.updateChampionshipConfiguration as RequestHandler)

app.get(ChampionshipsRoutes.CHAMPIONSHIPS_ID_CONFIGURATION, [
    origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER,
            AuthRole.REFEREE,
            AuthRole.TEAM_MEMBER,
            AuthRole.VIEWER
        ]) as RequestHandler,
        ...championshipConfigurationValidators.getChampionshipConfiguration,
        trimRequest.all,
] , championshipController.getChampionshipConfiguration as RequestHandler)


/*/ Establecer ganadores
app.post(`${ChampionshipsRoutes.CHAMPIONSHIPS}/:id/winners`, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
], championshipController.setWinners as RequestHandler);

// Obtener campeonatos por rango de fechas
app.get(`${ChampionshipsRoutes.CHAMPIONSHIPS}/date-range`, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN, AuthRole.ORGANIZER]),
], championshipController.getByDateRange as RequestHandler);

// Eliminar campeonato
app.delete(`${ChampionshipsRoutes.CHAMPIONSHIPS}/:id`, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([AuthRole.ADMIN]),
], championshipController.delete as RequestHandler);*/


export default app;
