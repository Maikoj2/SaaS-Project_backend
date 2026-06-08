import { Router, RequestHandler } from 'express';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { ChampionshipController } from '../../controllers/championship/championship.controller';
import trimRequest from 'trim-request';
import { validateCreateChampionship, validateCreateChampionshipConfiguration, validateRegisterTeam, validateUpdateChampionshipStatus } from '../../validators/championships/championship.validator';
import { ChampionshipsRoutes } from '../../constants/apiRoutes/championship/championshipsRoutes';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';
import { championshipConfigurationValidators } from '../../validators/championships/Configuration.validator';


const championshipController = new ChampionshipController();
const router: Router = Router();


// create championship
router.post(ChampionshipsRoutes.CHAMPIONSHIPS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_CREATE]) as RequestHandler,
    ...validateCreateChampionship,
    ...validateCreateChampionshipConfiguration,
    trimRequest.all,
], championshipController.create as RequestHandler);

// get all championships
router.get(ChampionshipsRoutes.CHAMPIONSHIPS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_READ]) as RequestHandler,
], championshipController.getActive as RequestHandler);

// get a championship by id
router.get(ChampionshipsRoutes.CHAMPIONSHIPS_ID, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_READ]) as RequestHandler,
], championshipController.getById as RequestHandler);

//update championship status
router.patch(ChampionshipsRoutes.CHAMPIONSHIPS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_UPDATE]) as RequestHandler,
    ...validateUpdateChampionshipStatus,
    trimRequest.all,
], championshipController.updateStatus as RequestHandler);

// register team
router.post(ChampionshipsRoutes.CHAMPIONSHIPS_ID_TEAMS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_REGISTER_TEAM]) as RequestHandler,
    ...validateRegisterTeam,
    trimRequest.all,
], championshipController.registerTeam as RequestHandler);

//  update config
router.patch(ChampionshipsRoutes.CHAMPIONSHIPS_ID_CONFIGURATION, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_UPDATE]) as RequestHandler,
    trimRequest.all,
    ...championshipConfigurationValidators.updateChampionshipConfiguration,
], championshipController.updateChampionshipConfiguration as RequestHandler);

// get championship configuration
router.get(ChampionshipsRoutes.CHAMPIONSHIPS_ID_CONFIGURATION, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([AuthPermission.CHAMPIONSHIP_READ]) as RequestHandler,
    trimRequest.all,
    ...championshipConfigurationValidators.getChampionshipConfiguration,
], championshipController.getChampionshipConfiguration as RequestHandler);

export default router;
