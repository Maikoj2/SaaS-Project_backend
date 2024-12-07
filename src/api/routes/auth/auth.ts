import express, { Express, Request, RequestHandler, Response } from "express";
import trimRequest from 'trim-request'
import { origin } from "../../middlewares";
import { AuthRole, AuthRoute } from "../../models/auth/authRoutes";
import { authValidation } from "../../validators";
import { AuthController } from "../../controllers";
import { handleAuthError, requireAuth } from "../../config";
import { roleAuthorization } from "../../middlewares/auth/roleAuthorization.middleware";

const app: Express = express();
const authController = new AuthController();

app.post(
    AuthRoute.VERIFY,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
    ],
    authController.verify as RequestHandler
)

app.post(
    AuthRoute.REGISTER,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.register
    ],
    authController.register as RequestHandler
)

app.post(
    AuthRoute.LOGIN,
    [
        origin.checkDomain as RequestHandler,
        // origin.checkTenant, 
        trimRequest.all,
        ...authValidation.login,
    ],
    authController.login as RequestHandler
)

app.get(
    AuthRoute.CHECK,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
    ],
    authController.checkExist as RequestHandler
)

app.get(
    AuthRoute.TOKEN,
    [
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER,
            AuthRole.REFEREE,
            AuthRole.TEAM_MEMBER,
            AuthRole.VIEWER
        ]) as RequestHandler,
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all
    ],
    authController.getRefreshToken as RequestHandler
)

export default app