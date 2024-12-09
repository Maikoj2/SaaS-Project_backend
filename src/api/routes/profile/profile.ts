import express, { Express, RequestHandler } from 'express';
import { ProfileController } from '../../controllers/';
import { auth, origin } from '../../middlewares';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { handleAuthError, requireAuth } from '../../config';
import { ProfileRoute } from '../../models/apiRoutes';
import { profileValidation } from '../../validators';
import trimRequest from 'trim-request';

const app: Express = express();
const profileController = new ProfileController();

app.get(ProfileRoute.PROFILE,
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

app.patch(ProfileRoute.PROFILE,
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

export default app;