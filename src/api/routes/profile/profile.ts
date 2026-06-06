import { Router, RequestHandler } from 'express';
import { ProfileController } from '../../controllers/';
import { auth, origin } from '../../middlewares';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { changePasswordValidation, profileValidation } from '../../validators';
import trimRequest from 'trim-request';
import { stepperValidation } from '../../validators/user/profile.validate';
import { AuthRole, ProfileRoute } from '../../constants/apiRoutes';

const router: Router = Router();
const profileController = new ProfileController();

// get the user data from data base an show ITenant
router.get(ProfileRoute.PROFILE,
    [
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
        trimRequest.all,
    ],
    profileController.getProfile as RequestHandler
);

// update the user data from database and show the updated data
router.patch(ProfileRoute.PROFILE,
    [
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
        trimRequest.all,
        profileValidation.updateProfile
    ],
    profileController.updateProfile as RequestHandler
)
// change the password of the user
router.post(ProfileRoute.CHANGE_PASSWORD, [
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
    trimRequest.all,
    changePasswordValidation.changePassword
], profileController.changePassword as RequestHandler)
// update the stepper of the user
router.patch(ProfileRoute.STEPPER, [
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    trimRequest.all,
    stepperValidation.stepper
], profileController.updateStepper as RequestHandler)

export default router;