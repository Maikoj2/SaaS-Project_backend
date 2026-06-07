import { Router, RequestHandler } from 'express';
import { origin } from '../../middlewares';
import { auth } from '../../middlewares/auth.middleware';
import { ChampionshipController } from '../../controllers/championship/championship.controller';
import trimRequest from 'trim-request';
import { validateCreateChampionship, validateCreateChampionshipConfiguration } from '../../validators/championships/championship.validator';
import { ChampionshipsRoutes } from '../../constants/apiRoutes/championship/championshipsRoutes';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';


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



export default router;
