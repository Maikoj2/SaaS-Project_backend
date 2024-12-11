import express, { Express, Request, RequestHandler, Response } from "express";
import trimRequest from 'trim-request'
import { origin } from "../../middlewares";
import { AuthRole, AuthRoute } from "../../models/apiRoutes/auth/authRoutes";
import { authValidation } from "../../validators";
import { AuthController } from "../../controllers";
import { handleAuthError, requireAuth } from "../../config";
import { roleAuthorization } from "../../middlewares/auth/roleAuthorization.middleware";
import { auth } from "../../middlewares/auth.middleware";
import { ValidationChain } from "express-validator";

const app: Express = express();
const authController = new AuthController();

// auth route to verify user by tenant and verification id
app.post(
    AuthRoute.VERIFY,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        ...authValidation.verify as ValidationChain[],
        trimRequest.all,
    ],
    authController.verify as RequestHandler
)

// auth route to register user
app.post(
    AuthRoute.REGISTER,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.register as ValidationChain[]
    ],
    authController.register as RequestHandler
)

// auth route to login user
app.post(
    AuthRoute.LOGIN,
    [
        origin.checkDomain as RequestHandler,
        // origin.checkTenant, 
        trimRequest.all,
        ...authValidation.login as ValidationChain[]
    ],
    authController.login as RequestHandler
)

// auth route to check if user exists
app.get(
    AuthRoute.CHECK,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
    ],
    authController.checkExist as RequestHandler
)

// auth route to verify token
app.get(
    AuthRoute.TOKEN,
    [
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
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all
    ],
    authController.verifyToken as RequestHandler
)
 
// auth route to forgot password
app.post(
    AuthRoute.FORGOT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.forgotPassword as ValidationChain[]
    ],
    authController.forgotPassword as RequestHandler
)

// auth route to reset password
app.post(
    AuthRoute.RESET,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.resetPassword as ValidationChain[]
    ],
    authController.resetPassword as RequestHandler
)

// auth route to refresh token
app.post(
    AuthRoute.REFRESH,
    [
        auth as RequestHandler,
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all
    ],
    authController.refreshToken as RequestHandler
)

// TODO: auth route to login with google, facebook 

export default app